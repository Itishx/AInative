import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'ainative-server-data') : path.join(__dirname, 'server-data');
const COURSES_FILE = path.join(DATA_DIR, 'published-courses.json');

function fallbackObjective(title) {
  return `Understand ${String(title || 'this lesson').toLowerCase()}.`;
}


function stripTutorFormatting(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/It looks like the lesson objective came through as ["']?undefined["']?.*?(?:[.?!]\s+|$)/i, '')
    .replace(/^ai tutor[:\s-]*/i, '')
    .replace(/^\s*---+\s*$/gm, ' ')
    .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*/gm, '')
    .replace(/^\s*(?:#{1,6}\s+|\*\*|\* |- |\d+[.)]\s+)/gm, '')
    .replace(/^\s*(?:WHAT IT IS|WHY IT MATTERS|THE ANALOGY|WORKED EXAMPLE|CHECK-IN QUESTION|HOW IT WORKS|KEY CONCEPT|SUMMARY|OVERVIEW|BACKGROUND|HISTORY)\s*$/gim, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
}

function trimWords(text, maxWords) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || '').trim();
  return `${words.slice(0, maxWords).join(' ')}...`.trim();
}

function isContinueOnly(text) {
  return /^(continue|next|go on|keep going|proceed|move on|ok|okay|k|got it|cool|nice)$/i.test(String(text || '').trim());
}

function hasSubstantiveLearningAnswer(text) {
  const value = String(text || '').trim();
  if (!value || isContinueOnly(value)) return false;
  if (/^(yes|no|maybe|idk|i don't know|dont know|not sure|no idea)$/i.test(value)) return false;
  const words = value.split(/\s+/).filter(Boolean);
  return words.length >= 4 || /[=(){};]|\b(select|from|where|because|means|represents|example|table|row|column|function|variable)\b/i.test(value);
}

function stripPrematureQuizLanguage(text) {
  return String(text || '')
    .replace(/(?:You're|You are)\s+in\s+good\s+shape\s+with[^.!?]*[.!?]\s*/gi, '')
    .replace(/You\s+can\s+(?:jump into|take|start)\s+the\s+quiz[^.!?]*[.!?]?/gi, '')
    .replace(/(?:take|start)\s+the\s+quiz\s+whenever\s+you're\s+ready[^.!?]*[.!?]?/gi, '')
    .replace(/if\s+you(?:'d| would)\s+like\s+one\s+more\s+concrete\s+example[^.!?]*[.!?]?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function lessonHasHandsOnMaterial(text) {
  const value = String(text || '').toLowerCase();
  return (
    /```/.test(value) ||
    /\b(select|insert|update|delete|create table|where|group by|order by|join|from)\b/.test(value) ||
    /\b(write|run|execute|debug|fix|edit|upload|calculate|build|implement|install|command|terminal|query|code)\b/.test(value)
  );
}

function practicalExerciseIsFair(exercise, taughtContent) {
  const text = `${exercise?.title || ''} ${exercise?.task || ''} ${exercise?.deliverable || ''} ${exercise?.submissionHint || ''}`.toLowerCase();
  const taught = String(taughtContent || '').toLowerCase();
  if (!text.trim()) return false;
  if (!lessonHasHandsOnMaterial(taught)) return false;

  const asksUnsupportedDesign =
    /\b(design|invent|create a new|topic of your choice|made-up data|from scratch)\b/.test(text) &&
    !/\bcreate table|schema|columns|rows|record\b/.test(taught);

  const asksUntaughtSql =
    /\b(sql|query|select|where|join|group by|order by|insert|update|delete)\b/.test(text) &&
    !/\b(select|where|join|group by|order by|insert|update|delete|query)\b/.test(taught);

  return !asksUnsupportedDesign && !asksUntaughtSql;
}

function buildOpeningTutorReply({ lessonTitle, lessonObjective, conceptDescription, conceptFacts }) {
  const descriptionSentences = splitSentences(conceptDescription).filter((sentence) => !sentence.endsWith('?'));
  const objectiveSentence = splitSentences(lessonObjective).find((sentence) => !sentence.endsWith('?'));
  const factSentence = splitSentences(Array.isArray(conceptFacts) ? conceptFacts[0] : '').find((sentence) => !sentence.endsWith('?'));
  const first = descriptionSentences[0] || objectiveSentence || `${lessonTitle} is the next concept in this lesson.`;
  const second = descriptionSentences[1] || factSentence || `For now, just focus on the main idea behind ${lessonTitle}; we will build from there one step at a time.`;

  return {
    text: trimWords(`${first} ${second}`, 90),
    readyToMoveOn: false,
    askedQuestion: false,
    confidenceSignal: 'medium',
    anchorSentence: null,
  };
}

function normalizeTutorReply(text, { currentPhase, isOpening, allowQuestion }) {
  const raw = stripTutorFormatting(text);
  if (!raw) return '';

  if (currentPhase === 'CHECK') {
    return trimWords(raw.replace(/\n{3,}/g, '\n\n'), 95);
  }

  const hasStructuredExample = /```|^\s*\|.+\|\s*$/m.test(String(text || ''));
  if (!isOpening && hasStructuredExample && raw.split(/\s+/).filter(Boolean).length <= 130) {
    return raw;
  }

  const sentences = splitSentences(raw);
  const explainers = sentences.filter((sentence) => !sentence.endsWith('?')).slice(0, isOpening ? 3 : 4);
  const question = allowQuestion ? sentences.find((sentence) => sentence.endsWith('?')) : '';
  const paragraphs = [];

  if (explainers.length > 0) {
    paragraphs.push(explainers.slice(0, 2).join(' '));
  }
  if (explainers.length > 2) {
    paragraphs.push(explainers.slice(2).join(' '));
  }
  if (question) {
    paragraphs.push(question);
  }

  const compacted = paragraphs.filter(Boolean).join('\n\n').trim();
  return trimWords(compacted || raw.replace(/\?+/g, '.'), isOpening ? 90 : 135);
}

function safeParseTutorPayload(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/g, '')
    .trim();

  if (!cleaned) {
    return { text: '', readyToMoveOn: false, askedQuestion: false };
  }

  try {
    return JSON.parse(cleaned);
  } catch {}

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  // Truncated JSON — text field present with closing quote
  const textMatch = cleaned.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (textMatch) {
    return {
      text: textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      readyToMoveOn: false,
      askedQuestion: false,
    };
  }

  // Truncated JSON — text field cut off mid-string (no closing quote)
  const unclosedMatch = cleaned.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (unclosedMatch && unclosedMatch[1]) {
    const partial = unclosedMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    // Keep only complete sentences so it doesn't end mid-word
    const lastComplete = partial.match(/^([\s\S]*[.!?])\s*/);
    return {
      text: lastComplete ? lastComplete[1].trim() : partial,
      readyToMoveOn: false,
      askedQuestion: false,
    };
  }

  // Only fall back to raw if it doesn't look like broken JSON
  if (!cleaned.startsWith('{')) {
    return { text: cleaned, readyToMoveOn: false, askedQuestion: /\?\s*$/.test(cleaned) };
  }

  return { text: '', readyToMoveOn: false, askedQuestion: false };
}

function buildTutorFallbackReply({
  lessonTitle,
  lessonObjective,
  conceptDescription,
  conceptFacts,
  currentPhase,
  isOpening,
  allowQuestion,
}) {
  const descriptionSentence = splitSentences(conceptDescription)[0] || splitSentences(lessonObjective)[0] || `This lesson is about ${lessonTitle}.`;
  const factSentence = splitSentences(Array.isArray(conceptFacts) ? conceptFacts[0] : '')[0] || '';

  if (isOpening || currentPhase === 'HOOK') {
    return buildOpeningTutorReply({ lessonTitle, lessonObjective, conceptDescription, conceptFacts });
  }

  if (currentPhase === 'CHECK') {
    return {
      text: `Quick check: in one short sentence, what is the main job of ${lessonTitle}?`,
      readyToMoveOn: false,
      askedQuestion: true,
      confidenceSignal: 'medium',
      anchorSentence: null,
    };
  }

  if (currentPhase === 'REINFORCE') {
    return {
      text: trimWords(`${descriptionSentence} ${factSentence}`.trim() || `The key point is ${lessonTitle}.`, 55),
      readyToMoveOn: false,
      askedQuestion: false,
      confidenceSignal: 'low',
      anchorSentence: null,
    };
  }

  const parts = [descriptionSentence];
  if (factSentence && !descriptionSentence.includes(factSentence)) {
    parts.push(factSentence);
  }
  if (!isOpening && allowQuestion) {
    parts.push('What part of that feels clear already?');
  }

  return {
    text: normalizeTutorReply(parts.join(' '), { currentPhase, isOpening, allowQuestion }),
    readyToMoveOn: false,
    askedQuestion: !isOpening && allowQuestion,
    confidenceSignal: allowQuestion ? 'medium' : 'low',
    anchorSentence: null,
  };
}



async function runCheckerAgent({ lessonTitle, lessonObjective, chatMessages }) {
  try {
    const historyText = (Array.isArray(chatMessages) ? chatMessages : [])
      .filter((m) => m.who === 'user' || m.who === 'tutor')
      .slice(-12)
      .map((m) => `${m.who === 'user' ? 'STUDENT' : 'TUTOR'}: ${String(m.text || '').trim()}`)
      .join('\n');

    const text = await callGemini(
      'You are a learning quality checker. Respond ONLY with valid JSON, no markdown.',
      [{
        role: 'user',
        content: [{ type: 'text', text: `Lesson: "${lessonTitle}"
Objective: "${lessonObjective}"

Chat:
${historyText}

Did the student demonstrate genuine understanding — answered a question correctly, explained something in their own words, or showed applied knowledge? Saying "got it", "okay", "next", "continue", "i get it", or "you may continue" does NOT count.

{"approved":true/false}` }],
      }],
      80,
    );

    const result = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''));
    return !!result.approved;
  } catch {
    return false;
  }
}

function repairCurriculumJson(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/g, '')
    .trim();

  try { return JSON.parse(cleaned); } catch {}

  // Walk char-by-char tracking depth so we can truncate at the last complete lesson
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastLessonClosePos = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      // depth 4 after a '}' means we just closed a lesson object (was depth 5)
      if (depth === 4 && ch === '}') lastLessonClosePos = i;
    }
  }

  if (lastLessonClosePos >= 0) {
    // Stack at this point: root{ modules[ module{ lessons[ — close them all
    try { return JSON.parse(cleaned.slice(0, lastLessonClosePos + 1) + ']}]}'); } catch {}
  }

  return null;
}

// Parses raw Udemy page innerText into { title, level, estimatedHours, modules }
// Heuristic: a text line followed by a timestamp (M:SS / MM:SS / H:MM:SS) is a lecture
function parseUdemyText(rawText) {
  const courseStart = rawText.indexOf('Course content');
  if (courseStart === -1) return null;

  const text = rawText.slice(courseStart);
  const allLines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const isTimestamp = (s) => /^\d{1,2}:\d{2}(:\d{2})?$/.test(s);

  const isSkip = (s) =>
    s === 'Course content' ||
    s === 'Expand all sections' ||
    s === 'Collapse all sections' ||
    /^\d+\s*sections?\s*[•·]\s*\d+\s*lectures?/.test(s) ||
    /^\d+\s*lectures?\s*[•·]/.test(s) ||
    /^\d+h\s+\d+m/.test(s) ||
    /^(Preview|New|Quiz|Article)$/i.test(s) ||
    isTimestamp(s) ||
    s.length < 2;

  const modules = [];
  let currentModule = null;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (isSkip(line)) continue;

    // Look ahead up to 3 lines for a timestamp (skips "Preview", "New", etc.)
    let tsIdx = -1;
    for (let j = i + 1; j <= i + 3 && j < allLines.length; j++) {
      if (isTimestamp(allLines[j])) { tsIdx = j; break; }
      if (!isSkip(allLines[j])) break; // hit a real line before timestamp → section header
    }

    if (tsIdx !== -1) {
      if (!currentModule) {
        currentModule = { title: 'Introduction', lessons: [] };
        modules.push(currentModule);
      }
      const tsParts = allLines[tsIdx].split(':');
      let minutes = 0;
      if (tsParts.length === 3) {
        minutes = parseInt(tsParts[0]) * 60 + parseInt(tsParts[1]);
      } else {
        minutes = parseInt(tsParts[0]);
      }
      currentModule.lessons.push({
        title: line,
        objective: `Understand ${line}`,
        minutes: Math.max(1, minutes),
      });
      i = tsIdx;
    } else {
      // Section header
      currentModule = { title: line, lessons: [] };
      modules.push(currentModule);
    }
  }

  const filtered = modules.filter((m) => m.lessons.length > 0);
  if (filtered.length < 1) return null;

  const metaLine = allLines.find((l) => /\d+h\s+\d+m/.test(l));
  const hoursMatch = metaLine?.match(/(\d+)h\s+(\d+)m/);
  const estimatedHours = hoursMatch
    ? parseInt(hoursMatch[1]) + Math.round(parseInt(hoursMatch[2]) / 60)
    : Math.round(filtered.reduce((s, m) => s + m.lessons.reduce((a, l) => a + l.minutes, 0), 0) / 60);

  return {
    title: 'Udemy Course',
    level: 'intermediate',
    estimatedHours: Math.max(1, estimatedHours),
    modules: filtered,
  };
}

// Like normalizeCurriculum but preserves actual minutes (Udemy lectures can be 30+ min)
function normalizeUdemyCurriculum(curriculum) {
  if (!curriculum || !Array.isArray(curriculum.modules)) return curriculum;
  let totalMinutes = 0;
  const modules = curriculum.modules.map((module) => ({
    ...module,
    lessons: Array.isArray(module.lessons)
      ? module.lessons.map((lesson) => {
          const mins = Math.max(1, Number(lesson.minutes) || 1);
          totalMinutes += mins;
          return { ...lesson, objective: lesson.objective || fallbackObjective(lesson.title), minutes: mins };
        })
      : [],
  }));
  return {
    ...curriculum,
    estimatedHours: Number(Math.max(0.1, totalMinutes / 60).toFixed(1)),
    modules,
  };
}

function normalizeCurriculum(curriculum) {
  if (!curriculum || !Array.isArray(curriculum.modules)) return curriculum;
  let totalMinutes = 0;
  const modules = curriculum.modules.map((module) => ({
    ...module,
    lessons: Array.isArray(module.lessons)
      ? module.lessons.map((lesson) => {
          const rawMinutes = Number(lesson.minutes);
          const minutes = Math.min(5, Math.max(2, Number.isFinite(rawMinutes) ? Math.round(rawMinutes) : 3));
          totalMinutes += minutes;
          return {
            ...lesson,
            objective: lesson.objective || fallbackObjective(lesson.title),
            minutes,
          };
        })
      : [],
  }));

  return {
    ...curriculum,
    estimatedHours: Number(Math.max(0.1, totalMinutes / 60).toFixed(1)),
    modules,
  };
}

const GEMINI_MODEL = 'gemini-3-flash-preview';

async function callGemini(systemPrompt, messages, maxTokens = 900, disableThinking = false) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  // Gemini requires alternating user/model turns, starting with user
  const contents = messages
    .filter((m) => m?.content?.[0]?.text?.trim())
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content[0].text }],
    }));

  // Ensure starts with user
  if (!contents.length || contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Begin.' }] });
  }

  const generationConfig = {
    maxOutputTokens: maxTokens,
    temperature: 0.7,
  };
  if (disableThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig,
  };

  const fetchOnce = () => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let res = await fetchOnce();
  let data = await res.json();

  // Auto-retry once on 429 using the delay Gemini provides
  if (res.status === 429) {
    const retryDetail = data?.error?.details?.find((d) => d?.retryDelay);
    const delaySec = retryDetail?.retryDelay
      ? parseFloat(String(retryDetail.retryDelay)) || 20
      : 20;
    await new Promise((r) => setTimeout(r, (delaySec + 1) * 1000));
    res = await fetchOnce();
    data = await res.json();
  }

  if (!res.ok) throw new Error(data.error?.message || `Gemini error ${res.status}`);
  // Filter out thought parts (internal reasoning) — only keep actual output parts
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('');
}

