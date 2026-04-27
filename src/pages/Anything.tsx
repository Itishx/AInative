import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC, btn } from '../theme';

const TOPICS = [
  'sql joins', 'sql window functions', 'python basics', 'python decorators', 'pandas cleaning',
  'excel formulas', 'excel dashboards', 'financial modeling', 'statistics intuition', 'linear regression',
  'a b testing', 'probability from scratch', 'machine learning basics', 'prompt engineering', 'langgraph agents',
  'docker for beginners', 'linux terminal', 'git without panic', 'system design basics', 'api design',
  'postgres indexing', 'data modeling', 'dbt fundamentals', 'airflow workflows', 'spark basics',
  'data storytelling', 'product analytics', 'retention analysis', 'cohort analysis', 'funnel debugging',
  'mandarin tones', 'french small talk', 'spanish travel phrases', 'japanese hiragana', 'korean basics',
  'public speaking', 'negotiation basics', 'cold email writing', 'storytelling on stage', 'interview confidence',
  'behavioral interviews', 'case interviews', 'resume surgery', 'portfolio reviews', 'salary negotiation',
  'color theory', 'typography taste', 'brand strategy', 'logo critique', 'visual hierarchy',
  'motion design', 'figma basics', 'ui writing', 'ux research', 'design systems',
  'how to dougie', 'shuffling basics', 'bachata timing', 'salsa turns', 'freestyle confidence',
  'guitar chords', 'piano scales', 'songwriting basics', 'music theory', 'beat making',
  'sourdough starter', 'espresso dialing', 'knife skills', 'meal prep', 'indian home cooking',
  'biryani basics', 'ramen at home', 'french omelettes', 'dessert plating', 'fermentation basics',
  'running form', 'mobility work', 'calisthenics basics', 'basketball footwork', 'tennis serve mechanics',
  'yoga foundations', 'breathwork basics', 'sleep better', 'habit design', 'focus systems',
  'personal finance', 'budgeting without misery', 'credit basics', 'investing 101', 'taxes for creators',
  'startup finance', 'pricing strategy', 'sales fundamentals', 'customer discovery', 'founder storytelling',
  'copywriting', 'seo basics', 'content strategy', 'email marketing', 'brand voice',
  'notion workflows', 'obsidian notes', 'zettelkasten basics', 'time blocking', 'deep work routines',
  'philosophy for beginners', 'stoicism', 'ethics in ai', 'critical thinking', 'logic basics',
  'history of the internet', 'world war two basics', 'the french revolution', 'cold war basics', 'indian independence',
  'astronomy basics', 'black holes', 'climate science', 'geology basics', 'ocean currents',
  'biology basics', 'genetics foundations', 'neuroscience basics', 'nutrition labels', 'human anatomy',
  'chess openings', 'midgame planning', 'endgame basics', 'poker math', 'game theory',
  'photography exposure', 'street photography', 'video editing', 'cinematic lighting', 'youtube scripting',
  'podcast interviewing', 'voice training', 'improv comedy', 'screenwriting', 'creative nonfiction',
  'poetry basics', 'novel outlining', 'worldbuilding', 'character arcs', 'editing your writing',
  'cybersecurity basics', 'password hygiene', 'networking fundamentals', 'cloud basics', 'kubernetes basics',
  'react fundamentals', 'typescript in practice', 'css layout mastery', 'next js basics', 'node apis',
  'rust ownership', 'go concurrency', 'java for interviews', 'c pointers', 'bash scripting',
  'mental models', 'decision making', 'learning how to learn', 'memory techniques', 'reading faster',
  'wedding speeches', 'better texting', 'conflict resolution', 'making friends as an adult', 'dating conversations',
  'travel hacking', 'packing light', 'trip planning', 'map reading', 'solo travel confidence',
  'skincare basics', 'hair care routines', 'capsule wardrobes', 'thrifting well', 'fragrance basics',
  'gardening basics', 'composting', 'house plants', 'balcony herbs', 'urban farming',
  'car maintenance', 'bike repair', 'motorcycle basics', 'home repairs', 'tool literacy',
  'meditation basics', 'journaling prompts', 'grief support basics', 'anxiety management', 'building resilience',
];

