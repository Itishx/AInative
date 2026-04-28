import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import LandingSaaS from './LandingSaaS';

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
  bg: '#141210', paper: '#1c1a16', paperAlt: '#252219',
  ink: '#f1ecdf', inkSoft: '#d8d2c2', mute: '#8a8373',
  ruleFaint: 'rgba(241,236,223,0.14)', ruleDash: 'rgba(241,236,223,0.22)',
  red: '#e8514a', green: '#6aae7f', amber: '#e3a447',
};

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const MONO  = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

const ThemeCtx = createContext<{ t: T; dark: boolean }>({ t: LIGHT, dark: false });
const useTheme = () => useContext(ThemeCtx);

function formatMargin(ms: number) {
  const d = Math.floor(ms / 86400000);
  const h = String(Math.floor((ms % 86400000) / 3600000)).padStart(2, '0');
  return `${d}d ${h}h`;
}

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
function SiteNav({ active, dark, onToggleDark, onNav, onToggleSaas }: {
  active: string; dark: boolean; onToggleDark: () => void; onNav: (id: string) => void; onToggleSaas: () => void;
}) {
  const { t } = useTheme();
  const items: [string, string][] = [
    ['how', 'How it works'], ['features', 'Features'],
    ['leaderboard', 'Leaderboard'], ['instructors', 'Teach here'],
    ['pricing', 'Pricing'], ['browse', 'Browse'], ['faq', 'FAQ'],
  ];
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      padding: '18px 20px 10px',
      background: 'transparent',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
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
          gap: 10,
          padding: '10px 14px',
          borderRadius: 999,
          background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.04)',
          flexShrink: 0,
        }}>
          <span style={{ width: 11, height: 11, background: t.red, display: 'inline-block', borderRadius: '50%' }} />
          <b style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', color: t.ink, textTransform: 'uppercase' }}>AINATIVE</b>
        </a>
        {/* Links */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: 6,
          marginLeft: 2,
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
              color: active === k ? (dark ? '#141210' : t.paper) : t.mute, cursor: 'pointer',
              background: active === k ? t.red : 'transparent',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>{l}</a>
          ))}
        </div>
        {/* Dark toggle */}
        <button onClick={onToggleDark} title={dark ? 'Light mode' : 'Dark mode'} style={{
          width: 42, height: 42, border: `1px solid ${t.ruleFaint}`,
          borderRadius: 999,
          background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.04)',
          color: t.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: MONO, fontSize: 14,
        }}>{dark ? '☀' : '☾'}</button>
        {/* SaaS theme toggle */}
        <button onClick={onToggleSaas} title="Switch to modern theme" style={{
          padding: '10px 16px', border: `1px solid ${t.ruleFaint}`,
          borderRadius: 999,
          background: 'rgba(26,21,16,0.04)',
          color: t.ink, cursor: 'pointer',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>✦ Modern</button>
        <a href="#dashboard" onClick={(e) => { e.preventDefault(); onNav('dashboard'); }} style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: t.ink, textDecoration: 'none', padding: '10px 12px', whiteSpace: 'nowrap',
        }}>Log in</a>
        <button onClick={() => onNav('new')} style={{
          background: t.ink, color: t.bg, border: 'none', padding: '12px 18px',
          borderRadius: 999,
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}>Start a course →</button>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'How to dougie', 'SQL for analysts', 'Python basics',
  'Mandarin tones', 'Color theory', 'Financial modeling',
];

