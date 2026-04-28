import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
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

function buildOpeningTutorReply({ lessonTitle, lessonObjective, conceptDescription, conceptFacts }) {
  const descriptionSentences = splitSentences(conceptDescription).filter((sentence) => !sentence.endsWith('?'));
  const objectiveSentence = splitSentences(lessonObjective).find((sentence) => !sentence.endsWith('?'));
  const factSentence = splitSentences(Array.isArray(conceptFacts) ? conceptFacts[0] : '').find((sentence) => !sentence.endsWith('?'));
  const first = descriptionSentences[0] || objectiveSentence || `${lessonTitle} is the next concept in this lesson.`;
  const second = descriptionSentences[1] || factSentence || `For now, just focus on the main idea behind ${lessonTitle}; we will build from there one step at a time.`;

  return {
    text: trimWords(`${first} ${second}`, 65),
    readyToMoveOn: false,
    askedQuestion: false,
  };
}

function normalizeTutorReply(text, { currentPhase, isOpening, allowQuestion }) {
  const raw = stripTutorFormatting(text);
  if (!raw) return '';

  if (currentPhase === 'CHECK') {
    return trimWords(raw.replace(/\n{3,}/g, '\n\n'), 70);
  }

  const hasStructuredExample = /```|^\s*\|.+\|\s*$/m.test(String(text || ''));
  if (!isOpening && hasStructuredExample && raw.split(/\s+/).filter(Boolean).length <= 130) {
    return raw;
  }

  const sentences = splitSentences(raw);
  const explainers = sentences.filter((sentence) => !sentence.endsWith('?')).slice(0, isOpening ? 2 : 3);
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
  return trimWords(compacted || raw.replace(/\?+/g, '.'), isOpening ? 65 : 95);
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

  return { text: cleaned, readyToMoveOn: false, askedQuestion: /\?\s*$/.test(cleaned) };
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
    };
  }

  if (currentPhase === 'REINFORCE') {
    return {
      text: trimWords(`${descriptionSentence} ${factSentence}`.trim() || `The key point is ${lessonTitle}.`, 55),
      readyToMoveOn: false,
      askedQuestion: false,
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
  };
}



async function runCheckerAgent({ lessonTitle, lessonObjective, chatMessages }) {
  try {
    const historyText = (Array.isArray(chatMessages) ? chatMessages : [])
      .filter((m) => m.who === 'user' || m.who === 'tutor')
      .slice(-12)
      .map((m) => `${m.who === 'user' ? 'STUDENT' : 'TUTOR'}: ${String(m.text || '').trim()}`)
      .join('\n');

    const res = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: 'You are a learning quality checker. Respond ONLY with valid JSON, no markdown.',
      messages: [{
        role: 'user',
        content: `Lesson: "${lessonTitle}"
Objective: "${lessonObjective}"

Chat:
${historyText}

Did the student demonstrate genuine understanding — answered a question correctly, explained something in their own words, or showed applied knowledge? Saying "got it", "okay", "next", "continue", "i get it", or "you may continue" does NOT count.

{"approved":true/false}`,
      }],
    });

    const text = res.content[0].type === 'text' ? res.content[0].text : '';
    const result = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''));
    return !!result.approved;
  } catch {
    return false;
  }
}

function normalizeCurriculum(curriculum) {
  if (!curriculum || !Array.isArray(curriculum.modules)) return curriculum;
  return {
    ...curriculum,
    modules: curriculum.modules.map((module) => ({
      ...module,
      lessons: Array.isArray(module.lessons)
        ? module.lessons.map((lesson) => ({
            ...lesson,
            objective: lesson.objective || fallbackObjective(lesson.title),
          }))
        : [],
    })),
  };
}

function buildTutorApiMessages(messages, starterText) {
  const cleaned = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.who === 'user' || m.who === 'tutor'))
    .map((m) => ({
      role: m.who === 'user' ? 'user' : 'assistant',
      content: [{ type: 'text', text: String(m.text ?? '').trim() }],
    }))
    .filter((m) => m.content[0].text.length > 0);

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

let client = null;
function getClient() {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set in .env');
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

app.get('/api/health', (_, res) => res.json({ ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY }));

// ── Generate curriculum ──────────────────────────────────────────────────────
app.post('/api/curriculum', async (req, res) => {
  const { topic, days } = req.body;
  try {
    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'You are a curriculum designer. Respond ONLY with valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Create a learning curriculum for: "${topic}". The student has ${days} days.
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
- 5–7 modules, 2–4 lessons each. Total hours fits in ${days} days at ~1h/day.
- Each lesson objective: one sentence describing what the student should understand by the end.
- Each lesson description: exactly 2 sentences — what the concept is + why it matters.
- Each lesson facts array: 3–5 specific, verifiable facts only. If topic is niche or obscure, include only facts you are highly confident about. Never invent facts.`,
      }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    res.json(normalizeCurriculum(JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''))));
  } catch (err) {
    console.error('[curriculum]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── AI tutor chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const {
    messages,
    courseTitle,
    moduleTitle,
    lessonTitle,
    lessonObjective,
    lessonScope,
    materialsContext,
    phase,
    conceptDescription,
    conceptFacts,
    isOpening,
    allowQuestion,
  } = req.body;

  try {
    const currentPhase = phase || 'HOOK';
    const objective = lessonObjective || fallbackObjective(lessonTitle);
    const description = conceptDescription || objective;
    const facts = Array.isArray(conceptFacts) && conceptFacts.length > 0
      ? conceptFacts.join(', ')
      : 'No specific facts provided — teach from high-confidence knowledge only and hedge uncertain claims with "approximately" or "around".';
    const openingTurn = !!isOpening;
    const allowQuestionThisTurn = !openingTurn && !!allowQuestion && currentPhase !== 'HOOK' && currentPhase !== 'REINFORCE';
    const starterText = openingTurn
      ? `Start the lesson "${lessonTitle}". Teach the first tiny idea only.`
      : `Continue the lesson "${lessonTitle}" with one small next step.`;

    if (openingTurn && currentPhase === 'HOOK') {
      return res.json(buildOpeningTutorReply({
        lessonTitle,
        lessonObjective: objective,
        conceptDescription: description,
        conceptFacts,
      }));
    }

    const scopeSection = lessonScope ? `\n\nCourse scope — do not teach these future topics: ${(lessonScope.futureLessonTitles || []).slice(0, 8).join(', ') || 'none'}.` : '';
    const materialsSection = materialsContext
      ? `\n\n━━━ INSTRUCTOR MATERIALS (teach ONLY from this) ━━━\n${materialsContext.slice(0, 8000)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : '';

    const systemPrompt = `You are an AI tutor teaching a course called: "${courseTitle}"

You are inside module "${moduleTitle}" and teaching exactly one lesson:
LESSON: ${lessonTitle}
OBJECTIVE: ${objective}
DESCRIPTION: ${description}
KEY FACTS: ${facts}

Current phase: ${currentPhase}
Opening turn: ${openingTurn ? 'yes' : 'no'}
You may end with one short check-in question this turn: ${allowQuestionThisTurn ? 'yes' : 'no'}

You MUST reply ONLY as valid JSON:
{"text":"...","readyToMoveOn":false,"askedQuestion":false}

CRITICAL BEHAVIOR RULES:
1. Never dump the full lesson. Teach one tiny idea only.
2. Never use headings, numbered sections, labels like "WHAT IT IS", "WHY IT MATTERS", "THE ANALOGY", or "CHECK-IN QUESTION".
3. Never say "let me deliver the full lesson", "from the beginning", or anything similar.
4. Never use an analogy unless the student explicitly asked for one.
5. Stay inside ${lessonTitle}. If the student asks about a future topic, defer it in one short sentence and return to this lesson.
6. Use only high-confidence facts. If even slightly unsure, hedge with "approximately" or "around".
7. Keep openings to 2-3 short sentences and under 65 words. Keep later teaching turns under 95 words.
8. Ask at most one question, and only after you have actually taught something in the same message. The only exception is CHECK phase, where asking the question is the point.
9. If the student says they do not know, are not sure, or are confused, explain more simply. Do not scold them and do not bounce back with another question immediately.

PHASE RULES:
- HOOK: Teach the first tiny idea in 2 short sentences. No question.
- EXPLAIN: Teach one next small piece of the lesson in 2-4 short sentences. If question permission is "yes", end with exactly one simple check-in question and set askedQuestion to true. Otherwise askedQuestion must be false.
- CHECK: Ask exactly one easy question about only the idea just taught. Prefer a very short multiple-choice question with A), B), C), and D). Set askedQuestion to true.
- REINFORCE: If the student is basically correct, confirm briefly and say they can take the quiz or ask for one more example. Set readyToMoveOn to true. If they are wrong or confused, correct the specific mistake in 1-2 short sentences and optionally invite one more example. Set readyToMoveOn to false. askedQuestion must be false.

