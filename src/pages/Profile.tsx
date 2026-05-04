import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AppNav } from '../components/Chrome';
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
  amber: 'var(--profile-amber)',
  serif: HC.serif,
  sans: HC.sans,
  mono: HC.mono,
};

function makeHandle(username: string) {
  return username.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'learner';
}

function getActivityKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildConsistency(courses: Course[]) {
  const activeDays = new Set<string>();
  courses.forEach((course) => {
    (course.studyLog ?? []).forEach((k) => activeDays.add(k));
    Object.values(course.lessonChats ?? {}).flat().forEach((msg) => {
      const d = new Date(msg.ts);
      if (!Number.isNaN(d.getTime())) activeDays.add(getActivityKey(d));
    });
  });
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 83);
  const todayKey = getActivityKey(now);
  const firstActive = [...activeDays].sort()[0] ?? '';
  return Array.from({ length: 84 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = getActivityKey(date);
    const countable = !!firstActive && key >= firstActive && key <= todayKey;
    return { key, active: activeDays.has(key), isPast: countable };
  });
}

function ConsistencyGrid({ courses }: { courses: Course[] }) {
  const days = useMemo(() => buildConsistency(courses), [courses]);
  const streak = useMemo(() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (!days[i].isPast) continue;
      if (days[i].active) s++;
      else break;
    }
    return s;
  }, [days]);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.mute }}>Consistency</span>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.10em', color: P.mute }}>{streak > 0 ? `${streak}d streak` : 'no streak'} · 12 wks</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
        {days.map((day) => (
          <div key={day.key} title={day.key} style={{ aspectRatio: '1 / 1', borderRadius: 4, background: !day.isPast ? P.softer : day.active ? P.green : 'rgba(255,81,72,0.35)' }} />
        ))}
      </div>
    </div>
  );
}