function HeroSection({ onNav }: { onNav: (k: string) => void }) {
  const { t, dark } = useTheme();
  const { state } = useStore();
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState('');
  const navigate = useNavigate();
  const finishers = state.courses.filter((c) => c.status === 'completed').length + 247;
  const deleted   = state.courses.filter((c) => c.status === 'tombstone').length + 1412;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setMaterialsError('');

    let materialsContext = '';

    if (resourceUrl.trim() || resourceFile) {
      setMaterialsLoading(true);
      try {
        const parts: string[] = [];
        if (resourceUrl.trim()) {
          const res = await fetch('/api/fetch-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: resourceUrl.trim() }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          if (data.text) parts.push(`[Source: ${resourceUrl.trim()}]\n${data.text}`);
        }
        if (resourceFile) {
          const form = new FormData();
          form.append('files', resourceFile);
          const res = await fetch('/api/upload-materials', { method: 'POST', body: form });
          const data = await res.json();
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
          — a learning platform with stakes
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
          fontFamily: SERIF, fontSize: 20, lineHeight: 1.5,
          color: t.mute, fontStyle: 'italic', margin: '0 auto 48px', maxWidth: 520,
        }}>
          Pick a deadline. Miss it — every lesson, every note,{' '}
          every quiz is <u>permanently deleted</u>. Forever.
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
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStart(e); } }}
                placeholder="What do you want to learn? Be specific — the AI will build you a real curriculum."
                rows={2}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent', resize: 'none',
                  fontFamily: SERIF, fontSize: 22, lineHeight: 1.4, color: t.ink,
                  minHeight: 56, overflow: 'hidden',
                }}
              />
            </div>

            {/* Resources toggle row */}
            <div style={{ borderTop: `1px solid ${t.ruleFaint}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowResources((s) => !s)}
                style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: showResources ? t.ink : t.mute, padding: 0 }}
              >
                {showResources ? '− hide resources' : '+ add your own resources'}
              </button>
              {(resourceUrl || resourceFile) && !showResources && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: t.green, letterSpacing: '0.1em' }}>
                  {[resourceUrl && '1 url', resourceFile && '1 pdf'].filter(Boolean).join(' · ')} attached
                </span>
              )}
            </div>

            {/* Resources panel */}
            {showResources && (
              <div style={{ padding: '12px 20px 16px', borderTop: `1px dashed ${t.ruleFaint}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0, width: 28 }}>url</span>
                  <input
                    type="url"
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    placeholder="https://… (article, docs page, blog post)"
                    style={{ flex: 1, border: 'none', borderBottom: `1px solid ${t.ruleFaint}`, outline: 'none', background: 'transparent', fontFamily: MONO, fontSize: 12, color: t.ink, padding: '4px 0' }}
                  />
                  {resourceUrl && (
                    <button type="button" onClick={() => setResourceUrl('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 12, color: t.mute, padding: 0 }}>×</button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0, width: 28 }}>pdf</span>
                  <label style={{ cursor: 'pointer', flex: 1 }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: resourceFile ? t.ink : t.mute, borderBottom: `1px solid ${resourceFile ? t.ink : t.ruleFaint}`, paddingBottom: 2 }}>
                      {resourceFile ? resourceFile.name : 'choose a pdf file…'}
                    </span>
                    <input type="file" accept=".pdf" onChange={(e) => setResourceFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                  </label>
                  {resourceFile && (
                    <button type="button" onClick={() => setResourceFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 12, color: t.mute, padding: 0 }}>×</button>
                  )}
                </div>
                {materialsError && (
                  <div style={{ fontFamily: MONO, fontSize: 10, color: t.red, letterSpacing: '0.1em' }}>{materialsError}</div>
                )}
              </div>
            )}

            {/* Bottom bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', borderTop: `1px solid ${t.ruleFaint}`,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => { setInput(`Teach me ${s.toLowerCase()}`); }}
                    style={{
                      fontFamily: MONO, fontSize: 10, padding: '5px 10px', letterSpacing: '0.08em',
                      border: `1px solid ${t.ruleFaint}`, background: 'transparent',
                      color: t.mute, cursor: 'pointer',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={!input.trim() || materialsLoading} style={{
                background: input.trim() && !materialsLoading ? t.ink : t.ruleFaint,
                color: input.trim() && !materialsLoading ? t.bg : t.mute,
                border: 'none', padding: '12px 24px', flexShrink: 0,
                fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                cursor: input.trim() && !materialsLoading ? 'pointer' : 'not-allowed', transition: 'background 0.15s',
              }}>
                {materialsLoading ? 'loading…' : 'Begin the clock →'}
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
            <span style={{ color: t.red }}>†</span> {deleted.toLocaleString()} deleted
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
  '† conversational french — dani.w — deleted at 00:01',
  '✓ docker in anger — mira.k — finished 14d 02h early',
  '† rust ownership — anon_99 — deleted at 03:47',
  '✓ linear algebra — yael — finished 04d 22h early',
  '† color theory — nikoj — deleted at 12:00',
  '✓ public speaking — aleks — finished 01d 16h early',
  '† react hooks — pin22 — deleted at 23:59',
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
          <span key={i} style={{ color: s.startsWith('†') ? '#ff6a5f' : t.bg, flexShrink: 0 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function PromptIllustration() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ink}`, background: t.bg, padding: 18, minHeight: 220 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.14em' }}>$ ainative new</div>
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
      body: 'Type the thing you\'ve been meaning to learn for months. Rust. French. GROUP BY. The AI drafts a full curriculum — modules, lessons, estimated hours — in about six seconds. Edit it if you want. Most people don\'t need to.',
      art: <PromptIllustration />,
    },
    {
      n: '02', kicker: 'Step two', title: 'Pick a deadline.',
      body: 'Between 3 and 90 days from today. It locks the instant you confirm. There are no extensions, no emergency tickets, no "life happened" clauses. You get one 72-hour pause, to be spent however you like.',
      art: <CalendarIllustration />,
    },
    {
      n: '03', kicker: 'Step three', title: 'Learn or lose it.',
      body: 'An AI tutor walks you through each lesson. Quizzes gate progress. A countdown lives in the top-right of every screen. If midnight on the deadline rolls over with modules unfinished — everything you built is permanently deleted.',
      art: <CountdownIllustration />,
    },
  ];
  return (
    <Wrap id="how" bg={t.paper} pad="120px 32px" borderTop borderBottom>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 64 }}>
        <div>
          <Kicker>How it works</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(56px, 7vw, 108px)', margin: '16px 0 0', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
            Three steps.<br /><i>One</i> guillotine.
          </h2>
        </div>
      </div>
      <div style={{ borderTop: `2px solid ${t.ink}` }}>
        {steps.map((s) => (
          <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', borderBottom: `1px solid ${t.ruleFaint}`, padding: '48px 0', gap: 48, alignItems: 'start' }}>
            <div style={{ fontFamily: SERIF, fontSize: 96, color: t.red, lineHeight: 0.9, letterSpacing: '-0.03em', fontStyle: 'italic' }}>{s.n}</div>
            <div>
              <Kicker color={t.mute}>{s.kicker}</Kicker>
              <h3 style={{ fontFamily: SERIF, fontSize: 44, margin: '12px 0 16px', fontWeight: 400, letterSpacing: '-0.02em', color: t.ink, lineHeight: 1.05 }}>{s.title}</h3>
              <p style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.5, color: t.inkSoft, margin: 0 }}>{s.body}</p>
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
    { who: 'tutor', text: 'A table is a pile of rows. GROUP BY sorts them into buckets by a key, then collapses each bucket.' },
    { who: 'user', text: 'So one row per bucket?' },
    { who: 'tutor', text: 'Exactly. Now — what does `SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id` return?' },
  ];
  return (
    <div style={{ border: `1px solid ${t.ink}`, background: t.paper, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.14em', paddingBottom: 12, borderBottom: `1px solid ${t.ruleFaint}` }}>
        <span>LESSON · GROUP BY</span>
        <span style={{ color: t.red }}>◉ VOICE ON</span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            maxWidth: '85%', alignSelf: m.who === 'user' ? 'flex-end' : 'flex-start',
            fontFamily: SERIF, fontSize: 15, lineHeight: 1.5, padding: '10px 14px',
            background: m.who === 'user' ? t.ink : t.bg,
            color: m.who === 'user' ? t.bg : t.ink,
            border: m.who === 'user' ? 'none' : `1px solid ${t.ruleFaint}`,
          }}>{m.text}</div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, padding: 6, border: `1px solid ${t.ink}` }}>
        <div style={{ width: 32, height: 32, background: t.red, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#faf7f0', fontFamily: MONO, fontSize: 14 }}>●</div>
        <div style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'center', height: 20 }}>
          {[8,14,22,10,18,26,12,6,16,22,14,8,20,24,12,6,14,20].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: t.ink }} />
          ))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: t.mute, letterSpacing: '0.1em' }}>HOLD SPACE</div>
      </div>
    </div>
  );
}

function TombstoneViz() {
  const { t } = useTheme();
  return (
    <div style={{ border: `1px solid ${t.ruleFaint}`, padding: 16, opacity: 0.75, background: t.paper }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: t.red, letterSpacing: '0.18em' }}>† TOMBSTONE</div>
      <div style={{ fontFamily: SERIF, fontSize: 22, color: t.ink, marginTop: 6, textDecoration: 'line-through', letterSpacing: '-0.01em' }}>
        Conversational French
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: t.mute, marginTop: 4 }}>deleted apr 19 · 61% complete at death</div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 4, color: t.red, fontFamily: SERIF }}>
        <span style={{ fontSize: 42, letterSpacing: '-0.02em' }}>-05</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: t.mute }}>D</span>
        <span style={{ fontSize: 42, marginLeft: 6, letterSpacing: '-0.02em' }}>17</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: t.mute }}>H</span>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: t.red, marginLeft: 10 }}>overdue</span>
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

function FeaturesSection({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  const navigate = useNavigate();
  const trio = [
    { n: '02', title: 'The tombstone.', body: 'When you miss a deadline, the course becomes a tombstone — locked, struck through, visible on your dashboard forever. Not to shame you. To remind you that last time, the midnight was real.', art: <TombstoneViz /> },
    { n: '03', title: 'One pause, only.', body: 'Life does happen. You get exactly one 72-hour pause per course, usable any time except the final 24 hours. Use it for a flu, a funeral, a wedding. After that, the clock is the clock.', art: <PauseViz /> },
    { n: '04', title: 'Public finishers.', body: "The leaderboard only shows people who beat their deadline — sorted by margin. Finish a 30-day course in 24? You climb. The 1,412 who missed don't appear. This is a list of survivors.", art: <LeaderboardViz /> },
  ];
  return (
    <Wrap id="features" pad="120px 32px">
      <div style={{ maxWidth: 780, marginBottom: 64 }}>
        <Kicker>The product</Kicker>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(56px, 7vw, 108px)', margin: '16px 0 24px', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
          Calm <i>product.</i><br />Loud <span style={{ color: t.red }}>consequences.</span>
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 22, color: t.inkSoft, lineHeight: 1.5, margin: 0 }}>
          Most learning apps make you feel productive. This one makes you actually finish.
          The interface is quiet, editorial, unhurried — because the stakes on the other side are doing the work.
        </p>
      </div>
      {/* Tutor feature */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start', marginBottom: 96 }}>
        <div>
          <Kicker color={t.mute}>Feature 01</Kicker>
          <h3 style={{ fontFamily: SERIF, fontSize: 56, margin: '12px 0 20px', fontWeight: 400, letterSpacing: '-0.02em', color: t.ink, lineHeight: 1 }}>
            An AI tutor that talks back.
          </h3>
          <p style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.5, color: t.inkSoft, margin: 0 }}>
            Each lesson is a real conversation — it explains concepts, asks you questions, corrects wrong answers,
            and only unlocks the next lesson when you pass the quiz. Chat or voice.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button onClick={() => navigate('/dashboard')} style={{
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
          <div key={f.n} style={{ padding: '40px 32px', borderRight: i < 2 ? `1px solid ${t.ruleFaint}` : 'none' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: t.red, letterSpacing: '0.16em' }}>FEATURE {f.n}</div>
            <h4 style={{ fontFamily: SERIF, fontSize: 32, margin: '10px 0 14px', fontWeight: 400, letterSpacing: '-0.015em', color: t.ink }}>{f.title}</h4>
            <p style={{ fontFamily: SERIF, fontSize: 17, color: t.inkSoft, lineHeight: 1.5, margin: 0 }}>{f.body}</p>
            <div style={{ marginTop: 24 }}>{f.art}</div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function LeaderboardSection({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  const { state } = useStore();
  const rows = state.leaderboard;
  return (
    <Wrap id="leaderboard" bg={t.paper} pad="120px 32px" borderTop borderBottom>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Kicker>The wall</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(56px, 7vw, 108px)', margin: '16px 0 0', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
            The <i>finishers.</i>
          </h2>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: t.mute, maxWidth: 340, textAlign: 'right' }}>
          1,412 people didn't make this list.<br />They don't get a line.
        </div>
      </div>
      <div style={{ borderTop: `2px solid ${t.ink}`, borderBottom: `1px solid ${t.ink}`, marginTop: 32 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr 1.3fr 180px 100px 100px',
          padding: '10px 16px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: t.mute, borderBottom: `1px solid ${t.ruleFaint}`,
        }}>
          <span>#</span><span>User</span><span>Course</span><span>Margin under</span><span>Days</span><span>Streak</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.certId} style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 1.3fr 180px 100px 100px',
            padding: '18px 16px', borderBottom: `1px solid ${t.ruleFaint}`,
            fontFamily: MONO, fontSize: 13, alignItems: 'center',
          }}>
            <span style={{ fontFamily: SERIF, fontSize: i < 3 ? 40 : 22, color: i < 3 ? t.red : t.mute, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {String(r.rank).padStart(2, '0')}
            </span>
            <span style={{ color: t.ink, fontWeight: 500 }}>{r.user}</span>
            <span style={{ fontFamily: SERIF, fontSize: 18, color: t.ink, fontStyle: 'italic' }}>{r.course}</span>
            <span style={{ color: t.red }}>-{formatMargin(r.marginMs)}</span>
            <span style={{ color: t.mute }}>{r.days}d total</span>
            <span style={{ color: t.ink }}>{r.streak}🔥</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, color: t.mute }}>
        <span>showing {rows.length} finishers</span>
        <button onClick={() => onNav('leaderboard-page')} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11,
          color: t.ink, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'underline',
        }}>See the full wall →</button>
      </div>
    </Wrap>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const QUOTES = [
  { q: "Knowing my French would evaporate at midnight on the 19th was the best motivator I've ever had. I finished 8 days early and actually retained it.", a: 'hansu · finished conversational japanese' },
  { q: "I lost a Rust course at 00:00:03 and I'm not even mad. The second attempt, six weeks later, I shipped a real CLI.", a: 'ojo_22 · deleted once, finished twice' },
  { q: "Our whole data team did the SQL course on the same 30-day clock. Four of six made it. The other two are quiet about it.", a: 'mira.k · engineering lead' },
];

