import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

const S = {
  bg: '#000000',
  bgAlt: '#0a0a0a',
  card: 'rgba(255,255,255,0.035)',
  border: 'rgba(255,255,255,0.08)',
  ink: '#edfaf2',
  inkSoft: '#85a897',
  mute: '#3a5448',
  accent: '#15803d',
  accentAlt: '#166534',
  accentGlow: 'rgba(21,128,61,0.32)',
  green: '#4ade80',
  red: '#f43f5e',
  amber: '#f59e0b',
};

const I = '"Inter", -apple-system, system-ui, sans-serif';
const M = '"JetBrains Mono", ui-monospace, "SF Mono", monospace';
const GRAD = 'linear-gradient(135deg, #15803d 0%, #166534 100%)';
const GRAD_T = 'linear-gradient(135deg, #4ade80 0%, #86efac 100%)';

function GradText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: GRAD_T,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>{children}</span>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 999,
      border: `1px solid ${color ? color + '40' : S.border}`,
      background: color ? color + '12' : S.card,
      fontFamily: I, fontSize: 12, fontWeight: 500,
      color: color ?? S.inkSoft,
    }}>{children}</span>
  );
}

function formatMargin(ms: number) {
  const d = Math.floor(ms / 86400000);
  const h = String(Math.floor((ms % 86400000) / 3600000)).padStart(2, '0');
  return `${d}d ${h}h`;
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function SaasNav({ active, onSwitchTheme, onNav }: {
  active: string; onSwitchTheme: () => void; onNav: (id: string) => void;
}) {
  const items: [string, string][] = [
    ['how', 'How it works'], ['features', 'Features'],
    ['leaderboard', 'Leaderboard'], ['instructors', 'Teach here'],
    ['pricing', 'Pricing'], ['browse', 'Browse'], ['faq', 'FAQ'],
  ];
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '16px 20px' }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(5,5,10,0.8)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${S.border}`, borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <a href="#home" onClick={(e) => { e.preventDefault(); onNav('home'); }} style={{
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, background: GRAD,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 12px ${S.accentGlow}`,
          }}>
            <span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />
          </span>
          <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 27, fontWeight: 400, color: S.ink, letterSpacing: '-0.055em' }}>Learnor</span>
        </a>

        <div style={{ flex: 1, display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {items.map(([k, l]) => (
            <a key={k} href={`#${k}`} onClick={(e) => { e.preventDefault(); onNav(k); }} style={{
              padding: '8px 12px', borderRadius: 8,
              fontFamily: I, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              color: active === k ? S.ink : S.inkSoft,
              background: active === k ? 'rgba(255,255,255,0.07)' : 'transparent',
            }}>{l}</a>
          ))}
        </div>

        <button onClick={onSwitchTheme} style={{
          padding: '7px 14px', borderRadius: 8,
          border: `1px solid ${S.border}`, background: 'transparent',
          color: S.inkSoft, cursor: 'pointer',
          fontFamily: I, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        }}>◈ Editorial</button>

        <a href="#dashboard" onClick={(e) => { e.preventDefault(); onNav('dashboard'); }} style={{
          fontFamily: I, fontSize: 13, fontWeight: 500,
          color: S.inkSoft, textDecoration: 'none', padding: '8px 10px', whiteSpace: 'nowrap',
        }}>Log in</a>

        <button onClick={() => onNav('new')} style={{
          padding: '10px 20px', borderRadius: 10, background: GRAD,
          border: 'none', color: '#fff', cursor: 'pointer',
          fontFamily: I, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: `0 0 20px ${S.accentGlow}`,
        }}>Get started →</button>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
const SUGGESTIONS = ['How to dougie', 'SQL for analysts', 'Python basics', 'Mandarin tones', 'Color theory', 'Financial modeling'];

function SaasHero({ onNav }: { onNav: (k: string) => void }) {
  const { state } = useStore();
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const finishers = state.courses.filter(c => c.status === 'completed').length + 247;
  const deleted = state.courses.filter(c => c.status === 'tombstone').length + 1412;

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    navigate(`/new?topic=${encodeURIComponent(v)}`);
  }

  return (
    <section id="home" style={{
      background: S.bg, padding: '80px 24px 120px',
      textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -240, left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 700,
        background: 'radial-gradient(ellipse, rgba(124,58,237,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative' }}>
        <div style={{ marginBottom: 28 }}>
          <Badge color={S.accent}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
            A learning platform with real stakes
          </Badge>
        </div>

        <h1 style={{
          fontFamily: I, fontWeight: 800,
          fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 1.0,
          letterSpacing: '-0.04em', margin: '0 0 24px', color: S.ink,
        }}>
          Learn whatever<br />the f*ck{' '}
          <GradText>you want.</GradText>
        </h1>

        <p style={{
          fontFamily: I, fontSize: 20, lineHeight: 1.65, fontWeight: 400,
          color: S.inkSoft, margin: '0 auto 48px', maxWidth: 540,
        }}>
          Pick a deadline. Miss it — every lesson, every note, every quiz is{' '}
          <span style={{ color: S.red, fontWeight: 600 }}>permanently deleted</span>. Forever.
        </p>

        <form onSubmit={handleStart}>
          <div style={{
            border: `1.5px solid ${focused ? S.accent : S.border}`,
            borderRadius: 16, background: S.card,
            backdropFilter: 'blur(12px)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? `0 0 0 4px ${S.accentGlow}, 0 4px 32px rgba(0,0,0,0.4)` : '0 4px 24px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', padding: '20px 20px 12px' }}>
              <span style={{ fontFamily: M, fontSize: 18, color: S.accent, marginRight: 14, marginTop: 2, flexShrink: 0 }}>✦</span>
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
                  fontFamily: I, fontSize: 18, lineHeight: 1.5, color: S.ink, minHeight: 52, overflow: 'hidden',
                }}
              />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', borderTop: `1px solid ${S.border}`,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setInput(`Teach me ${s.toLowerCase()}`)} style={{
                    fontFamily: I, fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 999,
                    border: `1px solid ${S.border}`, background: 'transparent', color: S.inkSoft, cursor: 'pointer',
                  }}>{s}</button>
                ))}
              </div>
              <button type="submit" disabled={!input.trim()} style={{
                background: input.trim() ? GRAD : S.mute + '80',
                color: '#fff', border: 'none', padding: '12px 24px',
                borderRadius: 10, flexShrink: 0,
                fontFamily: I, fontSize: 14, fontWeight: 600,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                boxShadow: input.trim() ? `0 0 18px ${S.accentGlow}` : 'none',
                transition: 'all 0.2s',
              }}>Begin the clock →</button>
            </div>
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 32, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: I, fontSize: 13, fontWeight: 500, color: S.inkSoft }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
            {finishers} finished
          </span>
          <span style={{ color: S.mute }}>·</span>
          <span style={{ fontFamily: I, fontSize: 13, fontWeight: 500, color: S.inkSoft }}>
            <span style={{ color: S.red }}>†</span> {deleted.toLocaleString()} deleted
          </span>
          <span style={{ color: S.mute }}>·</span>
          <span style={{ fontFamily: I, fontSize: 13, fontWeight: 500, color: S.inkSoft }}>no card required</span>
          {state.courses.length > 0 && (
            <>
              <span style={{ color: S.mute }}>·</span>
              <button onClick={() => onNav('dashboard')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: I, fontSize: 13, fontWeight: 600, color: S.accent, textDecoration: 'underline',
              }}>{state.courses.length} open contract{state.courses.length !== 1 ? 's' : ''} →</button>
            </>
          )}
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

