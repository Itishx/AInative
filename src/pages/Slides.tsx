import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const MONO  = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

const C = {
  bg:    '#f4f0e8',
  paper: '#faf7f0',
  ink:   '#1a1510',
  mute:  '#6b6458',
  red:   '#c4221b',
  green: '#2d6a3f',
  amber: '#d89430',
  rule:  'rgba(26,21,16,0.12)',
};

// ── Individual slides ─────────────────────────────────────────────────────────

function Slide1() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ink, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      {/* Big red circle decoration */}
      <div style={{ position: 'absolute', right: -120, top: -120, width: 480, height: 480, borderRadius: '50%', border: `1px solid rgba(196,34,27,0.25)` }} />
      <div style={{ position: 'absolute', right: -60, top: -60, width: 360, height: 360, borderRadius: '50%', border: `1px solid rgba(196,34,27,0.15)` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.red }} />
        <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.45)' }}>Learnor</span>
      </div>

      <div>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.red, marginBottom: 32 }}>Introducing</div>
        <div style={{ fontFamily: SERIF, fontSize: 120, lineHeight: 0.88, letterSpacing: '-0.05em', color: C.paper, marginBottom: 48 }}>
          Learn<br />or<br /><span style={{ color: C.red }}>lose.</span>
        </div>
        <div style={{ width: 80, height: 2, background: C.red, marginBottom: 32 }} />
        <div style={{ fontFamily: SERIF, fontSize: 24, color: 'rgba(250,247,240,0.55)', lineHeight: 1.4, maxWidth: 480 }}>
          A learning platform where deadlines are real, and failure means everything is permanently deleted.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.3)' }}>a-inative.vercel.app</div>
      </div>
    </div>
  );
}

function Slide2() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>01 / The problem</div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 88, lineHeight: 0.9, letterSpacing: '-0.04em', color: C.ink, marginBottom: 40 }}>
          You start.<br />You don't<br /><i style={{ color: C.red }}>finish.</i>
        </div>
        <div style={{ height: 1, background: C.rule, marginBottom: 36 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            { n: '93%', label: 'of online courses are never completed' },
            { n: '1.4k', label: 'courses deleted on Learnor this year' },
          ].map(({ n, label }) => (
            <div key={n} style={{ background: C.paper, padding: '24px 28px', border: `1px solid ${C.rule}` }}>
              <div style={{ fontFamily: SERIF, fontSize: 56, color: C.red, letterSpacing: '-0.03em', lineHeight: 1 }}>{n}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.mute, letterSpacing: '0.1em', marginTop: 10, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: C.mute }}>What if missing the deadline had real consequences?</div>
    </div>
  );
}

function Slide3() {
  const steps = [
    { n: '01', title: 'Pick a topic', body: 'Anything. SQL. Rust. Japanese. Docker. Just name it.' },
    { n: '02', title: 'Set a deadline', body: 'Choose your window. 7 days. 14 days. The clock starts now.' },
    { n: '03', title: 'Finish — or lose', body: 'Miss the deadline and every byte of your progress is permanently deleted.' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.paper, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>02 / How it works</div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 64, lineHeight: 0.92, letterSpacing: '-0.035em', color: C.ink, marginBottom: 52 }}>Three steps.<br />No excuses.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 28, alignItems: 'flex-start', borderTop: `1px solid ${C.rule}`, paddingTop: 20 }}>
              <span style={{ fontFamily: SERIF, fontSize: 52, color: C.red, lineHeight: 1, letterSpacing: '-0.04em', flexShrink: 0 }}>{s.n}</span>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontFamily: SERIF, fontSize: 20, color: C.mute, lineHeight: 1.4 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red }} />
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>Learnor</span>
      </div>
    </div>
  );
}