function buildTutorApiMessages(messages, starterText) {
  const cleaned = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.who === 'user' || m.who === 'tutor'))
    .map((m) => {
      const text = String(m.text ?? '').trim();
      if (!text) return null;
      // Include visual in tutor messages so the AI knows what's on the canvas
      const visualNote = m.who === 'tutor' && m.visual
        ? `\n[Canvas showed: ${String(m.visual).slice(0, 800)}]`
        : '';
      return {
        role: m.who === 'user' ? 'user' : 'assistant',
        content: [{ type: 'text', text: text + visualNote }],
      };
    })
    .filter(Boolean);

  if (!cleaned.length || cleaned[0].role !== 'user') {
    return [{
      role: 'user',
      content: [{ type: 'text', text: starterText }],
    }, ...cleaned];
  }

  return cleaned;
}

function readCourses() {
  try {
    return JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8')).map((course) => ({
      ...course,
      curriculum: normalizeCurriculum(course.curriculum),
    }));
  } catch { return []; }
}
function writeCourses(courses) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2));
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

dotenv.config();

const ALLOWED_ORIGINS = [
  'https://a-inative.vercel.app',
  /\.vercel\.app$/,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(null, allowed || true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

const app = express();
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (_, res) => res.json({
  ok: true,
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
  hasElevenLabsVoice: !!process.env.ELEVENLABS_VOICE_ID,
}));

app.get('/api/tts', (_, res) => res.json({
  ok: true,
  method: 'POST required for audio generation',
  hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
  hasElevenLabsVoice: !!process.env.ELEVENLABS_VOICE_ID,
}));

app.post('/api/tts', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const text = String(req.body?.text || '').replace(/\s+/g, ' ').trim().slice(0, 1200);

  if (!apiKey || !voiceId) {
    return res.status(500).json({ error: 'ElevenLabs env vars are not configured.' });
  }
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.82,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let detail = errorText || String(response.status);
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed?.detail?.message || parsed?.detail?.status || parsed?.message || errorText;
      } catch { /* keep raw ElevenLabs text */ }
      console.error('[tts:elevenlabs]', response.status, detail);
      return res.status(response.status).json({
        error: `ElevenLabs TTS failed: ${detail}`,
        status: response.status,
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(audio);
  } catch (err) {
    console.error('[tts]', err.message);
    res.status(500).json({ error: 'Could not generate voice audio.' });
  }
});

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ');
}

