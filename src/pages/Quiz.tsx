import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { HC, HCDark, btn, type Colors } from '../theme';
import { useStore } from '../store';
import type { MCQQuestion } from '../types';
import { useTheme } from '../lib/theme';

interface GradeResult { passed: boolean; score: number; feedback: string; }
interface PracticalExercise {
  title: string;
  task: string;
  deliverable: string;
  submissionHint: string;
}

function renderInlineFormatting(text: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={`${match.index}-bold`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={`${match.index}-italic`}>{token.slice(1, -1)}</em>);
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

function isMarkdownTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isMarkdownTableDivider(line: string) {
  const trimmed = line.trim();
  return /^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed);
}

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function renderMarkdown(text: string, theme: Colors, dark = false) {
  const lines = text.split('\n');
  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }

      rendered.push(
        <pre
          key={`code-${i}`}
          style={{
            margin: '12px 0 16px',
            padding: '12px 14px',
            background: dark ? 'rgba(250,247,240,0.08)' : '#16120f',
            color: dark ? theme.ink : HC.paper,
            overflowX: 'auto',
            fontFamily: HC.mono,
            fontSize: 13,
            lineHeight: 1.55,
            whiteSpace: 'pre',
          }}
        >
          <code>{codeLines.join('\n').trim()}</code>
        </pre>,
      );
      continue;
    }

    if (!trimmed) {
      rendered.push(<div key={`space-${i}`} style={{ height: 8 }} />);
      continue;
    }

    if (isMarkdownTableLine(line) && i + 1 < lines.length && isMarkdownTableDivider(lines[i + 1])) {
      const header = parseMarkdownTableRow(line);
      const rows: string[][] = [];
      i += 2;

      while (i < lines.length && isMarkdownTableLine(lines[i])) {
        rows.push(parseMarkdownTableRow(lines[i]));
        i += 1;
      }

      i -= 1;
      rendered.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '14px 0 18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.5, color: theme.ink }}>
            <thead>
              <tr>
                {header.map((cell, cellIndex) => (
                  <th
                    key={`head-${i}-${cellIndex}`}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderBottom: `1px solid ${theme.ruleFaint}`,
                      fontFamily: HC.mono,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: theme.mute,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {renderInlineFormatting(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${i}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`cell-${i}-${rowIndex}-${cellIndex}`}
                      style={{
                        padding: '10px',
                        borderBottom: `1px solid ${theme.ruleFaint}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      rendered.push(<div key={`rule-${i}`} style={{ height: 1, background: theme.ruleFaint, margin: '22px 0' }} />);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      rendered.push(<h3 key={`h2-${i}`} style={{ fontFamily: HC.serif, fontSize: 26, fontWeight: 400, margin: '28px 0 10px', letterSpacing: '-0.02em', color: theme.ink }}>{renderInlineFormatting(trimmed.slice(3))}</h3>);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      rendered.push(<h2 key={`h1-${i}`} style={{ fontFamily: HC.serif, fontSize: 34, fontWeight: 400, margin: '28px 0 12px', letterSpacing: '-0.03em', color: theme.ink }}>{renderInlineFormatting(trimmed.slice(2))}</h2>);
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      rendered.push(<div key={`bullet-${i}`} style={{ display: 'flex', gap: 10, marginBottom: 8, color: theme.ink }}><span style={{ color: theme.red, fontFamily: HC.mono, fontSize: 14 }}>·</span><span style={{ fontSize: 17, lineHeight: 1.72 }}>{renderInlineFormatting(trimmed.slice(2))}</span></div>);
      continue;
    }

    rendered.push(<p key={`text-${i}`} style={{ margin: '0 0 16px', fontSize: 18, lineHeight: 1.78, color: theme.ink }}>{renderInlineFormatting(line)}</p>);
  }

  return rendered;
}

function QuizContent({ courseId, mi, li }: { courseId: string; mi: number; li: number }) {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const { dark } = useTheme();
  const theme = dark ? HCDark : HC;
  const panelFill = dark ? 'rgba(241,236,223,0.055)' : 'rgba(26,21,16,0.035)';
  const panelFillStrong = dark ? 'rgba(241,236,223,0.09)' : 'rgba(26,21,16,0.065)';
  const tabBase: React.CSSProperties = {
    border: `1px solid ${theme.ruleFaint}`,
    background: panelFill,
    color: theme.mute,
    borderRadius: 999,
    padding: '11px 18px',
    fontFamily: HC.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };

  const course = state.courses.find((c) => c.id === courseId)!;
  const mod = course.curriculum.modules[mi];
  const lesson = mod.lessons[li];
  const lessonKey = `${mi}:${li}`;

  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [practicalExercises, setPracticalExercises] = useState<PracticalExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [uploads, setUploads] = useState<Record<number, File | null>>({});

  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [results, setResults] = useState<Array<GradeResult | null>>([]);
  const [overallPreferredMet, setOverallPreferredMet] = useState(false);

  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'handson'>('notes');
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesGenError, setNotesGenError] = useState('');

  useEffect(() => {
    if (!lesson.notes && !generatingNotes) handleGenerateNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerateNotes() {
    setGeneratingNotes(true);
    setNotesGenError('');
    try {
      const lessonChatHistory = course.lessonChats?.[lessonKey] ?? [];
      const isLastLessonOfModule = li === mod.lessons.length - 1;
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.subject,
          moduleTitle: mod.title,
          lessonTitle: isLastLessonOfModule ? `Full module: ${mod.title}` : lesson.title,
          lessonObjective: lesson.objective,
          lessonDescription: (lesson as any).description,
          lessonFacts: (lesson as any).facts,
          chatHistory: lessonChatHistory,
          premium: isPremium,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      dispatch({ type: 'SAVE_LESSON_NOTES', id: courseId, moduleIndex: mi, lessonIndex: li, notes: data.notes });
      if (isLastLessonOfModule) {
        dispatch({ type: 'SAVE_MODULE_NOTES', id: courseId, moduleIndex: mi, notes: data.notes });
      }
    } catch (e) {
      setNotesGenError((e as Error).message);
    } finally {
      setGeneratingNotes(false);
    }
  }

  const isPremium = state.profile?.plan === 'premium';
  const [hoQuestions, setHoQuestions] = useState<string[]>([]);
  const [hoAnswers, setHoAnswers] = useState<string[]>([]);
  const [hoResults, setHoResults] = useState<Array<{ score: number; correct: boolean; whatWasRight: string; whatWasMissing: string; betterAnswer: string } | null>>([]);
  const [hoLoading, setHoLoading] = useState(false);
  const [hoChecking, setHoChecking] = useState<number | null>(null);
  const [hoHintLoading, setHoHintLoading] = useState<number | null>(null);
  const [hoHints, setHoHints] = useState<(string | null)[]>([]);
  const [hoHintError, setHoHintError] = useState('');
  const [hoIsCoding, setHoIsCoding] = useState(false);
  const [hoError, setHoError] = useState('');

  async function handleGetHint(idx: number) {
    if (hoHintLoading !== null) return;
    setHoHintLoading(idx);
    setHoHintError('');
    try {
      const res = await fetch('/api/handson-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: hoQuestions[idx],
          courseTitle: course.subject,
          lessonTitle: lesson.title,
          isCoding: hoIsCoding,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status} — try restarting the server`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHoHints((prev) => { const n = [...prev]; n[idx] = data.hint; return n; });
    } catch (e) {
      setHoHintError((e as Error).message);
    } finally {
      setHoHintLoading(null);
    }
  }

  async function handleGenerateHo() {
    setHoLoading(true);
    setHoError('');
    setHoQuestions([]);
    setHoAnswers([]);
    setHoResults([]);
    setHoHints([]);
    try {
      const res = await fetch('/api/handson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.subject,
          moduleTitle: mod.title,
          lessonTitle: lesson.title,
          chatHistory: course.lessonChats?.[lessonKey] ?? [],
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status} — restart the server to pick up new endpoints`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('No questions returned from API');
      setHoQuestions(data.questions);
      setHoAnswers(data.questions.map(() => ''));
      setHoResults(data.questions.map(() => null));
      setHoHints(data.questions.map(() => null));
      setHoIsCoding(!!data.isCoding);
    } catch (e) {
      setHoError((e as Error).message);
    } finally {
      setHoLoading(false);
    }
  }

  async function handleCheckHo(idx: number) {
    if (hoChecking !== null) return;
    const answer = hoAnswers[idx]?.trim();
    if (!answer) return;
    setHoChecking(idx);
    try {
      const res = await fetch('/api/handson-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: hoQuestions[idx],
          userAnswer: answer,
          courseTitle: course.subject,
          lessonTitle: lesson.title,
          isCoding: hoIsCoding,
        }),
      });
      const data = await res.json();
      if (!data.error) setHoResults((prev) => { const n = [...prev]; n[idx] = data; return n; });
    } catch { /* silent */ }
    finally { setHoChecking(null); }
  }
  async function loadQuizPayload() {
    setLoading(true);
    setError('');
    const lessonChatHistory = course.lessonChats?.[lessonKey] ?? [];
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.subject,
          moduleTitle: mod.title,
          lessonTitle: lesson.title,
          chatHistory: lessonChatHistory,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const normalizedQuestions = (data.questions as MCQQuestion[] | undefined ?? [])
        .filter((q) => Array.isArray(q.options) && q.options.length === 4)
        .map((q) => ({ ...q, type: 'mcq' as const }))
        .slice(0, 8);
      setQuestions(normalizedQuestions);
      setPracticalExercises(Array.isArray(data.practicalExercises) ? data.practicalExercises : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!course || !mod || !lesson) return;
    loadQuizPayload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, lessonKey, mi, li]);

  const allAnswered = questions.length > 0 && questions.every((_, i) => (mcqAnswers[i] ?? -1) >= 0);

  async function handleSubmit() {
    if (!allAnswered) return;
    setGrading(true);
    try {
      const resultArr: GradeResult[] = questions.map((mcq, i) => {
        const passed = mcqAnswers[i] === mcq.correct;
        return {
          passed,
          score: passed ? 1 : 0,
          feedback: passed ? 'Correct.' : `Correct answer: ${mcq.options[mcq.correct]}`,
        };
      });
      setResults(resultArr);
      const totalScore = resultArr.reduce((sum, r) => sum + r.score, 0) / resultArr.length;
      setOverallPreferredMet(totalScore >= 0.7);
      dispatch({
        type: 'RECORD_QUIZ_ATTEMPT',
        attempt: {
          id: genId(),
          topic: lesson.title,
          courseId: course.id,
          courseTitle: course.subject,
          moduleIndex: mi,
          lessonIndex: li,
          score: resultArr.reduce((sum, r) => sum + r.score, 0),
          total: resultArr.length,
          createdAt: new Date().toISOString(),
        },
      });
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGrading(false);
    }
  }

  function handleContinue() {
    dispatch({ type: 'COMPLETE_LESSON', id: course.id, moduleIndex: mi, lessonIndex: li, preferredMet: overallPreferredMet });

    const updatedMods = course.curriculum.modules.map((m, mii) => {
      if (mii !== mi) return m;
      return {
        ...m,
        lessons: m.lessons.map((l, lii) =>
          lii !== li ? l : { ...l, completed: true, quizPassed: overallPreferredMet || l.quizPassed }
        ),
      };
    });
    const allDone = updatedMods.every((m) => m.lessons.every((l) => l.completed));
    if (allDone) {
      const marginMs = Math.max(0, new Date(course.deadline).getTime() - Date.now());
      const tookDays = Math.round((Date.now() - new Date(course.createdAt).getTime()) / 86400000);
      dispatch({
        type: 'ADD_LEADERBOARD',
        entry: { rank: 0, user: state.username, course: course.subject, marginMs, days: tookDays, streak: course.streak, certId: course.certId ?? genId() },
      });
    }
    navigate(`/learn/${course.id}`);
  }

  const totalScore = submitted && results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r?.score ?? 0), 0) / results.length * 100)
    : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.ink }}>
      <div style={{ flex: 1, maxWidth: 980, margin: '0 auto', width: '100%', padding: '44px 40px 72px' }}>
        {/* Header */}
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.red }}>
          {course.subject} · Module {mi + 1} · Lesson {li + 1}
        </div>
        <h1 style={{ fontFamily: HC.serif, fontSize: 'clamp(30px, 4vw, 54px)', fontWeight: 400, letterSpacing: '-0.035em', margin: '8px 0 6px', color: theme.ink }}>
          {lesson.title}
        </h1>
        <div style={{ fontFamily: HC.sans, fontSize: 15, color: theme.mute, lineHeight: 1.55, maxWidth: 580, marginBottom: 4 }}>
          {activeTab === 'notes' && 'Read through the notes first — they cover exactly what was taught in this lesson.'}
          {activeTab === 'quiz' && '8 multiple choice questions. 70% is the target, but it\'s not a blocker — you can continue either way.'}
          {activeTab === 'handson' && 'Write your answers. For coding lessons, type the actual query or code. The AI checks your logic and gives detailed feedback.'}
        </div>
        {(() => {
          const stepOrder: ('notes' | 'quiz' | 'handson')[] = ['notes', 'quiz', 'handson'];
          const currentIdx = stepOrder.indexOf(activeTab);
          const steps = [
            { id: 'notes' as const, label: 'Notes', sub: 'Read first' },
            { id: 'quiz' as const, label: 'Quiz', sub: '8 questions' },
            { id: 'handson' as const, label: 'Hands-on', sub: 'Optional' },
          ];
          return (
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 0 }}>
              {steps.map((step, si) => {
                const isActive = activeTab === step.id;
                const isDone = stepOrder.indexOf(step.id) < currentIdx;
                const isFuture = stepOrder.indexOf(step.id) > currentIdx;
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: si < steps.length - 1 ? 1 : 'none' }}>
                    <button
                      disabled={step.id === 'handson' && !submitted}
                      title={step.id === 'handson' && !submitted ? 'Complete the quiz first' : undefined}
                      onClick={() => {
                        if (step.id === 'handson') {
                          if (!submitted) return;
                          setActiveTab('handson');
                          if (hoQuestions.length === 0 && !hoLoading) handleGenerateHo();
                        } else {
                          setActiveTab(step.id);
                        }
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: step.id === 'handson' && !submitted ? 'not-allowed' : 'pointer',
                        padding: 0, flexShrink: 0, opacity: step.id === 'handson' && !submitted ? 0.45 : 1,
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${isActive ? theme.ink : isDone ? theme.green : theme.ruleFaint}`,
                        background: isActive ? theme.ink : isDone ? (dark ? 'rgba(106,174,127,0.15)' : 'rgba(45,106,63,0.1)') : 'transparent',
                        transition: 'all 180ms ease',
                      }}>
                        {isDone ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.green as string} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span style={{ fontFamily: HC.mono, fontSize: 11, fontWeight: 700, color: isActive ? theme.bg : isFuture ? theme.mute : theme.ink }}>
                            {String(si + 1).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? theme.ink : isDone ? theme.green : theme.mute, fontWeight: isActive ? 700 : 400 }}>
                          {step.label}
                        </div>
                        <div style={{ fontFamily: HC.mono, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.mute, marginTop: 1, opacity: 0.7 }}>
                          {step.sub}
                        </div>
                      </div>
                    </button>
                    {si < steps.length - 1 && (
                      <div style={{ flex: 1, height: 2, margin: '0 10px', marginBottom: 28, background: isDone ? theme.green : theme.ruleFaint, transition: 'background 300ms ease' }} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {activeTab === 'notes' && (
          <div style={{ marginTop: 34, maxWidth: 760 }}>
            {!isPremium && lesson.notes && (
              <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, border: `1px solid ${dark ? 'rgba(241,236,223,0.10)' : 'rgba(26,21,16,0.08)'}`, background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.025)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.amber, marginBottom: 4 }}>Basic notes</div>
                  <div style={{ fontFamily: HC.sans, fontSize: 13, lineHeight: 1.5, color: theme.mute }}>Upgrade to Premium for deeper notes — structured breakdowns, worked examples, common mistakes, and a mental model.</div>
                </div>
                <a href="/settings?tab=billing" style={{ flexShrink: 0, padding: '9px 16px', border: `1px solid ${theme.ink}`, background: 'transparent', color: theme.ink, fontFamily: HC.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer' }}>Upgrade →</a>
              </div>
            )}

            {generatingNotes && (
              <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.mute }}>Generating your notes…</div>
                <div style={{ width: 160, height: 2, background: theme.ruleFaint, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: theme.ink, animation: 'notesProgress 1.4s ease-in-out infinite', transformOrigin: 'left' }} />
                </div>
                <style>{`@keyframes notesProgress { 0%{transform:scaleX(0) translateX(0)} 50%{transform:scaleX(0.7) translateX(40%)} 100%{transform:scaleX(0) translateX(200%)} }`}</style>
              </div>
            )}

            {notesGenError && !generatingNotes && (
              <div style={{ marginBottom: 14, padding: '12px 16px', border: `1px solid ${theme.red}`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 13, color: theme.red }}>{notesGenError}</div>
                <button onClick={handleGenerateNotes} style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.ink, background: 'none', border: `1px solid ${theme.ink}`, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>Retry</button>
              </div>
            )}

            {lesson.notes && (
              <>
                <article style={{ borderTop: `1px solid ${theme.ruleFaint}`, paddingTop: 22, color: theme.ink }}>
                  {renderMarkdown(lesson.notes, theme, dark)}
                </article>
                <button
                  onClick={() => setActiveTab('quiz')}
                  style={{ marginTop: 28, border: `1px solid ${theme.ink}`, background: theme.ink, color: theme.bg, fontFamily: HC.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '13px 20px', cursor: 'pointer' }}
                >
                  Take the quiz →
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'handson' && (
          <div style={{ marginTop: 34, maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
              <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.red }}>
                hands-on practice
              </div>
              <button
                onClick={handleGenerateHo}
                disabled={hoLoading}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${theme.ruleFaint}`,
                  background: 'transparent',
                  color: theme.mute,
                  fontFamily: HC.mono,
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: hoLoading ? 'not-allowed' : 'pointer',
                  opacity: hoLoading ? 0.4 : 1,
                }}
              >
                {hoQuestions.length > 0 ? 'Regenerate' : 'Generate →'}
              </button>
            </div>

            {hoLoading && (
              <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: theme.mute }}>
                Generating practice questions…
              </div>
            )}

            {hoError && (
              <div style={{ padding: '12px 16px', border: `1px solid ${theme.red}`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.05)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: theme.red, fontFamily: HC.mono, fontWeight: 700, flexShrink: 0 }}>!</span>
                <div style={{ fontSize: 13, color: theme.ink }}>{hoError}</div>
              </div>
            )}

            {!hoLoading && hoQuestions.length === 0 && !hoError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontFamily: HC.sans, fontSize: 15, lineHeight: 1.65, color: theme.mute }}>
                  5 typed questions based on what was taught. For coding lessons, you'll write actual queries and code — the AI checks correctness and gives detailed feedback.
                </div>
                <button
                  onClick={handleGenerateHo}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '13px 20px',
                    border: `1px solid ${theme.ink}`,
                    background: theme.ink,
                    color: theme.bg,
                    fontFamily: HC.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Generate questions →
                </button>
              </div>
            )}

            {hoQuestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 30, borderTop: `1px solid ${theme.ruleFaint}`, paddingTop: 22 }}>
                {hoQuestions.map((q, idx) => {
                  const result = hoResults[idx];
                  const isChecking = hoChecking === idx;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: HC.mono, fontSize: 11, color: theme.red, flexShrink: 0, marginTop: 3 }}>
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
                          style={{
                            width: '100%',
                            resize: 'vertical',
                            padding: '12px 14px',
                            border: `1px solid ${result ? (result.correct ? (dark ? 'rgba(106,174,127,0.4)' : 'rgba(45,106,63,0.3)') : 'rgba(196,34,27,0.3)') : theme.ruleFaint}`,
                            background: result
                              ? (result.correct ? (dark ? 'rgba(106,174,127,0.06)' : 'rgba(45,106,63,0.04)') : (dark ? 'rgba(232,81,74,0.06)' : 'rgba(196,34,27,0.03)'))
                              : hoIsCoding ? (dark ? 'rgba(0,0,0,0.3)' : '#16120f') : panelFill,
                            color: hoIsCoding && !result ? (dark ? theme.ink : HC.paper) : theme.ink,
                            fontFamily: hoIsCoding ? HC.mono : HC.sans,
                            fontSize: hoIsCoding ? 13 : 15,
                            lineHeight: 1.6,
                            outline: 'none',
                            boxSizing: 'border-box',
                            whiteSpace: 'pre',
                            overflowWrap: 'normal',
                            overflowX: 'auto',
                            opacity: result ? 0.75 : 1,
                          }}
                        />

                        {!result && (
                          <>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleGetHint(idx)}
                                disabled={hoHintLoading === idx}
                                style={{
                                  padding: '10px 16px',
                                  border: `1px solid ${theme.ruleFaint}`,
                                  background: 'transparent',
                                  color: theme.mute,
                                  fontFamily: HC.mono,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: '0.14em',
                                  textTransform: 'uppercase',
                                  cursor: hoHintLoading === idx ? 'not-allowed' : 'pointer',
                                  opacity: hoHintLoading === idx ? 0.4 : 1,
                                }}
                              >
                                {hoHintLoading === idx ? 'Loading…' : hoHints[idx] ? 'Hint again' : 'Show hint'}
                              </button>
                              <button
                                onClick={() => handleCheckHo(idx)}
                                disabled={isChecking || !hoAnswers[idx]?.trim()}
                                style={{
                                  padding: '10px 18px',
                                  border: `1px solid ${theme.ink}`,
                                  background: 'transparent',
                                  color: theme.ink,
                                  fontFamily: HC.mono,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: '0.14em',
                                  textTransform: 'uppercase',
                                  cursor: isChecking || !hoAnswers[idx]?.trim() ? 'not-allowed' : 'pointer',
                                  opacity: isChecking || !hoAnswers[idx]?.trim() ? 0.4 : 1,
                                }}
                              >
                                {isChecking ? 'Checking…' : 'Check answer →'}
                              </button>
                            </div>
                            {hoHintError && (
                              <div style={{ fontSize: 12, color: theme.red, fontFamily: HC.mono }}>{hoHintError}</div>
                            )}
                            {hoHints[idx] && (
                              <div style={{ padding: '10px 14px', border: `1px solid ${dark ? 'rgba(241,236,223,0.12)' : 'rgba(26,21,16,0.1)'}`, background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.03)' }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.amber, marginBottom: 6 }}>Hint</div>
                                <div style={{ fontSize: 14, lineHeight: 1.65, color: theme.ink }}>{hoHints[idx]}</div>
                              </div>
                            )}
                          </>
                        )}

                        {result && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: result.correct ? theme.green : theme.red }}>
                                {result.correct ? '✓ Correct' : '✗ Needs work'} · {result.score}/100
                              </span>
                              <button
                                onClick={() => setHoResults((prev) => { const n = [...prev]; n[idx] = null; return n; })}
                                style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.mute, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                retry
                              </button>
                            </div>
                            {result.whatWasRight && (
                              <div style={{ padding: '12px 16px', border: `1px solid ${dark ? 'rgba(106,174,127,0.25)' : 'rgba(45,106,63,0.18)'}`, background: dark ? 'rgba(106,174,127,0.08)' : 'rgba(45,106,63,0.05)' }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.green, marginBottom: 6 }}>What you got right</div>
                                <div style={{ fontSize: 15, lineHeight: 1.65, color: theme.ink }}>{result.whatWasRight}</div>
                              </div>
                            )}
                            {result.whatWasMissing && (
                              <div style={{ padding: '12px 16px', border: `1px solid rgba(196,34,27,0.22)`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.04)' }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.red, marginBottom: 6 }}>What was missing</div>
                                <div style={{ fontSize: 15, lineHeight: 1.65, color: theme.ink }}>{result.whatWasMissing}</div>
                              </div>
                            )}
                            {result.betterAnswer && (
                              <div style={{ padding: '12px 16px', border: `1px solid ${theme.ruleFaint}`, background: panelFill }}>
                                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.mute, marginBottom: 6 }}>Model answer</div>
                                <div style={{ fontSize: 15, lineHeight: 1.65, color: theme.ink }}>{result.betterAnswer}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {activeTab === 'quiz' && loading && (
          <div style={{ marginTop: 40, fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: theme.mute }}>
            Generating quiz…
          </div>
        )}

        {/* Error */}
        {activeTab === 'quiz' && error && (
          <div style={{ marginTop: 28, padding: '12px 16px', border: `1px solid ${theme.red}`, background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.05)', display: 'flex', gap: 10 }}>
            <span style={{ color: theme.red, fontFamily: HC.mono, fontWeight: 700 }}>!</span>
            <div style={{ fontSize: 13 }}>{error}</div>
          </div>
        )}

        {/* Questions */}
        {activeTab === 'quiz' && !loading && !error && questions.map((q, qi) => {
          const result = submitted ? results[qi] : null;
          return (
            <div key={qi} style={{
              marginTop: 30, paddingTop: 24, borderTop: `1px solid ${theme.ruleFaint}`,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: HC.mono, fontSize: 11, color: theme.red, flexShrink: 0, marginTop: 3 }}>
                  {String(qi + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HC.serif, fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1.4 }}>{q.q}</div>
                  <div style={{ fontFamily: HC.mono, fontSize: 10, color: theme.mute, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Multiple choice
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {q.options.map((opt, oi) => {
                      const picked = mcqAnswers[qi] === oi;
                      const isCorrect = q.correct === oi;
                      let bg = 'transparent';
                      let border = `1px solid ${theme.ruleFaint}`;
                      let textColor: string = theme.ink;
                      if (submitted) {
                        if (isCorrect) { bg = dark ? 'rgba(106,174,127,0.13)' : 'rgba(45,106,63,0.1)'; border = `1px solid ${theme.green}`; textColor = theme.green as string; }
                        else if (picked && !isCorrect) { bg = dark ? 'rgba(232,81,74,0.13)' : 'rgba(196,34,27,0.08)'; border = `1px solid ${theme.red}`; textColor = theme.red as string; }
                      } else if (picked) {
                        bg = panelFillStrong; border = `1px solid ${theme.ink}`;
                      }
                      return (
                        <button key={oi} onClick={() => { if (!submitted) setMcqAnswers((p) => ({ ...p, [qi]: oi })); }}
                          style={{
                            padding: '12px 16px', background: bg, border, textAlign: 'left',
                            fontFamily: HC.serif, fontSize: 17, color: textColor,
                            cursor: submitted ? 'default' : 'pointer',
                            fontStyle: picked ? 'italic' : 'normal',
                            transition: 'background 0.1s',
                          }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Per-question feedback */}
                  {submitted && result && (
                    <div style={{
                      marginTop: 10, padding: '10px 14px',
                      border: `1px solid ${result.passed ? theme.green : theme.red}`,
                      background: result.passed ? (dark ? 'rgba(106,174,127,0.10)' : 'rgba(45,106,63,0.06)') : (dark ? 'rgba(232,81,74,0.10)' : 'rgba(196,34,27,0.04)'),
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontFamily: HC.mono, fontSize: 12, color: result.passed ? theme.green : theme.red, flexShrink: 0 }}>
                        {result.passed ? '✓' : '✗'}
                      </span>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: theme.ink }}>{result.feedback}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Submit / Result */}
        {activeTab === 'quiz' && !loading && !error && questions.length > 0 && (
          <div style={{ marginTop: 40, borderTop: `2px solid ${theme.ink}`, paddingTop: 28 }}>
            {!submitted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={handleSubmit} disabled={!allAnswered || grading} style={{
                  ...btn.primary, padding: '14px 32px', fontSize: 13, background: theme.ink, color: theme.bg,
                  opacity: !allAnswered || grading ? 0.4 : 1,
                  cursor: !allAnswered || grading ? 'not-allowed' : 'pointer',
                }}>
                  {grading ? 'Grading…' : 'Submit answers →'}
                </button>
                {!allAnswered && (
                  <span style={{ fontFamily: HC.mono, fontSize: 11, color: theme.mute }}>
                    Answer all questions first.
                  </span>
                )}
              </div>
            ) : (
              <div>
                {/* Score banner */}
                <div style={{
                  padding: '20px 24px',
                  border: `1.5px solid ${overallPreferredMet ? theme.green : theme.amber}`,
                  background: overallPreferredMet ? (dark ? 'rgba(106,174,127,0.10)' : 'rgba(45,106,63,0.07)') : (dark ? 'rgba(227,164,71,0.10)' : 'rgba(216,148,48,0.10)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: overallPreferredMet ? theme.green : theme.amber }}>
                      {overallPreferredMet ? 'Preferred score met' : 'Below preferred'}
                    </div>
                    <div style={{ fontFamily: HC.serif, fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', marginTop: 4 }}>
                      {totalScore}% — {overallPreferredMet ? 'you can continue.' : 'still okay to continue.'}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: theme.mute, marginTop: 8 }}>
                      70% is the target. This quiz is not a blocker anymore.
                    </div>
                  </div>
                  <div style={{ fontFamily: HC.serif, fontSize: 56, color: overallPreferredMet ? theme.green : theme.amber }}>
                    {overallPreferredMet ? '✓' : '→'}
                  </div>
                </div>

                {practicalExercises.length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.red, marginBottom: 10 }}>
                      optional practice
                    </div>
                    <div style={{ fontFamily: HC.serif, fontSize: 22, letterSpacing: '-0.015em', marginBottom: 8 }}>
                      Hands-on task, only if this lesson supports it.
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: theme.mute, marginBottom: 14 }}>
                      This is separate from your score. Skip it or upload what you made when it actually helps.
                    </div>

                    <div style={{ display: 'grid', gap: 14 }}>
                      {practicalExercises.map((exercise, idx) => {
                        const uploaded = uploads[idx];
                        return (
                          <div key={`${exercise.title}-${idx}`} style={{ background: panelFill, border: `1px solid ${theme.ruleFaint}`, padding: '18px 18px 16px' }}>
                            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.red, marginBottom: 8 }}>
                              Exercise {String(idx + 1).padStart(2, '0')}
                            </div>
                            <div style={{ fontFamily: HC.serif, fontSize: 24, letterSpacing: '-0.015em', marginBottom: 8 }}>
                              {exercise.title}
                            </div>
                            <div style={{ fontSize: 15, lineHeight: 1.65, color: theme.ink, marginBottom: 12 }}>
                              {exercise.task}
                            </div>
                            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.mute, marginBottom: 6 }}>
                              deliverable
                            </div>
                            <div style={{ fontSize: 14, lineHeight: 1.55, color: theme.ink, marginBottom: 12 }}>
                              {exercise.deliverable}
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.55, color: theme.mute, marginBottom: 14 }}>
                              {exercise.submissionHint}
                            </div>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                              <span style={{ ...btn.outline, padding: '10px 14px', fontSize: 10, borderColor: theme.ink, color: theme.ink }}>
                                {uploaded ? 'Replace upload' : 'Upload answer'}
                              </span>
                              <input
                                type="file"
                                onChange={(e) => setUploads((prev) => ({ ...prev, [idx]: e.target.files?.[0] ?? null }))}
                                style={{ display: 'none' }}
                              />
                              <span style={{ fontFamily: HC.mono, fontSize: 10, color: uploaded ? theme.green : theme.mute, letterSpacing: '0.08em' }}>
                                {uploaded ? `attached: ${uploaded.name}` : 'nothing attached yet'}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button onClick={handleContinue} style={{ ...btn.primary, padding: '14px 28px', background: theme.ink, color: theme.bg }}>
                    Continue →
                  </button>
                  {!overallPreferredMet && (
                    <button onClick={() => {
                      setSubmitted(false);
                      setResults([]);
                      setMcqAnswers({});
                      setUploads({});
                      setPracticalExercises([]);
                      loadQuizPayload();
                    }} style={{ ...btn.danger, padding: '14px 28px', background: theme.red }}>
                      Try for 70% →
                    </button>
                  )}
                  <button onClick={() => navigate(`/learn/${course.id}`)} style={{ ...btn.outline, borderColor: theme.ink, color: theme.ink }}>
                    ← Back to lesson
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

export default function Quiz() {
  const { courseId, modIdx, lessonIdx } = useParams<{ courseId: string; modIdx: string; lessonIdx: string }>();
  const navigate = useNavigate();
  const { state } = useStore();

  const mi = Number(modIdx ?? 0);
  const li = Number(lessonIdx ?? 0);
  const course = state.courses.find((c) => c.id === courseId);
  const mod = course?.curriculum.modules[mi];
  const lesson = mod?.lessons[li];

  if (!course || !mod || !lesson) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: HC.bg }}>
        <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20 }}>Quiz not found.</div>
        <button onClick={() => navigate('/dashboard')} style={btn.outline}>← Dashboard</button>
      </div>
    );
  }

  return <QuizContent courseId={course.id} mi={mi} li={li} />;
}

export function GeneralQuiz() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useStore();
  const topic = params.get('topic')?.trim() || 'General knowledge';
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Array<GradeResult | null>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseTitle: `Standalone quiz: ${topic}`,
        moduleTitle: 'Practice',
        lessonTitle: topic,
        chatHistory: [],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setQuestions(((data.questions as MCQQuestion[] | undefined) ?? [])
          .filter((q) => Array.isArray(q.options) && q.options.length === 4)
          .map((q) => ({ ...q, type: 'mcq' as const }))
          .slice(0, 8));
      })
      .catch((err) => setError(err?.message || 'Could not generate quiz.'))
      .finally(() => setLoading(false));
  }, [topic]);

  const allAnswered = questions.length > 0 && questions.every((_, index) => (answers[index] ?? -1) >= 0);
  const totalScore = submitted && results.length > 0
    ? Math.round(results.reduce((sum, result) => sum + (result?.score ?? 0), 0) / results.length * 100)
    : 0;

  function submit() {
    if (!allAnswered) return;
    const resultArr: GradeResult[] = questions.map((question, index) => {
      const passed = answers[index] === question.correct;
      return {
        passed,
        score: passed ? 1 : 0,
        feedback: passed ? 'Correct.' : `Correct answer: ${question.options[question.correct]}`,
      };
    });
    setResults(resultArr);
    dispatch({
      type: 'RECORD_QUIZ_ATTEMPT',
      attempt: {
        id: genId(),
        topic,
        score: resultArr.reduce((sum, result) => sum + result.score, 0),
        total: resultArr.length,
        createdAt: new Date().toISOString(),
      },
    });
    setSubmitted(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: HC.bg, color: HC.ink }}>
      <main style={{ maxWidth: 840, margin: '0 auto', padding: '42px 34px 70px' }}>
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: HC.red }}>
          standalone quiz
        </div>
        <h1 style={{ margin: '8px 0 8px', fontFamily: HC.serif, fontSize: 'clamp(34px, 6vw, 70px)', fontWeight: 400, letterSpacing: '-0.055em', lineHeight: 0.95 }}>
          {topic}
        </h1>
        <p style={{ margin: 0, color: HC.mute, fontSize: 14 }}>Eight MCQs. No course required.</p>

        {loading && <div style={{ marginTop: 34, color: HC.mute, fontFamily: HC.serif, fontStyle: 'italic' }}>Generating quiz...</div>}
        {error && <div style={{ marginTop: 28, border: `1px solid ${HC.red}`, padding: 14, color: HC.red }}>{error}</div>}

        {!loading && !error && questions.map((question, qi) => {
          const result = submitted ? results[qi] : null;
          return (
            <section key={qi} style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${HC.ruleFaint}` }}>
              <div style={{ fontFamily: HC.mono, color: HC.red, fontSize: 10, letterSpacing: '0.14em' }}>{String(qi + 1).padStart(2, '0')}</div>
              <h2 style={{ margin: '8px 0 14px', fontFamily: HC.serif, fontSize: 22, fontWeight: 400, letterSpacing: '-0.015em' }}>{question.q}</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {question.options.map((option, oi) => {
                  const picked = answers[qi] === oi;
                  const correct = question.correct === oi;
                  const border = submitted && correct ? HC.green : submitted && picked ? HC.red : picked ? HC.ink : HC.ruleFaint;
                  return (
                    <button
                      key={option}
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                      style={{ border: `1px solid ${border}`, background: picked ? HC.paper : 'transparent', color: submitted && correct ? HC.green : submitted && picked ? HC.red : HC.ink, padding: '12px 14px', textAlign: 'left', cursor: submitted ? 'default' : 'pointer', fontFamily: HC.serif, fontSize: 17 }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {result && <div style={{ marginTop: 10, color: result.passed ? HC.green : HC.red, fontSize: 13 }}>{result.feedback}</div>}
            </section>
          );
        })}

        {!loading && !error && questions.length > 0 && (
          <div style={{ marginTop: 34, borderTop: `2px solid ${HC.ink}`, paddingTop: 22, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {!submitted ? (
              <button onClick={submit} disabled={!allAnswered} style={{ ...btn.primary, opacity: allAnswered ? 1 : 0.45, cursor: allAnswered ? 'pointer' : 'not-allowed' }}>Submit answers →</button>
            ) : (
              <div style={{ fontFamily: HC.serif, fontSize: 34, letterSpacing: '-0.03em' }}>{totalScore}%</div>
            )}
            <button onClick={() => navigate('/dashboard')} style={btn.outline}>Dashboard</button>
          </div>
        )}
      </main>
    </div>
  );
}

function genId() {
  return 'AIN-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}
