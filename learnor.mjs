// Learnor — autonomous course engine.
// One Express router that carries the whole pipeline:
//   intake chat → course_requests queue → worker pass (plan → generate →
//   verify) → unlisted preview + review email to Itish → approval gate →
//   publish + requester email.
// The worker NEVER publishes or emails the requester — that happens only
// through the approval endpoints, which are Itish-gated (admin token or
// signed magic links from the review email).

import { Router } from 'express';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://nxxisxugpfswyvpchexs.supabase.co').trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const ADMIN_TOKEN = (process.env.LEARNOR_ADMIN_TOKEN || '').trim();
const WORKER_TOKEN = (process.env.LEARNOR_WORKER_TOKEN || ADMIN_TOKEN).trim();
const SIGNING_SECRET = ADMIN_TOKEN || SERVICE_KEY || 'learnor-dev-secret';
const REVIEW_EMAIL = (process.env.LEARNOR_REVIEW_EMAIL || 'itishpande21@gmail.com').trim();
const FROM_EMAIL = (process.env.LEARNOR_FROM_EMAIL || 'Learnor <onboarding@resend.dev>').trim();
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const SITE_URL = (process.env.LEARNOR_SITE_URL || 'https://www.learnor.io').replace(/\/$/, '');
const CATALOG_EMAIL = 'catalog@learnor.io';
const GEMINI_MODEL = 'gemini-3-flash-preview';
const MAX_ATTEMPTS = 3;
const STALE_BUILDING_MINUTES = 30;

// ── Supabase REST helpers (service role — bypasses RLS) ──────────────────────

function sbHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function sbSelect(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`Supabase select ${table} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function sbInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase insert ${table} failed (${res.status}): ${await res.text()}`);
  const rows = await res.json();
  return rows[0];
}

async function sbPatch(table, query, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Supabase patch ${table} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ── LLM helper ────────────────────────────────────────────────────────────────

async function callLLM(systemPrompt, userText, maxTokens = 8192, temperature = 0.6) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  };

  const fetchOnce = () => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let res = await fetchOnce();
  let data = await res.json();
  if (res.status === 429) {
    const retryDetail = data?.error?.details?.find((d) => d?.retryDelay);
    const delaySec = retryDetail?.retryDelay ? parseFloat(String(retryDetail.retryDelay)) || 20 : 20;
    await new Promise((r) => setTimeout(r, (delaySec + 1) * 1000));
    res = await fetchOnce();
    data = await res.json();
  }
  if (!res.ok) throw new Error(data.error?.message || `Gemini error ${res.status}`);
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('');
}

function parseJsonLoose(raw) {
  const cleaned = String(raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/g, '')
    .trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const sliced = cleaned.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1');
    try { return JSON.parse(sliced); } catch { /* fall through */ }
  }
  throw new Error('Model returned unparseable JSON');
}

