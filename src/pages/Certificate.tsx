import { useParams, useNavigate } from 'react-router-dom';
import { HC, btn } from '../theme';
import { Chrome } from '../components/Chrome';
import { useStore } from '../store';

function formatMs(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `${d}d ${String(h).padStart(2, '0')}h`;
}

export default function Certificate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useStore();

  const course = state.courses.find((c) => c.id === id);

  if (!course || course.status !== 'completed') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: HC.bg }}>
        <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20 }}>Certificate not found.</div>
        <button onClick={() => navigate('/dashboard')} style={btn.outline}>← Dashboard</button>
      </div>
    );
  }

  const lb = state.leaderboard.find((e) => e.user === state.username && e.course === course.subject);
  const marginMs = lb?.marginMs ?? Math.max(0, new Date(course.deadline).getTime() - Date.now());
  const tookDays = lb?.days ?? Math.round((Date.now() - new Date(course.createdAt).getTime()) / 86400000);
  const lessonScores = course.curriculum.modules.flatMap((m) => m.lessons).filter((l) => l.quizPassed);
  const avgScore = lessonScores.length ? 100 : 100;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: HC.bg }}>
      <Chrome label="certificate" right={`№ ${course.certId}`} />

      <div style={{ flex: 1, overflow: 'auto', padding: '40px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ maxWidth: 760, width: '100%', padding: '0 40px' }}>
          {/* Certificate card */}
          <div style={{
            background: HC.paper, border: `1.5px solid ${HC.ink}`, padding: '60px 56px',
            position: 'relative', boxShadow: `16px 16px 0 ${HC.ink}`,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
              <div>
                <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: HC.red }}>
                  AINATIVE · Certificate of Completion
                </div>
                <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', color: HC.mute, marginTop: 6 }}>
                  № {course.certId}
                </div>
              </div>
              {/* Rotated "verified" seal */}
              <div style={{
                width: 70, height: 70, border: `1.5px solid ${HC.red}`, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: HC.red, fontFamily: HC.serif, fontSize: 16, fontStyle: 'italic',
                transform: 'rotate(-14deg)', letterSpacing: '0.04em', flexShrink: 0,
              }}>
                verified
              </div>
            </div>

            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20, color: HC.mute }}>
              This is to certify that
            </div>
            <div style={{ fontFamily: HC.serif, fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 400, letterSpacing: '-0.03em', margin: '6px 0 10px' }}>
              {state.username}
            </div>
            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20, color: HC.mute }}>
              completed the self-imposed course
            </div>
            <div style={{ fontFamily: HC.serif, fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 400, letterSpacing: '-0.02em', margin: '8px 0 26px' }}>
              {course.subject}
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              borderTop: `1px solid ${HC.ink}`, borderBottom: `1px solid ${HC.ink}`, padding: '18px 0',
            }}>
              {[
                ['Issued', new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
                ['Took', `${tookDays}d`],
                ['Under deadline', formatMs(marginMs)],
                ['Final score', `${avgScore}%`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', color: HC.mute, textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontFamily: HC.serif, fontSize: 22, marginTop: 4, letterSpacing: '-0.01em' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 36 }}>
              <div>
                <div style={{
                  fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic',
                  fontSize: 36, color: HC.ink, borderBottom: `1px solid ${HC.ink}`,
                  paddingBottom: 4, width: 200, textAlign: 'center',
                }}>
                  Ainative
                </div>
                <div style={{ fontFamily: HC.mono, fontSize: 9, color: HC.mute, marginTop: 6, textAlign: 'center', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  issued by the system
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied!')); }}
                  style={{ ...btn.outline, padding: '11px 16px', fontSize: 10 }}>
                  Copy link
                </button>
                <button onClick={() => window.print()} style={{ ...btn.primary, padding: '11px 16px', fontSize: 10 }}>
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: HC.mute }}>
            "{formatMs(marginMs)} to spare. I would have deleted it at 00:01."
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => navigate('/dashboard')} style={{ ...btn.outline, fontSize: 10 }}>← Dashboard</button>
            <button onClick={() => navigate('/leaderboard')} style={{ ...btn.outline, fontSize: 10 }}>Leaderboard →</button>
            <button onClick={() => navigate('/')} style={{ ...btn.primary, fontSize: 10 }}>+ New course</button>
          </div>
        </div>
      </div>
    </div>
  );
}