function SaasTickerStrip() {
  const all = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`,
      padding: '14px 0', overflow: 'hidden',
      background: 'linear-gradient(90deg, rgba(124,58,237,0.1), rgba(99,102,241,0.1))',
    }}>
      <style>{`@keyframes saasTicker { from { transform: translateX(0) } to { transform: translateX(-33.33%) } }`}</style>
      <div style={{
        display: 'flex', gap: 64, whiteSpace: 'nowrap',
        animation: 'saasTicker 60s linear infinite',
        fontFamily: I, fontSize: 13, fontWeight: 500,
      }}>
        {all.map((s, i) => (
          <span key={i} style={{ color: s.startsWith('†') ? S.red : S.green, flexShrink: 0 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function SaasHowSection() {
  const steps = [
    { n: '01', title: 'Say it out loud.', body: "Type the thing you've been meaning to learn for months. Rust. French. GROUP BY. The AI drafts a full curriculum — modules, lessons, estimated hours — in about six seconds." },
    { n: '02', title: 'Pick a deadline.', body: 'Between 3 and 90 days from today. It locks the instant you confirm. No extensions, no emergency tickets, no "life happened" clauses. One 72-hour pause, total.' },
    { n: '03', title: 'Learn or lose it.', body: 'An AI tutor walks you through each lesson. Quizzes gate progress. A countdown lives on every screen. Miss midnight — everything you built is permanently deleted.' },
  ];
  return (
    <section id="how" style={{ background: S.bgAlt, padding: '120px 32px', borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ marginBottom: 64 }}>
          <Badge color={S.accent}>How it works</Badge>
          <h2 style={{
            fontFamily: I, fontWeight: 800,
            fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05,
            letterSpacing: '-0.03em', margin: '20px 0 0', color: S.ink,
          }}>
            Three steps.<br /><GradText>One guillotine.</GradText>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {steps.map(s => (
            <div key={s.n} style={{
              padding: '36px 32px', background: S.card,
              border: `1px solid ${S.border}`, borderRadius: 20,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
              <div style={{
                fontFamily: I, fontWeight: 800, fontSize: 64, lineHeight: 1,
                letterSpacing: '-0.04em', color: S.green,
                marginBottom: 20,
              }}>{s.n}</div>
              <h3 style={{ fontFamily: I, fontSize: 22, fontWeight: 700, color: S.ink, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{s.title}</h3>
              <p style={{ fontFamily: I, fontSize: 15, lineHeight: 1.65, color: S.inkSoft, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function TutorMockup() {
  const msgs = [
    { who: 'ai', text: 'A table is a pile of rows. GROUP BY sorts them into buckets by a key, then collapses each bucket.' },
    { who: 'user', text: 'So one row per bucket?' },
    { who: 'ai', text: 'Exactly. What does SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id return?' },
  ];
  return (
    <div style={{ border: `1px solid ${S.border}`, borderRadius: 12, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: I, fontSize: 12, fontWeight: 600, color: S.inkSoft }}>LESSON · GROUP BY</span>
        <span style={{ fontFamily: I, fontSize: 12, fontWeight: 600, color: S.green }}>● VOICE ON</span>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            maxWidth: '85%', alignSelf: m.who === 'user' ? 'flex-end' : 'flex-start',
            fontFamily: I, fontSize: 14, lineHeight: 1.5, padding: '10px 14px', borderRadius: 12,
            background: m.who === 'user' ? GRAD : 'rgba(255,255,255,0.06)',
            color: m.who === 'user' ? '#fff' : S.ink,
          }}>{m.text}</div>
        ))}
      </div>
    </div>
  );
}

function SaasFeaturesSection({ onNav }: { onNav: (k: string) => void }) {
  const navigate = useNavigate();
  const features = [
    {
      label: 'Feature 01', title: 'An AI tutor that talks back.',
      body: 'Each lesson is a real conversation — it explains concepts, asks questions, corrects wrong answers, and only unlocks the next lesson when you pass the quiz. Chat or voice.',
      art: <TutorMockup />,
    },
    {
      label: 'Feature 02', title: 'The tombstone.',
      body: 'When you miss a deadline, the course becomes a tombstone — locked, struck through, visible forever. Not to shame you. To remind you that last time, the midnight was real.',
      art: (
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <div style={{ fontFamily: M, fontSize: 10, color: S.red, letterSpacing: '0.12em', marginBottom: 8 }}>† TOMBSTONE</div>
          <div style={{ fontFamily: I, fontSize: 18, fontWeight: 600, color: S.ink, textDecoration: 'line-through', marginBottom: 4 }}>Conversational French</div>
          <div style={{ fontFamily: I, fontSize: 12, color: S.inkSoft }}>deleted apr 19 · 61% complete at death</div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: I, fontWeight: 800, fontSize: 36, color: S.red, letterSpacing: '-0.03em' }}>-05</span>
            <span style={{ fontFamily: I, fontSize: 12, color: S.inkSoft }}>D</span>
            <span style={{ fontFamily: I, fontWeight: 800, fontSize: 36, color: S.red, marginLeft: 6, letterSpacing: '-0.03em' }}>17</span>
            <span style={{ fontFamily: I, fontSize: 12, color: S.inkSoft }}>H</span>
            <span style={{ fontFamily: I, fontSize: 13, color: S.red, marginLeft: 8, fontStyle: 'italic' }}>overdue</span>
          </div>
        </div>
      ),
    },
    {
      label: 'Feature 03', title: 'One pause, only.',
      body: 'Life does happen. You get exactly one 72-hour pause per course, usable any time except the final 24 hours. After that, the clock is the clock.',
      art: (
        <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: I, fontSize: 12, fontWeight: 600, color: S.mute, marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Emergency Pause</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: i === 0 ? GRAD : S.border }} />
            ))}
            <span style={{ fontFamily: I, fontSize: 12, color: S.mute, marginLeft: 4 }}>72H</span>
          </div>
          <div style={{ fontFamily: I, fontSize: 14, color: S.inkSoft, lineHeight: 1.5 }}>One shot. Cannot be used in the last 24h.</div>
        </div>
      ),
    },
    {
      label: 'Feature 04', title: 'Public finishers.',
      body: "The leaderboard only shows people who beat their deadline — sorted by margin. The 1,412 who missed don't appear. This is a list of survivors.",
      art: (
        <div style={{ borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          {[{ rank: 1, user: 'mira.k', margin: '14d 02h' }, { rank: 2, user: 'ojo_22', margin: '11d 19h' }, { rank: 3, user: 'hansu', margin: '08d 11h' }].map((r, i) => (
            <div key={r.rank} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderBottom: i < 2 ? `1px solid ${S.border}` : 'none',
              background: i === 0 ? 'rgba(124,58,237,0.08)' : 'transparent',
            }}>
              <span style={{ fontFamily: I, fontWeight: 800, fontSize: 16, width: 24, color: i === 0 ? S.accent : S.mute }}>0{r.rank}</span>
              <span style={{ flex: 1, fontFamily: I, fontSize: 13, fontWeight: 500, color: S.ink }}>{r.user}</span>
              <span style={{ fontFamily: I, fontSize: 12, fontWeight: 600, color: S.green }}>-{r.margin}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];
  return (
    <section id="features" style={{ background: S.bg, padding: '120px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ maxWidth: 700, marginBottom: 64 }}>
          <Badge color={S.accent}>The product</Badge>
          <h2 style={{
            fontFamily: I, fontWeight: 800,
            fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05,
            letterSpacing: '-0.03em', margin: '20px 0 24px', color: S.ink,
          }}>
            Calm product.<br /><GradText>Loud consequences.</GradText>
          </h2>
          <p style={{ fontFamily: I, fontSize: 18, lineHeight: 1.65, color: S.inkSoft, margin: 0 }}>
            Most learning apps make you feel productive. This one makes you actually finish.
            The interface is quiet, unhurried — because the stakes are doing the work.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 48 }}>
          {features.map(f => (
            <div key={f.label} style={{
              padding: '32px', background: S.card, border: `1px solid ${S.border}`,
              borderRadius: 20, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
              <div style={{ fontFamily: I, fontSize: 12, fontWeight: 600, color: S.accent, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>{f.label}</div>
              <h3 style={{ fontFamily: I, fontSize: 24, fontWeight: 700, color: S.ink, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{f.title}</h3>
              <p style={{ fontFamily: I, fontSize: 15, lineHeight: 1.65, color: S.inkSoft, margin: '0 0 24px' }}>{f.body}</p>
              {f.art}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            padding: '14px 28px', borderRadius: 10, background: GRAD,
            border: 'none', color: '#fff', cursor: 'pointer',
            fontFamily: I, fontSize: 14, fontWeight: 600,
            boxShadow: `0 0 24px ${S.accentGlow}`,
          }}>See it in action →</button>
        </div>
      </div>
    </section>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function SaasLeaderboardSection({ onNav }: { onNav: (k: string) => void }) {
  const { state } = useStore();
  const rows = state.leaderboard;
  return (
    <section id="leaderboard" style={{ background: S.bgAlt, padding: '120px 32px', borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
          <div>
            <Badge color={S.accent}>The wall</Badge>
            <h2 style={{
              fontFamily: I, fontWeight: 800,
              fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05,
              letterSpacing: '-0.03em', margin: '20px 0 0', color: S.ink,
            }}>The <GradText>finishers.</GradText></h2>
          </div>
          <p style={{ fontFamily: I, fontSize: 16, color: S.inkSoft, maxWidth: 300, textAlign: 'right', lineHeight: 1.6 }}>
            1,412 people didn't make this list.<br />They don't get a line.
          </p>
        </div>
        <div style={{ border: `1px solid ${S.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 1.3fr 180px 100px 100px',
            padding: '12px 20px', fontFamily: I, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.07em', textTransform: 'uppercase', color: S.mute,
            borderBottom: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.025)',
          }}>
            <span>#</span><span>User</span><span>Course</span><span>Margin under</span><span>Days</span><span>Streak</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.certId} style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 1.3fr 180px 100px 100px',
              padding: '16px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${S.border}` : 'none',
              fontFamily: I, fontSize: 14, alignItems: 'center',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
            }}>
              <span style={{ fontFamily: I, fontWeight: 800, fontSize: i < 3 ? 28 : 18, color: i < 3 ? S.accent : S.mute, lineHeight: 1 }}>
                {String(r.rank).padStart(2, '0')}
              </span>
              <span style={{ color: S.ink, fontWeight: 500 }}>{r.user}</span>
              <span style={{ fontSize: 15, color: S.inkSoft, fontStyle: 'italic' }}>{r.course}</span>
              <span style={{ fontWeight: 600, color: S.green }}>-{formatMargin(r.marginMs)}</span>
              <span style={{ color: S.inkSoft }}>{r.days}d total</span>
              <span style={{ color: S.ink }}>{r.streak}🔥</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontFamily: I, fontSize: 13, color: S.inkSoft }}>
          <span>showing {rows.length} finishers</span>
          <button onClick={() => onNav('leaderboard-page')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: I, fontSize: 13, fontWeight: 600, color: S.accent,
          }}>See the full wall →</button>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const QUOTES = [
  { q: "Knowing my French would evaporate at midnight on the 19th was the best motivator I've ever had. I finished 8 days early and actually retained it.", a: 'hansu', role: 'finished conversational japanese' },
  { q: "I lost a Rust course at 00:00:03 and I'm not even mad. The second attempt, six weeks later, I shipped a real CLI.", a: 'ojo_22', role: 'deleted once, finished twice' },
  { q: "Our whole data team did the SQL course on the same 30-day clock. Four of six made it. The other two are quiet about it.", a: 'mira.k', role: 'engineering lead' },
];

