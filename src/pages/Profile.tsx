import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTheme } from '../lib/theme';
import { HC } from '../theme';

const P = {
  bg: 'var(--profile-bg)',
  ink: 'var(--profile-ink)',
  mute: 'var(--profile-mute)',
  faint: 'var(--profile-faint)',
  softer: 'var(--profile-softer)',
  red: 'var(--profile-red)',
  green: 'var(--profile-green)',
  serif: HC.serif,
  sans: HC.sans,
  mono: HC.mono,
};

function makeHandle(username: string) {
  return username.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'learner';
}

export default function Profile() {
  const { state } = useStore();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const displayName = state.profile?.displayName?.trim() || (state.username === 'you' ? 'Learner' : state.username);
  const handle = makeHandle(state.username);
  const bio = state.profile?.bio?.trim() || 'Learning in public, racing deadlines, and turning unfinished curiosity into finished courses.';
  const avatarUrl = state.profile?.avatarUrl?.trim();

  const stats = useMemo(() => {
    const active = state.courses.filter((course) => course.status !== 'tombstone' && course.status !== 'completed').length;
    const done = state.courses.filter((course) => course.status === 'completed').length;
    const urgent = state.courses.filter((course) => course.status === 'active-urgent').length;
    const quizTotal = state.quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const quizAvg = state.quizAttempts.length ? Math.round(quizTotal / state.quizAttempts.length) : 0;
    return { active, done, urgent, quizAvg };
  }, [state.courses, state.quizAttempts]);

  const joined = state.courses.length
    ? new Date(Math.min(...state.courses.map((course) => new Date(course.createdAt).getTime()).filter(Number.isFinite))).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main
      style={{
        minHeight: '100vh',
        background: P.bg,
        color: P.ink,
        fontFamily: P.sans,
        padding: '28px clamp(20px, 5vw, 72px) 72px',
        '--profile-bg': dark ? '#050505' : '#f4f0e8',
        '--profile-ink': dark ? '#f6f0e7' : '#1a1510',
        '--profile-mute': dark ? 'rgba(246,240,231,0.52)' : 'rgba(26,21,16,0.52)',
        '--profile-faint': dark ? 'rgba(246,240,231,0.12)' : 'rgba(26,21,16,0.12)',
        '--profile-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
        '--profile-red': dark ? '#ff5148' : '#c4221b',
        '--profile-green': dark ? '#72c089' : '#2d6a3f',
      } as React.CSSProperties}
    >
      <nav style={{ maxWidth: 1280, margin: '0 auto 46px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
        <button onClick={() => navigate('/')} style={{ border: 'none', background: 'transparent', color: P.ink, cursor: 'pointer', padding: 0, fontFamily: P.serif, fontSize: 31, letterSpacing: '-0.055em' }}>
          Learnor
        </button>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <button onClick={() => navigate('/dashboard')} style={{ border: 'none', background: 'transparent', color: P.mute, cursor: 'pointer', padding: 0, fontFamily: P.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Dashboard</button>
          <button onClick={() => navigate('/settings')} style={{ border: 'none', background: 'transparent', color: P.mute, cursor: 'pointer', padding: 0, fontFamily: P.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Settings</button>
        </div>
      </nav>

      <section style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(260px, 390px) minmax(0, 1fr)', gap: 'clamp(32px, 6vw, 86px)', alignItems: 'start' }}>
        <aside style={{ border: `1px solid ${P.faint}`, borderRadius: 34, padding: 30, background: P.softer }}>
          <div style={{ width: 156, height: 156, borderRadius: '50%', overflow: 'hidden', background: P.ink, color: P.bg, display: 'grid', placeItems: 'center', fontFamily: P.mono, fontSize: 28, fontWeight: 800, marginBottom: 26 }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.slice(0, 2).toUpperCase()}
          </div>
          <h1 style={{ margin: 0, fontFamily: P.sans, fontSize: 30, letterSpacing: '-0.05em', color: P.ink }}>{displayName}</h1>
          <div style={{ marginTop: 7, color: P.mute, fontSize: 18 }}>@{handle}</div>
          <p style={{ margin: '28px 0 0', color: P.ink, fontSize: 20, lineHeight: 1.45 }}>{bio}</p>
          <div style={{ marginTop: 30, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/settings')} style={{ border: `1px solid ${P.ink}`, borderRadius: 999, background: P.ink, color: P.bg, cursor: 'pointer', padding: '12px 18px', fontFamily: P.sans, fontSize: 14, fontWeight: 800 }}>Edit profile</button>
            <button onClick={() => navigate('/dashboard')} style={{ border: `1px solid ${P.faint}`, borderRadius: 999, background: 'transparent', color: P.ink, cursor: 'pointer', padding: '12px 18px', fontFamily: P.sans, fontSize: 14, fontWeight: 800 }}>Dashboard</button>
          </div>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${P.faint}`, display: 'grid', gap: 11, color: P.mute, fontSize: 15 }}>
            <span>⌖ Hyderabad</span>
            <span>↗ learnor.app</span>
            <span>▣ Joined {joined}</span>
          </div>
        </aside>

        <div>
          <div style={{ fontFamily: P.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.red }}>Profile</div>
          <h2 style={{ margin: '12px 0 0', fontFamily: P.serif, fontSize: 'clamp(54px, 8vw, 112px)', lineHeight: 0.84, fontWeight: 400, letterSpacing: '-0.08em' }}>
            Learning record.
          </h2>
          <div style={{ marginTop: 38, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 }}>
            {[
              ['Active', stats.active],
              ['Finished', stats.done],
              ['Urgent', stats.urgent],
              ['Quiz avg', `${stats.quizAvg}%`],
            ].map(([label, value]) => (
              <div key={label} style={{ borderTop: `1px solid ${P.faint}`, paddingTop: 16 }}>
                <div style={{ fontFamily: P.serif, fontSize: 46, lineHeight: 0.9, color: label === 'Urgent' ? P.red : P.ink }}>{value}</div>
                <div style={{ marginTop: 12, fontFamily: P.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: P.mute }}>{label}</div>
              </div>
            ))}
          </div>

          <section style={{ marginTop: 52, borderTop: `1px solid ${P.faint}`, paddingTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: P.serif, fontSize: 38, fontWeight: 400, letterSpacing: '-0.055em' }}>Courses</h3>
              <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.mute }}>{state.courses.length} total</span>
            </div>
            <div style={{ display: 'grid', gap: 18 }}>
              {state.courses.slice(0, 8).map((course) => (
                <button key={course.id} onClick={() => navigate(course.status === 'completed' ? `/certificate/${course.id}` : `/learn/${course.id}`)} style={{ border: 'none', borderTop: `1px solid ${P.faint}`, background: 'transparent', color: P.ink, cursor: 'pointer', padding: '18px 0 0', textAlign: 'left' }}>
                  <div style={{ fontFamily: P.serif, fontSize: 30, letterSpacing: '-0.055em' }}>{course.subject}</div>
                  <div style={{ marginTop: 7, fontFamily: P.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: P.mute }}>{course.status.replace('-', ' ')} · {Math.round(course.progress * 100)}%</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