function TestimonialsSection() {
  const { t } = useTheme();
  return (
    <Wrap id="voices" bg={t.paper} pad="100px 32px" borderTop borderBottom>
      <Kicker>Voices from the wall</Kicker>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 32, borderTop: `2px solid ${t.ink}` }}>
        {QUOTES.map((q, i) => (
          <div key={i} style={{ padding: '40px 32px', borderRight: i < 2 ? `1px solid ${t.ruleFaint}` : 'none', borderBottom: `1px solid ${t.ink}` }}>
            <div style={{ fontFamily: SERIF, fontSize: 72, color: t.red, lineHeight: 0.5, letterSpacing: '-0.02em' }}>"</div>
            <p style={{ fontFamily: SERIF, fontSize: 22, color: t.ink, lineHeight: 1.45, fontStyle: 'italic', margin: '8px 0 24px' }}>{q.q}</p>
            <div style={{ fontFamily: MONO, fontSize: 11, color: t.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>— {q.a}</div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: 'Free trial', price: '$0', unit: 'one course', sub: 'Try the deadline.',
    body: 'Run one course up to 14 days. Full product, full stakes. Prove to yourself that fear works.',
    list: ['1 course, up to 14 days', 'AI tutor', 'Leaderboard eligible', 'One emergency pause'],
    cta: 'Start free', primary: false,
  },
  {
    name: 'Finisher', price: '$18', unit: '/month', sub: 'Unlimited courses.',
    body: 'Queue as many courses as you can carry. Every one gets a real deadline. Every one can be deleted.',
    list: ['Unlimited courses', '3 concurrent active', 'Priority AI tutor', 'Public profile', 'Export certificates'],
    cta: 'Begin the clock →', primary: true,
  },
  {
    name: 'Team', price: '$12', unit: '/seat · yearly', sub: 'For study cohorts.',
    body: 'Enroll a team in the same course with the same deadline. One cohort leaderboard. Shared tombstones.',
    list: ['Everything in Finisher', 'Cohort deadlines', 'Private leaderboards', 'Manager dashboard', 'SSO + audit logs'],
    cta: 'Talk to us', primary: false,
  },
];

function PricingSection({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  return (
    <Wrap id="pricing" pad="120px 32px">
      <div style={{ maxWidth: 780, marginBottom: 56 }}>
        <Kicker>Pricing</Kicker>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(56px, 7vw, 108px)', margin: '16px 0 20px', letterSpacing: '-0.03em', fontWeight: 400, color: t.ink, lineHeight: 0.95 }}>
          The only thing we won't <i>delete.</i>
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 22, color: t.inkSoft, lineHeight: 1.5, margin: 0 }}>
          Pay monthly or yearly. Cancel anytime — active courses keep their deadlines.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {TIERS.map((tier) => (
          <div key={tier.name} style={{
            border: `1.5px solid ${tier.primary ? t.ink : t.ruleFaint}`,
            background: tier.primary ? t.paper : 'transparent', padding: 32, position: 'relative',
            boxShadow: tier.primary ? `12px 12px 0 ${t.ink}` : 'none',
          }}>
            {tier.primary && (
              <div style={{
                position: 'absolute', top: -12, left: 24, background: t.red, color: '#faf7f0',
                fontFamily: MONO, fontSize: 10, padding: '4px 10px', letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>most finish here</div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 11, color: t.mute, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{tier.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
              <span style={{ fontFamily: SERIF, fontSize: 72, color: t.ink, letterSpacing: '-0.03em', fontWeight: 400, lineHeight: 1 }}>{tier.price}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: t.mute }}>{tier.unit}</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: t.ink, marginTop: 12 }}>{tier.sub}</div>
            <p style={{ fontFamily: SERIF, fontSize: 16, color: t.inkSoft, lineHeight: 1.5, margin: '12px 0 20px' }}>{tier.body}</p>
            <div style={{ borderTop: `1px solid ${t.ruleFaint}`, paddingTop: 16 }}>
              {tier.list.map((l) => (
                <div key={l} style={{ display: 'flex', gap: 10, fontFamily: MONO, fontSize: 12, color: t.ink, padding: '6px 0' }}>
                  <span style={{ color: t.red }}>✓</span><span>{l}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onNav('new')} style={{
              width: '100%', marginTop: 24, padding: '14px',
              background: tier.primary ? t.ink : 'transparent',
              color: tier.primary ? t.bg : t.ink,
              border: tier.primary ? 'none' : `1px solid ${t.ink}`,
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
            }}>{tier.cta}</button>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS: [string, string][] = [
  ['Is the deletion actually permanent?', "Yes. When the deadline passes, we run a purge job: every lesson draft, every quiz attempt, every note you made, every message you sent the tutor — all of it. The course title remains on your dashboard as a tombstone so you can see it. Nothing else is recoverable."],
  ['What if my internet dies on the last day?', "Your progress syncs every 30 seconds when online. If you complete the final quiz offline and reconnect after the deadline, the completion is still honored as long as the timestamp in the local log is pre-deadline. This is the only exception we grant, and it's audited."],
  ['Can I extend a deadline?', "No. Not for any reason. You get one 72-hour pause per course, usable any time except the final 24 hours. That is the only flex. Adding extensions breaks the entire product."],
  ['What if I finish early?', "You're done, and you go on the leaderboard ranked by margin. Your certificate shows the margin. Your profile shows the margin."],
  ['Does the AI actually teach well?', "The tutor explains concepts, gives concrete examples, and only unlocks the next lesson when you pass a real quiz. If you're struggling it'll adapt — slower, more examples, different analogies."],
  ["I'm scared. Is that normal?", "That's the product working. Start with a 7-day course on something small. Build the muscle."],
];

function FAQSection() {
  const { t } = useTheme();
  return (
    <Wrap id="faq" pad="120px 32px">
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 64, alignItems: 'start' }}>
        <div style={{ position: 'sticky', top: 88 }}>
          <Kicker>Questions</Kicker>
          <h2 style={{ fontFamily: SERIF, fontSize: 72, margin: '16px 0 24px', fontWeight: 400, letterSpacing: '-0.03em', color: t.ink, lineHeight: 0.95 }}>
            Everything you'd want to ask before <i>committing.</i>
          </h2>
          <p style={{ fontFamily: SERIF, fontSize: 18, color: t.mute, lineHeight: 1.5, margin: 0 }}>
            If your question isn't here, email us at ask@ainative.com.
          </p>
        </div>
        <div style={{ borderTop: `2px solid ${t.ink}` }}>
          {FAQS.map(([q, a], i) => (
            <details key={i} open={i < 2} style={{ borderBottom: `1px solid ${t.ruleFaint}`, padding: '20px 0' }}>
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
          <p style={{ fontFamily: SERIF, fontSize: 20, color: t.inkSoft, lineHeight: 1.6, margin: '0 0 28px' }}>
            Most people who teach, teach not for the money — but for the love of it.
            The moment in a classroom where something clicks. That's the real reward.
          </p>
          <p style={{ fontFamily: SERIF, fontSize: 20, color: t.inkSoft, lineHeight: 1.6, margin: '0 0 28px' }}>
            We'll be honest with you: <b style={{ color: t.ink }}>this takes that part away.</b> The AI handles every explanation,
            every question, every quiz. Your students never hear your voice. They're taught by a system
            built entirely on top of your notes — but you don't do the teaching.
          </p>
          <p style={{ fontFamily: SERIF, fontSize: 20, color: t.inkSoft, lineHeight: 1.6, margin: '0 0 28px', fontStyle: 'italic' }}>
            If the act of teaching is why you do this — this isn't for you. And that's completely okay.
          </p>
          <p style={{ fontFamily: SERIF, fontSize: 20, color: t.inkSoft, lineHeight: 1.6, margin: '0 0 36px' }}>
            But if you have expertise locked in PDFs and notes that students can't access — and you'd like your
            work cut in half — this is your path. Upload your materials. AI builds the curriculum.
            Students enroll. You get paid.
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
                body: 'PDFs, notes, text files — anything you\'d hand a student. We extract the knowledge from them.',
              },
              {
                n: '02', title: 'AI builds the curriculum',
                body: 'Claude reads your materials and structures them into modules and lessons. You review and approve before anything goes live.',
              },
              {
                n: '03', title: 'Publish. Get paid.',
                body: 'Set a price. Students browse the marketplace, enroll, and learn via deadline-enforced AI tutoring — grounded 100% in your content.',
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
              The AI is not you. It won't tell your stories. It won't pause when a room goes quiet.
              It will teach your material — accurately, patiently, at 3am — but it will not teach the way you do.
              <b style={{ color: t.ink }}> Know what you're signing up for.</b>
            </p>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA({ onNav }: { onNav: (k: string) => void }) {
  const { t } = useTheme();
  return (
    <section id="start" style={{ background: t.ink, padding: '140px 32px' }}>
      <div style={{ textAlign: 'center', color: t.bg, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', color: t.red, textTransform: 'uppercase' }}>
          One last thing
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(72px, 11vw, 160px)', margin: '20px 0', letterSpacing: '-0.035em', fontWeight: 400, color: t.bg, lineHeight: 0.9 }}>
          Pick a thing.<br />Pick a date.<br /><i style={{ color: t.red }}>Or don't.</i>
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 24, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: '32px auto', maxWidth: 600, lineHeight: 1.4 }}>
          The courses you'll never take are already gathering dust. At least this way they go out with a bang.
        </p>
        <button onClick={() => onNav('new')} style={{
          background: t.red, color: '#faf7f0', border: 'none', padding: '20px 40px',
          fontFamily: MONO, fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 16,
        }}>Begin the clock →</button>
        <div style={{ marginTop: 24, fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
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
  const finishers = state.courses.filter((c) => c.status === 'completed').length + 247;
  const deleted   = state.courses.filter((c) => c.status === 'tombstone').length + 1412;
  const footerLinks: [string, [string, string][]][] = [
    ['Product', [['how', 'How it works'], ['features', 'Features'], ['instructors', 'Teach here'], ['pricing', 'Pricing'], ['new', 'Start a course']]],
    ['Social proof', [['leaderboard', 'Leaderboard'], ['leaderboard-page', 'Full wall'], ['dashboard', 'Sample dashboard']]],
    ['Company', [['#', 'About'], ['#', 'Manifesto'], ['#', 'Careers'], ['#', 'Press']]],
    ['Legal', [['#', 'Deletion terms'], ['#', 'Privacy'], ['#', 'Security'], ['#', 'Contact']]],
  ];
  return (
    <footer style={{ background: t.paper, borderTop: `1px solid ${t.ink}`, padding: '64px 32px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 32, paddingBottom: 40, borderBottom: `1px solid ${t.ruleFaint}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 11, height: 11, background: t.red, display: 'inline-block' }} />
              <b style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', color: t.ink, textTransform: 'uppercase' }}>AINATIVE</b>
            </div>
            <p style={{ fontFamily: SERIF, fontSize: 20, fontStyle: 'italic', lineHeight: 1.4, color: t.ink, marginTop: 18, maxWidth: 320 }}>
              A learning platform with stakes. Finish — or every byte is permanently deleted.
            </p>
            <div style={{ marginTop: 20, padding: '10px 14px', border: `1px solid ${t.ink}`, display: 'inline-flex', gap: 16, alignItems: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              <span style={{ color: t.green }}>● {finishers} alive</span>
              <span style={{ color: t.mute }}>·</span>
              <span style={{ color: t.red }}>† {deleted.toLocaleString()} gone</span>
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
          <span>© 2026 AINATIVE · all progress subject to deletion</span>
          <span>made with stakes</span>
        </div>
        {/* Giant closing wordmark */}
        <div style={{ fontFamily: SERIF, fontSize: 'clamp(80px, 14vw, 220px)', letterSpacing: '-0.05em', lineHeight: 0.85, color: t.ink, marginTop: 40, textAlign: 'center', opacity: 0.9 }}>
          <i>lose it</i> or <span style={{ color: t.red }}>learn it.</span>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [saas, setSaas] = useState<boolean>(() => {
    try { return localStorage.getItem('ain_saas') === 'true'; } catch { return false; }
  });
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem('ain_dark') === 'true'; } catch { return false; }
  });
  const [active, setActive] = useState('home');

  if (saas) {
    return <LandingSaaS onSwitchTheme={() => { setSaas(false); try { localStorage.setItem('ain_saas', 'false'); } catch {} }} />;
  }
  const sectionRefs = useRef<string[]>(['home', 'how', 'features', 'leaderboard', 'instructors', 'pricing', 'faq']);

  useEffect(() => {
    try { localStorage.setItem('ain_dark', String(dark)); } catch {}
    document.body.style.background = dark ? '#141210' : '#f4f0e8';
    document.body.style.color = dark ? '#f1ecdf' : '#1a1510';
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
    if (target === 'new') { navigate('/new'); return; }
    if (target === 'dashboard') { navigate('/dashboard'); return; }
    if (target === 'leaderboard-page') { navigate('/leaderboard'); return; }
    if (target === 'browse') { navigate('/browse'); return; }
    if (target === 'create') { navigate('/create'); return; }
    if (target === 'home') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const el = document.getElementById(target);
    if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: 'smooth' });
  }

  const t = dark ? DARK : LIGHT;

  return (
    <ThemeCtx.Provider value={{ t, dark }}>
      <div style={{ minHeight: '100vh', background: t.bg, transition: 'background 0.3s' }}>
        <SiteNav active={active} dark={dark} onToggleDark={() => setDark((d) => !d)} onNav={onNav} onToggleSaas={() => { setSaas(true); try { localStorage.setItem('ain_saas', 'true'); } catch {} }} />
        <HeroSection onNav={onNav} />
        <TickerStrip />
        <HowSection />
        <FeaturesSection onNav={onNav} />
        <LeaderboardSection onNav={onNav} />
        <TestimonialsSection />
        <InstructorSection onNav={onNav} />
        <PricingSection onNav={onNav} />
        <FAQSection />
        <FinalCTA onNav={onNav} />
        <SiteFooter onNav={onNav} />
      </div>
    </ThemeCtx.Provider>
  );
}
