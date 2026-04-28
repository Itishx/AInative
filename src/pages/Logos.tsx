import { Link } from 'react-router-dom';
import { HC, btn } from '../theme';

type LogoSpec = {
  name: string;
  note: string;
  bg: string;
  ink: string;
  accent: string;
  render: () => React.ReactNode;
};

function Shell({ children, spec }: { children: React.ReactNode; spec: LogoSpec }) {
  return (
    <section style={{
      minHeight: 260,
      background: spec.bg,
      color: spec.ink,
      border: `1px solid ${spec.bg === HC.ink ? 'rgba(250,247,240,0.14)' : HC.ruleFaint}`,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: spec.bg === HC.paper ? '0 18px 50px rgba(26,21,16,0.06)' : 'none',
    }}>
      <div style={{ minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
      <div>
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: spec.accent }}>
          {spec.name}
        </div>
        <div style={{ marginTop: 7, fontFamily: HC.serif, fontSize: 18, lineHeight: 1.25, color: spec.ink, opacity: 0.72 }}>
          {spec.note}
        </div>
      </div>
    </section>
  );
}

function RedDot({ color = HC.red, size = 13 }: { color?: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 999, background: color, display: 'inline-block', flexShrink: 0 }} />;
}

const logos: LogoSpec[] = [
  {
    name: '01 / Editorial Pill',
    note: 'Closest to current product language. Calm, premium, easy to ship.',
    bg: HC.paper,
    ink: HC.ink,
    accent: HC.red,
    render: () => (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13, padding: '16px 22px', borderRadius: 999, background: 'rgba(26,21,16,0.045)' }}>
        <RedDot />
        <span style={{ fontFamily: HC.mono, fontSize: 17, fontWeight: 800, letterSpacing: '0.24em' }}>LEARNOR</span>
      </div>
    ),
  },
  {
    name: '02 / Serif Authority',
    note: 'Feels like a serious school, not a SaaS toy.',
    bg: HC.bg,
    ink: HC.ink,
    accent: HC.red,
    render: () => (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: HC.serif, fontSize: 82, lineHeight: 0.8, letterSpacing: '-0.07em' }}>Learnor</span>
        <span style={{ width: 11, height: 11, borderRadius: 999, background: HC.red, transform: 'translateY(-8px)' }} />
      </div>
    ),
  },
  {
    name: '03 / Deadline Mark',
    note: 'A clock, a cut, a course under pressure.',
    bg: HC.ink,
    ink: HC.paper,
    accent: '#ff6a5f',
    render: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="25" fill="none" stroke="#faf7f0" strokeWidth="4" />
          <path d="M32 15v18l15 8" stroke="#faf7f0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M12 52L52 12" stroke="#e8514a" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: HC.mono, fontSize: 20, fontWeight: 800, letterSpacing: '0.20em' }}>LEARNOR</span>
      </div>
    ),
  },
  {
    name: '04 / L Monogram',
    note: 'Good app icon candidate. Simple, severe, memorable.',
    bg: HC.paper,
    ink: HC.ink,
    accent: HC.red,
    render: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 76, height: 76, background: HC.ink, color: HC.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <span style={{ fontFamily: HC.serif, fontSize: 70, lineHeight: 1, letterSpacing: '-0.08em' }}>L</span>
          <span style={{ position: 'absolute', right: 10, bottom: 10, width: 10, height: 10, borderRadius: 999, background: HC.red }} />
        </div>
        <span style={{ fontFamily: HC.serif, fontSize: 54, letterSpacing: '-0.055em' }}>Learnor</span>
      </div>
    ),
  },
  {
    name: '05 / Tutor Signal',
    note: 'More human. Implies voice, chat, AI guidance.',
    bg: '#f9f3e7',
    ink: HC.ink,
    accent: HC.green,
    render: () => (
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'end', height: 34, marginBottom: 14 }}>
          {[10, 22, 14, 30, 18, 25, 12].map((h, i) => (
            <span key={i} style={{ width: 6, height: h, borderRadius: 999, background: i === 3 ? HC.red : HC.ink }} />
          ))}
        </div>
        <div style={{ fontFamily: HC.mono, fontSize: 18, fontWeight: 800, letterSpacing: '0.20em' }}>LEARNOR</div>
      </div>
    ),
  },
  {
    name: '06 / Bracket System',
    note: 'Technical and curriculum-like. Nice for dev/data courses.',
    bg: HC.ink,
    ink: HC.paper,
    accent: HC.red,
    render: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: HC.mono, fontSize: 24, fontWeight: 800, letterSpacing: '0.14em' }}>
        <span style={{ color: '#e8514a' }}>[</span>
        <span>LEARNOR</span>
        <span style={{ color: '#e8514a' }}>]</span>
      </div>
    ),
  },
  {
    name: '07 / Soft Future',
    note: 'Less brutal, more consumer-friendly. Better if stakes get toned down.',
    bg: '#e9efe7',
    ink: '#172018',
    accent: '#2d6a3f',
    render: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden>
          <path d="M14 43V15h8v21h22v7H14Z" fill="#172018" />
          <circle cx="42" cy="16" r="6" fill="#c4221b" />
        </svg>
        <span style={{ fontFamily: HC.sans, fontSize: 38, fontWeight: 800, letterSpacing: '-0.055em' }}>Learnor</span>
      </div>
    ),
  },
  {
    name: '08 / Course Stamp',
    note: 'Feels official. Works on certificates, emails, and cards.',
    bg: HC.paper,
    ink: HC.ink,
    accent: HC.red,
    render: () => (
      <div style={{ border: `2px solid ${HC.ink}`, padding: '16px 20px', transform: 'rotate(-2deg)' }}>
        <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', color: HC.red, textTransform: 'uppercase' }}>finish before deletion</div>
        <div style={{ fontFamily: HC.serif, fontSize: 52, lineHeight: 0.95, letterSpacing: '-0.05em', marginTop: 4 }}>Learnor</div>
      </div>
    ),
  },
];

export default function Logos() {
  return (
    <div style={{ minHeight: '100vh', background: HC.bg, color: HC.ink }}>
      <header style={{ padding: '28px clamp(20px, 4vw, 60px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderBottom: `1px solid ${HC.ruleFaint}` }}>
        <div>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.red }}>
            Learnor identity lab
          </div>
          <h1 style={{ fontFamily: HC.serif, fontSize: 'clamp(44px, 7vw, 96px)', lineHeight: 0.9, letterSpacing: '-0.055em', margin: '12px 0 0' }}>
            Logo directions.
          </h1>
        </div>
        <Link to="/" style={{ ...btn.outline, textDecoration: 'none', flexShrink: 0 }}>Back home</Link>
      </header>

      <main style={{ padding: '34px clamp(20px, 4vw, 60px) 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18 }}>
          {logos.map((spec) => (
            <Shell key={spec.name} spec={spec}>
              {spec.render()}
            </Shell>
          ))}
        </div>

        <section style={{ marginTop: 34, border: `1px solid ${HC.ruleFaint}`, background: HC.paper, padding: 24 }}>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', color: HC.red, textTransform: 'uppercase' }}>
            My read
          </div>
          <p style={{ fontFamily: HC.serif, fontSize: 24, lineHeight: 1.35, maxWidth: 860, margin: '12px 0 0', color: HC.ink }}>
            Best practical direction: <b>01 Editorial Pill</b> for the product header, with <b>04 L Monogram</b> as the favicon/app icon.
            If you want Learnor to feel more premium and less startup-y, use <b>02 Serif Authority</b>.
          </p>
        </section>
      </main>
    </div>
  );
}