function hash(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getBubbleCount(width: number) {
  if (width < 640) return 54;
  if (width < 900) return 78;
  if (width < 1180) return 112;
  return 156;
}

function getColumnCount(width: number) {
  if (width < 640) return 2;
  if (width < 900) return 3;
  if (width < 1180) return 4;
  return 6;
}

function buildColumns(items: string[], columnCount: number) {
  const columns = Array.from({ length: columnCount }, () => [] as string[]);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

export default function Anything() {
  const navigate = useNavigate();
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440));
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const bubbleCount = getBubbleCount(width);
  const columnCount = getColumnCount(width);
  const topics = useMemo(() => TOPICS.slice(0, bubbleCount), [bubbleCount]);
  const columns = useMemo(() => buildColumns(topics, columnCount), [topics, columnCount]);

  return (
    <div style={{ minHeight: '100vh', background: HC.bg, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes anythingStreamFall {
          from { transform: translateY(calc(-50% - 10px)); }
          to { transform: translateY(0); }
        }

        .anything-column {
          position: relative;
          overflow: hidden;
          min-height: 100%;
          padding: 0 6px;
        }

        .anything-column:hover .anything-track,
        .anything-column:focus-within .anything-track {
          animation-play-state: paused;
        }

        .anything-track {
          display: flex;
          flex-direction: column;
          gap: 12px;
          will-change: transform;
          animation-name: anythingStreamFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .anything-row {
          display: flex;
        }

        .anything-row.incoming {
          justify-content: flex-start;
        }

        .anything-row.outgoing {
          justify-content: flex-end;
        }

        .anything-bubble {
          position: relative;
          width: fit-content;
          max-width: min(94%, 200px);
          padding: 11px 13px 12px;
          border: 1px solid rgba(26,21,16,0.09);
          border-radius: 24px;
          text-align: left;
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 16px 34px rgba(26,21,16,0.08);
        }

        .anything-bubble.incoming {
          border-bottom-left-radius: 10px;
        }

        .anything-bubble.outgoing {
          border-bottom-right-radius: 10px;
        }

        .anything-bubble:hover,
        .anything-bubble:focus-visible {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 24px 52px rgba(26,21,16,0.16);
          outline: none;
        }

        .anything-bubble.incoming::after,
        .anything-bubble.outgoing::after {
          content: "";
          position: absolute;
          bottom: 2px;
          width: 14px;
          height: 14px;
          border-radius: 0 0 12px 0;
          background: inherit;
          border-bottom: inherit;
        }

        .anything-bubble.incoming::after {
          left: -5px;
          border-left: inherit;
          transform: skewX(26deg);
        }

        .anything-bubble.outgoing::after {
          right: -5px;
          border-right: inherit;
          transform: scaleX(-1) skewX(26deg);
        }

        .tone-0 {
          background: rgba(250,247,240,0.88);
          color: #1a1510;
        }

        .tone-1 {
          background: rgba(26,21,16,0.90);
          color: #faf7f0;
          border-color: rgba(250,247,240,0.12);
        }

        .tone-2 {
          background: rgba(232,81,74,0.14);
          color: #1a1510;
          border-color: rgba(196,34,27,0.18);
        }

        .tone-3 {
          background: rgba(216,148,48,0.14);
          color: #1a1510;
          border-color: rgba(216,148,48,0.22);
        }

        .anything-bubble-kicker {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
          font-family: ${HC.mono};
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.62;
        }

        .anything-bubble-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: ${HC.red};
          flex-shrink: 0;
        }

        .anything-bubble-text {
          font-family: ${HC.serif};
          font-size: 20px;
          line-height: 0.98;
          letter-spacing: -0.02em;
          text-transform: lowercase;
        }

        @media (prefers-reduced-motion: reduce) {
          .anything-track {
            animation: none !important;
          }
        }
      `}</style>

      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 18% 14%, rgba(232,81,74,0.16), transparent 20%),
          radial-gradient(circle at 82% 18%, rgba(216,148,48,0.18), transparent 24%),
          radial-gradient(circle at 68% 76%, rgba(26,21,16,0.08), transparent 24%),
          linear-gradient(180deg, rgba(250,247,240,0.28), rgba(244,240,232,0.98))
        `,
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.25,
        backgroundImage: 'radial-gradient(rgba(26,21,16,0.08) 0.75px, transparent 0.75px)',
        backgroundSize: '24px 24px',
      }} />

      <div style={{ position: 'relative', zIndex: 3, padding: '18px 20px 0' }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          borderRadius: 999,
          border: `1px solid rgba(26,21,16,0.08)`,
          background: 'rgba(250,247,240,0.80)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 18px 50px rgba(26,21,16,0.10)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/')} style={{
              ...btn.ghost,
              padding: '10px 14px',
              borderRadius: 999,
              background: 'rgba(26,21,16,0.045)',
              color: HC.ink,
            }}>
              AINATIVE
            </button>
            <div style={{
              padding: '10px 14px',
              borderRadius: 999,
              background: 'rgba(26,21,16,0.04)',
              fontFamily: HC.mono,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: HC.mute,
            }}>
              teach me anything
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            fontFamily: HC.mono,
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: HC.mute,
          }}>
            <span>{bubbleCount} prompts</span>
            <span style={{ color: 'rgba(26,21,16,0.22)' }}>·</span>
            <span>no overlap</span>
            <span style={{ color: 'rgba(26,21,16,0.22)' }}>·</span>
            <span>tap any bubble</span>
            <button onClick={() => navigate('/new?topic=' + encodeURIComponent('Teach me anything at all'))} style={{ ...btn.primary, padding: '11px 16px', borderRadius: 999 }}>
              start blank →
            </button>
          </div>
        </div>
      </div>

      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 1280,
        margin: '0 auto',
        padding: width < 900 ? '30px 16px 140px' : '34px 20px 148px',
      }}>
        <div style={{ maxWidth: 760, marginBottom: 28 }}>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: HC.red, marginBottom: 12 }}>
            possibility space
          </div>
          <div style={{ fontFamily: HC.serif, fontSize: width < 700 ? 44 : 74, lineHeight: 0.9, letterSpacing: '-0.04em', color: HC.ink }}>
            Every bubble is a course waiting to happen.
          </div>
          <div style={{ marginTop: 14, maxWidth: 540, fontFamily: HC.serif, fontSize: width < 700 ? 20 : 24, lineHeight: 1.22, color: HC.mute, fontStyle: 'italic' }}>
            Wander through skills, languages, money, movement, code, design, cooking, weirdness, whatever.
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          gap: width < 900 ? 8 : 12,
          height: width < 900 ? 'calc(100vh - 280px)' : 'calc(100vh - 300px)',
          minHeight: 560,
        }}>
          {columns.map((column, columnIndex) => {
            const repeated = [...column, ...column];
            const duration = 28 + hash(columnIndex + 7) * 18;
            const delay = -(hash(columnIndex + 13) * duration);

            return (
              <div key={`column-${columnIndex}`} className="anything-column">
                <div
                  className="anything-track"
                  style={{
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                  }}
                >
                  {repeated.map((topic, itemIndex) => {
                    const prompt = `teach me ${topic}`;
                    const tone = Math.floor(hash(columnIndex * 100 + itemIndex + 31) * 4);
                    const outgoing = hash(columnIndex * 100 + itemIndex + 71) > 0.52;

                    return (
                      <div
                        key={`${columnIndex}-${itemIndex}-${topic}`}
                        className={`anything-row ${outgoing ? 'outgoing' : 'incoming'}`}
                      >
                        <button
                          className={`anything-bubble ${outgoing ? 'outgoing' : 'incoming'} tone-${tone}`}
                          onMouseEnter={() => setHoveredTopic(prompt)}
                          onMouseLeave={() => setHoveredTopic(null)}
                          onFocus={() => setHoveredTopic(prompt)}
                          onBlur={() => setHoveredTopic(null)}
                          onClick={() => navigate(`/new?topic=${encodeURIComponent(prompt)}`)}
                        >
                          <div className="anything-bubble-kicker">
                            <span className="anything-bubble-dot" />
                            <span>ai can teach</span>
                          </div>
                          <div className="anything-bubble-text">{prompt}</div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        position: 'fixed',
        left: '50%',
        bottom: 20,
        transform: 'translateX(-50%)',
        zIndex: 4,
        width: 'min(760px, calc(100vw - 28px))',
        padding: '14px 18px',
        borderRadius: 28,
        border: `1px solid rgba(26,21,16,0.08)`,
        background: 'rgba(250,247,240,0.86)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 20px 50px rgba(26,21,16,0.10)',
        pointerEvents: 'none',
      }}>
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.red, marginBottom: 8 }}>
          hovered prompt
        </div>
        <div style={{ fontFamily: HC.serif, fontSize: width < 640 ? 24 : 34, lineHeight: 0.98, letterSpacing: '-0.03em', color: HC.ink }}>
          {hoveredTopic ?? 'Click any bubble and the AI turns it into a real curriculum.'}
        </div>
      </div>
    </div>
  );
}