function Slide4() {
  const msgs = [
    { who: 'tutor', text: 'Before we dive in — how familiar are you with Kubernetes? Complete beginner, seen it once or twice, or used it before?' },
    { who: 'user', text: 'I\'ve heard of it but never actually used it.' },
    { who: 'tutor', text: 'Perfect. Think of Kubernetes as a traffic controller for your containers. It decides which server runs what, and restarts things when they crash...' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>03 / The tutor</div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 58, lineHeight: 0.92, letterSpacing: '-0.03em', color: C.ink, marginBottom: 36 }}>Your AI tutor.<br /><i>Knows where you're at.</i></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.who === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '78%',
              padding: '14px 18px',
              background: m.who === 'user' ? C.ink : C.paper,
              color: m.who === 'user' ? C.paper : C.ink,
              border: `1px solid ${m.who === 'user' ? C.ink : C.rule}`,
              fontFamily: SERIF,
              fontSize: 17,
              lineHeight: 1.45,
            }}>
              {m.text}
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.mute }}>Adapts to your level. Every lesson.</div>
    </div>
  );
}

function Slide5() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ink, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', background: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(196,34,27,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(196,34,27,0.04) 40px)` }} />

      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.35)', position: 'relative' }}>04 / The deadline</div>

      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: SERIF, fontSize: 36, color: C.red, letterSpacing: '-0.01em', marginBottom: 20, lineHeight: 1.2 }}>Miss the deadline.</div>
        <div style={{ fontFamily: SERIF, fontSize: 100, lineHeight: 0.85, letterSpacing: '-0.05em', color: C.paper, marginBottom: 36 }}>
          Every<br />byte<br /><span style={{ color: C.red }}>gone.</span>
        </div>
        <div style={{ height: 1, background: 'rgba(196,34,27,0.4)', marginBottom: 28 }} />
        <div style={{ fontFamily: SERIF, fontSize: 22, color: 'rgba(250,247,240,0.55)', lineHeight: 1.5, maxWidth: 500 }}>
          Your notes. Your progress. Your chat history. Permanently deleted. No undo. No extension. The clock doesn't care.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 36 }}>
        {[{ n: '7', l: 'days typical window' }, { n: '72h', l: 'urgent warning zone' }, { n: '0', l: 'exceptions, ever' }].map(({ n, l }) => (
          <div key={n}>
            <div style={{ fontFamily: SERIF, fontSize: 44, color: C.red, letterSpacing: '-0.03em', lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(250,247,240,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 6 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide6() {
  const rows = [
    { rank: '01', user: 'mira.k', course: 'Docker in anger', margin: '-14d 02h', streak: '21🔥' },
    { rank: '02', user: 'ojo_22', course: 'Intro to probability', margin: '-11d 19h', streak: '26🔥' },
    { rank: '03', user: 'hansu', course: 'Conversational Japanese', margin: '-8d 11h', streak: '38🔥' },
    { rank: '04', user: 'you?', course: '—', margin: '—', streak: '—' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.paper, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>05 / The leaderboard</div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 62, lineHeight: 0.92, letterSpacing: '-0.035em', color: C.ink, marginBottom: 40 }}>Only<br /><i>finishers</i><br />get a line.</div>
        <div style={{ borderTop: `2px solid ${C.ink}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1.3fr 140px 80px', padding: '10px 14px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.mute, borderBottom: `1px solid ${C.rule}` }}>
            <span>#</span><span>User</span><span>Course</span><span>Margin</span><span>Streak</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.rank} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1.3fr 140px 80px', padding: '13px 14px', borderBottom: `1px solid ${C.rule}`, background: i === 3 ? 'rgba(196,34,27,0.04)' : 'transparent' }}>
              <span style={{ fontFamily: SERIF, fontSize: i < 3 ? 30 : 18, color: i < 3 ? C.red : C.mute, letterSpacing: '-0.02em', lineHeight: 1 }}>{r.rank}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: i === 3 ? C.mute : C.ink, fontStyle: i === 3 ? 'italic' : 'normal' }}>{r.user}</span>
              <span style={{ fontFamily: SERIF, fontSize: 16, color: C.mute, fontStyle: 'italic' }}>{r.course}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.red }}>{r.margin}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink }}>{r.streak}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.mute }}>Sorted by how far under the deadline you finished.</div>
    </div>
  );
}

function Slide7() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>06 / Visual canvas</div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 58, lineHeight: 0.92, letterSpacing: '-0.03em', color: C.ink, marginBottom: 36 }}>See it.<br />Don't just<br /><i>read it.</i></div>
        <div style={{ background: C.paper, border: `1px solid ${C.rule}`, padding: 24, fontFamily: MONO, fontSize: 13, color: C.ink, lineHeight: 1.7 }}>
          <div style={{ color: C.mute, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${C.rule}`, paddingBottom: 10 }}>Canvas · orders table</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0, border: `1px solid ${C.rule}` }}>
            {['order_id', 'customer', 'amount', 'status'].map((h) => (
              <div key={h} style={{ padding: '8px 12px', background: C.ink, color: C.paper, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', borderRight: `1px solid rgba(250,247,240,0.1)` }}>{h}</div>
            ))}
            {[['1001','alice','$42.00','shipped'],['1002','bob','$18.50','pending'],['1003','carol','$97.20','delivered']].flatMap((row) =>
              row.map((cell, ci) => (
                <div key={`${row[0]}-${ci}`} style={{ padding: '8px 12px', borderRight: `1px solid ${C.rule}`, borderTop: `1px solid ${C.rule}`, fontSize: 13, color: C.ink }}>{cell}</div>
              ))
            )}
          </div>
        </div>
        <div style={{ marginTop: 16, fontFamily: SERIF, fontSize: 18, color: C.mute, fontStyle: 'italic' }}>When the tutor describes a table or code — it appears on the canvas instantly.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red }} />
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>Learnor</span>
      </div>
    </div>
  );
}

function Slide8() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.paper, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>07 / Certificates</div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 60, lineHeight: 0.92, letterSpacing: '-0.035em', color: C.ink, marginBottom: 40 }}>Finish early.<br /><i style={{ color: C.green }}>Earn it.</i></div>
        {/* Certificate mockup */}
        <div style={{ border: `2px solid ${C.ink}`, padding: '36px 40px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, border: `1px solid ${C.rule}`, pointerEvents: 'none' }} />
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute, marginBottom: 8 }}>Certificate of completion</div>
          <div style={{ fontFamily: SERIF, fontSize: 36, color: C.ink, letterSpacing: '-0.025em', marginBottom: 8 }}>Kubernetes Basics</div>
          <div style={{ fontFamily: SERIF, fontSize: 18, color: C.mute, fontStyle: 'italic', marginBottom: 20 }}>Awarded to <span style={{ color: C.ink, fontStyle: 'normal' }}>you</span> · Finished 8 days under deadline</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ width: 120, height: 1, background: C.ink, marginBottom: 6 }} />
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.mute, letterSpacing: '0.1em' }}>Learnor · 2026</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.red, letterSpacing: '0.14em' }}>AIN-000001</div>
          </div>
        </div>
      </div>

      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: C.mute }}>Your cert lives forever. Even after the course deadline passes.</div>
    </div>
  );
}