function SaasTestimonialsSection() {
  return (
    <section id="voices" style={{ background: S.bg, padding: '120px 32px', borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ marginBottom: 56, textAlign: 'center' }}>
          <Badge color={S.accent}>Voices from the wall</Badge>
          <h2 style={{
            fontFamily: I, fontWeight: 800,
            fontSize: 'clamp(32px, 4vw, 56px)', lineHeight: 1.1,
            letterSpacing: '-0.03em', margin: '20px 0 0', color: S.ink,
          }}>What finishers say</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {QUOTES.map((q, i) => (
            <div key={i} style={{
              padding: '32px', background: S.card, border: `1px solid ${S.border}`,
              borderRadius: 20, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
              <div style={{
                fontFamily: I, fontWeight: 800, fontSize: 52,
                color: S.green,
                lineHeight: 1, marginBottom: 16,
              }}>"</div>
              <p style={{ fontFamily: I, fontSize: 16, color: S.ink, lineHeight: 1.65, fontStyle: 'italic', margin: '0 0 28px' }}>{q.q}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: GRAD,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: I, fontSize: 14, fontWeight: 700, color: '#fff',
                }}>{q.a[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontFamily: I, fontSize: 13, fontWeight: 600, color: S.ink }}>{q.a}</div>
                  <div style={{ fontFamily: I, fontSize: 12, color: S.mute }}>{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Instructors ───────────────────────────────────────────────────────────────
function SaasInstructorSection() {
  const navigate = useNavigate();
  return (
    <section id="instructors" style={{ background: S.bgAlt, padding: '120px 32px', borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <Badge color={S.accent}>For instructors</Badge>
            <h2 style={{
              fontFamily: I, fontWeight: 800,
              fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.1,
              letterSpacing: '-0.03em', margin: '20px 0 24px', color: S.ink,
            }}>
              Your knowledge.<br />AI delivery.<br /><GradText>You still get paid.</GradText>
            </h2>
            <p style={{ fontFamily: I, fontSize: 16, lineHeight: 1.75, color: S.inkSoft, marginBottom: 16 }}>
              Most people who teach, teach for the love of it. We'll be honest:{' '}
              <strong style={{ color: S.ink }}>this takes that part away.</strong> The AI handles every explanation, every question, every quiz.
            </p>
            <p style={{ fontFamily: I, fontSize: 16, lineHeight: 1.75, color: S.inkSoft, marginBottom: 32, fontStyle: 'italic' }}>
              If the act of teaching is why you do this — this isn't for you. But if you have expertise locked in PDFs — upload, AI builds the curriculum, students enroll, you get paid.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => navigate('/create')} style={{
                padding: '14px 24px', borderRadius: 10, background: GRAD,
                border: 'none', color: '#fff', cursor: 'pointer',
                fontFamily: I, fontSize: 14, fontWeight: 600,
                boxShadow: `0 0 20px ${S.accentGlow}`,
              }}>Start teaching →</button>
              <button onClick={() => navigate('/browse')} style={{
                padding: '14px 24px', borderRadius: 10,
                background: 'transparent', color: S.inkSoft,
                border: `1px solid ${S.border}`, cursor: 'pointer',
                fontFamily: I, fontSize: 14, fontWeight: 500,
              }}>Browse courses</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { n: '01', title: 'Upload your materials', body: "PDFs, notes, text files — anything you'd hand a student. We extract the knowledge." },
              { n: '02', title: 'AI builds the curriculum', body: "Claude reads your materials and structures them into modules and lessons. You review before anything goes live." },
              { n: '03', title: 'Publish. Get paid.', body: "Set a price. Students enroll and learn via deadline-enforced AI tutoring — grounded 100% in your content." },
            ].map(step => (
              <div key={step.n} style={{
                padding: '24px', borderRadius: 16,
                background: S.card, border: `1px solid ${S.border}`,
                display: 'flex', gap: 20, alignItems: 'flex-start',
              }}>
                <div style={{
                  fontFamily: I, fontWeight: 800, fontSize: 28, lineHeight: 1,
                  color: S.green,
                  flexShrink: 0, width: 44,
                }}>{step.n}</div>
                <div>
                  <div style={{ fontFamily: I, fontSize: 15, fontWeight: 600, color: S.ink, marginBottom: 6 }}>{step.title}</div>
                  <div style={{ fontFamily: I, fontSize: 14, color: S.inkSoft, lineHeight: 1.65 }}>{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: 'Free trial', price: '$0', unit: 'one course',
    body: 'Run one course up to 14 days. Full product, full stakes. Prove to yourself that fear works.',
    list: ['1 course, up to 14 days', 'AI tutor', 'Leaderboard eligible', 'One emergency pause'],
    cta: 'Start free', primary: false,
  },
  {
    name: 'Finisher', price: '$18', unit: '/month',
    body: 'Queue as many courses as you can carry. Every one gets a real deadline. Every one can be deleted.',
    list: ['Unlimited courses', '3 concurrent active', 'Priority AI tutor', 'Public profile', 'Export certificates'],
    cta: 'Begin the clock →', primary: true,
  },
  {
    name: 'Team', price: '$12', unit: '/seat · yearly',
    body: 'Enroll a team in the same course with the same deadline. Shared tombstones. One cohort leaderboard.',
    list: ['Everything in Finisher', 'Cohort deadlines', 'Private leaderboards', 'Manager dashboard', 'SSO + audit logs'],
    cta: 'Talk to us', primary: false,
  },
];

function SaasPricingSection({ onNav }: { onNav: (k: string) => void }) {
  return (
    <section id="pricing" style={{ background: S.bg, padding: '120px 32px', borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ maxWidth: 600, marginBottom: 64 }}>
          <Badge color={S.accent}>Pricing</Badge>
          <h2 style={{
            fontFamily: I, fontWeight: 800,
            fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05,
            letterSpacing: '-0.03em', margin: '20px 0 20px', color: S.ink,
          }}>The only thing we won't <GradText>delete.</GradText></h2>
          <p style={{ fontFamily: I, fontSize: 18, lineHeight: 1.65, color: S.inkSoft, margin: 0 }}>
            Pay monthly or yearly. Cancel anytime — active courses keep their deadlines.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {TIERS.map(tier => (
            <div key={tier.name} style={{
              padding: '32px',
              background: tier.primary ? 'rgba(124,58,237,0.07)' : S.card,
              border: `${tier.primary ? 2 : 1}px solid ${tier.primary ? S.accent : S.border}`,
              borderRadius: 20, position: 'relative', overflow: 'hidden',
              boxShadow: tier.primary ? `0 0 48px ${S.accentGlow}` : 'none',
            }}>
              {tier.primary && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: GRAD }} />}
              {tier.primary && (
                <div style={{
                  position: 'absolute', top: 18, right: 18,
                  background: GRAD, color: '#fff', borderRadius: 999,
                  fontFamily: I, fontSize: 11, fontWeight: 600, padding: '4px 10px',
                }}>Most popular</div>
              )}
              <div style={{ fontFamily: I, fontSize: 12, fontWeight: 600, color: S.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>{tier.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: I, fontWeight: 800, fontSize: 56, color: S.ink, letterSpacing: '-0.04em', lineHeight: 1 }}>{tier.price}</span>
                <span style={{ fontFamily: I, fontSize: 14, color: S.inkSoft }}>{tier.unit}</span>
              </div>
              <p style={{ fontFamily: I, fontSize: 15, color: S.inkSoft, lineHeight: 1.65, margin: '16px 0 20px' }}>{tier.body}</p>
              <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 20, marginBottom: 24 }}>
                {tier.list.map(l => (
                  <div key={l} style={{ display: 'flex', gap: 10, fontFamily: I, fontSize: 14, fontWeight: 500, color: S.ink, padding: '6px 0' }}>
                    <span style={{ color: S.accent, fontWeight: 700 }}>✓</span><span>{l}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => onNav('new')} style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: tier.primary ? GRAD : 'transparent',
                color: tier.primary ? '#fff' : S.inkSoft,
                border: tier.primary ? 'none' : `1px solid ${S.border}`,
                fontFamily: I, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: tier.primary ? `0 0 20px ${S.accentGlow}` : 'none',
              }}>{tier.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS: [string, string][] = [
  ['Is the deletion actually permanent?', "Yes. When the deadline passes, we run a purge job: every lesson draft, every quiz attempt, every note — all of it. The course title remains as a tombstone. Nothing else is recoverable."],
  ['What if my internet dies on the last day?', "Your progress syncs every 30 seconds when online. If you complete the final quiz offline and reconnect after the deadline, the completion is still honored as long as the local timestamp is pre-deadline."],
  ['Can I extend a deadline?', "No. Not for any reason. You get one 72-hour pause per course, usable any time except the final 24 hours. That is the only flex."],
  ['What if I finish early?', "You're done, and you go on the leaderboard ranked by margin. Your certificate shows the margin. Your profile shows the margin."],
  ["I'm scared. Is that normal?", "That's the product working. Start with a 7-day course on something small. Build the muscle."],
];

function SaasFAQSection() {
  return (
    <section id="faq" style={{ background: S.bgAlt, padding: '120px 32px', borderTop: `1px solid ${S.border}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 80, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 100 }}>
            <Badge color={S.accent}>Questions</Badge>
            <h2 style={{
              fontFamily: I, fontWeight: 800, fontSize: 48, lineHeight: 1.1,
              letterSpacing: '-0.03em', margin: '20px 0 20px', color: S.ink,
            }}>
              Everything you'd ask before <GradText>committing.</GradText>
            </h2>
            <p style={{ fontFamily: I, fontSize: 16, color: S.inkSoft, lineHeight: 1.65 }}>
              If your question isn't here, email us at ask@learnor.ai.
            </p>
          </div>
          <div>
            {FAQS.map(([q, a], i) => (
              <details key={i} open={i < 2} style={{ borderBottom: `1px solid ${S.border}`, padding: '20px 0' }}>
                <summary style={{
                  cursor: 'pointer', listStyle: 'none',
                  display: 'flex', alignItems: 'baseline', gap: 16,
                  fontFamily: I, fontSize: 20, fontWeight: 600, color: S.ink, letterSpacing: '-0.01em',
                }}>
                  <span style={{ fontFamily: I, fontSize: 12, fontWeight: 700, color: S.accent, width: 32 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ flex: 1 }}>{q}</span>
                  <span style={{ fontFamily: I, fontSize: 18, color: S.mute }}>+</span>
                </summary>
                <div style={{ fontFamily: I, fontSize: 16, color: S.inkSoft, lineHeight: 1.65, marginTop: 12, paddingLeft: 48 }}>{a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function SaasFinalCTA({ onNav }: { onNav: (k: string) => void }) {
  return (
    <section id="start" style={{
      padding: '140px 32px', textAlign: 'center',
      background: 'linear-gradient(160deg, #0d0520 0%, #05050a 50%, #0a0520 100%)',
      borderTop: `1px solid ${S.border}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 700, height: 500,
        background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
        <Badge color={S.accent}>One last thing</Badge>
        <h2 style={{
          fontFamily: I, fontWeight: 800,
          fontSize: 'clamp(56px, 10vw, 112px)', lineHeight: 0.95,
          letterSpacing: '-0.04em', margin: '24px 0 0', color: S.ink,
        }}>
          Pick a thing.<br />Pick a date.<br /><GradText>Or don't.</GradText>
        </h2>
        <p style={{
          fontFamily: I, fontSize: 20, color: S.inkSoft, lineHeight: 1.6,
          margin: '32px auto', maxWidth: 480,
        }}>
          The courses you'll never take are already gathering dust. At least this way they go out with a bang.
        </p>
        <button onClick={() => onNav('new')} style={{
          padding: '18px 44px', borderRadius: 12, background: GRAD,
          border: 'none', color: '#fff', cursor: 'pointer',
          fontFamily: I, fontSize: 16, fontWeight: 700,
          boxShadow: `0 0 48px rgba(124,58,237,0.5), 0 8px 32px rgba(0,0,0,0.4)`,
        }}>Begin the clock →</button>
        <div style={{ marginTop: 20, fontFamily: I, fontSize: 13, color: S.mute }}>
          no card required · first course is free
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function SaasFooter({ onNav }: { onNav: (k: string) => void }) {
  const { state } = useStore();
  const finishers = state.courses.filter(c => c.status === 'completed').length + 247;
  const deleted = state.courses.filter(c => c.status === 'tombstone').length + 1412;
  const links: [string, [string, string][]][] = [
    ['Product', [['how', 'How it works'], ['features', 'Features'], ['instructors', 'Teach here'], ['pricing', 'Pricing'], ['new', 'Start a course']]],
    ['Social', [['leaderboard', 'Leaderboard'], ['leaderboard-page', 'Full wall'], ['dashboard', 'Dashboard']]],
    ['Company', [['#', 'About'], ['#', 'Manifesto'], ['#', 'Careers'], ['#', 'Press']]],
    ['Legal', [['#', 'Deletion terms'], ['#', 'Privacy'], ['#', 'Contact']]],
  ];
  return (
    <footer style={{ background: S.bgAlt, borderTop: `1px solid ${S.border}`, padding: '64px 32px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 32, paddingBottom: 40, borderBottom: `1px solid ${S.border}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />
              </span>
              <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 30, fontWeight: 400, color: S.ink, letterSpacing: '-0.055em' }}>Learnor</span>
            </div>
            <p style={{ fontFamily: I, fontSize: 15, lineHeight: 1.65, color: S.inkSoft, maxWidth: 280, marginBottom: 20 }}>
              A learning platform with stakes. Finish — or every byte is permanently deleted.
            </p>
            <div style={{ display: 'inline-flex', gap: 16, padding: '10px 16px', borderRadius: 10, border: `1px solid ${S.border}`, fontFamily: I, fontSize: 13, fontWeight: 500 }}>
              <span style={{ color: S.green }}>● {finishers} alive</span>
              <span style={{ color: S.mute }}>·</span>
              <span style={{ color: S.red }}>† {deleted.toLocaleString()} gone</span>
            </div>
          </div>
          {links.map(([heading, ls]) => (
            <div key={heading}>
              <div style={{ fontFamily: I, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: S.mute, marginBottom: 16 }}>{heading}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ls.map(([k, l]) => (
                  <a key={l} href={`#${k}`} onClick={(e) => { e.preventDefault(); if (k !== '#') onNav(k); }} style={{ fontFamily: I, fontSize: 14, color: S.inkSoft, textDecoration: 'none' }}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, fontFamily: I, fontSize: 12, color: S.mute }}>
          <span>© 2026 Learnor · all progress subject to deletion</span>
          <span>made with stakes</span>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LandingSaaS({ onSwitchTheme }: { onSwitchTheme: () => void }) {
  const navigate = useNavigate();
  const [active, setActive] = useState('home');
  const sectionRefs = useRef(['home', 'how', 'features', 'leaderboard', 'instructors', 'pricing', 'faq']);

  useEffect(() => {
    document.body.style.background = S.bg;
    document.body.style.color = S.ink;
    return () => {
      document.body.style.background = '';
      document.body.style.color = '';
    };
  }, []);

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
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.ink }}>
      <SaasNav active={active} onSwitchTheme={onSwitchTheme} onNav={onNav} />
      <SaasHero onNav={onNav} />
      <SaasTickerStrip />
      <SaasHowSection />
      <SaasFeaturesSection onNav={onNav} />
      <SaasLeaderboardSection onNav={onNav} />
      <SaasTestimonialsSection />
      <SaasInstructorSection />
      <SaasPricingSection onNav={onNav} />
      <SaasFAQSection />
      <SaasFinalCTA onNav={onNav} />
      <SaasFooter onNav={onNav} />
    </div>
  );
}
