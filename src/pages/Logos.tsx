import html2canvas from 'html2canvas';
import { useRef, useState } from 'react';
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

type SocialThemeSpec = {
  id: string;
  label: string;
  note: string;
  bg: string;
  ink: string;
  accent: string;
};

const SOCIAL_SIZE = 1080;
const SERIF_AUTHORITY_SCALE = 3.7;
const SERIF_AUTHORITY_FONT_SIZE = 82;
const SERIF_AUTHORITY_GAP = 12;
const SERIF_AUTHORITY_DOT_SIZE = 11;
const SERIF_AUTHORITY_DOT_LIFT = 8;

const socialThemes: SocialThemeSpec[] = [
  {
    id: 'light',
    label: 'Light Theme',
    note: 'Exact 02 / Serif Authority wordmark on the warm Learnor light theme.',
    bg: '#f4f0e8',
    ink: '#1a1510',
    accent: '#c4221b',
  },
  {
    id: 'dark',
    label: 'Dark Theme',
    note: 'Exact 02 / Serif Authority wordmark on the dashboard/profile black theme.',
    bg: '#050505',
    ink: '#f6f0e7',
    accent: '#ff5148',
  },
];

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSocialLogoSvg(theme: SocialThemeSpec) {
  const serif = escapeXml(HC.serif);
  const wordmarkSize = SERIF_AUTHORITY_FONT_SIZE * SERIF_AUTHORITY_SCALE;
  const gap = SERIF_AUTHORITY_GAP * SERIF_AUTHORITY_SCALE;
  const dotSize = SERIF_AUTHORITY_DOT_SIZE * SERIF_AUTHORITY_SCALE;
  const dotLift = SERIF_AUTHORITY_DOT_LIFT * SERIF_AUTHORITY_SCALE;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${SOCIAL_SIZE}" height="${SOCIAL_SIZE}" viewBox="0 0 ${SOCIAL_SIZE} ${SOCIAL_SIZE}" role="img" aria-label="Learnor ${escapeXml(theme.label)} social logo">
  <rect width="${SOCIAL_SIZE}" height="${SOCIAL_SIZE}" fill="${theme.bg}" />
  <foreignObject x="0" y="0" width="${SOCIAL_SIZE}" height="${SOCIAL_SIZE}">
    <xhtml:div style="width:${SOCIAL_SIZE}px;height:${SOCIAL_SIZE}px;display:flex;align-items:center;justify-content:center;background:${theme.bg};overflow:hidden;">
      <xhtml:div style="display:flex;align-items:baseline;gap:${gap}px;">
        <xhtml:span style="font-family:${serif};font-size:${wordmarkSize}px;line-height:0.8;letter-spacing:-0.07em;color:${theme.ink};">Learnor</xhtml:span>
        <xhtml:span style="width:${dotSize}px;height:${dotSize}px;border-radius:999px;background:${theme.accent};display:inline-block;flex-shrink:0;transform:translateY(-${dotLift}px);"></xhtml:span>
      </xhtml:div>
    </xhtml:div>
  </foreignObject>
</svg>`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function downloadSvg(theme: SocialThemeSpec) {
  const svg = buildSocialLogoSvg(theme);
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `learnor-serif-authority-${theme.id}-1080.svg`);
}

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

function SerifAuthorityMark({
  ink,
  accent,
  scale = 1,
}: {
  ink: string;
  accent: string;
  scale?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: SERIF_AUTHORITY_GAP * scale }}>
      <span
        style={{
          fontFamily: HC.serif,
          fontSize: SERIF_AUTHORITY_FONT_SIZE * scale,
          lineHeight: 0.8,
          letterSpacing: '-0.07em',
          color: ink,
        }}
      >
        Learnor
      </span>
      <span
        style={{
          width: SERIF_AUTHORITY_DOT_SIZE * scale,
          height: SERIF_AUTHORITY_DOT_SIZE * scale,
          borderRadius: 999,
          background: accent,
          display: 'inline-block',
          flexShrink: 0,
          transform: `translateY(-${SERIF_AUTHORITY_DOT_LIFT * scale}px)`,
        }}
      />
    </div>
  );
}

function SocialExportCard({ theme }: { theme: SocialThemeSpec }) {
  const svg = buildSocialLogoSvg(theme);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  async function downloadExactPng() {
    const el = exportRef.current;
    if (!el || exporting) return;
    setExporting(true);
    try {
      if ('fonts' in document) {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      }
      const canvas = await html2canvas(el, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        width: SOCIAL_SIZE,
        height: SOCIAL_SIZE,
        backgroundColor: theme.bg,
      });
      const link = document.createElement('a');
      link.download = `learnor-serif-authority-${theme.id}-1080.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width: SOCIAL_SIZE,
          height: SOCIAL_SIZE,
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        <div
          ref={exportRef}
          style={{
            width: SOCIAL_SIZE,
            height: SOCIAL_SIZE,
            background: theme.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <SerifAuthorityMark ink={theme.ink} accent={theme.accent} scale={SERIF_AUTHORITY_SCALE} />
        </div>
      </div>

      <article style={{
        border: `1px solid ${HC.ruleFaint}`,
        background: HC.paper,
        padding: 22,
        display: 'grid',
        gap: 18,
        boxShadow: '0 18px 50px rgba(26,21,16,0.06)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'baseline',
          flexWrap: 'wrap',
        }}>
        <div>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.accent }}>
            02 / Serif Authority
          </div>
          <h2 style={{ margin: '8px 0 0', fontFamily: HC.serif, fontSize: 34, lineHeight: 0.92, letterSpacing: '-0.05em', fontWeight: 400 }}>
            {theme.label}
          </h2>
        </div>
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute }}>
          1080 × 1080
        </div>
        </div>

        <div style={{
          aspectRatio: '1 / 1',
          border: `1px solid ${HC.ruleFaint}`,
          overflow: 'hidden',
          background: theme.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <SerifAuthorityMark ink={theme.ink} accent={theme.accent} scale={1.14} />
        </div>

        <p style={{ margin: 0, fontFamily: HC.sans, fontSize: 14, lineHeight: 1.6, color: HC.mute }}>
          {theme.note}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => void downloadExactPng()} disabled={exporting} style={{ ...btn.primary, opacity: exporting ? 0.7 : 1 }}>
            {exporting ? 'Rendering...' : 'Download PNG'}
          </button>
          <button onClick={() => void downloadSvg(theme)} style={{ ...btn.outline }}>
            Download SVG
          </button>
        </div>

        <div style={{ fontFamily: HC.mono, fontSize: 10, lineHeight: 1.7, letterSpacing: '0.08em', color: HC.mute }}>
          PNG is captured from the exact on-page 02 lockup at 1080×1080.
          <br />
          SVG stays downloadable if you want a browser-friendly vector master.
        </div>
      </article>
    </>
  );
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
    render: () => <SerifAuthorityMark ink={HC.ink} accent={HC.red} />,
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
        <section style={{ marginBottom: 34, border: `1px solid ${HC.ruleFaint}`, background: HC.paper, padding: 24 }}>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', color: HC.red, textTransform: 'uppercase' }}>
            Social media exports
          </div>
          <p style={{ fontFamily: HC.serif, fontSize: 24, lineHeight: 1.35, maxWidth: 900, margin: '12px 0 0', color: HC.ink }}>
            Built proper square exports for the exact <b>02 / Serif Authority</b> Learnor logo in both themes.
            Download the PNG when you want a ready-to-post 1080×1080 asset. Download the SVG when you want a vector master that will never lose quality.
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          {socialThemes.map((theme) => (
            <SocialExportCard key={theme.id} theme={theme} />
          ))}
        </div>

        <section style={{ marginTop: 34 }}>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', color: HC.red, textTransform: 'uppercase', marginBottom: 16 }}>
            Direction explorations
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18 }}>
            {logos.map((spec) => (
              <Shell key={spec.name} spec={spec}>
                {spec.render()}
              </Shell>
            ))}
          </div>
        </section>

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