function Slide9() {
  const reasons = [
    'No boring video lectures',
    'Learns your level in 30 seconds',
    'Visual canvas for tables & code',
    'Notes auto-generated per module',
    'Leaderboard for serious learners',
    'One pause allowed. Use it wisely.',
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>08 / Why Learnor</div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 62, lineHeight: 0.92, letterSpacing: '-0.035em', color: C.ink, marginBottom: 40 }}>Built for<br />people who<br /><i>actually</i> finish.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {reasons.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', border: `1px solid ${C.rule}`, background: C.paper }}>
              <span style={{ color: C.green, fontFamily: MONO, fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>✓</span>
              <span style={{ fontFamily: SERIF, fontSize: 18, color: C.ink, lineHeight: 1.35 }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red }} />
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.mute }}>Learnor</span>
      </div>
    </div>
  );
}

function Slide10() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ink, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -80, bottom: -80, width: 400, height: 400, borderRadius: '50%', border: `1px solid rgba(196,34,27,0.18)` }} />
      <div style={{ position: 'absolute', right: -140, bottom: -140, width: 560, height: 560, borderRadius: '50%', border: `1px solid rgba(196,34,27,0.10)` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.red }} />
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.4)' }}>Learnor</span>
      </div>

      <div>
        <div style={{ fontFamily: SERIF, fontSize: 22, color: C.red, letterSpacing: '-0.01em', marginBottom: 20 }}>The clock is already ticking.</div>
        <div style={{ fontFamily: SERIF, fontSize: 100, lineHeight: 0.85, letterSpacing: '-0.05em', color: C.paper, marginBottom: 48 }}>
          Start<br />your first<br />course<br /><span style={{ color: C.red }}>→</span>
        </div>
        <div style={{ display: 'inline-block', padding: '18px 32px', border: `1px solid rgba(250,247,240,0.2)`, fontFamily: MONO, fontSize: 14, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.55)' }}>
          a-inative.vercel.app
        </div>
      </div>

      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: 'rgba(250,247,240,0.35)' }}>1,412 people didn't make the leaderboard. Don't be one of them.</div>
    </div>
  );
}

