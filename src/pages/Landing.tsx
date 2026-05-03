import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTheme as useAppTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useTypingPlaceholder } from '../lib/useTypingPlaceholder';
// ── Theme ─────────────────────────────────────────────────────────────────────
type T = {
  bg: string; paper: string; paperAlt: string;
  ink: string; inkSoft: string; mute: string;
  ruleFaint: string; ruleDash: string;
  red: string; green: string; amber: string;
};

const LIGHT: T = {
  bg: '#f4f0e8', paper: '#faf7f0', paperAlt: '#ede8dc',
  ink: '#1a1510', inkSoft: '#2d2620', mute: '#6b6458',
  ruleFaint: 'rgba(26,21,16,0.12)', ruleDash: 'rgba(26,21,16,0.18)',
  red: '#c4221b', green: '#2d6a3f', amber: '#d89430',
};
const DARK: T = {
  bg: '#050505', paper: '#1c1a16', paperAlt: '#252219',
  ink: '#f6f0e7', inkSoft: '#d8d2c2', mute: '#8a8373',
  ruleFaint: 'rgba(241,236,223,0.14)', ruleDash: 'rgba(241,236,223,0.22)',
  red: '#e8514a', green: '#6aae7f', amber: '#e3a447',
};

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const SANS = '"Inter", -apple-system, system-ui, sans-serif';
const MONO  = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';
const HERO_PLACEHOLDER_PHRASES = [
  'Learn SQL joins for analytics',
  'Master Python for automation',
  'Understand AWS from scratch',
  'Get fluent in spoken French',
];

const ThemeCtx = createContext<{ t: T; dark: boolean }>({ t: LIGHT, dark: false });
const useTheme = () => useContext(ThemeCtx);

// ── Shared primitives ─────────────────────────────────────────────────────────
function Kicker({ children, color }: { children: React.ReactNode; color?: string }) {
  const { t } = useTheme();
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: color ?? t.red }}>
      {children}
    </div>
  );
}

