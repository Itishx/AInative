import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppNav } from '../components/Chrome';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { HC, HCDark } from '../theme';
import { apiUrl } from '../api';
import { useStore } from '../store';
import type { StudySession, UsageSnapshot } from '../types';

type McqQuestion = { type: 'mcq'; q: string; options: string[]; correct: number };
type QuizData = { questions: McqQuestion[] };
type HoResult = { score: number; correct: boolean; whatWasRight: string; whatWasMissing: string; betterAnswer: string } | null;
type StudyNotesResponse = {
  notes: string;
  session?: StudySession | null;
  error?: string;
  limitReached?: boolean;
  retryAt?: string | null;
  study?: UsageSnapshot['study'];
};

// ── Inline markdown helpers ──────────────────────────────────────────────────

function inlineHtml(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family:monospace;font-size:0.88em;background:rgba(128,128,128,0.12);padding:1px 5px;border-radius:3px">$1</code>');
}

function formatTimeUntil(target: string) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${Math.max(1, totalMinutes)}m`;
}

const SLIDE_BG = 'linear-gradient(145deg,#1a1510 0%,#2d2218 55%,#1a1208 100%)';
const SLIDE_BORDER = '1px solid rgba(250,247,240,0.10)';

function StudySlide({ content }: { content: string }) {
  const lines = content.trim().split('\n');
  const isTable = lines[0]?.trimStart().startsWith('|');

  const parseCells = (row: string) =>
    row.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  if (isTable) {
    const rows = lines.filter((l) => !/^\s*\|[-:\s|]+\|\s*$/.test(l));
    const [header, ...body] = rows;
    if (!header) return null;
    return (
      <div style={{ margin: '28px 0', borderRadius: 16, overflow: 'hidden', background: SLIDE_BG, border: SLIDE_BORDER, boxShadow: '0 20px 56px rgba(0,0,0,0.28)' }}>
        <div style={{ padding: '10px 18px', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.38)', borderBottom: '1px solid rgba(250,247,240,0.08)' }}>
          visual · table
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {parseCells(header).map((cell, i) => (
                  <th key={i} style={{ padding: '11px 18px', textAlign: 'left', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.50)', borderBottom: '1px solid rgba(250,247,240,0.10)', whiteSpace: 'nowrap' }}
                    dangerouslySetInnerHTML={{ __html: inlineHtml(cell) }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid rgba(250,247,240,0.06)' }}>
                  {parseCells(row).map((cell, ci) => (
                    <td key={ci} style={{ padding: '12px 18px', color: 'rgba(250,247,240,0.90)', fontFamily: HC.sans, fontSize: 14, lineHeight: 1.5 }}
                      dangerouslySetInnerHTML={{ __html: inlineHtml(cell) }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const hasFence = lines[0]?.startsWith('```');
  const lang = hasFence ? lines[0].slice(3).trim() : '';
  const codeLines = hasFence ? lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined) : lines;
  return (
    <div style={{ margin: '28px 0', borderRadius: 16, overflow: 'hidden', background: SLIDE_BG, border: SLIDE_BORDER, boxShadow: '0 20px 56px rgba(0,0,0,0.28)' }}>
      <div style={{ padding: '10px 18px', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.38)', borderBottom: '1px solid rgba(250,247,240,0.08)' }}>
        {lang ? `visual · ${lang}` : 'visual · code'}
      </div>
      <pre style={{ margin: 0, padding: '22px 24px', overflowX: 'auto', fontFamily: HC.mono, fontSize: 13, lineHeight: 1.75, color: 'rgba(250,247,240,0.92)' }}>
        <code>{codeLines.join('\n')}</code>
      </pre>
    </div>
  );
}

