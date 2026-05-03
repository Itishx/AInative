import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTheme } from '../lib/theme';
import { AppNav } from '../components/Chrome';

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const SANS  = '"Inter", -apple-system, system-ui, sans-serif';
const MONO  = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

const N = {
  bg:     'var(--n-bg)',
  paper:  'var(--n-paper)',
  ink:    'var(--n-ink)',
  mute:   'var(--n-mute)',
  faint:  'var(--n-faint)',
  softer: 'var(--n-softer)',
  red:    'var(--n-red)',
  amber:  'var(--n-amber)',
  green:  'var(--n-green)',
};

// ── Inline markdown ───────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index} style={{ fontWeight: 700 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ fontFamily: MONO, fontSize: '0.88em', background: N.softer, padding: '2px 6px', borderRadius: 4, border: `1px solid ${N.faint}` }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const SECTION_META: Record<string, { accent: string; label?: string; style: 'default' | 'callout' | 'warning' | 'highlight' }> = {
  'definition':      { accent: N.ink,   style: 'highlight' },
  'core concepts':   { accent: N.red,   style: 'default' },
  'how it works':    { accent: N.ink,   style: 'default' },
  'example':         { accent: N.green, style: 'callout', label: 'Worked example' },
  'common mistakes': { accent: N.amber, style: 'warning', label: 'Common mistakes' },
  'mental model':    { accent: N.red,   style: 'callout', label: 'Mental model' },
};

function getSectionMeta(heading: string) {
  const key = heading.toLowerCase().trim();
  return SECTION_META[key] ?? { accent: N.red, style: 'default' as const };
}