const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10];
const SLIDE_SIZE = 1080;

// ── SlideCard (preview + individual download) ─────────────────────────────────
function SlideCard({
  index, SlideComponent, onRef, onDownload, exporting, disabled,
}: {
  index: number;
  SlideComponent: () => JSX.Element;
  onRef: (el: HTMLDivElement | null) => void;
  onDownload: () => void;
  exporting: boolean;
  disabled: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Compute scale once container mounts
  const measuredRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / SLIDE_SIZE);
    });
    ro.observe(el);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div ref={measuredRef} style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div
          ref={onRef}
          style={{ width: SLIDE_SIZE, height: SLIDE_SIZE, transformOrigin: 'top left', transform: `scale(${scale})`, position: 'absolute', top: 0, left: 0 }}
        >
          <SlideComponent />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#5a534a', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Slide {String(index + 1).padStart(2, '0')}
        </div>
        <button
          onClick={onDownload}
          disabled={disabled}
          style={{
            padding: '8px 14px',
            background: 'rgba(241,236,223,0.06)',
            border: '1px solid rgba(241,236,223,0.1)',
            color: '#8a8373',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', borderRadius: 6,
          }}
        >
          {exporting ? '…' : '↓ JPEG'}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Slides() {
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportingIdx, setExportingIdx] = useState<number | null>(null);

  async function captureSlide(idx: number): Promise<HTMLCanvasElement> {
    const el = slideRefs.current[idx];
    if (!el) throw new Error('Slide not found');
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: SLIDE_SIZE,
      height: SLIDE_SIZE,
      backgroundColor: null,
    });
  }

  async function downloadAll() {
    setExporting(true);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [SLIDE_SIZE, SLIDE_SIZE], compress: true });
    for (let i = 0; i < SLIDES.length; i++) {
      setExportingIdx(i);
      const canvas = await captureSlide(i);
      const img = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage([SLIDE_SIZE, SLIDE_SIZE]);
      pdf.addImage(img, 'JPEG', 0, 0, SLIDE_SIZE, SLIDE_SIZE);
    }
    pdf.save('learnor-carousel.pdf');
    setExporting(false);
    setExportingIdx(null);
  }

  async function downloadJpeg(idx: number) {
    setExportingIdx(idx);
    const canvas = await captureSlide(idx);
    const link = document.createElement('a');
    link.download = `learnor-slide-${String(idx + 1).padStart(2, '0')}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
    setExportingIdx(null);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0c0a', padding: '48px 32px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 36, color: '#f1ecdf', letterSpacing: '-0.025em', lineHeight: 1 }}>Learnor carousel</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#5a534a', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 8 }}>10 slides · 1080 × 1080 · Instagram / LinkedIn ready</div>
          </div>
          <button
            onClick={downloadAll}
            disabled={exporting}
            style={{
              padding: '14px 28px',
              background: exporting ? '#2a2520' : C.red,
              color: '#faf7f0',
              border: 'none',
              cursor: exporting ? 'not-allowed' : 'pointer',
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              opacity: exporting ? 0.65 : 1,
              borderRadius: 8,
            }}
          >
            {exporting ? `Rendering ${(exportingIdx ?? 0) + 1}/${SLIDES.length}…` : '↓ Download all as PDF'}
          </button>
        </div>
      </div>

      {/* Slides grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
        {SLIDES.map((SlideComponent, i) => (
          <SlideCard
            key={i}
            index={i}
            SlideComponent={SlideComponent}
            onRef={(el) => { slideRefs.current[i] = el; }}
            onDownload={() => downloadJpeg(i)}
            exporting={exportingIdx === i}
            disabled={exportingIdx !== null}
          />
        ))}
      </div>
    </div>
  );
}
