import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { askInCourse, fetchCourse, LearnorCourse } from '../lib/learnor';
import { apiUrl } from '../api';

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const SANS = '"Inter", -apple-system, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

const C = {
  bg: 'var(--c-bg)',
  paper: 'var(--c-paper)',
  ink: 'var(--c-ink)',
  mute: 'var(--c-mute)',
  faint: 'var(--c-faint)',
  softer: 'var(--c-softer)',
  red: 'var(--c-red)',
  amber: 'var(--c-amber)',
  green: 'var(--c-green)',
};

// ── Markdown rendering (documentation-style, theme-aware) ─────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index} style={{ fontWeight: 700 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(
      <code key={m.index} style={{ fontFamily: MONO, fontSize: '0.88em', background: C.softer, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.faint}` }}>
        {m[4]}
      </code>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text }: { text: string }) {
  const lines = String(text || '').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Code fence
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
      i++;
      out.push(
        <div key={`code-${i}`} style={{ margin: '16px 0 20px', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.faint}` }}>
          {lang && (
            <div style={{ padding: '6px 14px', background: C.softer, borderBottom: `1px solid ${C.faint}`, fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.mute }}>
              {lang}
            </div>
          )}
          <pre style={{ margin: 0, padding: '14px 18px', background: C.softer, fontFamily: MONO, fontSize: 13, lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre', color: C.ink }}>
            <code>{code.join('\n')}</code>
          </pre>
        </div>,
      );
      continue;
    }

    // Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        out.push(
          <div key={`table-${i}`} style={{ margin: '16px 0 20px', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: SANS, fontSize: 13.5 }}>
              <thead>
                <tr>
                  {head.map((cell, ci) => (
                    <th key={ci} style={{ textAlign: 'left', padding: '8px 14px', borderBottom: `2px solid ${C.faint}`, fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.mute }}>
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '9px 14px', borderBottom: `1px solid ${C.faint}`, color: C.ink, lineHeight: 1.55 }}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    // Sub-heading (### or ##)
    if (/^#{2,4}\s/.test(trimmed)) {
      out.push(
        <div key={`h-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 10px' }}>
          <div style={{ width: 3, height: 16, background: C.red, borderRadius: 999, flexShrink: 0 }} />
          <div style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
            {renderInline(trimmed.replace(/^#{2,4}\s/, ''))}
          </div>
        </div>,
      );
      i++;
      continue;
    }

    // Bullets / numbered lists
    const bulletMatch = trimmed.match(/^(?:[-•*]\s+|(\d+)[.)]\s+)(.*)$/);
    if (bulletMatch && !trimmed.startsWith('**')) {
      out.push(
        <div key={`li-${i}`} style={{ display: 'flex', gap: 12, marginBottom: 9, alignItems: 'flex-start' }}>
          <span style={{ color: C.red, fontFamily: MONO, fontSize: 11, flexShrink: 0, marginTop: 4, lineHeight: 1 }}>
            {bulletMatch[1] ? `${bulletMatch[1]}.` : '·'}
          </span>
          <span style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.65, color: C.ink }}>{renderInline(bulletMatch[2])}</span>
        </div>,
      );
      i++;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      out.push(<div key={`hr-${i}`} style={{ height: 1, background: C.faint, margin: '20px 0' }} />);
      i++;
      continue;
    }

    if (!trimmed) {
      out.push(<div key={`sp-${i}`} style={{ height: 10 }} />);
      i++;
      continue;
    }

    out.push(
      <p key={`p-${i}`} style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.75, color: C.ink, margin: '4px 0' }}>
        {renderInline(lines[i])}
      </p>,
    );
    i++;
  }
  return <>{out}</>;
}

// ── Quiz tab ──────────────────────────────────────────────────────────────────

function QuizTab({ course }: { course: LearnorCourse }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const quiz = course.content.quiz || [];
  const answered = Object.keys(answers).length;
  const correct = quiz.filter((q, i) => answers[i] === q.correct).length;

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.mute, marginBottom: 28 }}>
        {answered === quiz.length && quiz.length > 0
          ? <>Score: <span style={{ color: correct >= quiz.length * 0.7 ? C.green : C.amber }}>{correct}/{quiz.length}</span></>
          : `${answered}/${quiz.length} answered`}
      </div>
      {quiz.map((item, qi) => {
        const picked = answers[qi];
        const done = picked !== undefined;
        return (
          <div key={qi} style={{ marginBottom: 36, paddingBottom: 30, borderBottom: `1px solid ${C.faint}` }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: C.red, lineHeight: 1, flexShrink: 0 }}>
                {String(qi + 1).padStart(2, '0')}
              </span>
              <div style={{ fontFamily: SANS, fontSize: 15.5, fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>{item.q}</div>
            </div>
            <div style={{ display: 'grid', gap: 8, paddingLeft: 38 }}>
              {item.options.map((option, oi) => {
                const isCorrect = oi === item.correct;
                const isPicked = picked === oi;
                let border = C.faint;
                let bg = 'transparent';
                if (done && isCorrect) { border = C.green; bg = C.softer; }
                else if (done && isPicked && !isCorrect) { border = C.red; }
                return (
                  <button
                    key={oi}
                    onClick={() => !done && setAnswers((a) => ({ ...a, [qi]: oi }))}
                    style={{
                      textAlign: 'left', cursor: done ? 'default' : 'pointer',
                      border: `1px solid ${border}`, background: bg, borderRadius: 10,
                      padding: '11px 14px', fontFamily: SANS, fontSize: 14, color: C.ink, lineHeight: 1.5,
                      display: 'flex', gap: 10, alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 10, color: done && isCorrect ? C.green : C.mute, flexShrink: 0 }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span>{option}</span>
                    {done && isCorrect && <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10, color: C.green, flexShrink: 0 }}>✓</span>}
                    {done && isPicked && !isCorrect && <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10, color: C.red, flexShrink: 0 }}>✕</span>}
                  </button>
                );
              })}
            </div>
            {done && (
              <div style={{ marginLeft: 38, marginTop: 12, padding: '12px 16px', background: C.softer, borderLeft: `3px solid ${picked === item.correct ? C.green : C.amber}` }}>
                <span style={{ fontFamily: SANS, fontSize: 13.5, lineHeight: 1.6, color: C.ink }}>
                  <b>Why:</b> {item.why}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Exercises tab ─────────────────────────────────────────────────────────────

function ExercisesTab({ course }: { course: LearnorCourse }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div>
      {(course.content.exercises || []).map((exercise, i) => (
        <div key={i} style={{ marginBottom: 40, paddingBottom: 34, borderBottom: `1px solid ${C.faint}` }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 26, color: C.red, lineHeight: 1, flexShrink: 0 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 style={{ margin: 0, fontFamily: SANS, fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
              {exercise.title}
            </h3>
          </div>
          <div style={{ paddingLeft: 40 }}>
            <Markdown text={exercise.task} />
            <button
              onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
              style={{ marginTop: 14, background: 'none', border: `1px solid ${C.faint}`, borderRadius: 999, color: C.ink, padding: '9px 16px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {open[i] ? 'Hide solution ↑' : 'Show worked solution ↓'}
            </button>
            {open[i] && (
              <div style={{ marginTop: 16, padding: '18px 20px', background: C.softer, borderLeft: `3px solid ${C.green}`, borderRadius: '0 10px 10px 0' }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.green, marginBottom: 10 }}>
                  Worked solution
                </div>
                <Markdown text={exercise.solution} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Highlight-to-ask ──────────────────────────────────────────────────────────

function AskPanel({ course, previewKey, selection, onClose }: {
  course: LearnorCourse; previewKey: string | null; selection: string; onClose: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function ask(q: string) {
    setBusy(true);
    setError('');
    try {
      const result = await askInCourse({ slug: course.slug, key: previewKey, selection, question: q });
      setAnswer(result.answer);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function readAloud() {
    if (!answer || speaking) return;
    setSpeaking(true);
    try {
      const res = await fetch(apiUrl('/api/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: answer }),
      });
      if (!res.ok) throw new Error('TTS unavailable');
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 92vw)', zIndex: 60,
      background: C.paper, borderLeft: `1px solid ${C.faint}`, boxShadow: '-24px 0 80px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.faint}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.red }}>
          Ask Learnor
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mute, fontFamily: MONO, fontSize: 13 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
        <div style={{ padding: '12px 16px', background: C.softer, borderLeft: `3px solid ${C.red}`, marginBottom: 18 }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.mute, marginBottom: 6 }}>
            You highlighted
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 15, fontStyle: 'italic', lineHeight: 1.6, color: C.ink }}>
            “{selection.length > 280 ? `${selection.slice(0, 280)}…` : selection}”
          </div>
        </div>
        {busy && (
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.mute }}>
            Thinking…
          </div>
        )}
        {error && (
          <div style={{ fontFamily: SANS, fontSize: 13, color: C.red, lineHeight: 1.6 }}>{error}</div>
        )}
        {answer && !busy && (
          <div>
            <Markdown text={answer} />
            <button
              onClick={readAloud}
              disabled={speaking}
              style={{ marginTop: 14, background: 'none', border: `1px solid ${C.faint}`, borderRadius: 999, color: speaking ? C.mute : C.ink, padding: '8px 14px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', cursor: speaking ? 'default' : 'pointer' }}
            >
              {speaking ? 'Playing…' : '▶ Read aloud'}
            </button>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (question.trim() && !busy) ask(question.trim()); }}
        style={{ padding: '14px 22px 20px', borderTop: `1px solid ${C.faint}`, display: 'flex', gap: 8 }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this passage…"
          autoFocus
          style={{ flex: 1, border: `1px solid ${C.faint}`, borderRadius: 10, background: 'transparent', color: C.ink, padding: '11px 14px', fontFamily: SANS, fontSize: 14, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          style={{ background: C.ink, color: C.bg, border: 'none', borderRadius: 10, padding: '0 16px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', cursor: busy ? 'wait' : 'pointer', opacity: busy || !question.trim() ? 0.5 : 1 }}
        >
          ASK
        </button>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Course() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const previewKey = searchParams.get('key');
  const navigate = useNavigate();
  const { dark } = useTheme();

  const [course, setCourse] = useState<LearnorCourse | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'notes' | 'quiz' | 'exercises'>('notes');
  const [activeSection, setActiveSection] = useState(0);
  const [selection, setSelection] = useState('');
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number } | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    fetchCourse(slug, previewKey)
      .then(setCourse)
      .catch((err) => setError((err as Error).message));
  }, [slug, previewKey]);

  // Scroll-spy for the section nav
  useEffect(() => {
    const onScroll = () => {
      const nodes = contentRef.current?.querySelectorAll<HTMLElement>('[data-section-index]');
      if (!nodes) return;
      let current = 0;
      nodes.forEach((node) => {
        if (node.getBoundingClientRect().top <= 160) current = Number(node.dataset.sectionIndex);
      });
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [course]);

  // Highlight-to-ask selection tracking
  useEffect(() => {
    const onMouseUp = () => {
      window.setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? '';
        if (text.length >= 8 && contentRef.current && sel && sel.rangeCount > 0
          && contentRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          setSelection(text.slice(0, 1500));
          setSelectionRect({ x: rect.left + rect.width / 2, y: rect.top });
        } else {
          setSelectionRect(null);
        }
      }, 0);
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  const vars = useMemo(() => ({
    '--c-bg': dark ? '#050505' : '#f4f0e8',
    '--c-paper': dark ? '#1c1a16' : '#faf7f0',
    '--c-ink': dark ? '#f6f0e7' : '#1a1510',
    '--c-mute': dark ? 'rgba(246,240,231,0.50)' : 'rgba(26,21,16,0.52)',
    '--c-faint': dark ? 'rgba(246,240,231,0.10)' : 'rgba(26,21,16,0.12)',
    '--c-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
    '--c-red': dark ? '#ff5148' : '#c4221b',
    '--c-amber': dark ? '#d99b45' : '#b87822',
    '--c-green': dark ? '#72c089' : '#2d6a3f',
  }) as React.CSSProperties, [dark]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, ...vars }}>
        <div style={{ fontFamily: SERIF, fontSize: 30, fontStyle: 'italic', color: C.ink }}>Course not found.</div>
        <button onClick={() => navigate('/browse')} style={{ background: 'none', border: `1px solid ${C.faint}`, borderRadius: 999, color: C.ink, padding: '10px 18px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', cursor: 'pointer' }}>
          ← Browse the shelf
        </button>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', ...vars }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.mute }}>Loading…</div>
      </div>
    );
  }

  const { content } = course;
  const tabs: Array<{ key: typeof tab; label: string; count: number }> = [
    { key: 'notes', label: 'Notes', count: content.sections?.length ?? 0 },
    { key: 'quiz', label: 'Quiz', count: content.quiz?.length ?? 0 },
    { key: 'exercises', label: 'Exercises', count: content.exercises?.length ?? 0 },
  ];

  function scrollToSection(index: number) {
    if (tab !== 'notes') setTab('notes');
    window.setTimeout(() => {
      const node = contentRef.current?.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
      if (node) window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
    }, 20);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, ...vars }}>
      {!course.published && (
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.amber, color: dark ? '#050505' : '#faf7f0', padding: '9px 20px', textAlign: 'center', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Unlisted preview — pending review, not public yet
        </div>
      )}

      {/* Sidebar */}
      <aside style={{ position: 'fixed', top: course.published ? 0 : 34, left: 0, bottom: 0, width: 280, borderRight: `1px solid ${C.faint}`, overflowY: 'auto', paddingBottom: 40, scrollbarWidth: 'none' }} className="course-sidebar">
        <div style={{ padding: '32px 24px 20px', borderBottom: `1px solid ${C.faint}` }}>
          <button onClick={() => navigate('/browse')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.mute, marginBottom: 14 }}>
            ← Browse
          </button>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.red, marginBottom: 6 }}>
            {course.category || 'Course'}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 17, letterSpacing: '-0.03em', lineHeight: 1.15, color: C.ink }}>
            {course.title}
          </div>
        </div>
        <nav style={{ padding: '16px 0' }}>
          {content.sections.map((section, i) => (
            <button
              key={i}
              onClick={() => scrollToSection(i)}
              style={{
                width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                padding: '8px 24px', textAlign: 'left',
                borderLeft: `2px solid ${tab === 'notes' && activeSection === i ? C.red : 'transparent'}`,
                display: 'flex', alignItems: 'baseline', gap: 10,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 9, color: tab === 'notes' && activeSection === i ? C.red : C.mute, letterSpacing: '0.1em', flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: tab === 'notes' && activeSection === i ? 600 : 400, color: tab === 'notes' && activeSection === i ? C.ink : C.mute, lineHeight: 1.3 }}>
                {section.heading}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div ref={contentRef} style={{ marginLeft: 280, minHeight: '100vh', padding: '48px clamp(32px, 6vw, 96px) 120px', maxWidth: 980 }} className="course-main">
        {/* Header */}
        <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: `2px solid ${C.ink}` }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.red, marginBottom: 12 }}>
            {course.subject || course.category} · {course.level || 'all levels'}
          </div>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(40px, 5.5vw, 76px)', lineHeight: 0.95, letterSpacing: '-0.05em', color: C.ink }}>
            {course.title}
          </h1>
          {content.summary && (
            <p style={{ margin: '18px 0 0', fontFamily: SERIF, fontSize: 19, fontStyle: 'italic', lineHeight: 1.5, color: C.mute, maxWidth: 640 }}>
              {content.summary}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 44, position: 'sticky', top: course.published ? 0 : 34, background: C.bg, padding: '12px 0', zIndex: 20 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                border: `1px solid ${tab === t.key ? C.ink : C.faint}`,
                background: tab === t.key ? C.ink : 'transparent',
                color: tab === t.key ? C.bg : C.mute,
                borderRadius: 999, padding: '10px 18px', cursor: 'pointer',
                fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
              }}
            >
              {t.label} · {t.count}
            </button>
          ))}
        </div>

        {tab === 'notes' && content.sections.map((section, i) => (
          <section key={i} data-section-index={i} style={{ marginBottom: 56, scrollMarginTop: 100 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
              <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(30px, 3.4vw, 44px)', color: C.red, lineHeight: 0.9, letterSpacing: '-0.03em', flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(22px, 2.6vw, 32px)', letterSpacing: '-0.025em', color: C.ink, lineHeight: 1.1 }}>
                {section.heading}
              </h2>
            </div>
            {section.intent && (
              <div style={{ margin: '8px 0 18px', paddingBottom: 12, borderBottom: `1px solid ${C.faint}`, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: C.mute, lineHeight: 1.7 }}>
                {section.intent}
              </div>
            )}
            <Markdown text={section.body} />
          </section>
        ))}

        {tab === 'quiz' && <QuizTab course={course} />}
        {tab === 'exercises' && <ExercisesTab course={course} />}
      </div>

      {/* Floating "ask" button on selection */}
      {selectionRect && !askOpen && (
        <button
          onClick={() => { setAskOpen(true); setSelectionRect(null); }}
          style={{
            position: 'fixed', left: Math.min(Math.max(selectionRect.x - 60, 12), window.innerWidth - 140),
            top: Math.max(selectionRect.y - 44, 12), zIndex: 55,
            background: C.ink, color: C.bg, border: 'none', borderRadius: 999,
            padding: '9px 16px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          }}
        >
          ✦ Ask Learnor
        </button>
      )}
      {askOpen && (
        <AskPanel course={course} previewKey={previewKey} selection={selection} onClose={() => setAskOpen(false)} />
      )}

      <style>{`
        @media (max-width: 900px) {
          .course-sidebar { display: none; }
          .course-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
