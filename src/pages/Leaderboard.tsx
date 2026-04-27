import { HC } from '../theme';
import { Chrome } from '../components/Chrome';
import { useStore } from '../store';

function formatMargin(ms: number): string {
  const totalH = Math.floor(ms / 3600000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  return `${d}d ${String(h).padStart(2, '0')}h`;
}

export default function Leaderboard() {
  const { state } = useStore();
  const lb = [...state.leaderboard].sort((a, b) => b.marginMs - a.marginMs).map((e, i) => ({ ...e, rank: i + 1 }));
  const tombCount = state.courses.filter((c) => c.status === 'tombstone').length + 1412;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: HC.bg }}>
      <Chrome label="leaderboard · public" right="only finishers show here" />

      <div style={{ flex: 1, overflow: 'auto', padding: '40px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontFamily: HC.serif, fontSize: 'clamp(42px, 6vw, 72px)', margin: 0, letterSpacing: '-0.03em', fontWeight: 400 }}>
            The <i>finishers.</i>
          </h2>
          <div style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            sorted by: margin under deadline
          </div>
        </div>
        <p style={{ fontFamily: HC.serif, fontSize: 18, color: HC.mute, margin: '4px 0 32px', fontStyle: 'italic' }}>
          {tombCount.toLocaleString()} people didn't make this list. They don't get a line.
        </p>

        <div style={{ borderTop: `2px solid ${HC.ink}` }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 1.3fr 180px 100px 80px',
            padding: '10px 16px', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: HC.mute, borderBottom: `1px solid ${HC.ruleFaint}`,
          }}>
            <span>#</span><span>User</span><span>Course</span><span>Margin</span><span>Days</span><span>Streak</span>
          </div>

          {lb.length === 0 && (
            <div style={{ padding: '48px 16px', fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20, color: HC.mute }}>
              No finishers yet. Be the first.
            </div>
          )}

          {lb.map((r, i) => {
            const isMe = r.user === state.username;
            return (
              <div key={r.certId} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr 1.3fr 180px 100px 80px',
                padding: '14px 16px', borderBottom: `1px solid ${HC.ruleFaint}`,
                background: isMe ? 'rgba(196,34,27,0.04)' : 'transparent',
                fontFamily: HC.mono, fontSize: 13, alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: HC.serif, fontSize: i < 3 ? 34 : 20,
                  color: i < 3 ? HC.red : HC.mute, letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {String(r.rank).padStart(2, '0')}
                </span>
                <span style={{ color: HC.ink, fontWeight: 500 }}>
                  {r.user}
                  {isMe && <span style={{ color: HC.red, marginLeft: 8, fontSize: 9, letterSpacing: '0.16em' }}>← YOU</span>}
                </span>
                <span style={{ fontFamily: HC.serif, fontSize: 17, color: HC.ink, fontStyle: 'italic' }}>{r.course}</span>
                <span style={{ color: HC.red }}>-{formatMargin(r.marginMs)} under</span>
                <span style={{ color: HC.mute }}>{r.days}d total</span>
                <span style={{ color: HC.ink }}>{r.streak > 0 ? `${r.streak}🔥` : '—'}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontFamily: HC.mono, fontSize: 11, color: HC.mute }}>
          <span>showing {lb.length} finisher{lb.length !== 1 ? 's' : ''}</span>
          <span>updated live</span>
        </div>
      </div>
    </div>
  );
}