function renderMarkdown(text: string, inkColor: string, muteColor: string, redColor: string, amberColor: string, greenColor: string) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let currentSection = '';

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      out.push(
        <div key={`code-${i}`} style={{ margin: '16px 0 20px', borderRadius: 10, overflow: 'hidden', border: `1px solid ${N.faint}` }}>
          {lang && (
            <div style={{ padding: '6px 14px', background: N.softer, borderBottom: `1px solid ${N.faint}`, fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: muteColor }}>
              {lang}
            </div>
          )}
          <pre style={{ margin: 0, padding: '14px 18px', background: N.softer, fontFamily: MONO, fontSize: 13, lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre', color: inkColor }}>
            <code>{code.join('\n')}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // HR
    if (/^---+$/.test(trimmed)) {
      out.push(<div key={`hr-${i}`} style={{ height: 1, background: N.faint, margin: '20px 0' }} />);
      i++;
      continue;
    }

    // H2 — section heading
    if (trimmed.startsWith('## ')) {
      const heading = trimmed.slice(3);
      currentSection = heading.toLowerCase().trim();
      const meta = getSectionMeta(heading);
      const accent = meta.accent === N.red ? redColor : meta.accent === N.amber ? amberColor : meta.accent === N.green ? greenColor : inkColor;
      out.push(
        <div key={`h2-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '36px 0 14px', paddingBottom: 10, borderBottom: `1px solid ${N.faint}` }}>
          <div style={{ width: 3, height: 20, background: accent, borderRadius: 999, flexShrink: 0 }} />
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent }}>
            {meta.label ?? heading}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // H1
    if (trimmed.startsWith('# ')) {
      out.push(
        <div key={`h1-${i}`} style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: '-0.03em', color: inkColor, margin: '20px 0 10px', lineHeight: 1.1, fontWeight: 400 }}>
          {renderInline(trimmed.slice(2))}
        </div>
      );
      i++;
      continue;
    }

    // Bullet
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.slice(2);
      const meta = getSectionMeta(currentSection);
      const isWarning = meta.style === 'warning';
      const isMentalModel = currentSection === 'mental model';
      const dot = isWarning ? amberColor : isMentalModel ? redColor : redColor;
      out.push(
        <div key={`bullet-${i}`} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
          <span style={{ color: dot, fontFamily: MONO, fontSize: 11, flexShrink: 0, marginTop: 4, lineHeight: 1 }}>·</span>
          <span style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.65, color: inkColor }}>{renderInline(content)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Empty line
    if (!trimmed) {
      out.push(<div key={`sp-${i}`} style={{ height: 10 }} />);
      i++;
      continue;
    }

    // Body paragraph — wrap Definition and Mental model in callout box
    const meta = getSectionMeta(currentSection);
    if (meta.style === 'highlight' && currentSection === 'definition') {
      out.push(
        <div key={`def-${i}`} style={{ padding: '16px 20px', background: N.softer, borderLeft: `3px solid ${inkColor}`, margin: '4px 0 12px' }}>
          <span style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.7, color: inkColor, fontStyle: 'italic' }}>{renderInline(line)}</span>
        </div>
      );
      i++;
      continue;
    }

    if (meta.style === 'callout' && currentSection === 'mental model') {
      out.push(
        <div key={`mm-${i}`} style={{ padding: '16px 20px', background: N.softer, borderLeft: `3px solid ${redColor}`, margin: '4px 0 12px', borderRadius: '0 8px 8px 0' }}>
          <span style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.7, color: inkColor, fontStyle: 'italic' }}>{renderInline(line)}</span>
        </div>
      );
      i++;
      continue;
    }

    out.push(
      <div key={`p-${i}`} style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.75, color: inkColor, margin: '4px 0' }}>
        {renderInline(line)}
      </div>
    );
    i++;
  }
  return out;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Notes() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { state } = useStore();
  const { dark } = useTheme();
  const [activeKey, setActiveKey] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  const course = state.courses.find((c) => c.id === courseId);
  const isPremium = state.profile?.plan === 'premium';

  const bg  = dark ? '#050505' : '#f4f0e8';
  const ink = dark ? '#f6f0e7' : '#1a1510';
  const mute = dark ? 'rgba(246,240,231,0.50)' : 'rgba(26,21,16,0.52)';

  if (!isPremium) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: 32 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: mute }}>Premium feature</div>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 400, letterSpacing: '-0.03em', margin: 0, color: ink }}>
          Notes are for<br /><i>premium members.</i>
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 18, color: mute, margin: 0, maxWidth: 380 }}>
          Upgrade to get AI-generated notes after every lesson — saved, searchable, yours.
        </p>
        <button
          onClick={() => navigate('/settings?tab=billing')}
          style={{ background: ink, color: bg, border: 'none', padding: '14px 28px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 8 }}
        >
          Upgrade to Premium →
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontFamily: MONO, fontSize: 10, color: mute, letterSpacing: '0.12em', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Go back
        </button>
      </div>
    );
  }

  const vars = {
    '--n-bg':     dark ? '#050505' : '#f4f0e8',
    '--n-paper':  dark ? '#1c1a16' : '#faf7f0',
    '--n-ink':    dark ? '#f6f0e7' : '#1a1510',
    '--n-mute':   dark ? 'rgba(246,240,231,0.50)' : 'rgba(26,21,16,0.52)',
    '--n-faint':  dark ? 'rgba(246,240,231,0.10)' : 'rgba(26,21,16,0.12)',
    '--n-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
    '--n-red':    dark ? '#ff5148' : '#c4221b',
    '--n-amber':  dark ? '#d99b45' : '#b87822',
    '--n-green':  dark ? '#72c089' : '#2d6a3f',
  } as React.CSSProperties;

  const inkColor   = dark ? '#f6f0e7' : '#1a1510';
  const muteColor  = dark ? 'rgba(246,240,231,0.50)' : 'rgba(26,21,16,0.52)';
  const redColor   = dark ? '#ff5148' : '#c4221b';
  const amberColor = dark ? '#d99b45' : '#b87822';
  const greenColor = dark ? '#72c089' : '#2d6a3f';

  // scroll-spy on window
  useEffect(() => {
    const onScroll = () => {
      const sections = contentRef.current?.querySelectorAll<HTMLElement>('[data-note-key]');
      if (!sections) return;
      let current = '';
      sections.forEach((s) => {
        if (s.getBoundingClientRect().top <= 160) current = s.dataset.noteKey ?? '';
      });
      setActiveKey(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(key: string) {
    const el = contentRef.current?.querySelector<HTMLElement>(`[data-note-key="${key}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveKey(key);
    }
  }

  if (!course) {
    return (
      <div style={{ minHeight: '100vh', background: N.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', ...vars } as React.CSSProperties}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: N.mute, textTransform: 'uppercase' }}>Course not found.</div>
      </div>
    );
  }

  // build flat list of lessons-with-notes for sidebar
  const modules = course.curriculum.modules;
  const totalWithNotes = modules.reduce((acc, m) => acc + m.lessons.filter((l) => l.notes).length, 0);

  return (
    <div style={{ minHeight: '100vh', background: N.bg, color: N.ink, ...vars } as React.CSSProperties}>
      <AppNav />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 280,
        borderRight: `1px solid ${N.faint}`,
        overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 40,
        scrollbarWidth: 'none',
      }}>
        {/* back + title */}
        <div style={{ padding: '88px 24px 20px', borderBottom: `1px solid ${N.faint}` }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: N.mute, marginBottom: 14 }}
          >
            ← Dashboard
          </button>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: N.red, marginBottom: 6 }}>
            Course notes
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 17, letterSpacing: '-0.03em', lineHeight: 1.15, color: N.ink }}>
            {course.subject}
          </div>
          <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 9, color: N.mute, letterSpacing: '0.08em' }}>
            {totalWithNotes}/{modules.reduce((a, m) => a + m.lessons.length, 0)} lessons have notes
          </div>
        </div>

        {/* Module / lesson tree */}
        <nav style={{ padding: '16px 0' }}>
          {modules.map((mod, mi) => {
            const modKey = `mod-${mi}`;
            const lessonsWithNotes = mod.lessons.filter((l) => l.notes).length;
            return (
              <div key={mi} style={{ marginBottom: 4 }}>
                {/* Module row */}
                <button
                  onClick={() => scrollTo(modKey)}
                  style={{
                    width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                    padding: '8px 24px', textAlign: 'left',
                    borderLeft: `2px solid ${activeKey === modKey ? redColor : 'transparent'}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 9, color: activeKey === modKey ? redColor : muteColor, letterSpacing: '0.1em', flexShrink: 0 }}>
                    {String(mi + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: activeKey === modKey ? inkColor : muteColor, lineHeight: 1.2, textAlign: 'left' }}>
                    {mod.title}
                  </span>
                  {lessonsWithNotes > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 8, color: N.green, letterSpacing: '0.08em', flexShrink: 0 }}>
                      {lessonsWithNotes}
                    </span>
                  )}
                </button>

                {/* Lesson rows */}
                {mod.lessons.map((lesson, li) => {
                  const key = `lesson-${mi}-${li}`;
                  const hasNotes = !!lesson.notes;
                  return (
                    <button
                      key={li}
                      onClick={() => scrollTo(key)}
                      disabled={!hasNotes}
                      style={{
                        width: '100%', border: 'none', background: 'none',
                        cursor: hasNotes ? 'pointer' : 'default',
                        padding: '5px 24px 5px 48px', textAlign: 'left',
                        borderLeft: `2px solid ${activeKey === key ? redColor : 'transparent'}`,
                        display: 'flex', alignItems: 'center', gap: 8,
                        opacity: hasNotes ? 1 : 0.38,
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: hasNotes ? (activeKey === key ? redColor : N.green) : N.faint }} />
                      <span style={{ fontFamily: SANS, fontSize: 11, color: activeKey === key ? inkColor : muteColor, lineHeight: 1.3, textAlign: 'left' }}>
                        {lesson.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        style={{
          marginLeft: 280,
          minHeight: '100vh',
          padding: '88px clamp(32px, 6vw, 96px) 120px',
        }}
      >
        {/* Course header */}
        <div style={{ marginBottom: 56, paddingBottom: 40, borderBottom: `2px solid ${inkColor}` }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: redColor, marginBottom: 12 }}>
            Notes
          </div>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.9, letterSpacing: '-0.06em', color: inkColor }}>
            {course.subject}
          </h1>
          <div style={{ marginTop: 18, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: MONO, fontSize: 9, color: muteColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span>{modules.length} modules</span>
            <span>·</span>
            <span>{modules.reduce((a, m) => a + m.lessons.length, 0)} lessons</span>
            <span>·</span>
            <span style={{ color: totalWithNotes > 0 ? N.green : muteColor }}>{totalWithNotes} with notes</span>
          </div>
        </div>

        {/* Module sections */}
        {modules.map((mod, mi) => {
          const modKey = `mod-${mi}`;
          const hasAnyInModule = mod.lessons.some((l) => l.notes);
          return (
            <section key={mi} data-note-key={modKey} style={{ marginBottom: 72, scrollMarginTop: 32 }}>
              {/* Module heading */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28, paddingBottom: 14, borderBottom: `1px solid ${N.faint}` }}>
                <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'clamp(44px, 5vw, 66px)', color: redColor, lineHeight: 0.9, letterSpacing: '-0.03em', flexShrink: 0 }}>
                  {String(mi + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: muteColor, marginBottom: 4 }}>
                    Module
                  </div>
                  <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.025em', color: inkColor, lineHeight: 1.1 }}>
                    {mod.title}
                  </h2>
                </div>
                {!hasAnyInModule && (
                  <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9, color: muteColor, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                    no notes yet
                  </span>
                )}
              </div>

              {/* Lesson notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {mod.lessons.map((lesson, li) => {
                  const key = `lesson-${mi}-${li}`;
                  const hasNotes = !!lesson.notes;
                  return (
                    <div
                      key={li}
                      data-note-key={key}
                      style={{
                        paddingBottom: 40,
                        marginBottom: 40,
                        borderBottom: li < mod.lessons.length - 1 ? `1px solid ${N.faint}` : 'none',
                        opacity: hasNotes ? 1 : 0.38,
                        scrollMarginTop: 100,
                      }}
                    >
                      {/* Lesson header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: hasNotes ? 20 : 0 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          display: 'grid', placeItems: 'center',
                          background: hasNotes ? (lesson.completed ? N.green : N.faint) : N.softer,
                          border: `1px solid ${hasNotes ? (lesson.completed ? N.green : N.faint) : N.faint}`,
                        }}>
                          {lesson.completed && (
                            <span style={{ fontFamily: MONO, fontSize: 8, color: dark ? '#050505' : '#faf7f0' }}>✓</span>
                          )}
                        </div>
                        <h3 style={{ margin: 0, fontFamily: SANS, fontSize: 15, fontWeight: 600, color: inkColor, letterSpacing: '-0.01em' }}>
                          {lesson.title}
                        </h3>
                        {!hasNotes && (
                          <span style={{ fontFamily: MONO, fontSize: 9, color: muteColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            not yet
                          </span>
                        )}
                      </div>

                      {/* Notes body */}
                      {hasNotes && lesson.notes && (
                        <div style={{ paddingLeft: 36 }}>
                          {renderMarkdown(lesson.notes, inkColor, muteColor, redColor, amberColor, greenColor)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Empty state */}
        {totalWithNotes === 0 && (
          <div style={{ marginTop: 24, padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: 28, color: muteColor, fontStyle: 'italic', letterSpacing: '-0.02em', marginBottom: 12 }}>
              No notes yet.
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: muteColor, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Notes are generated as you complete lessons.
            </div>
            <button
              onClick={() => navigate(`/learn/${courseId}`)}
              style={{ marginTop: 24, background: 'none', border: `1px solid ${N.ink}`, color: N.ink, padding: '12px 22px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Continue course →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