function Wrap({ id, children, bg, pad = '96px 32px', borderTop, borderBottom }: {
  id?: string; children: React.ReactNode; bg?: string; pad?: string; borderTop?: boolean; borderBottom?: boolean;
}) {
  const { t } = useTheme();
  return (
    <section id={id} style={{
      background: bg ?? t.bg, padding: pad,
      borderTop: borderTop ? `1px solid ${t.ruleFaint}` : undefined,
      borderBottom: borderBottom ? `1px solid ${t.ruleFaint}` : undefined,
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>{children}</div>
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function SiteNav({ active, dark, loggedIn, avatarUrl, profileLabel, onToggleDark, onNav, onToggleSaas }: {
  active: string; dark: boolean; loggedIn: boolean; avatarUrl?: string; profileLabel: string; onToggleDark: () => void; onNav: (id: string) => void;
}) {
  const { t } = useTheme();
  const items: [string, string][] = [
    ['how', 'How it works'], ['features', 'Features'],
    ['leaderboard', 'Leaderboard'], /* ['instructors', 'Teach here'], */
    ['pricing', 'Pricing'], ['browse', 'Browse'], ['faq', 'FAQ'],
  ];
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      padding: '18px 20px 10px',
      background: t.bg,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(130px, 0.55fr) minmax(0, auto) minmax(130px, 0.55fr)',
        alignItems: 'center',
        gap: 12,
      }}>
        <div />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          minWidth: 0,
          padding: '14px 18px',
          border: `1px solid ${t.ruleFaint}`,
          borderRadius: 999,
          background: dark ? 'rgba(28,26,22,0.84)' : 'rgba(250,247,240,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: dark
            ? '0 18px 48px rgba(0,0,0,0.30)'
            : '0 18px 48px rgba(26,21,16,0.10)',
        }}>
          {/* Wordmark */}
          <a href="#home" onClick={(e) => { e.preventDefault(); onNav('home'); }} style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: 999,
            flexShrink: 0,
          }}>
            <b style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 400, letterSpacing: '-0.055em', color: t.ink }}>Learnor</b>
          </a>
          {/* Links */}
          <div style={{
            display: 'flex',
            gap: 6,
            padding: 5,
            borderRadius: 999,
            background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.04)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {items.map(([k, l]) => (
              <a key={k} href={`#${k}`} onClick={(e) => { e.preventDefault(); onNav(k); }} style={{
                padding: '10px 14px', fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase', textDecoration: 'none',
                color: active === k ? t.bg : t.mute, cursor: 'pointer',
                background: active === k ? t.red : 'transparent',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>{l}</a>
            ))}
          </div>
        </div>

        <div style={{
          justifySelf: 'end',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px',
          borderRadius: 999,
          border: `1px solid ${t.ruleFaint}`,
          background: dark ? 'rgba(28,26,22,0.72)' : 'rgba(250,247,240,0.76)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          {/* Dark toggle */}
          <button onClick={onToggleDark} title={dark ? 'Light mode' : 'Dark mode'} style={{
            width: 42, height: 42, border: `1px solid ${t.ruleFaint}`,
            borderRadius: 999,
            background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.04)',
            color: t.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: MONO, fontSize: 14,
          }}>{dark ? '☀' : '☾'}</button>
          {loggedIn && (
            <a href="#dashboard" onClick={(e) => { e.preventDefault(); onNav('dashboard'); }} style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: t.ink,
              textDecoration: 'none',
              padding: '12px 13px',
              borderRadius: 999,
              background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.04)',
              border: `1px solid ${t.ruleFaint}`,
              whiteSpace: 'nowrap',
            }}>
              Dashboard
            </a>
          )}
          <a href={loggedIn ? '#profile' : '#dashboard'} onClick={(e) => { e.preventDefault(); onNav(loggedIn ? 'profile' : 'dashboard'); }} style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: t.ink, textDecoration: 'none', padding: loggedIn ? 0 : '10px 12px', whiteSpace: 'nowrap',
            display: 'grid', placeItems: 'center',
          }}>
            {loggedIn ? (
              <span style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                background: t.ink,
                color: t.bg,
                border: `1px solid ${t.ruleFaint}`,
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : profileLabel.slice(0, 2).toUpperCase()}
              </span>
            ) : 'Log in'}
          </a>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection({ onNav }: { onNav: (k: string) => void }) {
  const { t, dark } = useTheme();
  const { state } = useStore();
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState('');
  const navigate = useNavigate();
  const typingPlaceholder = useTypingPlaceholder({
    phrases: HERO_PLACEHOLDER_PHRASES,
    enabled: !focused && !input.trim(),
  });
  const finishers = state.courses.filter((c) => c.status === 'completed').length;
  const recommitted = state.courses.filter((c) => c.status === 'tombstone' || c.status === 'expired').length;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setMaterialsError('');

    let materialsContext = '';

    if (resourceFile) {
      setMaterialsLoading(true);
      try {
        async function safeJson(res: Response) {
          const text = await res.text();
          try { return JSON.parse(text); } catch { throw new Error(`Server error (${res.status})`); }
        }

        const parts: string[] = [];
        if (resourceFile) {
          const form = new FormData();
          form.append('files', resourceFile);
          const res = await fetch('/api/upload-materials', { method: 'POST', body: form });
          const data = await safeJson(res);
          if (data.error) throw new Error(data.error);
          if (data.materialsContext) parts.push(data.materialsContext);
        }
        materialsContext = parts.join('\n\n---\n\n');
      } catch (err) {
        setMaterialsError(err instanceof Error ? err.message : 'Failed to load resources');
        setMaterialsLoading(false);
        return;
      }
      setMaterialsLoading(false);
    }

    if (materialsContext) {
      try { sessionStorage.setItem('ainative_materials_context', materialsContext); } catch {}
    }
    navigate(`/new?topic=${encodeURIComponent(v)}`);
  }

  return (
    <section id="home" style={{ background: t.bg, padding: '100px 24px 120px', textAlign: 'center' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Kicker */}
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: t.red, marginBottom: 32 }}>
          — active learning. not passive watching.
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: SERIF, fontWeight: 400,
          fontSize: 'clamp(56px, 9vw, 120px)', lineHeight: 0.92,
          letterSpacing: '-0.035em', margin: '0 0 32px', color: t.ink,
        }}>
          Learn whatever<br />
          the f*ck{' '}
          <span style={{ fontStyle: 'italic', color: t.red }}>you want.</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontFamily: SERIF, fontSize: 20, lineHeight: 1.4,
          color: t.mute, fontStyle: 'italic', margin: '0 auto 42px', maxWidth: 460,
        }}>
          Type a topic. Get a tiny course. Finish before it disappears.
        </p>

        {/* Big input box */}
        <form onSubmit={handleStart}>
          <div style={{
            border: `1.5px solid ${focused ? t.ink : t.ruleFaint}`,
            background: t.paper,
            transition: 'border-color 0.15s',
            boxShadow: focused ? `0 0 0 3px ${dark ? 'rgba(241,236,223,0.08)' : 'rgba(26,21,16,0.06)'}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', padding: '20px 20px 12px' }}>
              <span style={{ fontFamily: MONO, fontSize: 13, color: t.red, marginRight: 14, marginTop: 3, flexShrink: 0 }}>$</span>
              <div style={{ position: 'relative', flex: 1 }}>
                {typingPlaceholder.show && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      fontFamily: SERIF,
                      fontSize: 22,
                      lineHeight: 1.4,
                      color: t.mute,
                      minHeight: 56,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {typingPlaceholder.text}
                    <span style={{ opacity: typingPlaceholder.cursorVisible ? 1 : 0, transition: 'opacity 140ms ease' }}>|</span>
                  </div>
                )}
                <textarea
                  aria-label="What do you want to learn?"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStart(e); } }}
                  placeholder=""
                  rows={2}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    resize: 'none',
                    fontFamily: SERIF,
                    fontSize: 22,
                    lineHeight: 1.4,
                    color: t.ink,
                    minHeight: 56,
                    overflow: 'hidden',
                  }}
                />
              </div>
            </div>

            {/* PDF panel — shown when resources selected */}
            {showResources && (
              <div style={{ padding: '12px 20px 14px', borderTop: `1px dashed ${t.ruleFaint}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>pdf</span>
                <label style={{ cursor: 'pointer', flex: 1 }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: resourceFile ? t.ink : t.mute, borderBottom: `1px solid ${resourceFile ? t.ink : t.ruleFaint}`, paddingBottom: 2 }}>
                    {resourceFile ? resourceFile.name : 'choose a pdf file…'}
                  </span>
                  <input type="file" accept=".pdf" onChange={(e) => { setResourceFile(e.target.files?.[0] ?? null); }} style={{ display: 'none' }} />
                </label>
                {resourceFile && (
                  <button type="button" onClick={() => setResourceFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 12, color: t.mute, padding: 0 }}>×</button>
                )}
                {materialsError && (
                  <span style={{ fontFamily: MONO, fontSize: 10, color: t.red, letterSpacing: '0.1em' }}>{materialsError}</span>
                )}
              </div>
            )}

            {/* Bottom bar */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 10px 16px', borderTop: `1px solid ${t.ruleFaint}`, gap: 10 }}>

              {/* + modal */}
              {showModal && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 12,
                  background: t.paper, border: `1px solid ${t.ruleFaint}`,
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: dark ? '0 16px 48px rgba(0,0,0,0.36)' : '0 16px 48px rgba(26,21,16,0.14)',
                  minWidth: 240, zIndex: 10,
                }}>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setShowResources(true); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', borderBottom: `1px solid ${t.ruleFaint}`, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 16 }}>📄</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: t.ink }}>Add your own resources</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); navigate('/import'); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 16 }}>↗</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: t.ink }}>Import a course</span>
                    <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.amber, border: `1px solid ${t.amber}`, borderRadius: 999, padding: '2px 8px' }}>premium</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setShowModal((s) => !s); if (showResources) setShowResources(false); }}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: `1px solid ${resourceFile || showModal ? t.ink : t.ruleFaint}`,
                    background: 'none', cursor: 'pointer',
                    color: resourceFile || showModal ? t.ink : t.mute,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, lineHeight: 1, flexShrink: 0,
                  }}
                >
                  {showModal ? '×' : '+'}
                </button>
                {resourceFile && (
                  <span style={{ fontFamily: MONO, fontSize: 10, color: t.green, letterSpacing: '0.1em' }}>1 pdf attached</span>
                )}
              </div>

              <button type="submit" disabled={!input.trim() || materialsLoading} style={{
                background: input.trim() && !materialsLoading ? t.ink : t.ruleFaint,
                color: input.trim() && !materialsLoading ? t.bg : t.mute,
                border: 'none', padding: '10px 22px', flexShrink: 0,
                fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                cursor: input.trim() && !materialsLoading ? 'pointer' : 'not-allowed', transition: 'background 0.15s',
              }}>
                {materialsLoading ? 'loading…' : 'Start course →'}
              </button>
            </div>
          </div>
        </form>

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 24, marginTop: 32, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 11, color: t.mute, letterSpacing: '0.1em' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.green, display: 'inline-block' }} />
            <span>{finishers} finished</span>
          </div>
          <span style={{ color: t.ruleFaint, fontFamily: MONO, fontSize: 14 }}>·</span>
          <div style={{ fontFamily: MONO, fontSize: 11, color: t.mute, letterSpacing: '0.1em' }}>
            <span style={{ color: t.amber }}>↺</span> {recommitted.toLocaleString()} recommitted
          </div>
          <span style={{ color: t.ruleFaint, fontFamily: MONO, fontSize: 14 }}>·</span>
          <div style={{ fontFamily: MONO, fontSize: 11, color: t.mute, letterSpacing: '0.1em' }}>no card required</div>
          {state.courses.length > 0 && (
            <>
              <span style={{ color: t.ruleFaint, fontFamily: MONO, fontSize: 14 }}>·</span>
              <button onClick={() => onNav('dashboard')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: MONO, fontSize: 11, color: t.ink, letterSpacing: '0.1em',
                textDecoration: 'underline',
              }}>{state.courses.length} open contract{state.courses.length !== 1 ? 's' : ''} →</button>
            </>
          )}
        </div>