function renderMarkdown(md: string, t: typeof HC) {
  const faint = t.ruleFaint;
  const ink = t.ink;
  const mute = t.mute;
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { elements.push(<div key={key++} style={{ height: 10 }} />); i++; continue; }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++;
      elements.push(
        <div key={key++} style={{ margin: '20px 0', borderRadius: 4, overflow: 'hidden' }}>
          {lang && <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: mute, background: `rgba(128,128,128,0.10)`, padding: '6px 16px', borderBottom: `1px solid ${faint}` }}>{lang}</div>}
          <pre style={{ margin: 0, padding: '18px 20px', background: `rgba(128,128,128,0.07)`, overflowX: 'auto', fontFamily: HC.mono, fontSize: 13, lineHeight: 1.65, color: ink, borderLeft: `3px solid ${faint}` }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    if (line.trim() === '### Slide' || line.trim().toLowerCase() === '### slide') {
      i++;
      const slideLines: string[] = [];
      while (i < lines.length && !lines[i].trim()) i++;
      if (i < lines.length && lines[i].startsWith('```')) {
        slideLines.push(lines[i]); i++;
        while (i < lines.length && !lines[i].startsWith('```')) { slideLines.push(lines[i]); i++; }
        if (i < lines.length) { slideLines.push(lines[i]); i++; }
      } else {
        while (i < lines.length && lines[i].trimStart().startsWith('|')) { slideLines.push(lines[i]); i++; }
      }
      if (slideLines.length) elements.push(<StudySlide key={key++} content={slideLines.join('\n')} />);
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{ fontFamily: HC.serif, fontSize: 26, fontWeight: 400, color: ink, margin: '36px 0 10px', letterSpacing: '-0.02em', borderBottom: `1px solid ${faint}`, paddingBottom: 8 }}>{line.slice(3)}</h2>);
      i++; continue;
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} style={{ fontFamily: HC.serif, fontSize: 36, fontWeight: 400, color: ink, margin: '0 0 20px', letterSpacing: '-0.03em' }}>{line.slice(2)}</h1>);
      i++; continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 10, margin: '5px 0' }}>
          <span style={{ color: ink, flexShrink: 0, fontSize: 8, marginTop: 7 }}>●</span>
          <span style={{ fontFamily: HC.sans, fontSize: 16, lineHeight: 1.65, color: ink }} dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(2)) }} />
        </div>
      );
      i++; continue;
    }

    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter((l) => !/^\s*\|[-:\s|]+\|\s*$/.test(l));
      elements.push(<StudySlide key={key++} content={rows.join('\n')} />);
      continue;
    }

    const isTabRow = (l: string) => l.includes('\t') && !l.startsWith('- ') && !l.startsWith('#');
    const isBoldRow = (l: string) => /^\*\*[^*]+\*\*[\t ]{2,}\S/.test(l);
    if (isTabRow(line) || isBoldRow(line)) {
      const tabRows: string[] = [];
      while (i < lines.length && (isTabRow(lines[i]) || isBoldRow(lines[i]))) { tabRows.push(lines[i]); i++; }
      const pipeRows = tabRows.map((l) => {
        const cells = l.split(/\t|  +/).map((c) => c.trim()).filter(Boolean);
        return '| ' + cells.join(' | ') + ' |';
      });
      elements.push(<StudySlide key={key++} content={pipeRows.join('\n')} />);
      continue;
    }

    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      elements.push(<p key={key++} style={{ fontFamily: HC.sans, fontSize: 15, fontWeight: 600, color: ink, margin: '18px 0 4px' }}>{line.trim().slice(2, -2)}</p>);
      i++; continue;
    }

    elements.push(
      <p key={key++} style={{ fontFamily: HC.sans, fontSize: 16, lineHeight: 1.7, color: ink, margin: '6px 0' }}
        dangerouslySetInnerHTML={{ __html: inlineHtml(line) }} />
    );
    i++;
  }
  return elements;
}

// ── Step bar ─────────────────────────────────────────────────────────────────

type Tab = 'notes' | 'quiz' | 'handson';