async function callLLMJson(systemPrompt, userText, maxTokens = 8192, temperature = 0.55) {
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await callLLM(systemPrompt, userText, maxTokens, temperature);
      return parseJsonLoose(text);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// ── Email (Resend; logs instead of sending when no key is configured) ─────────

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log(`[learnor:email] (not sent — RESEND_API_KEY unset) to=${to} subject=${subject}`);
    return { sent: false, detail: 'RESEND_API_KEY not configured; email logged to console' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('[learnor:email]', res.status, detail);
      return { sent: false, detail };
    }
    return { sent: true };
  } catch (err) {
    console.error('[learnor:email]', err.message);
    return { sent: false, detail: err.message };
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Magic-link signing ────────────────────────────────────────────────────────

function signAction(id, action) {
  return createHmac('sha256', SIGNING_SECRET).update(`${id}:${action}`).digest('hex');
}

function verifyAction(id, action, sig) {
  const expected = Buffer.from(signAction(id, action), 'hex');
  let provided;
  try { provided = Buffer.from(String(sig || ''), 'hex'); } catch { return false; }
  return provided.length === expected.length && timingSafeEqual(expected, provided);
}

// ── Auth middleware ───────────────────────────────────────────────────────────

function bearerToken(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function requireToken(expected, label) {
  return (req, res, next) => {
    if (!expected) {
      return res.status(503).json({
        error: `${label} is not configured. Set LEARNOR_ADMIN_TOKEN (and optionally LEARNOR_WORKER_TOKEN) in the server env.`,
      });
    }
    if (bearerToken(req) !== expected) return res.status(401).json({ error: 'Unauthorized' });
    next();
  };
}

const requireAdmin = requireToken(ADMIN_TOKEN, 'Admin access');
const requireWorker = requireToken(WORKER_TOKEN, 'Worker access');

// ── Content helpers ───────────────────────────────────────────────────────────

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `course-${Date.now()}`;
}

async function uniqueSlug(base) {
  let slug = base;
  for (let i = 2; i < 50; i += 1) {
    const existing = await sbSelect('courses', `slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`);
    if (!existing.length) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

function courseStats(content) {
  return {
    sections: content?.sections?.length ?? 0,
    quiz: content?.quiz?.length ?? 0,
    exercises: content?.exercises?.length ?? 0,
  };
}

// ── The build pipeline (PLAN → GENERATE → VERIFY) ────────────────────────────

const DESIGN_RULES = `Writing rules (Learnor "Databricks-notes" style):
- Documentation-style prose in Markdown. NO H1 headings (the page supplies the title). Use plain paragraphs, "- " bullets, fenced code blocks with a language tag, and Markdown tables for comparisons.
- Section shape: one intent line (what this section is for), then a plain-language explanation, then a concrete example, then optional code or a table. Every abstract idea gets a concrete example immediately after it.
- Write for reading speed and retention, not word count. If a sentence doesn't teach, cut it.
- Original explanations only — never reproduce copyrighted source text.`;

function briefContext(request) {
  return [
    `Topic: ${request.topic}`,
    `Level: ${request.level || 'unspecified'}`,
    `Brief (structured understanding): ${JSON.stringify(request.brief || {})}`,
    `Requester's own definition of success: ${request.expectations || 'unspecified'}`,
    `Metadata: ${JSON.stringify(request.metadata || {})}`,
    request.status === 'changes_requested' && request.review_notes
      ? `REVIEWER FEEDBACK on the previous version (honor this above everything else): ${request.review_notes}`
      : '',
  ].filter(Boolean).join('\n');
}

async function planCourse(request) {
  const plan = await callLLMJson(
    `You are the curriculum planner for Learnor, a marketplace of complete single-page reading courses. Plan a course that fits the requester's brief exactly — build to THEIR expectations, not a generic version of the topic. Respond with ONLY JSON:
{
  "title": "clean course title",
  "subject": "short subject label (e.g. Python, SQL, React)",
  "category": "one of: Programming | Web Development | Data & AI | Cloud & DevOps | Product & Growth | Other",
  "summary": "one-sentence promise of what the reader can DO afterwards",
  "sections": [{ "heading": "…", "intent": "one line: what this section teaches and why it's here" }],
  "quizCount": 6-10,
  "exerciseCount": 2-4
}
Rules: 5 to 12 sections, ordered first principles → applied. The last sections must reach real, practical proficiency (projects/workflows), not stop at basics.`,
    briefContext(request),
    3000,
  );
  if (!Array.isArray(plan.sections) || plan.sections.length < 5 || plan.sections.length > 12) {
    throw new Error(`Plan produced ${plan.sections?.length ?? 0} sections (need 5-12)`);
  }
  return plan;
}

async function generateSections(request, plan) {
  const sections = [];
  const batchSize = 3;
  for (let i = 0; i < plan.sections.length; i += batchSize) {
    const batch = plan.sections.slice(i, i + batchSize);
    const result = await callLLMJson(
      `You are the course writer for Learnor. Write the body of each requested section as Markdown.
${DESIGN_RULES}
Respond with ONLY JSON: { "sections": [{ "heading": "exact heading given", "body": "markdown" }] }
Each body should be roughly 250-600 words plus examples/code. Do not repeat the heading inside the body.`,
      `${briefContext(request)}

Course title: ${plan.title}
Full outline (for continuity — do NOT cover other sections' material): ${plan.sections.map((s, idx) => `${idx + 1}. ${s.heading}`).join('; ')}

Write ONLY these sections now:
${batch.map((s) => `- "${s.heading}" — intent: ${s.intent}`).join('\n')}`,
      8192,
    );
    const written = Array.isArray(result.sections) ? result.sections : [];
    for (const planned of batch) {
      const match = written.find((w) => w.heading === planned.heading) || written[batch.indexOf(planned)];
      if (!match?.body || String(match.body).trim().length < 300) {
        throw new Error(`Section "${planned.heading}" came back empty or too thin`);
      }
      sections.push({ heading: planned.heading, intent: planned.intent, body: String(match.body).trim() });
    }
  }
  return sections;
}

async function generateAssessments(request, plan, sections) {
  const result = await callLLMJson(
    `You write the Quiz and Exercises tabs for a Learnor course. Everything must be answerable purely from the course content provided. Respond with ONLY JSON:
{
  "quiz": [{ "q": "…", "options": ["…","…","…","…"], "correct": 0, "why": "one-line rationale" }],
  "exercises": [{ "title": "…", "task": "markdown: a hands-on task the reader does on their own machine", "solution": "markdown: full worked solution" }]
}
Quiz: exactly ${plan.quizCount || 8} questions, 4 options each, "correct" is the 0-based index. Exercises: exactly ${plan.exerciseCount || 3}, each with a complete worked solution.`,
    `Course: ${plan.title}
${briefContext(request)}

Course content:
${sections.map((s) => `## ${s.heading}\n${s.body}`).join('\n\n').slice(0, 42000)}`,
    8192,
  );
  return { quiz: result.quiz, exercises: result.exercises };
}

function verifyStructure(plan, content) {
  const problems = [];
  if (!content.title) problems.push('missing title');
  const { sections, quiz, exercises } = content;
  if (!Array.isArray(sections) || sections.length < 5 || sections.length > 12) {
    problems.push(`bad section count (${sections?.length ?? 0})`);
  }
  (sections || []).forEach((s, i) => {
    if (!s.heading || !s.body || s.body.length < 300) problems.push(`section ${i + 1} too thin`);
  });
  if (!Array.isArray(quiz) || quiz.length < 6 || quiz.length > 10) {
    problems.push(`bad quiz count (${quiz?.length ?? 0})`);
  }
  (quiz || []).forEach((item, i) => {
    const valid = item?.q && Array.isArray(item.options) && item.options.length === 4
      && Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4 && item.why;
    if (!valid) problems.push(`quiz question ${i + 1} malformed`);
  });
  if (!Array.isArray(exercises) || exercises.length < 2 || exercises.length > 4) {
    problems.push(`bad exercise count (${exercises?.length ?? 0})`);
  }
  (exercises || []).forEach((ex, i) => {
    if (!ex?.title || !ex?.task || !ex?.solution) problems.push(`exercise ${i + 1} missing task or solution`);
  });
  return problems;
}

async function factCheck(content) {
  const result = await callLLMJson(
    `You are a skeptical fact-checker reviewing a course before publication. Check every definition, number, date, and claim. Flag ONLY genuine factual errors or dangerously misleading statements — not style. For each problem, rewrite the whole section body with the error fixed (or the shaky claim removed). Respond with ONLY JSON:
{ "ok": true/false, "corrections": [{ "index": 0-based section index, "body": "full corrected markdown body" }], "notes": "one line" }`,
    content.sections.map((s, i) => `[${i}] ${s.heading}\n${s.body}`).join('\n\n').slice(0, 48000),
    8192,
    0.2,
  );
  const corrections = Array.isArray(result.corrections) ? result.corrections : [];
  for (const fix of corrections) {
    const idx = Number(fix.index);
    if (Number.isInteger(idx) && content.sections[idx] && String(fix.body || '').length >= 300) {
      content.sections[idx].body = String(fix.body).trim();
    }
  }
  return { corrected: corrections.length, notes: result.notes || '' };
}

async function expectationsFit(request, content) {
  if (!request.expectations) return { fit: true, reason: 'no explicit expectations recorded' };
  const result = await callLLMJson(
    `You are the final gate before a course goes to human review. The requester defined what "done well" means to them. Judge honestly whether this course actually delivers that. Respond with ONLY JSON: { "fit": true/false, "reason": "one sentence" }`,
    `Requester's definition of success: ${request.expectations}
Level: ${request.level || 'unspecified'}
Brief: ${JSON.stringify(request.brief || {})}

Course "${content.title}" — sections: ${content.sections.map((s) => s.heading).join('; ')}

Content:
${content.sections.map((s) => s.body).join('\n\n').slice(0, 30000)}`,
    600,
    0.2,
  );
  return { fit: result.fit !== false, reason: result.reason || '' };
}

async function buildCourse(request) {
  const plan = await planCourse(request);
  const sections = await generateSections(request, plan);
  const { quiz, exercises } = await generateAssessments(request, plan, sections);

  const content = {
    title: plan.title,
    summary: plan.summary || '',
    subject: plan.subject || request.topic,
    category: plan.category || request.category || 'Other',
    level: request.level || 'beginner',
    sections,
    quiz,
    exercises,
  };

  const structural = verifyStructure(plan, content);
  if (structural.length) throw new Error(`Verification (structural): ${structural.join('; ')}`);

  const facts = await factCheck(content);
  const fit = await expectationsFit(request, content);
  if (!fit.fit) throw new Error(`Verification (expectations-fit): ${fit.reason}`);

  return { content, verification: { structural: 'pass', factCorrections: facts.corrected, factNotes: facts.notes, expectationsFit: fit.reason || 'pass' } };
}

// ── Review email ──────────────────────────────────────────────────────────────

function reviewEmailHtml(request, content, previewUrl) {
  const approveUrl = `${SITE_URL}/api/learnor/review/action?id=${request.id}&action=approve&sig=${signAction(request.id, 'approve')}`;
  const changesUrl = `${SITE_URL}/api/learnor/review/action?id=${request.id}&action=changes&sig=${signAction(request.id, 'changes')}`;
  const stats = courseStats(content);
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1510">
    <h2 style="font-weight:400">🔍 Review needed — “${escapeHtml(request.topic)}”</h2>
    <p>Built a course from <b>${escapeHtml(request.requester_email)}</b>'s request. Ready for your eyes before it goes live.</p>
    <p><b>Preview:</b> <a href="${previewUrl}">${previewUrl}</a></p>
    <p><b>They wanted:</b> ${escapeHtml(request.expectations || '(no explicit expectations — see brief)')}</p>
    <p><b>What I built:</b> ${escapeHtml(content.summary || content.title)} — ${stats.sections} sections, ${stats.quiz}-question quiz, ${stats.exercises} exercises. Level: ${escapeHtml(request.level || 'unspecified')}.</p>
    <p style="margin-top:28px">
      <a href="${approveUrl}" style="background:#1a1510;color:#faf7f0;padding:12px 22px;text-decoration:none;letter-spacing:0.1em;font-family:monospace;font-size:12px">APPROVE &amp; PUBLISH</a>
      &nbsp;&nbsp;
      <a href="${changesUrl}" style="border:1px solid #1a1510;color:#1a1510;padding:12px 22px;text-decoration:none;letter-spacing:0.1em;font-family:monospace;font-size:12px">REQUEST CHANGES</a>
    </p>
    <p style="color:#6b6458;font-size:13px">Or review everything at ${SITE_URL}/admin/review</p>
  </div>`;
}

function readyEmailHtml(request, liveUrl) {
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1510">
    <h2 style="font-weight:400">Your “${escapeHtml(request.topic)}” course is live 🎉</h2>
    <p>Hey — you asked Learnor to teach you <b>${escapeHtml(request.topic)}</b>, so I built it. It's ready:</p>
    <p><a href="${liveUrl}" style="font-size:18px">${liveUrl}</a></p>
    <p>This course was built entirely for <i>you</i>. If you think others would want it too, we can put it on the marketplace and both earn — <b>you keep 60%, we take 40%.</b> I'd rather keep you happy than squeeze margins. Optional; reply “list it” and it goes up under your name.</p>
    <p>Happy reading (twice as fast as watching, promise).<br>— Learnor</p>
  </div>`;
}

// ── Worker state (loop guardrail) ─────────────────────────────────────────────

let consecutiveFailures = 0;

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// Health / queue counts — used by learnor-worker.sh to decide whether to run a pass.
router.get('/health', async (_req, res) => {
  const configured = { supabase: !!SERVICE_KEY, gemini: !!process.env.GEMINI_API_KEY, email: !!RESEND_API_KEY, adminToken: !!ADMIN_TOKEN };
  try {
    const rows = await sbSelect('course_requests', 'select=status');
    const counts = {};
    for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
    res.json({
      ok: true,
      configured,
      counts,
      buildable: (counts.pending || 0) + (counts.changes_requested || 0),
      haltedAfterConsecutiveFailures: consecutiveFailures >= 3,
    });
  } catch (err) {
    res.json({ ok: false, configured, buildable: 0, error: err.message });
  }
});

// ── INTAKE — the guided conversation that produces a clean brief ─────────────

router.post('/intake', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const transcript = messages
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .slice(-16)
    .map((m) => `${m.who === 'user' ? 'LEARNER' : 'LEARNOR'}: ${m.text.trim()}`)
    .join('\n');
  if (!transcript) return res.status(400).json({ error: 'messages required' });

  try {
    const result = await callLLMJson(
      `You are the Learnor intake AI. Your ONLY job is to understand what this person wants to learn well enough to write a clean course brief. Keep the conversation tight — 3 to 5 exchanges total, one question at a time, never an interrogation.

Cover, in order (skip anything they already answered):
1. The raw topic (they usually open with it).
2. Scope + intent: what they actually want out of it and why (a job, a project, curiosity, an exam).
3. Starting level: total beginner / know a bit / already comfortable.
4. Shape of "done": what should they be able to DO after? How deep, any format leanings (more examples? more hands-on? conceptual?).
5. Then REFLECT BACK a one-paragraph understanding ("So you want X, coming in at level Y, and you'll feel this landed if you can Z. Right?") and let them confirm or correct it.

Only after they confirm your reflection, finish.

ALWAYS respond with ONLY JSON, one of:
While still talking: { "done": false, "reply": "your next message (warm, short, ONE question max)" }
When finished: {
  "done": true,
  "reply": "Got it — Claude understands what you're after. It'll build your course, then it goes through a quick human review, and you'll get an email when it's live.",
  "topic": "clean, specific course title",
  "brief": { "scope": "…", "subtopics": ["…"], "exclude": ["…"], "angle": "…" },
  "expectations": "their own definition of success, cleaned up, in their words",
  "level": "beginner" | "some" | "advanced",
  "metadata": { "goal": "…", "useCase": "…", "depth": "…", "formatPrefs": "…", "timeBudget": "…" }
}`,
      `Conversation so far:\n${transcript}\n\nRespond with the JSON for your next turn.`,
      2000,
      0.7,
    );
    res.json({
      done: result.done === true,
      reply: String(result.reply || '').trim() || 'Tell me a bit more about what you want to learn.',
      request: result.done === true ? {
        topic: result.topic,
        brief: result.brief,
        expectations: result.expectations,
        level: result.level,
        metadata: result.metadata,
      } : null,
    });
  } catch (err) {
    console.error('[learnor:intake]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Insert the request row once intake completed and we have an email.
router.post('/request', async (req, res) => {
  const { topic, brief, expectations, level, metadata, requesterEmail } = req.body || {};
  const email = String(requesterEmail || '').trim().toLowerCase();
  if (!topic || typeof topic !== 'string') return res.status(400).json({ error: 'topic required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'valid email required' });

  try {
    const row = await sbInsert('course_requests', {
      topic: topic.trim().slice(0, 200),
      brief: brief ?? null,
      expectations: typeof expectations === 'string' ? expectations.slice(0, 2000) : null,
      level: typeof level === 'string' ? level.slice(0, 40) : null,
      metadata: metadata ?? null,
      requester_email: email,
      status: 'pending',
      built_by: 'auto',
    });
    res.json({ ok: true, id: row.id });
  } catch (err) {
    console.error('[learnor:request]', err.message);
    res.status(500).json({ error: 'Could not save your request. Try again in a minute.' });
  }
});

// ── The shelf ────────────────────────────────────────────────────────────────

router.get('/shelf', async (_req, res) => {
  try {
    const rows = await sbSelect(
      'courses',
      'published_at=not.is.null&select=slug,title,category,subject,level,published_at,is_marketplace,content&order=published_at.desc',
    );
    res.json(rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      category: row.category,
      subject: row.subject,
      level: row.level,
      publishedAt: row.published_at,
      stats: courseStats(row.content),
      summary: row.content?.summary || '',
    })));
  } catch (err) {
    console.error('[learnor:shelf]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Full course content. Published → public. Unpublished → requires ?key=<preview_token>.
router.get('/course/:slug', async (req, res) => {
  try {
    const rows = await sbSelect(
      'courses',
      `slug=eq.${encodeURIComponent(req.params.slug)}&select=slug,title,category,subject,level,published_at,preview_token,content&limit=1`,
    );
    const course = rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const published = !!course.published_at;
    if (!published && (!req.query.key || req.query.key !== course.preview_token)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({
      slug: course.slug,
      title: course.title,
      category: course.category,
      subject: course.subject,
      level: course.level,
      published,
      publishedAt: course.published_at,
      content: course.content,
    });
  } catch (err) {
    console.error('[learnor:course]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Highlight-to-ask: answer a question about a selected passage, in course context.
router.post('/ask', async (req, res) => {
  const { slug, key, selection, question } = req.body || {};
  if (!slug || !selection) return res.status(400).json({ error: 'slug and selection required' });
  try {
    const rows = await sbSelect(
      'courses',
      `slug=eq.${encodeURIComponent(String(slug))}&select=title,subject,published_at,preview_token,content&limit=1`,
    );
    const course = rows[0];
    if (!course || (!course.published_at && key !== course.preview_token)) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const sel = String(selection).slice(0, 1500);
    const context = (course.content?.sections || [])
      .filter((s) => s.body?.includes(sel.slice(0, 80)))
      .map((s) => `## ${s.heading}\n${s.body}`)
      .join('\n\n')
      .slice(0, 12000)
      || (course.content?.sections || []).map((s) => `## ${s.heading}`).join('\n');

    const answer = await callLLM(
      `You are Learnor's in-course tutor. The learner highlighted a passage in the course "${course.title}" (${course.subject}) and asked about it. Answer in plain, warm prose — 2 to 5 sentences, a short code snippet only if it genuinely helps. Stay grounded in the course content provided.`,
      `Highlighted passage:\n"""${sel}"""\n\nTheir question: ${String(question || 'Explain this to me.').slice(0, 500)}\n\nRelevant course content:\n${context}`,
      900,
      0.5,
    );
    res.json({ answer: answer.trim() });
  } catch (err) {
    console.error('[learnor:ask]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── THE LOOP — one worker pass: claim → build → verify → stage for review ────

router.post('/worker/pass', requireWorker, async (req, res) => {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY not configured' });
  if (consecutiveFailures >= 3 && !req.body?.resume) {
    return res.status(423).json({
      status: 'halted',
      error: '3 consecutive build failures — loop halted. Investigate, then pass {"resume": true} to continue.',
    });
  }

  try {
    // Reset crashed builds (building > 30 min) back to pending.
    const staleCutoff = new Date(Date.now() - STALE_BUILDING_MINUTES * 60000).toISOString();
    await sbPatch(
      'course_requests',
      `status=eq.building&updated_at=lt.${encodeURIComponent(staleCutoff)}`,
      { status: 'pending', updated_at: new Date().toISOString() },
    );

    // 1. CLAIM — oldest pending/changes_requested.
    const candidates = await sbSelect(
      'course_requests',
      'status=in.(pending,changes_requested)&select=*&order=created_at.asc&limit=1',
    );
    if (!candidates.length) return res.json({ status: 'queue_empty' });
    const request = candidates[0];
    const claimed = await sbPatch(
      'course_requests',
      `id=eq.${request.id}&status=eq.${request.status}`,
      { status: 'building', updated_at: new Date().toISOString() },
    );
    if (!claimed.length) return res.json({ status: 'claim_lost', id: request.id });

    // 2. READ THE BRIEF.
    const thinBrief = !request.brief && !request.expectations;
    if (thinBrief && request.built_by !== 'itish') {
      await sbPatch('course_requests', `id=eq.${request.id}`, {
        status: 'needs_clarification',
        error: 'Brief missing or too thin — needs mini-intake or manual brief.',
        updated_at: new Date().toISOString(),
      });
      await sendEmail({
        to: REVIEW_EMAIL,
        subject: `⚠️ Learnor: "${request.topic}" needs clarification`,
        html: `<p>Request <b>${escapeHtml(request.topic)}</b> from ${escapeHtml(request.requester_email)} has no usable brief. Add one in the DB or ask the requester, then set status back to <code>pending</code>.</p>`,
      });
      return res.json({ status: 'needs_clarification', id: request.id, topic: request.topic });
    }
    if (thinBrief) {
      // Catalog row without a brief — synthesize the standard catalog brief.
      request.brief = { scope: 'complete, practical, end-to-end; beginner-friendly but taken all the way to real proficiency' };
      request.expectations = 'A complete end-to-end course that takes a beginner to real working proficiency.';
    }

    // 3-5. PLAN → GENERATE → VERIFY.
    let built;
    try {
      built = await buildCourse(request);
    } catch (err) {
      const attempts = (request.attempts || 0) + 1;
      const failedOut = attempts >= MAX_ATTEMPTS;
      consecutiveFailures += 1;
      await sbPatch('course_requests', `id=eq.${request.id}`, {
        status: failedOut ? 'failed' : 'pending',
        attempts,
        error: String(err.message).slice(0, 1000),
        updated_at: new Date().toISOString(),
      });
      if (failedOut) {
        await sendEmail({
          to: REVIEW_EMAIL,
          subject: `❌ Learnor: "${request.topic}" failed ${MAX_ATTEMPTS} builds`,
          html: `<p><b>${escapeHtml(request.topic)}</b> failed verification ${MAX_ATTEMPTS} times. Last error: ${escapeHtml(err.message)}</p>`,
        });
      }
      return res.json({ status: failedOut ? 'failed' : 'retry_queued', id: request.id, topic: request.topic, attempts, error: err.message });
    }

    // 6. STAGE FOR REVIEW — unlisted preview, review email to Itish. NO publish.
    const { content, verification } = built;
    const isRebuild = request.status === 'changes_requested' && request.slug;
    const slug = isRebuild ? request.slug : await uniqueSlug(slugify(content.title));
    const previewToken = randomBytes(18).toString('hex');
    const previewUrl = `${SITE_URL}/course/${slug}?key=${previewToken}`;

    const existing = await sbSelect('courses', `slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`);
    if (existing.length) {
      await sbPatch('courses', `slug=eq.${encodeURIComponent(slug)}`, {
        title: content.title,
        category: content.category,
        subject: content.subject,
        level: content.level,
        content,
        preview_token: previewToken,
        request_id: request.id,
      });
    } else {
      await sbInsert('courses', {
        slug,
        title: content.title,
        category: content.category,
        subject: content.subject,
        level: content.level,
        content,
        preview_token: previewToken,
        request_id: request.id,
      });
    }

    await sbPatch('course_requests', `id=eq.${request.id}`, {
      status: 'pending_review',
      slug,
      category: content.category,
      preview_url: previewUrl,
      error: null,
      updated_at: new Date().toISOString(),
    });

    const email = await sendEmail({
      to: REVIEW_EMAIL,
      subject: `🔍 Review needed — "${request.topic}" course`,
      html: reviewEmailHtml(request, content, previewUrl),
    });

    consecutiveFailures = 0;
    res.json({
      status: 'pending_review',
      id: request.id,
      topic: request.topic,
      slug,
      previewUrl,
      stats: courseStats(content),
      verification,
      reviewEmailSent: email.sent,
    });
  } catch (err) {
    console.error('[learnor:worker]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── APPROVAL GATE (Itish only) ────────────────────────────────────────────────

async function approveRequest(id) {
  const rows = await sbSelect('course_requests', `id=eq.${id}&select=*&limit=1`);
  const request = rows[0];
  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending_review') throw new Error(`Request is "${request.status}", not pending_review`);
  if (!request.slug) throw new Error('Request has no staged course slug');

  await sbPatch('course_requests', `id=eq.${id}`, { status: 'approved', updated_at: new Date().toISOString() });
  await sbPatch('courses', `slug=eq.${encodeURIComponent(request.slug)}`, { published_at: new Date().toISOString() });
  await sbPatch('course_requests', `id=eq.${id}`, { status: 'published', updated_at: new Date().toISOString() });

  const liveUrl = `${SITE_URL}/course/${request.slug}`;
  let readyEmail = { sent: false, detail: 'catalog course — no requester email' };
  if (request.requester_email && request.requester_email !== CATALOG_EMAIL) {
    readyEmail = await sendEmail({
      to: request.requester_email,
      subject: `Your "${request.topic}" course is live 🎉`,
      html: readyEmailHtml(request, liveUrl),
    });
  }
  return { liveUrl, readyEmail, topic: request.topic };
}

async function requestChanges(id, notes) {
  const rows = await sbSelect('course_requests', `id=eq.${id}&select=id,status&limit=1`);
  const request = rows[0];
  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending_review') throw new Error(`Request is "${request.status}", not pending_review`);
  await sbPatch('course_requests', `id=eq.${id}`, {
    status: 'changes_requested',
    review_notes: String(notes || '').slice(0, 4000),
    updated_at: new Date().toISOString(),
  });
}

router.get('/queue', requireAdmin, async (_req, res) => {
  try {
    const rows = await sbSelect(
      'course_requests',
      'select=id,topic,expectations,level,requester_email,status,slug,category,preview_url,review_notes,attempts,error,built_by,created_at,updated_at&order=updated_at.desc&limit=200',
    );
    res.json({ requests: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/review/:id/approve', requireAdmin, async (req, res) => {
  try {
    res.json({ ok: true, ...(await approveRequest(req.params.id)) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/review/:id/request-changes', requireAdmin, async (req, res) => {
  try {
    await requestChanges(req.params.id, req.body?.notes);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Magic links from the review email (signed — safe to click from the phone).
router.get('/review/action', async (req, res) => {
  const { id, action, sig, notes } = req.query;
  const page = (title, body) => res.send(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;background:#f4f0e8;color:#1a1510;display:grid;place-items:center;min-height:90vh"><div style="max-width:460px;padding:24px"><h2 style="font-weight:400">${title}</h2>${body}</div></body>`,
  );
  if (!id || !action || !verifyAction(String(id), String(action), String(sig || ''))) {
    return res.status(401).send('Invalid or expired review link.');
  }
  try {
    if (action === 'approve') {
      const result = await approveRequest(String(id));
      return page('Approved & published ✓', `<p>“${escapeHtml(result.topic)}” is live: <a href="${result.liveUrl}">${result.liveUrl}</a></p><p>${result.readyEmail.sent ? 'Requester emailed.' : escapeHtml(result.readyEmail.detail || 'Requester not emailed.')}</p>`);
    }
    if (action === 'changes') {
      if (typeof notes !== 'string' || !notes.trim()) {
        return page('Request changes', `
          <form method="GET" action="/api/learnor/review/action">
            <input type="hidden" name="id" value="${escapeHtml(id)}">
            <input type="hidden" name="action" value="changes">
            <input type="hidden" name="sig" value="${escapeHtml(sig)}">
            <textarea name="notes" rows="6" style="width:100%;font-family:inherit;font-size:15px;padding:10px" placeholder="What should change?" required></textarea>
            <button type="submit" style="margin-top:12px;background:#1a1510;color:#faf7f0;border:none;padding:12px 22px;font-family:monospace;letter-spacing:0.1em;cursor:pointer">SEND BACK TO BUILDER</button>
          </form>`);
      }
      await requestChanges(String(id), notes);
      return page('Sent back ✓', '<p>The worker will rebuild around your notes on its next pass. No requester email was sent.</p>');
    }
    return res.status(400).send('Unknown action.');
  } catch (err) {
    return page('Could not complete that', `<p>${escapeHtml(err.message)}</p>`);
  }
});

// Requester replied "list it" → flip marketplace flag (admin applies it).
router.post('/marketplace/:slug', requireAdmin, async (req, res) => {
  try {
    const rows = await sbPatch('courses', `slug=eq.${encodeURIComponent(req.params.slug)}`, {
      is_marketplace: req.body?.listed !== false,
    });
    if (!rows.length) return res.status(404).json({ error: 'Course not found' });
    res.json({ ok: true, isMarketplace: rows[0].is_marketplace });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