<div style={{ marginTop: 24 }}>
          <button
            onClick={() => navigate('/anything')}
            style={{
              background: 'transparent',
              border: `1px solid ${t.ruleFaint}`,
              color: t.ink,
              cursor: 'pointer',
              padding: '12px 18px',
              borderRadius: 999,
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Or wander through everything it can teach →
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Ticker ────────────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '↺ conversational french — dani.w — expired, new deadline set',
  '✓ docker in anger — mira.k — finished 14d 02h early',
  '↺ rust ownership — anon_99 — recommitted day 2',
  '✓ linear algebra — yael — finished 04d 22h early',
  '↺ color theory — nikoj — missed deadline, back on track',
  '✓ public speaking — aleks — finished 01d 16h early',
  '↺ react hooks — pin22 — second attempt underway',
  '✓ intro to probability — ojo_22 — finished 11d 19h early',
];

function TickerStrip() {
  const { t } = useTheme();
  const all = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ background: t.ink, padding: '18px 0', overflow: 'hidden' }}>
      <style>{`@keyframes ainTicker { from { transform: translateX(0) } to { transform: translateX(-33.33%) } }`}</style>
      <div style={{
        display: 'flex', gap: 64, whiteSpace: 'nowrap',
        animation: 'ainTicker 60s linear infinite',
        fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        {all.map((s, i) => (
          <span key={i} style={{ color: s.startsWith('↺') ? '#d99b45' : t.bg, flexShrink: 0 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ── Comparison strip ─────────────────────────────────────────────────────────
function ComparisonSection() {
  const { t } = useTheme();
  const rows = [
    { source: 'YouTube', verdict: 'You watch. You forget.' },
    { source: 'A textbook', verdict: 'You read. You zone out.' },
    { source: 'Learnor', verdict: 'You explain it back. You keep it.', highlight: true },
  ];
  return (
    <Wrap bg={t.paperAlt} pad="80px 32px" borderBottom>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Kicker>Why it works</Kicker>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(38px, 5vw, 68px)', margin: '16px 0 40px', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
          Built for understanding,<br /><i>not watching.</i>
        </h2>
        <div style={{ borderTop: `2px solid ${t.ink}` }}>
          {rows.map((row) => (
            <div key={row.source} style={{
              display: 'grid', gridTemplateColumns: '200px 1fr', gap: 32,
              padding: '22px 0', borderBottom: `1px solid ${t.ruleFaint}`, alignItems: 'baseline',
            }}>
              <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: row.highlight ? t.red : t.mute }}>
                {row.source}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 22, color: row.highlight ? t.ink : t.inkSoft, fontStyle: row.highlight ? 'normal' : 'italic', lineHeight: 1.2 }}>
                {row.verdict}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: SERIF, fontSize: 17, color: t.mute, lineHeight: 1.65, margin: '28px 0 0', fontStyle: 'italic', maxWidth: 600 }}>
          If you actually want to understand something — not just watch it — this is for you.
        </p>
      </div>
    </Wrap>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function PromptIllustration() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ink}`, background: t.bg, padding: 18, minHeight: 220 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.14em' }}>$ learnor new</div>
      <div style={{ fontFamily: SERIF, fontSize: 20, color: t.ink, marginTop: 10, fontStyle: 'italic', lineHeight: 1.3 }}>
        "teach me conversational spanish,<br />intermediate, in 30 days"
      </div>
      <div style={{ marginTop: 18, borderTop: `1px dashed ${t.ruleDash}`, paddingTop: 12 }}>
        {['01 · Sounds & rhythm', '02 · Present tense, used right', '03 · Past tense without panic', '04 · Directions & transactions', '05 · Opinions & small talk', '+ 3 more…'].map((l, i) => (
          <div key={i} style={{
            fontFamily: MONO, fontSize: 11, color: i === 5 ? t.mute : t.ink,
            padding: '4px 0', borderBottom: i < 5 ? `1px dashed ${t.ruleFaint}` : 'none', letterSpacing: '0.04em',
          }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function CalendarIllustration() {
  const { t } = useTheme();
  const selected = 18;
  return (
    <div style={{ border: `1px solid ${t.ink}`, background: t.bg, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.14em', marginBottom: 10 }}>
        <span>‹ APR</span><span style={{ color: t.ink }}>MAY 2026</span><span>JUN ›</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, fontFamily: MONO, fontSize: 10 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', color: t.mute, padding: 3 }}>{d}</div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => {
          const d = i - 3;
          if (d < 1 || d > 31) return <div key={i} />;
          const isSel = d === selected;
          const inRange = d < selected && d >= 1;
          return (
            <div key={i} style={{
              textAlign: 'center', padding: '6px 0',
              background: isSel ? t.red : inRange ? 'rgba(196,34,27,0.12)' : 'transparent',
              color: isSel ? '#faf7f0' : t.ink,
              border: isSel ? 'none' : `1px solid ${t.ruleFaint}`,
              fontWeight: isSel ? 600 : 400,
            }}>{d}</div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 10, color: t.red, letterSpacing: '0.14em' }}>
        ▸ DEADLINE: MAY 18 · 23:59 · 20 DAYS LOCKED
      </div>
    </div>
  );
}

function CountdownIllustration() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ink}`, background: t.bg, padding: 24, textAlign: 'center' }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.16em' }}>TIME REMAINING</div>
      <div style={{ fontFamily: SERIF, fontSize: 88, color: t.red, lineHeight: 0.9, marginTop: 12, letterSpacing: '-0.03em' }}>
        <span>00</span>
        <span style={{ fontFamily: MONO, fontSize: 20, color: t.mute, marginLeft: 4, letterSpacing: '0.1em' }}>D</span>
        <span style={{ marginLeft: 16 }}>02</span>
        <span style={{ fontFamily: MONO, fontSize: 20, color: t.mute, marginLeft: 4, letterSpacing: '0.1em' }}>H</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: t.mute, letterSpacing: '0.14em', marginTop: 10 }}>
        14 : 23 MINUTES · 08 SECONDS
      </div>
      <div style={{ marginTop: 14, height: 4, background: t.ruleFaint, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '94%', background: t.red }} />
      </div>
      <div style={{ marginTop: 14, fontFamily: SERIF, fontSize: 16, color: t.ink, fontStyle: 'italic' }}>
        One module left. 94% complete.
      </div>
    </div>
  );
}