function StepBar({ activeTab, setActiveTab, quizSubmitted, t }: { activeTab: Tab; setActiveTab: (t: Tab) => void; quizSubmitted: boolean; t: typeof HC }) {
  const stepOrder: Tab[] = ['notes', 'quiz', 'handson'];
  const currentIdx = stepOrder.indexOf(activeTab);
  const steps = [
    { id: 'notes' as const, label: 'Notes', sub: 'Read first' },
    { id: 'quiz' as const, label: 'Quiz', sub: '10 questions' },
    { id: 'handson' as const, label: 'Hands-on', sub: 'Optional' },
  ];
  return (
    <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, si) => {
        const isActive = activeTab === step.id;
        const isDone = stepOrder.indexOf(step.id) < currentIdx;
        const isFuture = stepOrder.indexOf(step.id) > currentIdx;
        const locked = step.id === 'handson' && !quizSubmitted;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: si < steps.length - 1 ? 1 : 'none' }}>
            <button
              disabled={locked}
              title={locked ? 'Complete the quiz first' : undefined}
              onClick={() => { if (!locked) setActiveTab(step.id); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', padding: 0, flexShrink: 0, opacity: locked ? 0.45 : 1 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${isActive ? t.ink : isDone ? t.green : t.ruleFaint}`, background: isActive ? t.ink : isDone ? 'rgba(106,174,127,0.12)' : 'transparent', transition: 'all 180ms ease' }}>
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.green as string} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span style={{ fontFamily: HC.mono, fontSize: 11, fontWeight: 700, color: isActive ? t.paper : isFuture ? t.mute : t.ink }}>
                    {String(si + 1).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? t.ink : isDone ? t.green : t.mute, fontWeight: isActive ? 700 : 400 }}>
                  {step.label}
                </div>
                <div style={{ fontFamily: HC.mono, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.mute, marginTop: 1, opacity: 0.7 }}>
                  {step.sub}
                </div>
              </div>
            </button>
            {si < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 10px', marginBottom: 28, background: isDone ? t.green : t.ruleFaint, transition: 'background 300ms ease' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Study() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { dark } = useTheme();
  const { state, dispatch } = useStore();
  const t = dark ? HCDark : HC;

  const topic = params.get('topic') || '';
  const sessionId = params.get('sessionId') || '';

  // ── Notes phase ──
  const [notesReady, setNotesReady] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [studyLimit, setStudyLimit] = useState<UsageSnapshot['study'] | null>(null);

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  // ── Quiz phase ──
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // ── Hands-on phase ──
  const [hoQuestions, setHoQuestions] = useState<string[]>([]);
  const [hoAnswers, setHoAnswers] = useState<string[]>([]);
  const [hoResults, setHoResults] = useState<HoResult[]>([]);
  const [hoHints, setHoHints] = useState<string[]>([]);
  const [hoLoading, setHoLoading] = useState(false);
  const [hoError, setHoError] = useState('');
  const [hoChecking, setHoChecking] = useState<number | null>(null);
  const [hoHintLoading, setHoHintLoading] = useState<number | null>(null);
  const [hoHintErrors, setHoHintErrors] = useState<string[]>([]);
  const [hoIsCoding, setHoIsCoding] = useState(false);

  const quizRef = useRef<HTMLDivElement>(null);
  const loadKeyRef = useRef('');

  useEffect(() => {
    loadKeyRef.current = '';
    setNotesReady(false);
    setNotes('');
    setNotesError('');
    setStudyLimit(null);
    setActiveTab('notes');
    setQuiz(null);
    setQuizLoading(false);
    setQuizError('');
    setAnswers([]);
    setSubmitted(false);
    setHoQuestions([]);
    setHoAnswers([]);
    setHoResults([]);
    setHoHints([]);
    setHoLoading(false);
    setHoError('');
    setHoChecking(null);
    setHoHintLoading(null);
    setHoHintErrors([]);
    setHoIsCoding(false);
  }, [sessionId, topic]);

  // ── Load notes ──
  useEffect(() => {
    const loadKey = `${sessionId}:${topic}`;
    if (sessionId) {
      const saved = (state.studySessions ?? []).find((s) => s.id === sessionId);
      if (saved) {
        setNotesError('');
        setNotes(saved.notes);
        setNotesReady(true);
        return;
      }
      setNotesError('That study session could not be found.');
      setNotesReady(true);
      return;
    }
    if (loading || !topic || loadKeyRef.current === loadKey) return;
    if (!user?.id) {
      setNotesError('Please sign in again to start a study session.');
      setNotesReady(true);
      return;
    }
    loadKeyRef.current = loadKey;

    const notesContext = sessionStorage.getItem('study_notes_context') || undefined;

    fetch(apiUrl('/api/study-notes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, notesContext, userId: user.id }),
    })
      .then(async (r) => {
        const data = await r.json() as StudyNotesResponse;
        if (!r.ok || data.error) {
          const err = new Error(data.error || 'Could not generate study notes.') as Error & { payload?: StudyNotesResponse };
          err.payload = data;
          throw err;
        }
        return data;
      })
      .then((data) => {
        setStudyLimit(data.study ?? null);
        if (notesContext) sessionStorage.removeItem('study_notes_context');
        setNotes(data.notes);
        setNotesReady(true);
        dispatch({
          type: 'ADD_STUDY_SESSION',
          session: data.session ?? { id: crypto.randomUUID(), topic, notes: data.notes, createdAt: new Date().toISOString() },
        });
      })
      .catch((err: Error & { payload?: StudyNotesResponse }) => {
        if (err.payload?.study) setStudyLimit(err.payload.study);
        setNotesError(err.message);
        setNotesReady(true);
      });
  }, [dispatch, loading, sessionId, state.studySessions, topic, user?.id]);

  // ── Switch to quiz tab — load quiz ──
  async function goToQuiz() {
    setActiveTab('quiz');
    if (quiz) return;
    setQuizLoading(true);
    setQuizError('');
    try {
      const res = await fetch(apiUrl('/api/study-quiz'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, notes }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
    } catch (err: unknown) {
      setQuizError(err instanceof Error ? err.message : String(err));
    } finally {
      setQuizLoading(false);
    }
  }

  function submitQuiz() { setSubmitted(true); }

  // ── Hands-on ──
  async function handleGenerateHo() {
    setHoLoading(true);
    setHoError('');
    try {
      const res = await fetch(apiUrl('/api/handson'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: topic,
          moduleTitle: 'Study Session',
          lessonTitle: topic,
          chatHistory: [{ who: 'tutor', text: notes }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHoQuestions(data.questions);
      setHoAnswers(new Array(data.questions.length).fill(''));
      setHoResults(new Array(data.questions.length).fill(null));
      setHoHints(new Array(data.questions.length).fill(''));
      setHoHintErrors(new Array(data.questions.length).fill(''));
      setHoIsCoding(data.isCoding ?? false);
    } catch (err: unknown) {
      setHoError(err instanceof Error ? err.message : String(err));
    } finally {
      setHoLoading(false);
    }
  }

  async function handleCheckHo(idx: number) {
    setHoChecking(idx);
    try {
      const res = await fetch(apiUrl('/api/handson-check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: hoQuestions[idx], userAnswer: hoAnswers[idx], courseTitle: topic, lessonTitle: topic, isCoding: hoIsCoding }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHoResults((prev) => { const n = [...prev]; n[idx] = data; return n; });
    } catch (err: unknown) {
      setHoError(err instanceof Error ? err.message : String(err));
    } finally {
      setHoChecking(null);
    }
  }

  async function handleGetHint(idx: number) {
    setHoHintLoading(idx);
    setHoHintErrors((prev) => { const n = [...prev]; n[idx] = ''; return n; });
    try {
      const res = await fetch(apiUrl('/api/handson-hint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: hoQuestions[idx], courseTitle: topic, lessonTitle: topic, isCoding: hoIsCoding, notesContext: notes }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHoHints((prev) => { const n = [...prev]; n[idx] = data.hint; return n; });
    } catch (err: unknown) {
      setHoHintErrors((prev) => { const n = [...prev]; n[idx] = err instanceof Error ? err.message : String(err); return n; });
    } finally {
      setHoHintLoading(null);
    }
  }

  const score = quiz ? answers.filter((a, i) => a === quiz.questions[i].correct).length : 0;
  const pct = quiz ? Math.round((score / quiz.questions.length) * 100) : 0;

  const panelFill = dark ? 'rgba(241,236,223,0.06)' : 'rgba(26,21,16,0.045)';
  const studyRetryLabel = studyLimit?.retryAt ? formatTimeUntil(studyLimit.retryAt) : '';
  const studyUnlockStamp = studyLimit?.retryAt
    ? new Date(studyLimit.retryAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: t.paper, color: t.ink }}>
      <AppNav />

      <div style={{ flex: 1, maxWidth: 980, margin: '0 auto', width: '100%', padding: '44px 40px 96px' }}>

        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.mute, padding: 0, marginBottom: 20 }}
          >
            ← Dashboard
          </button>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.red, marginBottom: 8 }}>
            — study session
          </div>
          <h1 style={{ fontFamily: HC.serif, fontSize: 'clamp(30px, 4vw, 54px)', fontWeight: 400, letterSpacing: '-0.035em', margin: '0 0 6px', color: t.ink }}>
            {topic}
          </h1>
          <div style={{ fontFamily: HC.sans, fontSize: 15, color: t.mute, lineHeight: 1.55, maxWidth: 580, marginBottom: 4 }}>
            {activeTab === 'notes' && 'Read through the notes first — generated just for this topic.'}
            {activeTab === 'quiz' && '10 questions. Score 80%+ to feel the aura.'}
            {activeTab === 'handson' && 'Write your answers. The AI checks your logic and gives detailed feedback.'}
          </div>

          {/* Step bar */}
          <StepBar activeTab={activeTab} setActiveTab={(tab) => { if (tab === 'quiz') { goToQuiz(); } else { setActiveTab(tab); } }} quizSubmitted={submitted} t={t} />
        </div>

        {/* ── Notes tab ── */}
        {activeTab === 'notes' && (
          <div style={{ marginTop: 34, maxWidth: 760 }}>
            {!notesReady && (
              <div style={{ padding: '80px 0' }}>
                <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.mute, marginBottom: 16 }}>
                  generating study notes…
                </div>
                <div style={{ width: 200, height: 2, background: t.ruleFaint, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: t.red, animation: 'studyLoad 1.4s ease-in-out infinite', width: '40%' }} />
                </div>
                <style>{`@keyframes studyLoad { 0%{transform:translateX(-100%)} 50%{transform:translateX(400%)} 100%{transform:translateX(400%)} }`}</style>
              </div>
            )}

            {notesError && (
              <div style={{ padding: '12px 16px', border: `1px solid ${t.red}`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.05)', display: 'flex', gap: 10, marginBottom: 24 }}>
                <span style={{ color: t.red, fontFamily: HC.mono, fontWeight: 700 }}>!</span>
                <div style={{ fontSize: 13, color: t.ink, lineHeight: 1.6 }}>
                  <div>{notesError}</div>
                  {studyLimit?.retryAt && (
                    <>
                      <div style={{ marginTop: 6, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.mute }}>
                        Next free session in {studyRetryLabel}{studyUnlockStamp ? ` · ${studyUnlockStamp}` : ''}
                      </div>
                      <a href="/settings?tab=billing" style={{ display: 'inline-block', marginTop: 8, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.ink, textDecoration: 'none', borderBottom: `1px solid ${t.ink}` }}>
                        Upgrade to premium →
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}

            {notesReady && notes && (
              <>
                <article style={{ borderTop: `1px solid ${t.ruleFaint}`, paddingTop: 22, color: t.ink }}>
                  {renderMarkdown(notes, t)}
                </article>
                <button
                  onClick={goToQuiz}
                  style={{ marginTop: 28, border: `1px solid ${t.ink}`, background: t.ink, color: t.paper, fontFamily: HC.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '13px 20px', cursor: 'pointer' }}
                >
                  Take the quiz →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Quiz tab ── */}
        {activeTab === 'quiz' && (
          <div ref={quizRef} style={{ marginTop: 34, maxWidth: 760 }}>
            {quizLoading && (
              <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: t.mute }}>
                Generating quiz…
              </div>
            )}

            {quizError && (
              <div style={{ padding: '12px 16px', border: `1px solid ${t.red}`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.05)', display: 'flex', gap: 10 }}>
                <span style={{ color: t.red, fontFamily: HC.mono, fontWeight: 700 }}>!</span>
                <div style={{ fontSize: 13 }}>{quizError}</div>
              </div>
            )}

            {!quizLoading && !quizError && quiz && quiz.questions.map((q, qi) => {
              const chosen = answers[qi];
              return (
                <div key={qi} style={{ marginTop: 30, paddingTop: 24, borderTop: `1px solid ${t.ruleFaint}` }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                    <span style={{ fontFamily: HC.mono, fontSize: 11, color: t.red, flexShrink: 0, marginTop: 4 }}>
                      {String(qi + 1).padStart(2, '0')}
                    </span>
                    <div style={{ fontFamily: HC.serif, fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1.4, color: t.ink }}>{q.q}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 28 }}>
                    {q.options.map((opt, oi) => {
                      const isChosen = chosen === oi;
                      const isRight = oi === q.correct;
                      let bg2 = 'transparent';
                      let border2 = `1px solid ${t.ruleFaint}`;
                      let color2 = t.ink;
                      if (submitted && isRight) { bg2 = `${t.green}22`; border2 = `1px solid ${t.green}`; color2 = t.green; }
                      else if (submitted && isChosen && !isRight) { bg2 = `${t.red}18`; border2 = `1px solid ${t.red}66`; color2 = t.red; }
                      else if (!submitted && isChosen) { border2 = `1px solid ${t.ink}`; }
                      return (
                        <button key={oi} disabled={submitted} onClick={() => { const next = [...answers]; next[qi] = oi; setAnswers(next); }}
                          style={{ background: bg2, border: border2, color: color2, padding: '14px 18px', cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontFamily: HC.sans, fontSize: 15, lineHeight: 1.4, transition: 'all 140ms ease' }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!quizLoading && !quizError && quiz && !submitted && (
              <div style={{ marginTop: 32 }}>
                <button
                  onClick={submitQuiz}
                  disabled={answers.some((a) => a === null)}
                  style={{ border: `1px solid ${t.ink}`, background: answers.some((a) => a === null) ? t.ruleFaint : t.ink, color: answers.some((a) => a === null) ? t.mute : t.paper, fontFamily: HC.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '13px 20px', cursor: answers.some((a) => a === null) ? 'not-allowed' : 'pointer' }}
                >
                  Submit →
                </button>
              </div>
            )}

            {submitted && quiz && (
              <div style={{ marginTop: 48, padding: 40, border: `1px solid ${t.ruleFaint}`, textAlign: 'center' }}>
                <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.mute, marginBottom: 16 }}>your score</div>
                <div style={{ fontFamily: HC.serif, fontSize: 'clamp(64px, 10vw, 96px)', fontWeight: 400, letterSpacing: '-0.04em', color: pct >= 80 ? t.green : pct >= 50 ? t.amber : t.red, lineHeight: 1 }}>
                  {pct}%
                </div>
                <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20, color: t.mute, margin: '12px 0 32px' }}>
                  {score} of {quiz.questions.length} correct
                  {pct >= 90 ? ' — feels the aura.' : pct >= 80 ? ' — good going.' : pct >= 50 ? ' — you passed, keep going.' : ' — review the notes and try again.'}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setSubmitted(false); setAnswers(new Array(quiz.questions.length).fill(null)); }}
                    style={{ background: 'transparent', border: `1px solid ${t.ruleFaint}`, color: t.ink, padding: '12px 24px', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Retake →
                  </button>
                  <button
                    onClick={() => { setActiveTab('handson'); if (hoQuestions.length === 0 && !hoLoading) handleGenerateHo(); }}
                    style={{ background: t.ink, border: 'none', color: t.paper, padding: '12px 24px', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Hands-on →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Hands-on tab ── */}
        {activeTab === 'handson' && (
          <div style={{ marginTop: 34, maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.red }}>
                hands-on practice
              </div>
              <button
                onClick={handleGenerateHo}
                disabled={hoLoading}
                style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${t.ruleFaint}`, background: 'transparent', color: t.mute, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: hoLoading ? 'not-allowed' : 'pointer', opacity: hoLoading ? 0.4 : 1 }}
              >
                {hoQuestions.length > 0 ? 'Regenerate' : 'Generate →'}
              </button>
            </div>

            {hoLoading && (
              <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: t.mute }}>
                Generating practice questions…
              </div>
            )}

            {hoError && (
              <div style={{ padding: '12px 16px', border: `1px solid ${t.red}`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.05)', display: 'flex', gap: 10, marginBottom: 16 }}>
                <span style={{ color: t.red, fontFamily: HC.mono, fontWeight: 700 }}>!</span>
                <div style={{ fontSize: 13, color: t.ink }}>{hoError}</div>
              </div>
            )}

            {!hoLoading && hoQuestions.length === 0 && !hoError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontFamily: HC.sans, fontSize: 15, lineHeight: 1.65, color: t.mute }}>
                  5 typed questions based on what was covered in the notes. The AI checks your answers and gives detailed feedback.
                </div>
                <button
                  onClick={handleGenerateHo}
                  style={{ alignSelf: 'flex-start', padding: '13px 20px', border: `1px solid ${t.ink}`, background: t.ink, color: t.paper, fontFamily: HC.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Generate questions →
                </button>
              </div>
            )}

            {hoQuestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 30, borderTop: `1px solid ${t.ruleFaint}`, paddingTop: 22 }}>
                {hoQuestions.map((q, idx) => {
                  const result = hoResults[idx];
                  const isChecking = hoChecking === idx;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: HC.mono, fontSize: 11, color: t.red, flexShrink: 0, marginTop: 3 }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div style={{ fontFamily: HC.serif, fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1.4 }}>{q}</div>
                      </div>
                      <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <textarea
                          value={hoAnswers[idx] || ''}
                          onChange={(e) => { if (!result) setHoAnswers((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; }); }}
                          placeholder={hoIsCoding ? 'Write your code / query here…' : 'Type your answer here…'}
                          rows={hoIsCoding ? 6 : 3}
                          disabled={isChecking || !!result}
                          style={{ width: '100%', resize: 'vertical', padding: '12px 14px', border: `1px solid ${result ? (result.correct ? (dark ? 'rgba(106,174,127,0.4)' : 'rgba(45,106,63,0.3)') : 'rgba(196,34,27,0.3)') : t.ruleFaint}`, background: result ? (result.correct ? (dark ? 'rgba(106,174,127,0.06)' : 'rgba(45,106,63,0.04)') : (dark ? 'rgba(232,81,74,0.06)' : 'rgba(196,34,27,0.03)')) : hoIsCoding ? (dark ? 'rgba(0,0,0,0.3)' : '#16120f') : panelFill, color: hoIsCoding && !result ? (dark ? t.ink : HC.paper) : t.ink, fontFamily: hoIsCoding ? HC.mono : HC.sans, fontSize: hoIsCoding ? 13 : 15, lineHeight: 1.6, outline: 'none', boxSizing: 'border-box', whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto', opacity: result ? 0.75 : 1 }}
                        />

                        {!result && (
                          <>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleGetHint(idx)}
                                disabled={hoHintLoading === idx}
                                style={{ padding: '10px 16px', border: `1px solid ${t.ruleFaint}`, background: 'transparent', color: t.mute, fontFamily: HC.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: hoHintLoading === idx ? 'not-allowed' : 'pointer', opacity: hoHintLoading === idx ? 0.4 : 1 }}
                              >
                                {hoHintLoading === idx ? 'Loading…' : hoHints[idx] ? 'Hint again' : 'Show hint'}
                              </button>
                              <button
                                onClick={() => handleCheckHo(idx)}
                                disabled={isChecking || !hoAnswers[idx]?.trim()}
                                style={{ padding: '10px 18px', border: `1px solid ${t.ink}`, background: 'transparent', color: t.ink, fontFamily: HC.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: isChecking || !hoAnswers[idx]?.trim() ? 'not-allowed' : 'pointer', opacity: isChecking || !hoAnswers[idx]?.trim() ? 0.4 : 1 }}
                              >
                                {isChecking ? 'Checking…' : 'Check answer →'}
                              </button>
                            </div>
                            {hoHintErrors[idx] && <div style={{ fontSize: 12, color: t.red, fontFamily: HC.mono }}>{hoHintErrors[idx]}</div>}
                            {hoHints[idx] && (
                              <div style={{ padding: '10px 14px', border: `1px solid ${dark ? 'rgba(241,236,223,0.12)' : 'rgba(26,21,16,0.1)'}`, background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.03)' }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.amber, marginBottom: 6 }}>Hint</div>
                                <div style={{ fontSize: 14, lineHeight: 1.65, color: t.ink }}>{hoHints[idx]}</div>
                              </div>
                            )}
                          </>
                        )}

                        {result && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: result.correct ? t.green : t.red }}>
                                {result.correct ? '✓ Correct' : '✗ Needs work'} · {result.score}/100
                              </span>
                              <button
                                onClick={() => setHoResults((prev) => { const n = [...prev]; n[idx] = null; return n; })}
                                style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.mute, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                retry
                              </button>
                            </div>
                            {result.whatWasRight && (
                              <div style={{ padding: '12px 16px', border: `1px solid ${dark ? 'rgba(106,174,127,0.25)' : 'rgba(45,106,63,0.18)'}`, background: dark ? 'rgba(106,174,127,0.08)' : 'rgba(45,106,63,0.05)' }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.green, marginBottom: 6 }}>What you got right</div>
                                <div style={{ fontSize: 15, lineHeight: 1.65, color: t.ink }}>{result.whatWasRight}</div>
                              </div>
                            )}
                            {result.whatWasMissing && (
                              <div style={{ padding: '12px 16px', border: `1px solid rgba(196,34,27,0.22)`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.04)' }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.red, marginBottom: 6 }}>What was missing</div>
                                <div style={{ fontSize: 15, lineHeight: 1.65, color: t.ink }}>{result.whatWasMissing}</div>
                              </div>
                            )}
                            {result.betterAnswer && (
                              <div style={{ padding: '12px 16px', border: `1px solid ${t.ruleFaint}`, background: panelFill }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.mute, marginBottom: 6 }}>Model answer</div>
                                <div style={{ fontSize: 15, lineHeight: 1.65, color: t.ink }}>{result.betterAnswer}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{ paddingTop: 28, borderTop: `1px solid ${t.ruleFaint}`, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{ padding: '13px 24px', border: `1px solid ${t.ink}`, background: t.ink, color: t.paper, fontFamily: HC.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Done →
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    style={{ padding: '13px 24px', border: `1px solid ${t.ruleFaint}`, background: 'transparent', color: t.ink, fontFamily: HC.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    ← Back to notes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
