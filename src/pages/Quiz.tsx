import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HC, btn } from '../theme';
import { useStore } from '../store';
import type { MCQQuestion } from '../types';

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

function renderMarkdown(text: string) {
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
            background: '#16120f',
            color: HC.paper,
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.5, color: HC.ink }}>
            <thead>
              <tr>
                {header.map((cell, cellIndex) => (
                  <th
                    key={`head-${i}-${cellIndex}`}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderBottom: `1px solid ${HC.ruleFaint}`,
                      fontFamily: HC.mono,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: HC.mute,
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
                        borderBottom: `1px solid ${HC.ruleFaint}`,
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
      rendered.push(<div key={`rule-${i}`} style={{ height: 1, background: HC.ruleFaint, margin: '14px 0' }} />);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      rendered.push(<h3 key={`h2-${i}`} style={{ fontFamily: HC.serif, fontSize: 20, fontWeight: 400, margin: '18px 0 6px', letterSpacing: '-0.01em', color: HC.ink }}>{renderInlineFormatting(trimmed.slice(3))}</h3>);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      rendered.push(<h2 key={`h1-${i}`} style={{ fontFamily: HC.serif, fontSize: 24, fontWeight: 400, margin: '18px 0 8px', letterSpacing: '-0.02em', color: HC.ink }}>{renderInlineFormatting(trimmed.slice(2))}</h2>);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      rendered.push(<div key={`bullet-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 4, color: HC.ink }}><span style={{ color: HC.red, fontFamily: HC.mono, fontSize: 12 }}>·</span><span style={{ fontSize: 14, lineHeight: 1.55 }}>{renderInlineFormatting(trimmed.slice(2))}</span></div>);
      continue;
    }

    rendered.push(<div key={`text-${i}`} style={{ fontSize: 14, lineHeight: 1.6, color: HC.ink }}>{renderInlineFormatting(line)}</div>);
  }

  return rendered;
}

function QuizContent({ courseId, mi, li }: { courseId: string; mi: number; li: number }) {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();

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

  const [showNotes, setShowNotes] = useState(true);
  const preferredThreshold = 70;

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
        .map((q) => ({ ...q, type: 'mcq' as const }));
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: HC.bg, color: HC.ink }}>
      <div style={{ flex: 1, maxWidth: 840, margin: '0 auto', width: '100%', padding: '40px 40px 60px' }}>
        {/* Header */}
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: HC.red }}>
          {course.subject} · Module {mi + 1} · Lesson {li + 1}
        </div>
        <h1 style={{ fontFamily: HC.serif, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 400, letterSpacing: '-0.025em', margin: '6px 0 4px', color: HC.ink }}>
          {lesson.title}
        </h1>
        <div style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute }}>
          70% is preferred. You can still continue even if you score lower.
        </div>

        {/* Notes panel */}
        {lesson.notes && (
          <div style={{ marginTop: 28, border: `1px solid ${HC.ruleFaint}`, background: HC.paper, color: HC.ink }}>
            <button
              onClick={() => setShowNotes(!showNotes)}
              style={{
                width: '100%', padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: HC.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.ink,
              }}
            >
              <span>Lesson Notes</span>
              <span style={{ color: HC.mute }}>{showNotes ? '▲ hide' : '▼ show'}</span>
            </button>
            {showNotes && (
              <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${HC.ruleFaint}`, color: HC.ink }}>
                {renderMarkdown(lesson.notes)}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ marginTop: 40, fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: HC.mute }}>
            Generating quiz…
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 28, padding: '12px 16px', border: `1px solid ${HC.red}`, background: 'rgba(196,34,27,0.05)', display: 'flex', gap: 10 }}>
            <span style={{ color: HC.red, fontFamily: HC.mono, fontWeight: 700 }}>!</span>
            <div style={{ fontSize: 13 }}>{error}</div>
          </div>
        )}

        {/* Questions */}
        {!loading && !error && questions.map((q, qi) => {
          const result = submitted ? results[qi] : null;
          return (
            <div key={qi} style={{
              marginTop: 32, paddingTop: 24, borderTop: `1px solid ${HC.ruleFaint}`,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: HC.mono, fontSize: 11, color: HC.red, flexShrink: 0, marginTop: 3 }}>
                  {String(qi + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HC.serif, fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1.4 }}>{q.q}</div>
                  <div style={{ fontFamily: HC.mono, fontSize: 10, color: HC.mute, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Multiple choice
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {q.options.map((opt, oi) => {
                      const picked = mcqAnswers[qi] === oi;
                      const isCorrect = q.correct === oi;
                      let bg = 'transparent';
                      let border = `1px solid ${HC.ruleFaint}`;
                      let textColor: string = HC.ink;
                      if (submitted) {
                        if (isCorrect) { bg = 'rgba(45,106,63,0.1)'; border = `1px solid ${HC.green}`; textColor = HC.green as string; }
                        else if (picked && !isCorrect) { bg = 'rgba(196,34,27,0.08)'; border = `1px solid ${HC.red}`; textColor = HC.red as string; }
                      } else if (picked) {
                        bg = HC.paper; border = `1px solid ${HC.ink}`;
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
                      border: `1px solid ${result.passed ? HC.green : HC.red}`,
                      background: result.passed ? 'rgba(45,106,63,0.06)' : 'rgba(196,34,27,0.04)',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontFamily: HC.mono, fontSize: 12, color: result.passed ? HC.green : HC.red, flexShrink: 0 }}>
                        {result.passed ? '✓' : '✗'}
                      </span>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: HC.ink }}>{result.feedback}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Submit / Result */}
        {!loading && !error && questions.length > 0 && (
          <div style={{ marginTop: 40, borderTop: `2px solid ${HC.ink}`, paddingTop: 28 }}>
            {!submitted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={handleSubmit} disabled={!allAnswered || grading} style={{
                  ...btn.primary, padding: '14px 32px', fontSize: 13,
                  opacity: !allAnswered || grading ? 0.4 : 1,
                  cursor: !allAnswered || grading ? 'not-allowed' : 'pointer',
                }}>
                  {grading ? 'Grading…' : 'Submit answers →'}
                </button>
                {!allAnswered && (
                  <span style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute }}>
                    Answer all questions first.
                  </span>
                )}
              </div>
            ) : (
              <div>
                {/* Score banner */}
                <div style={{
                  padding: '20px 24px',
                  border: `1.5px solid ${overallPreferredMet ? HC.green : HC.amber}`,
                  background: overallPreferredMet ? 'rgba(45,106,63,0.07)' : 'rgba(216,148,48,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: overallPreferredMet ? HC.green : HC.amber }}>
                      {overallPreferredMet ? 'Preferred score met' : 'Below preferred'}
                    </div>
                    <div style={{ fontFamily: HC.serif, fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', marginTop: 4 }}>
                      {totalScore}% — {overallPreferredMet ? 'you can continue.' : 'still okay to continue.'}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: HC.mute, marginTop: 8 }}>
                      70% is the target. This quiz is not a blocker anymore.
                    </div>
                  </div>
                  <div style={{ fontFamily: HC.serif, fontSize: 56, color: overallPreferredMet ? HC.green : HC.amber }}>
                    {overallPreferredMet ? '✓' : '→'}
                  </div>
                </div>

                {practicalExercises.length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: HC.red, marginBottom: 10 }}>
                      optional practice
                    </div>
                    <div style={{ fontFamily: HC.serif, fontSize: 22, letterSpacing: '-0.015em', marginBottom: 8 }}>
                      Hands-on task, only if this lesson supports it.
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: HC.mute, marginBottom: 14 }}>
                      This is separate from your score. Skip it or upload what you made when it actually helps.
                    </div>

                    <div style={{ display: 'grid', gap: 14 }}>
                      {practicalExercises.map((exercise, idx) => {
                        const uploaded = uploads[idx];
                        return (
                          <div key={`${exercise.title}-${idx}`} style={{ background: HC.paper, border: `1px solid ${HC.ruleFaint}`, padding: '18px 18px 16px' }}>
                            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.red, marginBottom: 8 }}>
                              Exercise {String(idx + 1).padStart(2, '0')}
                            </div>
                            <div style={{ fontFamily: HC.serif, fontSize: 24, letterSpacing: '-0.015em', marginBottom: 8 }}>
                              {exercise.title}
                            </div>
                            <div style={{ fontSize: 15, lineHeight: 1.65, color: HC.ink, marginBottom: 12 }}>
                              {exercise.task}
                            </div>
                            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: HC.mute, marginBottom: 6 }}>
                              deliverable
                            </div>
                            <div style={{ fontSize: 14, lineHeight: 1.55, color: HC.ink, marginBottom: 12 }}>
                              {exercise.deliverable}
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.55, color: HC.mute, marginBottom: 14 }}>
                              {exercise.submissionHint}
                            </div>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                              <span style={{ ...btn.outline, padding: '10px 14px', fontSize: 10 }}>
                                {uploaded ? 'Replace upload' : 'Upload answer'}
                              </span>
                              <input
                                type="file"
                                onChange={(e) => setUploads((prev) => ({ ...prev, [idx]: e.target.files?.[0] ?? null }))}
                                style={{ display: 'none' }}
                              />
                              <span style={{ fontFamily: HC.mono, fontSize: 10, color: uploaded ? HC.green : HC.mute, letterSpacing: '0.08em' }}>
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
                  <button onClick={handleContinue} style={{ ...btn.primary, padding: '14px 28px' }}>
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
                    }} style={{ ...btn.danger, padding: '14px 28px' }}>
                      Try for 70% →
                    </button>
                  )}
                  <button onClick={() => navigate(`/learn/${course.id}`)} style={btn.outline}>
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

function genId() {
  return 'AIN-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}