function HowSection() {
  const { t } = useTheme();
  const steps = [
    {
      n: '01', kicker: 'Step one', title: 'Say it out loud.',
      body: 'Name the thing. Learnor turns it into short lessons.',
      art: <PromptIllustration />,
    },
    {
      n: '02', kicker: 'Step two', title: 'Pick a deadline.',
      body: 'Choose the date. The clock starts when you commit.',
      art: <CalendarIllustration />,
    },
    {
      n: '03', kicker: 'Step three', title: 'Commit. Recommit if needed.',
      body: 'The tutor teaches step by step. Miss the deadline, set a new one, and keep going.',
      art: <CountdownIllustration />,
    },
  ];
  return (
    <Wrap id="how" bg={t.paper} pad="120px 32px" borderTop borderBottom>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 44 }}>
        <div>
          <Kicker>How it works</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(56px, 7vw, 108px)', margin: '16px 0 0', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
            Three steps.<br /><i>One</i> commitment.
          </h2>
        </div>
      </div>
      <div style={{ borderTop: `2px solid ${t.ink}` }}>
        {steps.map((s) => (
          <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '96px 0.9fr 1.1fr', borderBottom: `1px solid ${t.ruleFaint}`, padding: '34px 0', gap: 40, alignItems: 'start' }}>
            <div style={{ fontFamily: SERIF, fontSize: 70, color: t.red, lineHeight: 0.9, letterSpacing: '-0.03em', fontStyle: 'italic' }}>{s.n}</div>
            <div>
              <Kicker color={t.mute}>{s.kicker}</Kicker>
              <h3 style={{ fontFamily: SERIF, fontSize: 38, margin: '10px 0 10px', fontWeight: 400, letterSpacing: '-0.02em', color: t.ink, lineHeight: 1.05 }}>{s.title}</h3>
              <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.35, color: t.inkSoft, margin: 0 }}>{s.body}</p>
            </div>
            <div>{s.art}</div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function TutorMockup() {
  const { t } = useTheme();
  const msgs = [
    { who: 'tutor', text: 'A primary key is the one value that identifies a row. Keep it unique and the table stays searchable.' },
    { who: 'user', text: 'show example' },
    { who: 'tutor', text: 'Perfect — I’ll put the table on the canvas while we talk through it.' },
  ];
  return (
    <div style={{
      border: `1px solid ${t.ruleFaint}`,
      background: '#171410',
      minHeight: 520,
      display: 'grid',
      gridTemplateColumns: '0.92fr 1.4fr',
      overflow: 'hidden',
      boxShadow: '0 26px 80px rgba(0,0,0,0.18)',
    }}>
      <div style={{ padding: 20, color: '#faf7f0', borderRight: '1px solid rgba(250,247,240,0.10)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(250,247,240,0.50)', textTransform: 'uppercase' }}>
          Learnor · SQL basics
        </div>
        <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 32, lineHeight: 0.95, letterSpacing: '-0.035em' }}>
          Primary keys, one step at a time.
        </div>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              maxWidth: '92%',
              alignSelf: m.who === 'user' ? 'flex-end' : 'flex-start',
              fontFamily: SANS,
              fontSize: 14,
              lineHeight: 1.55,
              padding: '11px 13px',
              borderRadius: 16,
              background: m.who === 'user' ? '#faf7f0' : 'rgba(250,247,240,0.08)',
              color: m.who === 'user' ? '#171410' : 'rgba(250,247,240,0.86)',
              border: m.who === 'user' ? 'none' : '1px solid rgba(250,247,240,0.08)',
            }}>{m.text}</div>
          ))}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {['show example', 'ask again', 'take quiz'].map((label, i) => (
              <span key={label} style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.10em', color: i === 0 ? '#7ad08b' : 'rgba(250,247,240,0.48)', border: '1px solid rgba(250,247,240,0.10)', padding: '6px 8px', borderRadius: 999 }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 9, border: '1px solid rgba(250,247,240,0.10)', borderRadius: 16, background: 'rgba(250,247,240,0.06)' }}>
            <div style={{ flex: 1, fontFamily: SANS, fontSize: 13, color: 'rgba(250,247,240,0.42)' }}>Ask, answer, or hold space...</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#faf7f0', letterSpacing: '0.12em' }}>SEND ↵</div>
          </div>
        </div>
      </div>

      <div style={{ background: t.bg, color: t.ink, padding: 24, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: t.red, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Canvas</div>
            <div style={{ marginTop: 5, fontFamily: SERIF, fontSize: 34, lineHeight: 0.95, letterSpacing: '-0.035em' }}>Orders table</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>visual example</div>
        </div>

        <div style={{ border: `1px solid ${t.ruleFaint}`, background: t.paper, padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: `1px solid ${t.ruleFaint}` }}>
            {['order_id', 'customer_id', 'date', 'total'].map((h) => (
              <div key={h} style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 0 10px' }}>{h}</div>
            ))}
          </div>
          {[
            ['1001', '42', 'Jan 15', '$59.99'],
            ['1002', '87', 'Jan 16', '$120.00'],
            ['1003', '42', 'Jan 18', '$34.50'],
          ].map((row) => (
            <div key={row[0]} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: `1px dashed ${t.ruleFaint}` }}>
              {row.map((cell, i) => (
                <div key={cell} style={{ fontFamily: i === 0 ? MONO : SANS, fontSize: 14, color: i === 0 ? t.red : t.ink, padding: '13px 0' }}>{cell}</div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, background: t.paper }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Why it matters</div>
            <p style={{ margin: '10px 0 0', fontFamily: SANS, fontSize: 14, lineHeight: 1.55, color: t.inkSoft }}>
              The canvas holds the visual so the chat can stay focused.
            </p>
          </div>
          <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, background: t.paper }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Progress</div>
            <div style={{ marginTop: 14, height: 7, background: t.ruleFaint }}>
              <div style={{ width: '42%', height: '100%', background: t.red }} />
            </div>
            <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.10em' }}>LESSON 03 OF 18</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TombstoneViz() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, opacity: 0.75, background: t.paper }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: t.amber, letterSpacing: '0.18em' }}>↺ EXPIRED</div>
      <div style={{ fontFamily: SERIF, fontSize: 22, color: t.ink, marginTop: 6, letterSpacing: '-0.01em' }}>
        Conversational French
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: t.mute, marginTop: 4 }}>missed apr 19 · 61% saved · recommitting</div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 4, color: t.amber, fontFamily: SERIF }}>
        <span style={{ fontSize: 42, letterSpacing: '-0.02em' }}>+14</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: t.mute }}>D</span>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: t.amber, marginLeft: 10 }}>new deadline</span>
      </div>
    </div>
  );
}

function PauseViz() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, background: t.paper }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.18em' }}>EMERGENCY PAUSE</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
        {[0,1,2].map((i) => (
          <div key={i} style={{ flex: 1, height: 14, border: `1px solid ${t.ink}`, background: i === 0 ? t.ink : 'transparent' }} />
        ))}
        <span style={{ fontFamily: MONO, fontSize: 10, color: t.mute, marginLeft: 4 }}>72H</span>
      </div>
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: t.inkSoft, marginTop: 12, lineHeight: 1.4 }}>
        One shot. Cannot be used in the last 24h.
      </div>
    </div>
  );
}

function LeaderboardViz() {
  const { t } = useTheme();
  const rows = [
    { rank: 1, user: 'mira.k', margin: '14d 02h' },
    { rank: 2, user: 'ojo_22', margin: '11d 19h' },
    { rank: 3, user: 'hansu', margin: '08d 11h' },
    { rank: 4, user: 'dani.w', margin: '06d 04h' },
  ];
  return (
    <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, background: t.paper }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.18em' }}>THIS MONTH</div>
      {rows.map((r, i) => (
        <div key={r.rank} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: i < 3 ? `1px dashed ${t.ruleFaint}` : 'none' }}>
          <span style={{ fontFamily: SERIF, fontSize: i === 0 ? 26 : 16, color: i === 0 ? t.red : t.mute, letterSpacing: '-0.02em', width: 32 }}>{String(r.rank).padStart(2, '0')}</span>
          <span style={{ flex: 1, fontFamily: MONO, fontSize: 11, color: t.ink }}>{r.user}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: t.red, letterSpacing: '0.1em' }}>-{r.margin}</span>
        </div>
      ))}
    </div>
  );
}