function extractReadableText(html) {
  return decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(raw) {
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

async function fetchReadableUrl(url, timeoutMs = 7000) {
  const safeUrl = normalizeUrl(url);
  if (!safeUrl) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LearnorResearchBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) return '';
    const contentType = response.headers.get('content-type') || '';
    if (!/text|html|json|xml/i.test(contentType)) return '';
    return extractReadableText(await response.text()).slice(0, 9000);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function searchWithTavily(topic) {
  if (!process.env.TAVILY_API_KEY) return [];
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `${topic} tutorial fundamentals practical examples`,
      search_depth: 'basic',
      max_results: 8,
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!response.ok) throw new Error(`Tavily search failed: ${response.status}`);
  const data = await response.json();
  return (data.results || [])
    .map((result) => ({
      title: result.title || result.url,
      url: normalizeUrl(result.url),
      snippet: result.content || '',
    }))
    .filter((result) => result.url);
}

async function searchWithDuckDuckGo(topic) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${topic} tutorial fundamentals examples`)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LearnorResearchBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,*/*',
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const matches = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set();
  return matches
    .map((match) => {
      let href = decodeHtmlEntities(match[1]);
      try {
        const parsed = new URL(href, 'https://duckduckgo.com');
        const uddg = parsed.searchParams.get('uddg');
        if (uddg) href = decodeURIComponent(uddg);
      } catch { /* keep raw href */ }
      const safeUrl = normalizeUrl(href);
      const title = extractReadableText(match[2]).slice(0, 140) || safeUrl;
      return { title, url: safeUrl, snippet: '' };
    })
    .filter((result) => {
      if (!result.url || seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    })
    .slice(0, 8);
}

async function researchTopic(topic) {
  if (process.env.ENABLE_WEB_RESEARCH === 'false') {
    return { materialsContext: '', sources: [], status: 'disabled' };
  }

  let candidates = [];
  try {
    candidates = await searchWithTavily(topic);
  } catch (err) {
    console.warn('[research:tavily]', err.message);
  }
  if (candidates.length === 0) {
    try {
      candidates = await searchWithDuckDuckGo(topic);
    } catch (err) {
      console.warn('[research:ddg]', err.message);
    }
  }

  const picked = [];
  const seenHosts = new Set();
  for (const candidate of candidates) {
    if (picked.length >= 6) break;
    try {
      const host = new URL(candidate.url).hostname.replace(/^www\./, '');
      if (seenHosts.has(host)) continue;
      seenHosts.add(host);
    } catch { /* ignore host dedupe */ }
    picked.push(candidate);
  }

  const sources = [];
  for (const candidate of picked) {
    const pageText = await fetchReadableUrl(candidate.url);
    const combined = [candidate.snippet, pageText].filter(Boolean).join('\n').trim();
    if (combined.length < 250) continue;
    sources.push({
      title: candidate.title,
      url: candidate.url,
      text: combined.slice(0, 5000),
    });
  }

  if (sources.length === 0) {
    return { materialsContext: '', sources: [], status: 'empty' };
  }

  let synthesis = '';
  try {
    synthesis = await callGemini(
      'You are a research librarian for an educational product. Extract only useful, source-grounded teaching material. No markdown table. No invented facts.',
      [{
        role: 'user',
        content: [{ type: 'text', text: `Topic: ${topic}

Create a compact teaching research pack from these sources. Include:
- core concepts that must be taught
- prerequisite concepts
- common beginner mistakes
- practical examples or exercises if present in the sources
- vocabulary/definitions

Only use the provided sources. If sources disagree or are thin, say so.

SOURCES:
${sources.map((source, index) => `[${index + 1}] ${source.title}
${source.url}
${source.text}`).join('\n\n---\n\n')}` }],
      }],
      2600,
    );
    synthesis = synthesis.trim();
  } catch (err) {
    console.warn('[research:synthesis]', err.message);
  }

  const sourcePack = sources.map((source, index) => (
    `[${index + 1}] ${source.title}\nURL: ${source.url}\nEXCERPT: ${trimWords(source.text, 260)}`
  )).join('\n\n');

  return {
    status: 'ok',
    sources: sources.map(({ title, url }) => ({ title, url })),
    materialsContext: [
      `WEB RESEARCH PACK FOR: ${topic}`,
      `Generated at: ${new Date().toISOString()}`,
      synthesis ? `SYNTHESIZED NOTES:\n${synthesis}` : '',
      `SOURCE EXCERPTS:\n${sourcePack}`,
    ].filter(Boolean).join('\n\n---\n\n').slice(0, 18000),
  };
}

// ── Generate curriculum ──────────────────────────────────────────────────────
app.post('/api/curriculum', async (req, res) => {
  const { topic, days } = req.body;
  try {
    const research = await researchTopic(topic);
    const materialsContext = research.materialsContext || '';
    const curriculumPrompt = materialsContext
      ? `Create a learning curriculum for: "${topic}". The student has ${days} days.

Build this curriculum STRICTLY from the researched source pack below. Do not include lessons that are not supported by the pack.
===
${materialsContext.slice(0, 12000)}
===

Return ONLY valid JSON:
{
  "title": "...",
  "level": "beginner|intermediate|advanced",
  "estimatedHours": <number>,
  "modules": [
    {
      "title": "...",
      "lessons": [
        {
          "title": "...",
          "objective": "...",
          "description": "Two sentences max — what this concept is and why it matters.",
          "facts": ["specific source-grounded fact 1", "specific source-grounded fact 2", "specific source-grounded fact 3"],
          "minutes": <number>
        }
      ]
    }
  ]
}
Rules:
- 5–7 modules, 2–4 lessons each. Every lesson must be 2–5 minutes max; choose 2 for simple concepts, 3–4 for normal concepts, 5 only for dense technical concepts.
- Each lesson objective: one sentence describing what the student should understand by the end.
- Each lesson description: exactly 2 sentences — what the concept is + why it matters.
- Each lesson facts array: 3–5 specific facts from the research pack only. Never invent facts.`
      : `Create a learning curriculum for: "${topic}". The student has ${days} days.
Return ONLY valid JSON:
{
  "title": "...",
  "level": "beginner|intermediate|advanced",
  "estimatedHours": <number>,
  "modules": [
    {
      "title": "...",
      "lessons": [
        {
          "title": "...",
          "objective": "...",
          "description": "Two sentences max — what this concept is and why it matters.",
          "facts": ["specific verifiable fact 1", "specific verifiable fact 2", "specific verifiable fact 3"],
          "minutes": <number>
        }
      ]
    }
  ]
}
Rules:
- 5–7 modules, 2–4 lessons each. Every lesson must be 2–5 minutes max; choose 2 for simple concepts, 3–4 for normal concepts, 5 only for dense technical concepts.
- Each lesson objective: one sentence describing what the student should understand by the end.
- Each lesson description: exactly 2 sentences — what the concept is + why it matters.
- Each lesson facts array: 3–5 specific, verifiable facts only. If topic is niche or obscure, include only facts you are highly confident about. Never invent facts.`;
    const text = await callGemini(
      'You are a curriculum designer. Respond ONLY with valid JSON, no markdown fences.',
      [{ role: 'user', content: [{ type: 'text', text: curriculumPrompt }] }],
      8192,
    );
    const parsedCurriculum = repairCurriculumJson(text);
    if (!parsedCurriculum) throw new Error('Could not parse curriculum JSON');
    res.json({
      ...normalizeCurriculum(parsedCurriculum),
      materialsContext,
      researchSources: research.sources || [],
      researchStatus: research.status,
    });
  } catch (err) {
    console.error('[curriculum]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/research-topic', async (req, res) => {
  const { topic } = req.body;
  if (!topic || typeof topic !== 'string') return res.status(400).json({ error: 'topic required' });
  try {
    res.json(await researchTopic(topic));
  } catch (err) {
    console.error('[research-topic]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Generate personalized lesson teaching plan ────────────────────────────────
app.post('/api/lesson-plan', async (req, res) => {
  const { courseTitle, moduleTitle, lessonTitle, lessonObjective, description, facts, priorKnowledge } = req.body;
  try {
    const planMessages = [{
      role: 'user',
      content: [{ type: 'text', text: `You are about to teach a 1-on-1 lesson.

Course: "${courseTitle}"
Module: "${moduleTitle}"
Lesson: "${lessonTitle}"
Objective: "${lessonObjective}"
Description: ${description}
Key facts: ${Array.isArray(facts) ? facts.join('; ') : facts || 'none'}

The student just described their prior experience:
"${priorKnowledge}"

Write a 150-200 word teaching plan for this specific student. Cover:
- What angle to open with given their experience (skip basics if experienced, slow down if beginner)
- The single best hook or first idea to land
- 2-3 steps to build the concept
- One concrete example to use
- What check question to ask them
- One common misconception to watch for

Write as direct instructions to yourself as the tutor, not to the student.` }],
    }];
    const text = await callGemini(
      'You are a teaching strategist. Write a direct, practical lesson plan. No headings, no JSON, just plain guidance.',
      planMessages,
      600,
    );
    res.json({ plan: text.trim() });
  } catch (err) {
    console.error('[lesson-plan]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── AI tutor chat ────────────────────────────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  const { messages, lessonTitle, courseTitle } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set in environment' });
  }

  try {
    const recentMessages = (Array.isArray(messages) ? messages : []).slice(-5);
    const context = recentMessages
      .map((m) => `${m.who === 'tutor' ? 'Tutor' : 'Student'}: ${String(m.text || '').slice(0, 300)}`)
      .join('\n');

    const prompt = `Educational diagram for a learning app. Topic: "${lessonTitle}" (course: "${courseTitle}").

Recent lesson:
${context}

Draw a clean, minimal educational visual illustrating the key concept above.
White background. Simple labels. Textbook-quality technical diagram style — architecture diagram, concept map, or annotated illustration. No people. One accent color maximum.`;

    const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'low',
      }),
    });

    const data = await oaiRes.json();

    if (!oaiRes.ok) {
      const detail = data?.error?.message || JSON.stringify(data);
      console.error('[generate-image]', detail);
      return res.status(500).json({ error: detail });
    }

    const b64 = data.data?.[0]?.b64_json;
    if (b64) return res.json({ image: `data:image/png;base64,${b64}` });

    const url = data.data?.[0]?.url;
    if (url) return res.json({ image: url });

    return res.status(500).json({ error: 'No image in OpenAI response' });
  } catch (err) {
    console.error('[generate-image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const {
    messages,
    courseTitle,
    moduleTitle,
    lessonTitle,
    lessonObjective,
    lessonScope,
    materialsContext,
    lessonPlan,
    phase,
    conceptDescription,
    conceptFacts,
    isOpening,
    allowQuestion,
    wantsVisualExample,
  } = req.body;

  try {
    let currentPhase = phase || 'HOOK';
    const objective = lessonObjective || fallbackObjective(lessonTitle);
    const description = conceptDescription || objective;
    const facts = Array.isArray(conceptFacts) && conceptFacts.length > 0
      ? conceptFacts.join(', ')
      : 'No specific facts provided — teach from high-confidence knowledge only and hedge uncertain claims with "approximately" or "around".';
    const openingTurn = !!isOpening;
    const latestUserText = [...(Array.isArray(messages) ? messages : [])].reverse().find((m) => m?.who === 'user')?.text || '';
    const studentAnswered = hasSubstantiveLearningAnswer(latestUserText);
    if (currentPhase === 'REINFORCE' && !studentAnswered) {
      currentPhase = 'EXPLAIN';
    }
    const visualExampleTurn = !!wantsVisualExample;
    const allowQuestionThisTurn = !openingTurn && !!allowQuestion && currentPhase !== 'HOOK' && currentPhase !== 'REINFORCE';
    const starterText = openingTurn
      ? `Start the lesson "${lessonTitle}". Teach the first tiny idea only.`
      : `Continue the lesson "${lessonTitle}" with one small next step.`;

    const scopeSection = lessonScope ? `\n\nCourse scope — do not teach these future topics: ${(lessonScope.futureLessonTitles || []).slice(0, 8).join(', ') || 'none'}.` : '';
    const materialsSection = materialsContext
      ? `\n\n━━━ LOCKED COURSE KNOWLEDGE BASE (teach ONLY from this) ━━━\n${materialsContext.slice(0, 10000)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nThe knowledge base above is the only source of truth for this course. Do not add outside facts, extra concepts, or examples that are not supported by it. If the student asks for something outside it, say it is outside this course pack and offer to stay with the current lesson.`
      : '';
    const planSection = lessonPlan
      ? `\n\n━━━ YOUR PERSONALIZED TEACHING PLAN ━━━\n${String(lessonPlan).slice(0, 2000)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFollow this plan. Adapt if the student goes a different direction, but use the approach it describes.`
      : '';

    const prevTutorTexts = (Array.isArray(messages) ? messages : [])
      .filter((m) => m?.who === 'tutor' && m?.text?.trim())
      .map((m) => String(m.text).trim())
      .filter(Boolean);
    const alreadyCoveredSection = prevTutorTexts.length
      ? `\n\n━━━ WHAT YOU HAVE ALREADY SAID (DO NOT REPEAT) ━━━\n${prevTutorTexts.map((t, i) => `[${i + 1}] ${t.slice(0, 300)}`).join('\n')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nThe above sentences are already in the student's chat. If you write any of these sentences again word-for-word or near-verbatim, you are hallucinating. Move forward to genuinely new content.`
      : '';

    const systemPrompt = `# AI Tutor System Prompt — Master Version

---

## IDENTITY

You are an elite AI tutor — part Socrates, part engineer, part coach.
You are teaching: **"${courseTitle}"**
Current module: **"${moduleTitle}"**
Current lesson: **"${lessonTitle}"**

Lesson metadata:
- OBJECTIVE: ${objective}
- DESCRIPTION: ${description}
- KEY FACTS: ${facts}
- RESEARCH/MATERIALS: ${materialsContext ? 'Provided in the RESEARCH/MATERIALS section below.' : 'None provided for this lesson.'}
- PREVIOUS TUTOR MESSAGES: ${prevTutorTexts.length ? 'Provided in the PREVIOUS TUTOR MESSAGES section below.' : 'None yet.'}

Current phase: ${currentPhase}
Opening turn: ${openingTurn ? 'yes' : 'no'}
Check-in allowed this turn: ${allowQuestionThisTurn ? 'yes' : 'no'}
Student requested canvas example: ${visualExampleTurn ? 'yes' : 'no'}

---

## YOUR TEACHING PHILOSOPHY

You follow the **D-SUAVE** method — the gold standard of elite tutoring:

- **D — Define**: Start every lesson with one clean, plain-English definition the student can hold in their head.
- **S — Surprise**: Then show *why this definition matters right now* — real stakes, not a textbook sentence.
- **U — Unpack**: Teach one idea at a time. Never more.
- **A — Anchor**: Connect every new idea to something the student already knows.
- **V — Verify**: Make the student *construct* understanding, not just confirm it.
- **E — Extend**: End by showing where this leads — to the next idea, to real-world use.

You are not a textbook. You are a thinking partner.

---

## JSON OUTPUT FORMAT

You MUST always reply in this exact JSON format — nothing outside it:

{
  "text": "string — your teaching message (max 130 words, no headings, no bullet dumps)",
  "visual": "string | null — code/table/diagram goes here only",
  "readyToMoveOn": false,
  "askedQuestion": false,
  "confidenceSignal": "low | medium | high",
  "anchorSentence": "string | null — one sentence connecting this to a prior concept the student learned"
}

**confidenceSignal rules:**
- "low" → student is guessing, confused, or giving wrong answers
- "medium" → student understands the surface but hasn't internalized
- "high" → student can explain it back or apply it correctly; may set readyToMoveOn: true

**visual rules:**
- null = nothing to show on canvas this turn — frontend hides or clears the canvas area
- A string = render this on the canvas (fenced code, markdown table, diagram)
- Never put code or tables inside text — always move them to visual
- If text references something visual (e.g. "look at this query"), visual must not be null

**anchorSentence rules:**
- Always fill this unless it's the very first lesson of the course
- Format: "This builds on [prior concept] — [how it connects]."
- Example: "This builds on SELECT — GROUP BY is how you make SELECT powerful across categories."
- Goes in the JSON field, NOT in the text (frontend can render it as a subtle context bar)

---

## PHASE RULES

### DEFINE
Goal: Give the student a clear, plain-English definition they can hold in their head.
- Always the very first phase of every lesson — before anything else
- One sentence. No jargon. No caveats. No "it depends."
- Format: "[Term] is [what it does], used when [situation]."
- Bad: "GROUP BY is a SQL clause that groups rows with the same values in specified columns into summary rows."
- Good: "GROUP BY is a SQL tool that collapses many rows into groups so you can run calculations — like totals or averages — on each group separately."
- After the definition, immediately transition into HOOK — don't linger here

### HOOK
Goal: Create curiosity. Make the student want to know *why this definition matters*.
- Open with a real-world consequence or surprising fact — never repeat the definition
- 2–3 sentences max
- No question yet
- Bad: "Today we'll learn about GROUP BY. It groups rows."
- Good: "Imagine you have a million sales rows. GROUP BY lets you collapse them into one insight per country — in a single line. That's what we're building toward."

### EXPLAIN
Goal: Teach one small piece. Make it land.
- Teach exactly one idea — the smallest meaningful unit
- If introducing syntax: show it in visual, explain what each part does in text
- Ask one check-in question only if check-in allowed is "yes" and you've taught something concrete
- Never ask two questions in one turn
- If student says "ok / got it / continue / next" → teach the next small piece, don't summarize what they already know

### CHECK
Goal: Verify real understanding — make them construct, not just recall.
- Ask one question — prefer construction over recognition
- Strong question types:
  - "What do you think would happen if we removed GROUP BY here?"
  - "Write the query that would give us total sales per region."
  - "Which of these two queries is correct — and why is the other one wrong?"
- Avoid questions like: "Does that make sense?" or "Are you ready to move on?"

### REINFORCE
Goal: Evaluate the answer. Teach from it, don't just confirm.
- **If correct:** Affirm briefly (1 sentence), then add one small follow-up insight that deepens understanding. Set confidenceSignal: "high" and consider readyToMoveOn: true.
- **If partially correct:** Acknowledge what's right, then precisely fix the gap. Don't re-explain everything — target the exact misunderstanding.
- **If wrong:** Don't say "wrong." Identify the specific confusion type (vocabulary / concept / application), address only that, then re-ask or move forward depending on context.
- **If vague / "I don't know":** Give a hint that points toward the answer without giving it. Then ask a simpler version.

---

## CONFUSION DETECTION PROTOCOL

When a student expresses confusion, DO NOT just simplify and repeat. Instead:

1. **Diagnose the confusion type:**
   - *Vocabulary confusion* → They don't know what a word means (redefine the term)
   - *Concept confusion* → They understand the words but not the idea (use a different angle, not an analogy unless asked)
   - *Application confusion* → They understand the idea but can't use it (show a concrete worked example in visual)
   - *Prerequisite gap* → They're missing a foundational concept (briefly bridge it, flag it for the system)

2. **Address exactly that type.** Don't re-explain from the top.

3. Set confidenceSignal: "low" and do NOT ask another question this turn.

---

## CANVAS / VISUAL RULES

- Code always goes in visual as a fenced code block — NEVER in text
- Tables, schemas, key-value structures, data examples → visual as markdown table
- Diagrams / step-by-step flows → visual as structured markdown or ASCII
- If text references something visual (e.g. "look at this query"), visual must NOT be null
- If the concept changes significantly, clear the previous visual
- If student requested canvas example is "yes", visual is required — no exceptions
- If a previous visual was wrong or incomplete, immediately emit a corrected version with a note in text

---

## CRITICAL BEHAVIOR RULES

1. **Never dump the full lesson.** One idea per turn. Always.
2. **Never use section headers or labels** in text (no "WHAT IT IS", "WHY IT MATTERS", "CHECK-IN QUESTION").
3. **Never start with "Great!", "Excellent!", "Perfect!"** — hollow affirmations kill trust. A brief, specific acknowledgment is fine: "Yes — and that's the key insight."
4. **Never use an analogy unless the student asks for one.** Analogies can mislead; precision teaches.
5. **Stay inside the current lesson scope.** If the student asks about something from a future lesson, say: "That's exactly where we're headed — let's build to it."
6. **Use only high-confidence facts.** If uncertain, say so briefly and stay with what's solid.
7. **Keep text under 130 words.** Everything else goes in visual.
8. **Never ask more than one question per turn.**
9. **After a student's correct answer, always teach one new thing** — don't just confirm and stop.
10. **The lesson ends when the student can apply the concept**, not just recite it.
11. **Never say "ready for the quiz"** or "shall we move on?" — pace is determined by confidenceSignal.
12. **Always write as if speaking** — not as if writing documentation.

---

## SCOPE RULES

${scopeSection || 'No explicit future-lesson scope was provided. Stay tightly inside the current lesson objective and defer unrelated concepts.'}

These define what belongs in this lesson vs. future lessons. If a concept is out of scope:
- Acknowledge it briefly
- Say it's coming and when
- Return to the current lesson

---

## WORKED EXAMPLE — WHAT GREAT LOOKS LIKE

**Scenario:** Teaching GROUP BY in SQL. HOOK phase. Opening turn.

**Bad response:**
"Today we'll learn GROUP BY. GROUP BY is used to group rows that have the same values in specified columns. It's often used with aggregate functions like COUNT, SUM, AVG."

Why it's bad: Definition-first, no stakes, no curiosity, no connection to real use.

**Good response:**
{
  "text": "You have a table with 10 million sales records. Your manager wants total revenue by country. Without GROUP BY, you'd need to write a separate query for every single country. GROUP BY does that collapse in one shot — it's the difference between 1 query and 200. What do you think it's actually doing to those rows?",
  "visual": null,
  "readyToMoveOn": false,
  "askedQuestion": true,
  "confidenceSignal": "medium",
  "anchorSentence": null
}

Why it's good: Stakes first, real-world scale, curiosity gap, ends with a thinking question — not a yes/no.

---

This prompt was designed for maximum teaching quality. Runtime variables have been filled above.

${materialsSection}${planSection}${alreadyCoveredSection}`;

    const apiMessages = buildTutorApiMessages(messages, starterText);

    let rawText;
    try {
      rawText = await callGemini(systemPrompt, apiMessages, 1600, true);
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('at least one message') || msg.includes('contents') || msg.includes('INVALID_ARGUMENT')) {
        rawText = null;
      } else {
        throw err;
      }
    }

    if (!rawText) {
      return res.json(buildTutorFallbackReply({
        lessonTitle,
        lessonObjective: objective,
        conceptDescription: description,
        conceptFacts,
        currentPhase,
        isOpening: openingTurn,
        allowQuestion: allowQuestionThisTurn,
      }));
    }

    const raw = rawText;
    const parsed = safeParseTutorPayload(raw);
    const cleaned = normalizeTutorReply(parsed.text || raw, {
      currentPhase,
      isOpening: openingTurn,
      allowQuestion: allowQuestionThisTurn,
    });

    const MIN_TUTOR_TURNS = 5;
    const tutorTurnCount = (Array.isArray(messages) ? messages : []).filter((m) => m.who === 'tutor').length;
    let readyToMoveOn = !!parsed.readyToMoveOn;

    if (readyToMoveOn) {
      if (currentPhase !== 'REINFORCE' || tutorTurnCount < MIN_TUTOR_TURNS || !studentAnswered) {
        readyToMoveOn = false;
      } else {
        readyToMoveOn = await runCheckerAgent({
          lessonTitle,
          lessonObjective: objective,
          chatMessages: messages,
        });
      }
    }

    let visual = typeof parsed.visual === 'string' && parsed.visual.trim() ? parsed.visual.trim() : null;
    if (visualExampleTurn && !visual) {
      const lowerLesson = String(lessonTitle || '').toLowerCase();
      if (/\bwhere\b|\bfilter(?:ing)?\b/.test(lowerLesson)) {
        visual = `\`\`\`sql\nSELECT customer_name, state\nFROM customers\nWHERE state = 'Texas';\n\`\`\``;
      } else if (/\bselect\b|\bquery\b|\bstatement\b/.test(lowerLesson)) {
        visual = `\`\`\`sql\nSELECT customer_id, total_amount\nFROM orders\nLIMIT 3;\n\`\`\``;
      } else if (/\b(table|database|row|column|record|primary key|sql)\b/.test(lowerLesson)) {
        visual = `| customer_id | customer_name | state |\n|---|---|---|\n| 42 | Sarah Chen | Texas |\n| 87 | Marcus Webb | New York |\n| 91 | Aisha Khan | Texas |`;
      } else {
        visual = `\`\`\`txt\n${lessonTitle}\nStep 1 -> concrete example\nStep 2 -> what changes\nStep 3 -> why it matters\n\`\`\``;
      }
    }

    // If AI has no visual, strip any text that claims to reference the canvas —
    // otherwise the chat says "look at the canvas" while canvas shows something unrelated.
    let finalText = readyToMoveOn ? cleaned : stripPrematureQuizLanguage(cleaned);
    if (!visual) {
      finalText = finalText
        .replace(/[Tt]ake a look at the canvas[^.!?]*[.!?]?\s*/g, '')
        .replace(/[Ll]ook at the (?:table|canvas|diagram|visual)[^.!?]*[.!?]?\s*/g, '')
        .replace(/[Tt]he canvas (?:now )?shows[^.!?]*[.!?]?\s*/g, '')
        .replace(/[Aa]s you can see (?:in|on) the canvas[^.!?]*[.!?]?\s*/g, '')
        .replace(/[Ss]ee the (?:table|canvas|diagram|visual)[^.!?]*[.!?]?\s*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    res.json({
      text: finalText || buildTutorFallbackReply({
        lessonTitle,
        lessonObjective: objective,
        conceptDescription: description,
        conceptFacts,
        currentPhase,
        isOpening: openingTurn,
        allowQuestion: allowQuestionThisTurn,
      }).text,
      readyToMoveOn,
      askedQuestion: !!parsed.askedQuestion || (allowQuestionThisTurn && /\?\s*$/.test(cleaned)),
      visual,
      confidenceSignal: ['low', 'medium', 'high'].includes(parsed.confidenceSignal) ? parsed.confidenceSignal : (readyToMoveOn ? 'high' : 'medium'),
      anchorSentence: typeof parsed.anchorSentence === 'string' && parsed.anchorSentence.trim() ? parsed.anchorSentence.trim() : null,
    });
  } catch (err) {
    console.error('[chat]', err.message);
    res.json(buildTutorFallbackReply({
      lessonTitle,
      lessonObjective: req.body.lessonObjective || fallbackObjective(req.body.lessonTitle),
      conceptDescription: req.body.conceptDescription || req.body.lessonObjective || '',
      conceptFacts: req.body.conceptFacts,
      currentPhase: req.body.phase || 'HOOK',
      isOpening: !!req.body.isOpening,
      allowQuestion: !!req.body.allowQuestion,
    }));
  }
});

// ── Generate lesson notes ────────────────────────────────────────────────────
app.post('/api/notes', async (req, res) => {
  const { courseTitle, moduleTitle, lessonTitle, chatHistory } = req.body;
  try {
    const chatSummary = (chatHistory || [])
      .map((m) => `${m.who === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
      .join('\n');

    const text = await callGemini(
      'You are an expert at creating clear, concise study notes.',
      [{
        role: 'user',
        content: [{ type: 'text', text: `Create structured study notes for the lesson "${lessonTitle}" (Module: "${moduleTitle}", Course: "${courseTitle}").
${chatSummary ? `\nBased on this tutoring session:\n${chatSummary}\n` : ''}
Format the notes in markdown:
- Start with ## Key Concepts (3–5 bullet points)
- Then ## How It Works (brief explanation, may include a short code example if relevant)
- Then ## Common Mistakes (2–3 pitfalls)
- End with ## Remember (one-sentence summary)
Be concise. Notes should fit on one screen.` }],
      }],
      1024,
    );
    res.json({ notes: text });
  } catch (err) {
    console.error('[notes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Generate quiz (MCQ + practical exercises) ───────────────────────────────
app.post('/api/quiz', async (req, res) => {
  const { courseTitle, moduleTitle, lessonTitle, chatHistory } = req.body;

  // Summarise what was actually taught so the quiz stays on-topic
  const taughtContent = (chatHistory || [])
    .filter((m) => m.who === 'tutor')
    .map((m) => m.text)
    .join('\n\n');

  try {
    const text = await callGemini(
      'You are a quiz writer. Respond ONLY with valid JSON, no markdown fences.',
      [{
        role: 'user',
        content: [{ type: 'text', text: `Write an 8-question quiz for: lesson "${lessonTitle}" (module "${moduleTitle}", course "${courseTitle}").

${taughtContent
  ? `====== WHAT THE TUTOR ACTUALLY TAUGHT ======
${taughtContent}
============================================

STRICT RULES — read carefully:
1. Every question MUST be directly answerable from the text above. If the tutor said it, test it. If they didn't, skip it.
2. MCQ wrong options must be plausible-sounding but clearly wrong to someone who read the tutor's messages.
3. Practical exercises are OPTIONAL. Return [] unless the tutor clearly taught a concrete hands-on action the student can now perform.
4. A practical exercise must be directly doable from the tutor messages above. Do not ask for SELECT, WHERE, JOIN, schema design, code, commands, or data work unless those exact skills were already taught.
5. If the lesson was conceptual, introductory, vocabulary-only, or only showed examples without teaching how to perform the task, practicalExercises MUST be [].
6. Do NOT ask the student to invent a new database/table/project from scratch unless the tutor explicitly taught table design/schema creation in this lesson.
7. Do NOT invent new facts, definitions, or examples that don't appear in the tutor messages above.`
  : `No chat history — write fair, introductory-level questions for "${lessonTitle}". Test conceptual understanding, not trivia or memorized syntax.`}

Write:
- exactly 8 MCQ questions
- 0 to 2 practical exercises. Prefer 0 unless there is a genuinely fair hands-on task from the taught content.

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "questions": [
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> }
  ],
  "practicalExercises": []
}` }],
      }],
      1800,
    );
    const parsed = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''));
    parsed.questions = (parsed.questions || [])
      .filter((q) => Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({
        ...q,
        type: 'mcq',
      }))
      .slice(0, 8);
    parsed.practicalExercises = Array.isArray(parsed.practicalExercises)
      ? parsed.practicalExercises
          .filter((exercise) => practicalExerciseIsFair(exercise, taughtContent))
          .slice(0, 2)
      : [];
    res.json(parsed);
  } catch (err) {
    console.error('[quiz]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Grade a typed answer ─────────────────────────────────────────────────────
app.post('/api/grade', async (req, res) => {
  const { question, sampleAnswer, userAnswer } = req.body;
  try {
    const text = await callGemini(
      'You are a strict but fair tutor grading a student answer. Respond ONLY with valid JSON.',
      [{
        role: 'user',
        content: [{ type: 'text', text: `Grade this student answer fairly.

Question: "${question}"
Model answer: "${sampleAnswer}"
Student's answer: "${userAnswer}"

GRADING RULES:
- Score based on whether the student demonstrates understanding of the CONCEPT, not whether they matched the model answer word-for-word.
- A good paraphrase or different valid example = full marks.
- Partial understanding = 0.5–0.7.
- Wrong concept or nonsense = 0.
- Too short (under 8 words) = 0.
- Pass threshold: score >= 0.7

Return ONLY valid JSON:
{ "passed": <true|false>, "score": <0.0-1.0>, "feedback": "One sentence — what they got right or what they missed." }` }],
      }],
      300,
    );
    res.json(JSON.parse(text.trim().replace(/^```json\n?|```$/g, '')));
  } catch (err) {
    console.error('[grade]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Upload materials ─────────────────────────────────────────────────────────
async function extractPdfText(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  await doc.destroy();
  return pages.join('\n').replace(/\s+/g, ' ').trim().slice(0, 15000);
}

app.post('/api/upload-materials', upload.array('files', 10), async (req, res) => {
  try {
    const texts = [];
    for (const file of req.files ?? []) {
      if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        const text = await extractPdfText(file.buffer);
        if (!text) {
          texts.push(`[${file.originalname}]\n(PDF could not be parsed — try uploading a .txt file instead)`);
        } else {
          texts.push(`[${file.originalname}]\n${text}`);
        }
      } else {
        texts.push(`[${file.originalname}]\n${file.buffer.toString('utf8')}`);
      }
    }
    res.json({ materialsContext: texts.join('\n\n---\n\n') });
  } catch (err) {
    console.error('[upload-materials]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Fetch and extract text from a URL ────────────────────────────────────────
app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });

  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only http/https URLs are supported' });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return res.status(400).json({ error: `Page returned ${response.status} — try a different URL` });
    }

    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000);

    if (!text || text.length < 100) {
      return res.status(400).json({ error: 'Not enough readable text found — this page may be JavaScript-rendered. Try copying the content into a PDF instead.' });
    }

    res.json({ text });
  } catch (err) {
    console.error('[fetch-url]', err.message);
    const msg = String(err?.message || '');
    if (msg.includes('abort') || msg.includes('timeout')) {
      return res.status(400).json({ error: 'URL took too long to respond (>7s). Try a different URL or paste the content into a PDF.' });
    }
    res.status(500).json({ error: `Could not fetch URL: ${msg}` });
  }
});

// ── Course page crawler (Udemy etc) ──────────────────────────────────────────
app.post('/api/crawl-course', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });

  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'Only http/https URLs supported' });

  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  };

  async function tryFetch(targetUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch(targetUrl, { headers: BROWSER_HEADERS, redirect: 'follow', signal: controller.signal });
      clearTimeout(timer);
      return r;
    } catch (e) { clearTimeout(timer); throw e; }
  }

  function extractFromHtml(html) {
    // 1. Try JSON-LD structured data first (most reliable)
    const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const jsonLdBlocks = jsonLdMatches.map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);

    // 2. Try __INITIAL_STATE__ / __UDEMY_INITIAL_DATA__ embedded JSON
    const initDataMatch = html.match(/(?:__UDEMY_INITIAL_DATA__|__INITIAL_STATE__|__NEXT_DATA__)\s*=\s*({[\s\S]+?})(?:\s*;?\s*<\/script>|\s*;?\s*window\.)/);
    let initData = null;
    if (initDataMatch) {
      try { initData = JSON.parse(initDataMatch[1]); } catch {}
    }

    // 3. Fallback: strip HTML to readable text
    const plainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000);

    return { jsonLdBlocks, initData, plainText };
  }

  try {
    let html = '';
    let strategy = '';

    // Strategy 1: direct fetch
    try {
      const r = await tryFetch(url);
      if (r.ok) {
        html = await r.text();
        strategy = 'direct';
      } else if (r.status === 403 || r.status === 429 || r.status === 503) {
        // Strategy 2: allorigins proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const pr = await tryFetch(proxyUrl);
        if (pr.ok) {
          const pd = await pr.json();
          html = pd.contents || '';
          strategy = 'proxy';
        }
      }
    } catch {
      // Strategy 2 fallback
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const pr = await tryFetch(proxyUrl);
        if (pr.ok) {
          const pd = await pr.json();
          html = pd.contents || '';
          strategy = 'proxy';
        }
      } catch {}
    }

    if (!html || html.length < 200) {
      return res.status(400).json({ error: 'Could not fetch this page. Udemy may require login or blocks crawlers. Try pasting course content manually.' });
    }

    const { jsonLdBlocks, initData, plainText } = extractFromHtml(html);

    res.json({
      strategy,
      plainText,
      charCount: plainText.length,
      jsonLd: jsonLdBlocks,
      hasInitData: !!initData,
      initDataKeys: initData ? Object.keys(initData).slice(0, 20) : [],
    });
  } catch (err) {
    console.error('[crawl-course]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Generate curriculum from instructor materials ─────────────────────────────
app.post('/api/curriculum-from-materials', async (req, res) => {
  const { topic, materialsContext } = req.body;
  try {
    // Try direct Udemy text parsing first — preserves exact sections & lectures
    const direct = parseUdemyText(materialsContext || '');
    if (direct && direct.modules.length >= 1) {
      if (topic && !topic.startsWith('http')) direct.title = topic;
      const curriculum = normalizeUdemyCurriculum(direct);
      return res.json({ ...curriculum, materialsContext: (materialsContext || '').slice(0, 30000) });
    }

    // Fallback: ask Gemini to EXTRACT the exact outline, not generate a new one
    const text = await callGemini(
      'You are a course outline extractor. Respond ONLY with valid JSON, no markdown fences.',
      [{
        role: 'user',
        content: [{ type: 'text', text: `Extract the EXACT course outline from this Udemy page text. Preserve every section title and lecture title EXACTLY as they appear — do not summarize, rename, combine, or invent anything.

===
${(materialsContext || '').slice(0, 15000)}
===

Return ONLY valid JSON:
{
  "title": "...",
  "level": "beginner|intermediate|advanced",
  "estimatedHours": <number>,
  "modules": [
    {
      "title": "Section title exactly as shown",
      "lessons": [{ "title": "Lecture title exactly as shown", "objective": "One sentence: what this lecture covers", "minutes": <integer from timestamp> }]
    }
  ]
}

Include EVERY section and EVERY lecture. Use the exact titles. Set minutes from the timestamp shown next to each lecture.` }],
      }],
      8192,
    );
    const parsedFromMaterials = repairCurriculumJson(text);
    if (!parsedFromMaterials) throw new Error('Could not parse curriculum JSON');
    const curriculum = normalizeUdemyCurriculum(parsedFromMaterials);
    res.json({ ...curriculum, materialsContext: materialsContext || '' });
  } catch (err) {
    console.error('[curriculum-from-materials]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Publish a course ─────────────────────────────────────────────────────────
app.post('/api/publish-course', (req, res) => {
  const { creatorToken, curriculum, price } = req.body;
  const expected = process.env.CREATOR_TOKEN;
  if (!expected || creatorToken !== expected) {
    return res.status(401).json({ error: 'Invalid creator token.' });
  }
  const courses = readCourses();
  const entry = {
    id: randomUUID(),
    curriculum,
    price: Number(price) || 0,
    enrollCount: 0,
    createdAt: new Date().toISOString(),
  };
  writeCourses([...courses, entry]);
  res.json(entry);
});

// ── List published courses ────────────────────────────────────────────────────
app.get('/api/published-courses', (_, res) => {
  const courses = readCourses().map(({ curriculum: { materialsContext: _, ...rest }, ...c }) => ({
    ...c,
    curriculum: rest,
  }));
  res.json(courses);
});

// ── Enroll in a course ───────────────────────────────────────────────────────
app.post('/api/enroll', (req, res) => {
  const { courseId } = req.body;
  const courses = readCourses();
  const found = courses.find((c) => c.id === courseId);
  if (!found) return res.status(404).json({ error: 'Course not found.' });
  // Increment enroll count
  const updated = courses.map((c) => c.id === courseId ? { ...c, enrollCount: (c.enrollCount || 0) + 1 } : c);
  writeCourses(updated);
  res.json(found);
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || (process.env.RAILWAY_ENVIRONMENT ? '0.0.0.0' : '127.0.0.1');

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log(`Learnor API → http://${HOST}:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠  GEMINI_API_KEY not set — copy .env.example to .env');
    }
  });
}
