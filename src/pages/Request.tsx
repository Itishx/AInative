import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { fetchShelf, IntakeMessage, IntakeResult, sendIntake, ShelfCourse, submitRequest } from '../lib/learnor';

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const SANS = '"Inter", -apple-system, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

const R = {
  bg: 'var(--r-bg)',
  paper: 'var(--r-paper)',
  ink: 'var(--r-ink)',
  mute: 'var(--r-mute)',
  faint: 'var(--r-faint)',
  softer: 'var(--r-softer)',
  red: 'var(--r-red)',
  green: 'var(--r-green)',
};

const OPENING = 'What do you want to learn? Anything at all — I\'ll build you a complete course around it.';

export default function Request() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dark } = useTheme();

  const [messages, setMessages] = useState<IntakeMessage[]>([{ who: 'ai', text: OPENING }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [intakeDone, setIntakeDone] = useState<IntakeResult['request']>(null);
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [shelf, setShelf] = useState<ShelfCourse[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchShelf().then(setShelf).catch(() => {}); }, []);
  useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, intakeDone, submitted]);

  const vars = useMemo(() => ({
    '--r-bg': dark ? '#050505' : '#f4f0e8',
    '--r-paper': dark ? '#1c1a16' : '#faf7f0',
    '--r-ink': dark ? '#f6f0e7' : '#1a1510',
    '--r-mute': dark ? 'rgba(246,240,231,0.50)' : 'rgba(26,21,16,0.52)',
    '--r-faint': dark ? 'rgba(246,240,231,0.10)' : 'rgba(26,21,16,0.12)',
    '--r-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
    '--r-red': dark ? '#ff5148' : '#c4221b',
    '--r-green': dark ? '#72c089' : '#2d6a3f',
  }) as React.CSSProperties, [dark]);

  async function send() {
    const text = input.trim();
    if (!text || busy || intakeDone) return;
    setError('');
    setInput('');
    const next: IntakeMessage[] = [...messages, { who: 'user', text }];
    setMessages(next);
    setBusy(true);
    try {
      const result = await sendIntake(next);
      setMessages((m) => [...m, { who: 'ai', text: result.reply }]);
      if (result.done && result.request) setIntakeDone(result.request);
    } catch (err) {
      setError((err as Error).message);
      setMessages((m) => [...m, { who: 'ai', text: 'Sorry — I hit a snag. Say that again?' }]);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!intakeDone || busy) return;
    setBusy(true);
    setError('');
    try {
      await submitRequest({
        topic: intakeDone.topic,
        brief: intakeDone.brief,
        expectations: intakeDone.expectations,
        level: intakeDone.level,
        metadata: intakeDone.metadata,
        requesterEmail: email.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: R.bg, color: R.ink, fontFamily: SANS, ...vars }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px clamp(20px, 4vw, 48px) 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 44 }}>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/')}
            style={{ border: `1px solid ${R.faint}`, borderRadius: 999, background: 'transparent', color: R.ink, cursor: 'pointer', padding: '10px 16px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}
          >
            {user ? '← Dashboard' : '← Home'}
          </button>
          <button
            onClick={() => navigate('/browse')}
            style={{ border: `1px solid ${R.faint}`, borderRadius: 999, background: 'transparent', color: R.mute, cursor: 'pointer', padding: '10px 16px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}
          >
            Browse the shelf →
          </button>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: R.red }}>
          Request a course
        </div>
        <h1 style={{ margin: '12px 0 0', fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 0.92, letterSpacing: '-0.05em' }}>
          Learn whatever<br /><i>you want.</i>
        </h1>
        <p style={{ margin: '16px 0 0', color: R.mute, fontSize: 15, lineHeight: 1.65, maxWidth: 520 }}>
          Tell Learnor what you're after. It builds a complete reading course just for you,
          a human reviews it, and you get an email when it's live.
        </p>

        {/* Chat */}
        <div style={{ marginTop: 40, border: `1px solid ${R.faint}`, borderRadius: 24, background: R.paper, overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px 8px', maxHeight: '52vh', overflowY: 'auto' }}>
            {messages.map((message, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: message.who === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                <div style={{
                  maxWidth: '82%', padding: '12px 16px', borderRadius: 16,
                  background: message.who === 'user' ? R.ink : R.softer,
                  color: message.who === 'user' ? R.bg : R.ink,
                  border: message.who === 'user' ? 'none' : `1px solid ${R.faint}`,
                  fontSize: 14.5, lineHeight: 1.6,
                }}>
                  {message.text}
                </div>
              </div>
            ))}
            {busy && !intakeDone && (
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: R.mute, padding: '4px 2px 12px' }}>
                Learnor is thinking…
              </div>
            )}

            {intakeDone && !submitted && (
              <div style={{ margin: '10px 0 18px', border: `1px solid ${R.faint}`, borderRadius: 16, padding: '18px 20px', background: R.softer }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: R.green, marginBottom: 10 }}>
                  Brief captured
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 6 }}>{intakeDone.topic}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: R.mute, marginBottom: 16 }}>
                  Done well means: {intakeDone.expectations} · Level: {intakeDone.level}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com — for the “it's live” email"
                    style={{ flex: '1 1 220px', border: `1px solid ${R.faint}`, borderRadius: 10, background: 'transparent', color: R.ink, padding: '12px 14px', fontFamily: SANS, fontSize: 14, outline: 'none' }}
                  />
                  <button
                    onClick={submit}
                    disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                    style={{ background: R.ink, color: R.bg, border: 'none', borderRadius: 10, padding: '12px 20px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', opacity: busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 0.5 : 1 }}
                  >
                    {busy ? 'Sending…' : 'Build my course →'}
                  </button>
                </div>
              </div>
            )}

            {submitted && (
              <div style={{ margin: '10px 0 18px', border: `1px solid ${R.green}`, borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  Got it — Claude understands what you're after. ✓
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: R.mute }}>
                  It'll build your course, then it goes through a quick human review,
                  and you'll get an email at <b style={{ color: R.ink }}>{email}</b> when it's live.
                </div>
              </div>
            )}

            {error && (
              <div style={{ color: R.red, fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{error}</div>
            )}
            <div ref={endRef} />
          </div>

          {!intakeDone && (
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              style={{ display: 'flex', gap: 8, padding: '14px 18px 18px', borderTop: `1px solid ${R.faint}` }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={messages.length === 1 ? 'e.g. Rust, options trading, statistics for my ML job…' : 'Reply…'}
                autoFocus
                style={{ flex: 1, border: `1px solid ${R.faint}`, borderRadius: 12, background: 'transparent', color: R.ink, padding: '13px 16px', fontFamily: SANS, fontSize: 14.5, outline: 'none' }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                style={{ background: R.ink, color: R.bg, border: 'none', borderRadius: 12, padding: '0 20px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', cursor: busy ? 'wait' : 'pointer', opacity: busy || !input.trim() ? 0.5 : 1 }}
              >
                SEND
              </button>
            </form>
          )}
        </div>

        {/* Recently built — social proof */}
        {shelf.length > 0 && (
          <section style={{ marginTop: 64 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: R.mute, marginBottom: 18, paddingBottom: 12, borderBottom: `1px solid ${R.faint}` }}>
              Recently built
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {shelf.slice(0, 6).map((course) => (
                <button
                  key={course.slug}
                  onClick={() => navigate(`/course/${course.slug}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${R.faint}`, padding: '12px 2px', cursor: 'pointer' }}
                >
                  <span style={{ fontFamily: SERIF, fontSize: 19, letterSpacing: '-0.02em', color: R.ink }}>{course.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: R.mute, flexShrink: 0 }}>
                    {course.category} · {course.stats.sections} sections →
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