function WeeklyRankViz() {
  const { t } = useTheme();
  const rows = [
    { rank: 1, user: 'you', courses: 3, streak: 12, self: true },
    { rank: 2, user: 'priya.r', courses: 3, streak: 9, self: false },
    { rank: 3, user: 'lex_m', courses: 2, streak: 7, self: false },
    { rank: 4, user: 'j.ohno', courses: 2, streak: 5, self: false },
  ];
  return (
    <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, background: t.paper }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.18em' }}>WEEKLY</div>
        <div style={{ fontFamily: MONO, fontSize: 8, color: t.green, letterSpacing: '0.1em' }}>LIVE</div>
      </div>
      {rows.map((r, i) => (
        <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < rows.length - 1 ? `1px solid ${t.ruleFaint}` : 'none', background: r.self ? `${t.red}10` : 'transparent', marginLeft: r.self ? -8 : 0, paddingLeft: r.self ? 8 : 0, paddingRight: r.self ? 8 : 0 }}>
          <span style={{ fontFamily: SERIF, fontSize: 15, color: i === 0 ? t.red : t.mute, width: 20, flexShrink: 0 }}>{r.rank}</span>
          <span style={{ flex: 1, fontFamily: MONO, fontSize: 10, color: r.self ? t.red : t.ink }}>{r.user}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: t.mute }}>{r.courses} done</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: t.amber, letterSpacing: '0.06em' }}>{r.streak}d</span>
        </div>
      ))}
    </div>
  );
}

function NotesViz() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, background: t.paper }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.18em' }}>LESSON NOTES</div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Primary keys identify one row.', 'SQL filters rows before grouping.', 'Arrays keep values in order.'].map((note, i) => (
          <div key={note} style={{ display: 'flex', gap: 9, alignItems: 'start', fontFamily: SERIF, fontSize: 15, lineHeight: 1.35, color: t.ink }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: t.red, marginTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizViz() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, background: t.paper }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, letterSpacing: '0.18em' }}>QUIZ GATE</div>
      <div style={{ fontFamily: SERIF, fontSize: 17, color: t.ink, marginTop: 10, lineHeight: 1.25 }}>
        What does WHERE do?
      </div>
      {['Sorts columns', 'Filters rows', 'Renames a table'].map((option, i) => (
        <div key={option} style={{ marginTop: 8, padding: '7px 9px', border: `1px solid ${i === 1 ? t.green : t.ruleFaint}`, color: i === 1 ? t.green : t.inkSoft, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em' }}>
          {String.fromCharCode(65 + i)}) {option}
        </div>
      ))}
    </div>
  );
}