If the student is repeating what you already taught back to you, do not re-teach the full lesson. Either tighten the explanation or move into a simple check.${scopeSection}${materialsSection}`;

    const apiMessages = buildTutorApiMessages(messages, starterText);

    let response;
    try {
      response = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 220,
        system: systemPrompt,
        messages: apiMessages,
      });
    } catch (err) {
      if (String(err?.message || '').includes('messages: at least one message is required')) {
        response = null;
      } else {
        throw err;
      }
    }

    if (!response) {
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

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = safeParseTutorPayload(raw);
    const cleaned = normalizeTutorReply(parsed.text || raw, {
      currentPhase,
      isOpening: openingTurn,
      allowQuestion: allowQuestionThisTurn,
    });

    const MIN_TUTOR_TURNS = 3;
    const tutorTurnCount = (Array.isArray(messages) ? messages : []).filter((m) => m.who === 'tutor').length;
    let readyToMoveOn = !!parsed.readyToMoveOn;

    if (readyToMoveOn) {
      if (currentPhase !== 'REINFORCE' || tutorTurnCount < MIN_TUTOR_TURNS) {
        readyToMoveOn = false;
      } else {
        readyToMoveOn = await runCheckerAgent({
          lessonTitle,
          lessonObjective: objective,
          chatMessages: messages,
        });
      }
    }

    res.json({
      text: cleaned || buildTutorFallbackReply({
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

    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are an expert at creating clear, concise study notes.',
      messages: [{
        role: 'user',
        content: `Create structured study notes for the lesson "${lessonTitle}" (Module: "${moduleTitle}", Course: "${courseTitle}").
