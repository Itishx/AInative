import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTheme } from '../lib/theme';
import { HC } from '../theme';
import type { Course } from '../types';

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

function ConsistencyGrid({ courses }: { courses: Course[] }) {
  const today = new Date();
  const days = Array.from({ length: 84 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (83 - index));
    const key = date.toISOString().slice(0, 10);
    const count = courses.reduce((sum, course) => sum + (course.lastStudiedDate === key ? 1 : 0), 0);
    return { key, count };
  });

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.mute }}>Consistency</span>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.mute }}>
          {days.reduce((sum, day) => sum + day.count, 0)} study signals · last 12 weeks
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, minmax(8px, 1fr))', gap: 6 }}>
        {days.map((day) => {
          const level = Math.min(3, day.count);
          const color = level === 0
            ? P.softer
            : level === 1
              ? 'rgba(45,106,63,0.45)'
              : level === 2
                ? 'rgba(45,106,63,0.72)'
                : P.green;
          return (
            <span
              key={day.key}
              title={`${day.key}: ${day.count} activity`}
              style={{
                aspectRatio: '1 / 1',
                minWidth: 8,
                borderRadius: 3,
                background: color,
                boxShadow: level > 0 ? `0 0 18px ${color}` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Profile() {
  const { state } = useStore();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const displayName = state.profile?.displayName?.trim() || (state.username === 'you' ? 'Learner' : state.username);
  const handle = makeHandle(state.username);
  const headline = state.profile?.headline?.trim() || `Welcome back, ${displayName}.`;
  const bio = state.profile?.bio?.trim() || 'Learning in public, racing deadlines, and turning unfinished curiosity into finished courses.';
  const avatarUrl = state.profile?.avatarUrl?.trim();

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

      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 440px)',
          gap: 'clamp(28px, 5vw, 70px)',
          alignItems: 'start',
          border: `1px solid ${P.faint}`,
          borderRadius: 34,
          padding: 'clamp(24px, 4vw, 46px)',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(26,21,16,0.018))',
          boxShadow: '0 30px 100px rgba(26,21,16,0.07)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 11px', border: `1px solid ${P.faint}`, borderRadius: 999, background: P.softer, marginBottom: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.red }} />
            <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.mute }}>
              @{handle}
            </span>
          </div>
          <h1 style={{ margin: 0, fontFamily: P.serif, fontWeight: 400, fontSize: 'clamp(52px, 8vw, 112px)', lineHeight: 0.82, letterSpacing: '-0.08em', color: P.ink }}>
            {headline}
          </h1>
          <p style={{ maxWidth: 650, margin: '22px 0 0', color: P.mute, fontFamily: P.sans, fontSize: 16, lineHeight: 1.6 }}>
            {bio}
          </p>
          <div style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/settings')}
              style={{ border: `1px solid ${P.ink}`, borderRadius: 999, background: P.ink, color: P.bg, cursor: 'pointer', padding: '11px 16px', fontFamily: P.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}
            >
              Edit profile
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ border: `1px solid ${P.faint}`, borderRadius: 999, background: P.softer, color: P.mute, cursor: 'pointer', padding: '11px 16px', fontFamily: P.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}
            >
              Dashboard
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/settings')}
              style={{ width: 58, height: 58, borderRadius: '50%', border: `1px solid ${P.faint}`, background: P.ink, color: P.bg, overflow: 'hidden', display: 'grid', placeItems: 'center', fontFamily: P.mono, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
              aria-label="Edit profile"
            >
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.slice(0, 2).toUpperCase()}
            </button>
            <div style={{ textAlign: 'right', minWidth: 0 }}>
              <div style={{ fontFamily: P.sans, fontSize: 15, fontWeight: 800, color: P.ink }}>{displayName}</div>
              <div style={{ marginTop: 4, fontFamily: P.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.mute }}>@{handle}</div>
            </div>
          </div>
          <ConsistencyGrid courses={state.courses} />
        </div>
      </section>
    </main>
  );
}