function FeaturesSection({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  const navigate = useNavigate();
  const trio = [
    { n: '02', title: 'Recommit.', body: 'Miss a deadline and set a new one. Progress saves. The clock restarts.', art: <TombstoneViz /> },
    { n: '03', title: 'One pause.', body: 'A single 72-hour save. Spend it carefully.', art: <PauseViz /> },
    { n: '04', title: 'Finishers.', body: 'Beat the clock and show up on the wall.', art: <LeaderboardViz /> },
    { n: '05', title: 'Notes.', body: 'Each lesson leaves clean notes behind.', art: <NotesViz /> },
    { n: '06', title: 'Quizzes.', body: 'MCQs check recall before you move on.', art: <QuizViz /> },
    { n: '07', title: 'Weekly rankings.', body: 'See where you stand against other learners. Streak days, courses finished, live every week.', art: <WeeklyRankViz /> },
  ];
  return (
    <Wrap id="features" pad="120px 32px">
      <div style={{ maxWidth: 720, marginBottom: 48 }}>
        <Kicker>The product</Kicker>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(56px, 7vw, 108px)', margin: '16px 0 24px', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
          Chat on the left.<br />Canvas on the <span style={{ color: t.red }}>right.</span>
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 22, color: t.inkSoft, lineHeight: 1.35, margin: 0 }}>
          Learn by conversation, but never stare at a wall of text. Whenever an example, table, diagram, or code block matters, it opens beside the tutor.
        </p>
      </div>
      {/* Tutor feature */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.72fr 1.28fr', gap: 48, alignItems: 'start', marginBottom: 96 }}>
        <div>
          <Kicker color={t.mute}>Feature 01</Kicker>
          <h3 style={{ fontFamily: SERIF, fontSize: 54, margin: '12px 0 16px', fontWeight: 400, letterSpacing: '-0.02em', color: t.ink, lineHeight: 1 }}>
            The course room.
          </h3>
          <p style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.4, color: t.inkSoft, margin: 0 }}>
            The tutor teaches one step at a time in chat. The canvas carries the heavy stuff: examples, tables, code, diagrams, notes, and quiz context.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button onClick={() => navigate('/auth')} style={{
              background: t.ink, color: t.bg, border: 'none', padding: '14px 22px',
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer',
            }}>See it in action →</button>
          </div>
        </div>
        <TutorMockup />
      </div>
      {/* Trio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: `2px solid ${t.ink}`, borderBottom: `1px solid ${t.ink}` }}>
        {trio.map((f, i) => (
          <div key={f.n} style={{
            padding: '40px 32px',
            borderRight: i % 3 !== 2 ? `1px solid ${t.ruleFaint}` : 'none',
            borderBottom: i < trio.length - 3 ? `1px solid ${t.ruleFaint}` : 'none',
          }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: t.red, letterSpacing: '0.16em' }}>FEATURE {f.n}</div>
            <h4 style={{ fontFamily: SERIF, fontSize: 32, margin: '10px 0 10px', fontWeight: 400, letterSpacing: '-0.015em', color: t.ink }}>{f.title}</h4>
            <p style={{ fontFamily: SERIF, fontSize: 17, color: t.inkSoft, lineHeight: 1.35, margin: 0 }}>{f.body}</p>
            <div style={{ marginTop: 24 }}>{f.art}</div>
          </div>
        ))}
      </div>

      {/* Import callout */}
      <div style={{
        marginTop: 48, padding: '32px 40px',
        border: `1.5px solid ${t.ruleDash}`,
        background: t.paper,
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: t.red, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
            Already in a course?
          </div>
          <h4 style={{ fontFamily: SERIF, fontSize: 30, margin: '0 0 12px', fontWeight: 400, letterSpacing: '-0.01em', color: t.ink }}>
            Import from anywhere.
          </h4>
          <p style={{ fontFamily: SERIF, fontSize: 17, color: t.inkSoft, lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
            Already watching a Udemy course? Click one bookmark. Learnor reads the full curriculum and teaches you through it — interactively, with a tutor, not just passive video.
          </p>
        </div>
        <a href="/import" style={{
          background: t.ink, color: t.bg, padding: '14px 24px',
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
          textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block',
        }}>
          Import a course →
        </a>
      </div>
    </Wrap>
  );
}

// ── Notes section ────────────────────────────────────────────────────────────
function NotesPageMockup() {
  const { t, dark } = useTheme();

  const sidebarBg  = dark ? '#0e0c0a' : '#f0ece4';
  const contentBg  = dark ? '#1c1a16' : '#faf7f0';
  const borderCol  = dark ? 'rgba(241,236,223,0.09)' : 'rgba(26,21,16,0.11)';
  const muteCol    = dark ? 'rgba(241,236,223,0.40)' : 'rgba(26,21,16,0.45)';
  const inkCol     = dark ? '#f1ecdf' : '#1a1510';
  const codeBg     = dark ? 'rgba(241,236,223,0.06)' : 'rgba(26,21,16,0.05)';

  const modules = [
    {
      n: '01', title: 'Foundations',
      lessons: [
        { title: 'What is SQL?', hasNotes: true, active: false },
        { title: 'Tables and rows', hasNotes: true, active: true },
        { title: 'Data types', hasNotes: false, active: false },
      ],
    },
    {
      n: '02', title: 'Querying data',
      lessons: [
        { title: 'SELECT basics', hasNotes: true, active: false },
        { title: 'WHERE clause', hasNotes: false, active: false },
      ],
    },
  ];

  const noteLines = [
    { type: 'label', text: 'TABLES AND ROWS' },
    { type: 'h', text: 'What a table actually is' },
    { type: 'bullet', text: 'A table is a structured grid — rows are records, columns are fields.' },
    { type: 'bullet', text: 'Every row in a table should be uniquely identifiable.' },
    { type: 'bullet', text: 'Column data types enforce what can go in each field.' },
    { type: 'code', text: 'SELECT * FROM orders\nWHERE customer_id = 42;' },
    { type: 'bullet', text: 'NULL means "no value" — different from 0 or an empty string.' },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr',
      border: `1px solid ${borderCol}`,
      boxShadow: dark ? '0 32px 80px rgba(0,0,0,0.36)' : '0 32px 80px rgba(26,21,16,0.12)',
      overflow: 'hidden',
      minHeight: 440,
    }}>
      {/* Sidebar */}
      <div style={{ background: sidebarBg, borderRight: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column' }}>
        {/* back + meta */}
        <div style={{ padding: '20px 16px 14px', borderBottom: `1px solid ${borderCol}` }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.red, marginBottom: 8 }}>
            Course notes
          </div>
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: inkCol, lineHeight: 1.2 }}>
            SQL Basics
          </div>
          <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 8, color: muteCol, letterSpacing: '0.08em' }}>
            4/8 lessons with notes
          </div>
        </div>

        {/* Module tree */}
        <div style={{ padding: '10px 0', flex: 1 }}>
          {modules.map((mod) => (
            <div key={mod.n} style={{ marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px' }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: muteCol, letterSpacing: '0.1em', flexShrink: 0 }}>{mod.n}</span>
                <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: muteCol }}>{mod.title}</span>
              </div>
              {mod.lessons.map((l) => (
                <div key={l.title} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 16px 5px 32px',
                  borderLeft: l.active ? `2px solid ${t.red}` : '2px solid transparent',
                  background: l.active ? (dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.04)') : 'transparent',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: l.hasNotes ? (l.active ? t.red : t.green) : borderCol }} />
                  <span style={{ fontFamily: SANS, fontSize: 10, color: l.active ? inkCol : muteCol, lineHeight: 1.3 }}>{l.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Content pane */}
      <div style={{ background: contentBg, padding: '24px 28px', overflowY: 'auto' }}>
        {/* Course heading */}
        <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: `2px solid ${inkCol}` }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.red, marginBottom: 6 }}>Notes</div>
          <div style={{ fontFamily: SERIF, fontSize: 32, letterSpacing: '-0.055em', lineHeight: 0.92, color: inkCol }}>SQL Basics</div>
        </div>

        {/* Module heading */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${borderCol}` }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 36, color: t.red, lineHeight: 0.9, letterSpacing: '-0.03em', flexShrink: 0 }}>01</span>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: muteCol, marginBottom: 3 }}>Module</div>
            <div style={{ fontFamily: SERIF, fontSize: 18, letterSpacing: '-0.025em', color: inkCol, lineHeight: 1.1 }}>Foundations</div>
          </div>
        </div>

        {/* Lesson header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: t.green, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: dark ? '#050505' : '#faf7f0' }}>✓</span>
          </div>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: inkCol }}>Tables and rows</span>
        </div>

        {/* Notes body */}
        <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {noteLines.map((line, i) => {
            if (line.type === 'label') return (
              <div key={i} style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.red, marginBottom: 2 }}>{line.text}</div>
            );
            if (line.type === 'h') return (
              <div key={i} style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: '-0.02em', color: inkCol, lineHeight: 1.15, marginBottom: 4 }}>{line.text}</div>
            );
            if (line.type === 'bullet') return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: t.red, fontFamily: MONO, fontSize: 9, flexShrink: 0, marginTop: 3 }}>·</span>
                <span style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.6, color: inkCol }}>{line.text}</span>
              </div>
            );
            if (line.type === 'code') return (
              <pre key={i} style={{ margin: '4px 0 6px', padding: '9px 12px', background: codeBg, borderLeft: `2px solid ${t.red}`, fontFamily: MONO, fontSize: 10, lineHeight: 1.55, color: inkCol, overflowX: 'auto', whiteSpace: 'pre' }}>
                {line.text}
              </pre>
            );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

function NotesSectionLanding({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  const navigate = useNavigate();
  return (
    <Wrap id="notes" bg={t.paper} pad="120px 32px" borderTop borderBottom>
      <div style={{ display: 'grid', gridTemplateColumns: '0.72fr 1.28fr', gap: 48, alignItems: 'start' }}>
        {/* Left: copy */}
        <div>
          <Kicker>Built-in notes</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(48px, 6vw, 88px)', margin: '16px 0 24px', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
            Every lesson,<br /><i>distilled.</i>
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: 20, color: t.inkSoft, lineHeight: 1.45, margin: '0 0 20px' }}>
            After each lesson the tutor writes you a clean set of notes — the key ideas, the gotchas, the examples that stuck. Organised by module and lesson, always there when you need them.
          </p>
          <p style={{ fontFamily: SERIF, fontSize: 20, color: t.inkSoft, lineHeight: 1.45, margin: 0 }}>
            Access from any course card. No hunting through chat history.
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/auth')} style={{
              background: t.ink, color: t.bg, border: 'none', padding: '14px 22px',
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Start a course →</button>
          </div>
        </div>

        {/* Right: mockup */}
        <NotesPageMockup />
      </div>
    </Wrap>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
// ── Pricing ───────────────────────────────────────────────────────────────────
const PRICING_ROWS: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: 'Messages',        free: '25 / day',    premium: 'Unlimited' },
  { label: 'Notes',           free: false,         premium: true },
  { label: 'Import content',  free: false,         premium: 'Anywhere' },
  { label: 'PDF upload',      free: false,         premium: true },
  { label: 'Courses & Quizzes', free: 'Basic',     premium: 'Unlimited' },
  { label: 'Voice mode',      free: false,         premium: true },
];

function PricingSection({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();

  function cell(val: string | boolean, accent?: boolean) {
    if (val === false) return <span style={{ color: t.mute, fontSize: 16 }}>—</span>;
    if (val === true)  return <span style={{ color: t.green, fontSize: 14 }}>✓</span>;
    return <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: accent ? t.ink : t.mute }}>{val}</span>;
  }

  return (
    <Wrap id="pricing" pad="120px 32px">
      <div style={{ maxWidth: 780, marginBottom: 56 }}>
        <Kicker>Pricing</Kicker>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(56px, 7vw, 108px)', margin: '16px 0 20px', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
          The only thing we won't <i>give up on.</i>
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 22, color: t.inkSoft, lineHeight: 1.35, margin: 0 }}>
          Start free. Upgrade when the clock starts working.
        </p>
      </div>

      {/* Comparison table */}
      <div style={{ border: `1.5px solid ${t.ink}`, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: `1.5px solid ${t.ink}` }}>
          <div style={{ padding: '20px 24px', borderRight: `1px solid ${t.ruleFaint}` }} />
          <div style={{ padding: '20px 24px', borderRight: `1px solid ${t.ruleFaint}` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.mute }}>Free</div>
            <div style={{ fontFamily: SERIF, fontSize: 36, color: t.ink, marginTop: 8, letterSpacing: '-0.03em' }}>₹0</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, marginTop: 4, letterSpacing: '0.08em' }}>forever</div>
          </div>
          <div style={{ padding: '20px 24px', borderRight: `1px solid ${t.ruleFaint}`, background: t.paper, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 3, background: t.red }} />
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.red }}>Premium</div>
            <div style={{ fontFamily: SERIF, fontSize: 36, color: t.ink, marginTop: 8, letterSpacing: '-0.03em' }}>₹299</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, marginTop: 4, letterSpacing: '0.08em' }}>$21 / month</div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.mute }}>Team</div>
            <div style={{ fontFamily: SERIF, fontSize: 28, color: t.ink, marginTop: 8, letterSpacing: '-0.02em', fontStyle: 'italic' }}>Let's talk.</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: t.mute, marginTop: 4, letterSpacing: '0.08em' }}>custom pricing</div>
          </div>
        </div>

        {/* Feature rows */}
        {PRICING_ROWS.map((row, i) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: i < PRICING_ROWS.length - 1 ? `1px solid ${t.ruleFaint}` : 'none' }}>
            <div style={{ padding: '16px 24px', borderRight: `1px solid ${t.ruleFaint}`, fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.mute, display: 'flex', alignItems: 'center' }}>{row.label}</div>
            <div style={{ padding: '16px 24px', borderRight: `1px solid ${t.ruleFaint}`, display: 'flex', alignItems: 'center' }}>{cell(row.free)}</div>
            <div style={{ padding: '16px 24px', borderRight: `1px solid ${t.ruleFaint}`, background: t.paper, display: 'flex', alignItems: 'center' }}>{cell(row.premium, true)}</div>
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}><span style={{ color: t.green, fontSize: 14 }}>✓</span></div>
          </div>
        ))}

        {/* CTA row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: `1.5px solid ${t.ink}` }}>
          <div style={{ padding: '20px 24px', borderRight: `1px solid ${t.ruleFaint}` }} />
          <div style={{ padding: '20px 24px', borderRight: `1px solid ${t.ruleFaint}` }}>
            <button onClick={() => onNav('new')} style={{ background: 'transparent', color: t.ink, border: `1px solid ${t.ink}`, padding: '10px 18px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Start free →
            </button>
          </div>
          <div style={{ padding: '20px 24px', borderRight: `1px solid ${t.ruleFaint}`, background: t.paper }}>
            <button onClick={() => onNav('new')} style={{ background: t.ink, color: t.bg, border: 'none', padding: '10px 18px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Get premium →
            </button>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <a href="mailto:ask@learnor.ai" style={{ display: 'inline-block', background: 'transparent', color: t.ink, border: `1px solid ${t.ink}`, padding: '10px 18px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none' }}>
              Contact us →
            </a>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS: [string, string][] = [
  ['What happens if I miss the deadline?', 'The course expires. Your progress is saved. Set a new deadline and keep going. Nothing is permanently lost.'],
  ['Can I extend a deadline?', 'Not mid-course. But if you miss it, you can recommit with a fresh deadline. You also get one 72-hour pause per course.'],
  ['What if I finish early?', 'You keep the course, get the certificate, and hit the finisher wall.'],
  ['Does the AI teach well?', 'It teaches in tiny steps, checks understanding, and uses the canvas when useful.'],
];

function FAQSection() {
  const { t } = useTheme();
  return (
    <Wrap id="faq" pad="120px 32px">
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 56, alignItems: 'start' }}>
        <div style={{ position: 'sticky', top: 88 }}>
          <Kicker>Questions</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: 64, margin: '16px 0 20px', fontWeight: 400, letterSpacing: '-0.03em', color: t.ink, lineHeight: 0.95 }}>
            The only questions that matter.
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: 18, color: t.mute, lineHeight: 1.5, margin: 0 }}>
            If your question isn't here, email us at ask@learnor.ai.
          </p>
        </div>
        <div style={{ borderTop: `2px solid ${t.ink}` }}>
          {FAQS.map(([q, a], i) => (
            <details key={i} style={{ borderBottom: `1px solid ${t.ruleFaint}`, padding: '18px 0' }}>
              <summary style={{
                cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'baseline', gap: 16,
                fontFamily: SERIF, fontSize: 26, color: t.ink, letterSpacing: '-0.01em',
              }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: t.red, width: 32 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ flex: 1 }}>{q}</span>
                <span style={{ fontFamily: MONO, fontSize: 16, color: t.mute }}>+</span>
              </summary>
              <div style={{ fontFamily: SERIF, fontSize: 18, color: t.inkSoft, lineHeight: 1.55, marginTop: 12, paddingLeft: 48 }}>{a}</div>
            </details>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

// ── Instructor section ────────────────────────────────────────────────────────
function InstructorSection({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  const navigate = useNavigate();
  return (
    <Wrap id="instructors" bg={t.paper} pad="120px 32px" borderTop borderBottom>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
        {/* Left: the honest pitch */}
        <div>
          <Kicker>For instructors</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(44px, 6vw, 88px)', margin: '16px 0 24px', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
            Your knowledge.<br />AI delivery.<br /><i style={{ color: t.red }}>You still get paid.</i>
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: 22, color: t.inkSoft, lineHeight: 1.4, margin: '0 0 32px' }}>
            Upload your notes. Learnor turns them into a deadline-driven course. Students learn from the AI. You review, publish, and get paid.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/create')} style={{
              background: t.ink, color: t.bg, border: 'none', padding: '14px 24px',
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Start teaching →</button>
            <button onClick={() => navigate('/browse')} style={{
              background: 'transparent', color: t.ink, border: `1px solid ${t.ink}`, padding: '14px 24px',
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Browse courses</button>
          </div>
        </div>

        {/* Right: how it works */}
        <div>
          <div style={{ border: `2px solid ${t.ink}`, padding: '32px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.mute, marginBottom: 28 }}>
              How it works in three steps
            </div>
            {[
              {
                n: '01', title: 'Upload your materials',
                body: 'PDFs, notes, links, handouts.',
              },
              {
                n: '02', title: 'AI builds the curriculum',
                body: 'Modules, lessons, quizzes.',
              },
              {
                n: '03', title: 'Publish. Get paid.',
                body: 'Set a price. Students enroll.',
              },
            ].map((step, i) => (
              <div key={step.n} style={{ display: 'flex', gap: 20, paddingBottom: i < 2 ? 24 : 0, marginBottom: i < 2 ? 24 : 0, borderBottom: i < 2 ? `1px dashed ${t.ruleFaint}` : 'none' }}>
                <div style={{ fontFamily: SERIF, fontSize: 44, color: t.red, letterSpacing: '-0.02em', lineHeight: 1, fontStyle: 'italic', flexShrink: 0, width: 48 }}>{step.n}</div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: t.ink, textTransform: 'uppercase', marginBottom: 6 }}>{step.title}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, color: t.inkSoft, lineHeight: 1.5 }}>{step.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: '20px 24px', border: `1px solid ${t.ruleFaint}`, background: t.bg }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: t.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              A word of caution
            </div>
            <p style={{ fontFamily: SERIF, fontSize: 16, color: t.inkSoft, lineHeight: 1.55, margin: 0 }}>
              It teaches your material, not your personality. Good for scale. Bad for performance art.
            </p>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA({ onNav }: { onNav: (k: string) => void }) {
  const { t, dark } = useTheme();
  const mutedText = dark ? 'rgba(10,8,6,0.55)' : 'rgba(250,247,240,0.6)';
  const softText  = dark ? 'rgba(10,8,6,0.38)' : 'rgba(250,247,240,0.42)';
  return (
    <section id="start" style={{ background: t.ink, padding: '140px 32px' }}>
      <div style={{ textAlign: 'center', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', color: t.red, textTransform: 'uppercase' }}>
          One last thing
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(72px, 11vw, 160px)', margin: '20px 0', letterSpacing: '-0.035em', fontWeight: 400, color: t.bg, lineHeight: 0.9 }}>
          Pick a thing.<br />Pick a date.<br /><i style={{ color: t.red }}>Or don't.</i>
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 24, color: mutedText, fontStyle: 'italic', margin: '32px auto', maxWidth: 600, lineHeight: 1.4 }}>
          The courses you'll never take are already gathering dust. At least this way they go out with a bang.
        </p>
        <button onClick={() => onNav('new')} style={{
          background: t.red, color: '#faf7f0', border: 'none', padding: '20px 40px',
          fontFamily: MONO, fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 16,
        }}>Start course →</button>
        <div style={{ marginTop: 24, fontFamily: MONO, fontSize: 11, color: softText, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          no card required · first course is free
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function SiteFooter({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  const { state } = useStore();
  const finishers = state.courses.filter((c) => c.status === 'completed').length;
  const recommitted = state.courses.filter((c) => c.status === 'tombstone' || c.status === 'expired').length;
  const footerLinks: [string, [string, string][]][] = [
    ['Product', [['how', 'How it works'], ['features', 'Features'], /* ['instructors', 'Teach here'], */ ['pricing', 'Pricing'], ['new', 'Start a course']]],
    ['Social proof', [['leaderboard', 'Leaderboard'], ['leaderboard-page', 'Full wall'], ['dashboard', 'Sample dashboard']]],
    ['Company', [['#', 'About'], ['#', 'Manifesto'], ['#', 'Careers'], ['#', 'Press']]],
    ['Legal', [['#', 'Terms'], ['#', 'Privacy'], ['#', 'Security'], ['#', 'Contact']]],
  ];
  return (
    <footer style={{ background: t.paper, borderTop: `1px solid ${t.ink}`, padding: '64px 32px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 32, paddingBottom: 40, borderBottom: `1px solid ${t.ruleFaint}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, background: t.red, display: 'inline-block', borderRadius: 999, transform: 'translateY(-4px)' }} />
              <b style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 400, letterSpacing: '-0.055em', color: t.ink }}>Learnor</b>
            </div>
            <p style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.4, color: t.ink, marginTop: 18, maxWidth: 320 }}>
              A learning platform with stakes. Commit to a deadline. Miss it? Recommit.
            </p>
            <div style={{ marginTop: 20, padding: '10px 14px', border: `1px solid ${t.ink}`, display: 'inline-flex', gap: 16, alignItems: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              <span style={{ color: t.green }}>● {finishers} finished</span>
              <span style={{ color: t.mute }}>·</span>
              <span style={{ color: t.amber }}>↺ {recommitted.toLocaleString()} recommitted</span>
            </div>
          </div>
          {footerLinks.map(([heading, links]) => (
            <div key={heading}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.mute, marginBottom: 14 }}>{heading}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map(([k, l]) => (
                  <a key={l} href={`#${k}`} onClick={(e) => { e.preventDefault(); if (k !== '#') onNav(k); }} style={{ fontFamily: SERIF, fontSize: 16, color: t.ink, textDecoration: 'none', cursor: 'pointer' }}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.mute }}>
          <span>© 2026 LEARNOR · no progress is permanently lost</span>
          <span>made with stakes</span>
        </div>
        {/* Giant closing wordmark */}
        <div style={{ fontFamily: SERIF, fontSize: 'clamp(36px, 5vw, 72px)', letterSpacing: '-0.04em', lineHeight: 1, color: t.ink, marginTop: 32, textAlign: 'center', opacity: 0.5 }}>
          <i>commit.</i> or <span style={{ color: t.red }}>recommit.</span>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dark, toggle } = useAppTheme();
  const [active, setActive] = useState('home');

  const sectionRefs = useRef<string[]>(['home', 'how', 'features', 'notes', 'leaderboard', /* 'instructors', */ 'pricing', 'faq']);

  useEffect(() => {
    try { localStorage.setItem('ain_dark', String(dark)); } catch {}
    document.body.style.background = dark ? DARK.bg : LIGHT.bg;
    document.body.style.color = dark ? DARK.ink : LIGHT.ink;
  }, [dark]);

  // Scroll-spy
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 200;
      let cur = 'home';
      for (const id of sectionRefs.current) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function onNav(target: string) {
    if (target === 'new') { navigate(user ? '/new' : '/auth'); return; }
    if (target === 'dashboard') { navigate(user ? '/dashboard' : '/auth'); return; }
    if (target === 'profile') { navigate(user ? '/profile' : '/auth'); return; }
    if (target === 'leaderboard' || target === 'leaderboard-page') { navigate('/leaderboard'); return; }
    if (target === 'browse') { navigate('/browse'); return; }
    if (target === 'create') { navigate('/create'); return; }
    if (target === 'home') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const el = document.getElementById(target);
    if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: 'smooth' });
  }

  const t = dark ? DARK : LIGHT;
  const { state } = useStore();
  const profileLabel = state.profile?.displayName?.trim() || state.username || user?.email || 'me';
  const avatarUrl = state.profile?.avatarUrl?.trim();

  return (
    <ThemeCtx.Provider value={{ t, dark }}>
      <div style={{ minHeight: '100vh', background: t.bg, transition: 'background 0.3s' }}>
        <SiteNav active={active} dark={dark} loggedIn={!!user} avatarUrl={avatarUrl} profileLabel={profileLabel} onToggleDark={toggle} onNav={onNav} />
        <HeroSection onNav={onNav} />
        <TickerStrip />
        <ComparisonSection />
        <HowSection />
        <FeaturesSection onNav={onNav} />
        <NotesSectionLanding onNav={onNav} />
        {/* <InstructorSection onNav={onNav} /> */}
        <PricingSection onNav={onNav} />
        <FAQSection />
        <FinalCTA onNav={onNav} />
        <SiteFooter onNav={onNav} />
      </div>
    </ThemeCtx.Provider>
  );
}