function FinishedCard({ course, onCert }: { course: Course; onCert: () => void }) {
  const lessons = course.curriculum.modules.flatMap((m) => m.lessons);
  const deadline = new Date(course.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const missedCount = course.deadlineHistory?.length ?? 0;
  return (
    <article style={{ border: `1px solid ${P.faint}`, borderRadius: 20, padding: '22px 24px', background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(26,21,16,0.015))', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.green }}>✓ finished</span>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.1em', color: P.mute }}>{deadline}</span>
      </div>
      <h3 style={{ margin: 0, fontFamily: P.serif, fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 0.95, color: P.ink }}>{course.subject}</h3>
      <div style={{ display: 'flex', gap: 18, fontFamily: P.mono, fontSize: 9, color: P.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <span>{course.curriculum.modules.length} modules</span>
        <span>{lessons.length} lessons</span>
        <span>{course.curriculum.estimatedHours}h est.</span>
      </div>
      {missedCount > 0 && (
        <div style={{ fontFamily: P.mono, fontSize: 9, color: P.amber, letterSpacing: '0.1em' }}>
          {missedCount === 1 ? 'finished after 1 missed deadline' : `finished after ${missedCount} missed deadlines`}
        </div>
      )}
      {course.certId && (
        <button onClick={onCert} style={{ alignSelf: 'flex-start', border: `1px solid ${P.green}`, borderRadius: 999, background: 'transparent', color: P.green, cursor: 'pointer', padding: '8px 14px', fontFamily: P.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
          View certificate →
        </button>
      )}
    </article>
  );
}

function ExpiredCard({ course }: { course: Course }) {
  const progress = Math.round(course.progress * 100);
  const deadline = new Date(course.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <article style={{ border: `1px solid ${P.faint}`, borderRadius: 20, padding: '22px 24px', opacity: 0.65, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.amber }}>↺ missed deadline</span>
        <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.1em', color: P.mute }}>{deadline}</span>
      </div>
      <h3 style={{ margin: 0, fontFamily: P.serif, fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 0.95, color: P.ink }}>{course.subject}</h3>
      <div style={{ display: 'flex', gap: 18, fontFamily: P.mono, fontSize: 9, color: P.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <span>{progress}% complete</span>
        <span>{course.curriculum.modules.length} modules</span>
      </div>
      <div style={{ height: 3, background: P.softer, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: P.amber, borderRadius: 999 }} />
      </div>
    </article>
  );
}

interface RemoteProfile {
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  plan: string;
  totalCourses: number;
  finishedCourses: number;
  quizAttempts: number;
  finishedTitles: { subject: string; certId?: string }[];
}

export default function Profile() {
  const { username: slugParam } = useParams<{ username: string }>();
  const { state } = useStore();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const myHandle = makeHandle(state.username);
  const isOwn = !slugParam || slugParam === myHandle;

  // Redirect /profile → /profile/:handle so the URL is always canonical
  useEffect(() => {
    if (!slugParam && myHandle && myHandle !== 'learner') {
      navigate(`/profile/${myHandle}`, { replace: true });
    }
  }, [slugParam, myHandle, navigate]);

  // Remote profile state (used when viewing someone else)
  const [remote, setRemote] = useState<RemoteProfile | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState('');

  useEffect(() => {
    if (isOwn) return;
    setRemoteLoading(true);
    setRemoteError('');
    fetch(`/api/profile/${encodeURIComponent(slugParam!)}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Learner not found.' : 'Could not load profile.');
        return res.json();
      })
      .then(d => { setRemote(d); setRemoteLoading(false); })
      .catch(e => { setRemoteError(e.message); setRemoteLoading(false); });
  }, [slugParam, isOwn]);

  // Own profile data
  const displayName = state.profile?.displayName?.trim() || (state.username === 'you' ? 'Learner' : state.username);
  const bio = state.profile?.bio?.trim() || 'Learning in public, racing deadlines, and turning unfinished curiosity into finished courses.';
  const avatarUrl = state.profile?.avatarUrl?.trim();
  const finished = useMemo(() => state.courses.filter((c) => c.status === 'completed'), [state.courses]);
  const expired = useMemo(() => state.courses.filter((c) => c.status === 'tombstone' || c.status === 'expired'), [state.courses]);
  const leaderboardRank = useMemo(() => {
    const entry = state.leaderboard.find((e) => e.user === myHandle || e.user === displayName);
    return entry?.rank ?? null;
  }, [state.leaderboard, myHandle, displayName]);
  const joined = useMemo(() => {
    const all = state.courses.map((c) => c.createdAt).filter(Boolean).sort();
    if (!all.length) return null;
    return new Date(all[0]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [state.courses]);

  const cssVars = {
    '--profile-bg': dark ? '#050505' : '#f4f0e8',
    '--profile-ink': dark ? '#f6f0e7' : '#1a1510',
    '--profile-mute': dark ? 'rgba(246,240,231,0.52)' : 'rgba(26,21,16,0.52)',
    '--profile-faint': dark ? 'rgba(246,240,231,0.12)' : 'rgba(26,21,16,0.12)',
    '--profile-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
    '--profile-red': dark ? '#ff5148' : '#c4221b',
    '--profile-green': dark ? '#72c089' : '#2d6a3f',
    '--profile-amber': dark ? '#d99b45' : '#b87822',
  } as React.CSSProperties;

  // ── Render: someone else's profile ─────────────────────────────────────────
  if (!isOwn) {
    return (
      <main style={{ minHeight: '100vh', background: P.bg, color: P.ink, fontFamily: P.sans, padding: '140px clamp(20px, 5vw, 72px) 96px', ...cssVars }}>
        <AppNav />
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {remoteLoading && (
            <div style={{ fontFamily: P.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.mute }}>Loading…</div>
          )}
          {remoteError && !remoteLoading && (
            <div>
              <div style={{ fontFamily: P.mono, fontSize: 13, color: P.red, marginBottom: 20 }}>{remoteError}</div>
              <button onClick={() => navigate('/learners')} style={{ fontFamily: P.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.ink, background: 'none', border: `1px solid ${P.faint}`, padding: '11px 20px', cursor: 'pointer', borderRadius: 999 }}>
                ← Browse learners
              </button>
            </div>
          )}
          {remote && !remoteLoading && (
            <>
              {/* Identity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 380px)', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'start', paddingBottom: 40, borderBottom: `1px solid ${P.faint}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: `1px solid ${P.faint}`, background: P.ink, color: P.bg, overflow: 'hidden', display: 'grid', placeItems: 'center', fontFamily: P.serif, fontSize: 36, letterSpacing: '-0.06em', marginBottom: 20 }}>
                    {remote.avatarUrl ? <img src={remote.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : remote.displayName[0]?.toUpperCase() ?? 'L'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ margin: '0 0 10px', fontFamily: P.serif, fontWeight: 400, fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 0.9, letterSpacing: '-0.055em', color: P.ink }}>{remote.displayName}</h1>
                    {remote.plan === 'premium' && (
                      <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.red, border: `1px solid ${P.red}`, padding: '3px 8px', borderRadius: 999, opacity: 0.7 }}>Premium</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                    <span style={{ fontFamily: P.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.mute }}>@{remote.username}</span>
                  </div>
                  {remote.headline && <p style={{ margin: '0 0 10px', fontFamily: P.serif, fontSize: 18, lineHeight: 1.35, color: P.ink }}>{remote.headline}</p>}
                  {remote.bio && <p style={{ margin: '0 0 22px', fontFamily: P.sans, fontSize: 16, lineHeight: 1.6, color: P.mute }}>{remote.bio}</p>}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link to="/learners" style={{ display: 'inline-block', border: `1px solid ${P.faint}`, borderRadius: 999, background: 'transparent', color: P.mute, padding: '11px 20px', fontFamily: P.mono, fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', textDecoration: 'none' }}>
                      ← All learners
                    </Link>
                    <button
                      onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                      style={{ border: `1px solid ${P.faint}`, borderRadius: 999, background: 'transparent', color: copied ? P.green : P.mute, cursor: 'pointer', padding: '11px 20px', fontFamily: P.mono, fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase' }}
                    >
                      {copied ? 'Link copied ✓' : 'Share profile'}
                    </button>
                  </div>
                </div>
                {/* Stats in place of consistency grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderLeft: `1px solid ${P.faint}`, paddingLeft: 'clamp(20px, 3vw, 40px)' }}>
                  {[
                    { label: 'Courses', value: remote.totalCourses, color: P.ink },
                    { label: 'Finished', value: remote.finishedCourses, color: P.green },
                    { label: 'Quiz attempts', value: remote.quizAttempts, color: P.ink },
                  ].map((stat, i, arr) => (
                    <div key={stat.label} style={{ padding: '20px 0', borderBottom: i < arr.length - 1 ? `1px solid ${P.faint}` : 'none' }}>
                      <div style={{ fontFamily: P.serif, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 0.9, letterSpacing: '-0.04em', color: stat.color }}>{stat.value}</div>
                      <div style={{ marginTop: 8, fontFamily: P.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.mute }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Finished courses */}
              <div style={{ marginTop: 52 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `2px solid ${P.ink}`, paddingBottom: 12, marginBottom: 24 }}>
                  <h2 style={{ margin: 0, fontFamily: P.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.ink }}>Finished Courses</h2>
                  <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.12em', color: P.mute }}>{remote.finishedTitles.length}</span>
                </div>
                {remote.finishedTitles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {remote.finishedTitles.map((c, i, arr) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 0', borderBottom: i < arr.length - 1 ? `1px solid ${P.faint}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{ fontFamily: P.mono, fontSize: 9, color: P.green, flexShrink: 0 }}>✓</span>
                          <span style={{ fontFamily: P.serif, fontSize: 20, color: P.ink, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</span>
                        </div>
                        {c.certId && (
                          <button onClick={() => navigate(`/certificate/${c.certId}`)} style={{ flexShrink: 0, border: `1px solid ${P.green}`, borderRadius: 999, background: 'transparent', color: P.green, cursor: 'pointer', padding: '8px 16px', fontFamily: P.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                            View cert →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontFamily: P.sans, fontSize: 14, color: P.mute, margin: '24px 0' }}>No finished courses yet.</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Render: own profile ─────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: P.bg, color: P.ink, fontFamily: P.sans, padding: '140px clamp(20px, 5vw, 72px) 96px', ...cssVars }}>
      <AppNav />
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Identity + grid side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 380px)', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'start', paddingBottom: 40, borderBottom: `1px solid ${P.faint}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <button onClick={() => navigate('/settings')} style={{ width: 80, height: 80, borderRadius: '50%', border: `1px solid ${P.faint}`, background: P.ink, color: P.bg, overflow: 'hidden', display: 'grid', placeItems: 'center', fontFamily: P.serif, fontSize: 36, letterSpacing: '-0.06em', cursor: 'pointer', marginBottom: 20 }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName[0]?.toUpperCase() ?? 'L'}
            </button>
            <h1 style={{ margin: '0 0 10px', fontFamily: P.serif, fontWeight: 400, fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 0.9, letterSpacing: '-0.055em', color: P.ink }}>{displayName}</h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontFamily: P.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.mute }}>@{myHandle}</span>
              {joined && <span style={{ fontFamily: P.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.mute }}>· joined {joined}</span>}
            </div>
            <p style={{ margin: '0 0 22px', fontFamily: P.sans, fontSize: 16, lineHeight: 1.6, color: P.mute }}>{bio}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/settings')} style={{ border: `1px solid ${P.faint}`, borderRadius: 999, background: 'transparent', color: P.ink, cursor: 'pointer', padding: '11px 20px', fontFamily: P.mono, fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                Edit profile
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/profile/${myHandle}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                style={{ border: `1px solid ${P.faint}`, borderRadius: 999, background: 'transparent', color: copied ? P.green : P.mute, cursor: 'pointer', padding: '11px 20px', fontFamily: P.mono, fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase' }}
              >
                {copied ? 'Link copied ✓' : 'Copy link'}
              </button>
            </div>
          </div>
          <ConsistencyGrid courses={state.courses} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${P.faint}`, marginTop: 0 }}>
          {[
            { label: 'Finished', value: finished.length, color: P.green },
            { label: 'Expired', value: expired.length, color: P.amber },
            { label: 'Total courses', value: state.courses.length, color: P.ink },
            ...(leaderboardRank ? [{ label: 'Leaderboard rank', value: `#${leaderboardRank}`, color: P.ink }] : []),
          ].map((stat, i) => (
            <div key={stat.label} style={{ flex: 1, padding: '28px 0', paddingRight: 24, borderRight: i < 2 ? `1px solid ${P.faint}` : 'none', marginRight: i < 2 ? 24 : 0 }}>
              <div style={{ fontFamily: P.serif, fontSize: 'clamp(36px, 5vw, 60px)', lineHeight: 0.9, letterSpacing: '-0.04em', color: stat.color }}>{stat.value}</div>
              <div style={{ marginTop: 10, fontFamily: P.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.mute }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Finished Courses */}
        <div style={{ marginTop: 52 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `2px solid ${P.ink}`, paddingBottom: 12, marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontFamily: P.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.ink }}>Finished Courses</h2>
            <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.12em', color: P.mute }}>{finished.length}</span>
          </div>
          {finished.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {finished.map((course) => (
                <FinishedCard key={course.id} course={course} onCert={() => navigate(`/certificate/${course.id}`)} />
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: P.sans, fontSize: 14, color: P.mute, margin: '24px 0' }}>Nothing yet. Finish a course and it'll show up here.</p>
          )}
        </div>

        {/* Certificates */}
        <div style={{ marginTop: 52 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `2px solid ${P.ink}`, paddingBottom: 12, marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontFamily: P.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.ink }}>Certificates</h2>
            <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.12em', color: P.mute }}>{finished.filter((c) => c.certId).length}</span>
          </div>
          {finished.filter((c) => c.certId).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {finished.filter((c) => c.certId).map((course, i, arr) => (
                <div key={course.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '18px 0', borderBottom: i < arr.length - 1 ? `1px solid ${P.faint}` : 'none' }}>
                  <div>
                    <div style={{ fontFamily: P.serif, fontSize: 20, letterSpacing: '-0.02em', color: P.ink }}>{course.subject}</div>
                    <div style={{ marginTop: 4, fontFamily: P.mono, fontSize: 9, color: P.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {new Date(course.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/certificate/${course.id}`)} style={{ flexShrink: 0, border: `1px solid ${P.green}`, borderRadius: 999, background: 'transparent', color: P.green, cursor: 'pointer', padding: '8px 16px', fontFamily: P.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                    View →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: P.sans, fontSize: 14, color: P.mute, margin: '24px 0' }}>No certificates yet.</p>
          )}
        </div>

        {/* Missed deadlines */}
        {expired.length > 0 && (
          <div style={{ marginTop: 52 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `2px solid ${P.ink}`, paddingBottom: 12, marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontFamily: P.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: P.amber }}>Missed Deadlines</h2>
              <span style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: '0.12em', color: P.mute }}>{expired.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {expired.map((course) => (
                <ExpiredCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