${chatSummary ? `\nBased on this tutoring session:\n${chatSummary}\n` : ''}
Format the notes in markdown:
- Start with ## Key Concepts (3–5 bullet points)
- Then ## How It Works (brief explanation, may include a short code example if relevant)
- Then ## Common Mistakes (2–3 pitfalls)
- End with ## Remember (one-sentence summary)
Be concise. Notes should fit on one screen.`,
      }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
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
    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      system: 'You are a quiz writer. Respond ONLY with valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Write a 5-question quiz for: lesson "${lessonTitle}" (module "${moduleTitle}", course "${courseTitle}").

${taughtContent
  ? `====== WHAT THE TUTOR ACTUALLY TAUGHT ======
${taughtContent}
============================================

STRICT RULES — read carefully:
1. Every question MUST be directly answerable from the text above. If the tutor said it, test it. If they didn't, skip it.
2. MCQ wrong options must be plausible-sounding but clearly wrong to someone who read the tutor's messages.
3. Practical exercises must ask the student to DO something relevant to the lesson, not just restate facts.
4. If the lesson is technical, practical exercises should involve code, commands, data work, debugging, or a file they can upload.
5. If the lesson is non-technical, practical exercises should involve a concrete artifact they can create and upload.
6. Do NOT invent new facts, definitions, or examples that don't appear in the tutor messages above.`
  : `No chat history — write fair, introductory-level questions for "${lessonTitle}". Test conceptual understanding, not trivia or memorized syntax.`}

Write:
- exactly 5 MCQ questions
- exactly 2 practical exercises

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "questions": [
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> },
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": <0-3> }
  ],
  "practicalExercises": [
    {
      "title": "...",
      "task": "...",
      "deliverable": "...",
      "submissionHint": "..."
    },
    {
      "title": "...",
      "task": "...",
      "deliverable": "...",
      "submissionHint": "..."
    }
  ]
}`,
      }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const parsed = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''));
    parsed.questions = (parsed.questions || [])
      .filter((q) => Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({
        ...q,
        type: 'mcq',
      }));
    parsed.practicalExercises = Array.isArray(parsed.practicalExercises) ? parsed.practicalExercises : [];
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
    const msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: 'You are a strict but fair tutor grading a student answer. Respond ONLY with valid JSON.',
      messages: [{
        role: 'user',
        content: `Grade this student answer fairly.

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
{ "passed": <true|false>, "score": <0.0-1.0>, "feedback": "One sentence — what they got right or what they missed." }`,
      }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
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

// ── Generate curriculum from instructor materials ─────────────────────────────
app.post('/api/curriculum-from-materials', async (req, res) => {
  const { topic, days, materialsContext } = req.body;
  try {
    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'You are a curriculum designer. Respond ONLY with valid JSON, no markdown fences.',
      messages: [{
        role: 'user',
        content: `Create a learning curriculum for: "${topic}". The student has ${days} days.

Here are the instructor's materials — build the curriculum STRICTLY from this content:
===
${(materialsContext || '').slice(0, 10000)}
===

Return ONLY valid JSON:
{
  "title": "...",
  "level": "beginner|intermediate|advanced",
  "estimatedHours": <number>,
  "modules": [
    {
      "title": "...",
      "lessons": [{ "title": "...", "objective": "...", "minutes": <number> }]
    }
  ]
}
Rules: 5–7 modules, 2–4 lessons each. Total hours fits in ${days} days at ~1h/day. Only cover topics that appear in the provided materials.
Each lesson objective must describe what the student should understand by the end of that lesson, in one sentence.`,
      }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const curriculum = normalizeCurriculum(JSON.parse(text.trim().replace(/^```json\n?|```$/g, '')));
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
    console.log(`AINative API → http://${HOST}:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠  ANTHROPIC_API_KEY not set — copy .env.example to .env');
    }
  });
}
