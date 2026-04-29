import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC } from '../theme';
import { useStore } from '../store';
import { useTheme } from '../lib/theme';
import type { Course } from '../types';

type Filter = 'all' | 'not-started' | 'in-progress' | 'done' | 'urgent' | 'archived';

const D = {
  bg: 'var(--dash-bg)',
  ink: 'var(--dash-ink)',
  mute: 'var(--dash-mute)',
  faint: 'var(--dash-faint)',
  softer: 'var(--dash-softer)',
  red: 'var(--dash-red)',
  amber: 'var(--dash-amber)',
  green: 'var(--dash-green)',
  serif: HC.serif,
  sans: HC.sans,
  mono: HC.mono,
};

function courseHasStarted(course: Course) {
  return course.progress > 0 || Object.values(course.lessonChats ?? {}).some((msgs) => msgs.length > 0);
}

function getCourseFilter(course: Course): Exclude<Filter, 'all' | 'urgent'> {
  if (course.status === 'tombstone') return 'archived';
  if (course.status === 'completed') return 'done';
  if (!courseHasStarted(course)) return 'not-started';
  return 'in-progress';
}

function daysUntil(deadline: string) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function formatDeadline(deadline: string) {
  return new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusFor(course: Course) {
  if (course.status === 'tombstone') return { label: 'Archived', color: D.mute };
  if (course.status === 'completed') return { label: 'Done', color: D.green };
  if (course.status === 'active-urgent') return { label: 'Urgent', color: D.red };
  if (courseHasStarted(course)) return { label: 'In progress', color: D.ink };
  return { label: 'Not started', color: D.amber };
}

function makeHandle(username: string) {
  return username.toLowerCase().replace(/[^a-z0-9_]+/g, '').slice(0, 18) || 'learner';
}

function getActivityKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildConsistency(courses: Course[]) {
  const counts = new Map<string, number>();
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 83);

  courses.forEach((course) => {
    [course.createdAt, course.lastStudiedDate].filter(Boolean).forEach((raw) => {
      const date = new Date(raw as string);
      if (!Number.isNaN(date.getTime())) {
        const key = getActivityKey(date);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });

    Object.values(course.lessonChats ?? {}).flat().forEach((msg) => {
      const date = new Date(msg.ts);
      if (!Number.isNaN(date.getTime())) {
        const key = getActivityKey(date);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });
  });

  return Array.from({ length: 84 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = getActivityKey(date);
    return { key, count: counts.get(key) ?? 0 };
  });
}

function ConsistencyGrid({ courses }: { courses: Course[] }) {
  const days = useMemo(() => buildConsistency(courses), [courses]);
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: D.mute }}>
          consistency
        </div>
        <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: D.mute }}>
          {total} study signals · last 12 weeks
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 5 }}>
        {days.map((day) => {
          const level = Math.min(4, day.count);
          const color = level === 0
            ? D.softer
            : level === 1
              ? 'rgba(114,192,137,0.32)'
              : level === 2
                ? 'rgba(114,192,137,0.52)'
                : level === 3
                  ? 'rgba(114,192,137,0.74)'
                  : D.green;
          return (
            <div
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

function CourseRow({
  course,
  onOpen,
  onDelete,
}: {
  course: Course;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const lessons = course.curriculum.modules.flatMap((m) => m.lessons);
  const doneLessons = lessons.filter((l) => l.completed).length;
  const currentLesson = course.curriculum.modules[course.currentModule]?.lessons[course.currentLesson];
  const progress = Math.round(course.progress * 100);
  const daysLeft = daysUntil(course.deadline);
  const status = statusFor(course);
  const archived = course.status === 'tombstone';

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.5fr) 110px 110px 130px 104px',
        gap: 18,
        alignItems: 'center',
        padding: '24px 0',
        borderTop: `1px solid ${D.faint}`,
        opacity: archived ? 0.45 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 34, lineHeight: 0.95, letterSpacing: '-0.045em', fontWeight: 400, color: D.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {course.subject}
          </h2>
          <span style={{ flexShrink: 0, fontFamily: D.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: status.color }}>
            {status.label}
          </span>
        </div>
        <p style={{ margin: '9px 0 0', fontFamily: D.sans, fontSize: 13, lineHeight: 1.45, color: D.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentLesson?.title ?? 'No lesson selected'} · {course.curriculum.modules.length} modules
        </p>
      </div>

      <div>
        <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.mute }}>Deadline</div>
        <div style={{ marginTop: 5, fontFamily: D.sans, fontSize: 13, color: D.ink }}>{formatDeadline(course.deadline)}</div>
      </div>

      <div>
        <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.mute }}>Clock</div>
        <div style={{ marginTop: 5, fontFamily: D.sans, fontSize: 13, color: course.status === 'active-urgent' ? D.red : D.ink }}>
          {course.status === 'completed' ? 'Finished' : daysLeft <= 0 ? 'Due now' : `${daysLeft} days`}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: D.mono, fontSize: 9, color: D.mute, letterSpacing: '0.08em' }}>
          <span>{progress}%</span>
          <span>{doneLessons}/{lessons.length}</span>
        </div>
        <div style={{ marginTop: 8, height: 1, background: D.faint }}>
          <div style={{ width: `${progress}%`, height: 1, background: course.status === 'active-urgent' ? D.red : D.ink }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          onClick={onOpen}
          disabled={archived}
          style={{
            border: 'none',
            borderBottom: `1px solid ${archived ? D.faint : D.ink}`,
            background: 'transparent',
            color: archived ? D.mute : D.ink,
            cursor: archived ? 'not-allowed' : 'pointer',
            padding: '6px 0',
            fontFamily: D.mono,
            fontSize: 9,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
          }}
        >
          {course.status === 'completed' ? 'Cert' : courseHasStarted(course) ? 'Resume' : 'Start'}
        </button>
        <button
          onClick={onDelete}
          style={{
            border: 'none',
            background: 'transparent',
            color: D.red,
            cursor: 'pointer',
            padding: '6px 0',
            fontFamily: D.mono,
            fontSize: 9,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function ProfilePanel({
  displayName,
  handle,
  bio,
  avatarUrl,
  joined,
  stats,
  courseCount,
  onEdit,
}: {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string | undefined;
  joined: string;
  stats: { notStarted: number; inProgress: number; done: number; urgent: number; archived: number };
  courseCount: number;
  onEdit: () => void;
}) {
  const profileScore = Math.max(1, Math.round((stats.inProgress * 7 + stats.done * 18 + courseCount * 3) * 10) / 10);

  return (
    <aside style={{
      position: 'sticky',
      top: 28,
      minHeight: 'calc(100vh - 56px)',
      borderRight: `1px solid ${D.faint}`,
      padding: '34px 34px 34px 0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 34,
    }}>
      <div>
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, rgba(246,240,231,0.12), rgba(255,81,72,0.28))',
            border: `1px solid ${D.faint}`,
            overflow: 'hidden',
            color: D.ink,
            fontFamily: D.serif,
            fontSize: 64,
            letterSpacing: '-0.06em',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            displayName[0]?.toUpperCase() ?? 'L'
          )}
        </div>

        <h1 style={{ margin: '34px 0 0', fontFamily: D.sans, fontSize: 28, lineHeight: 1, letterSpacing: '-0.055em', color: D.ink }}>
          {displayName}
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 20, height: 20, borderRadius: 999, marginLeft: 8, background: D.red, color: D.bg, fontFamily: D.mono, fontSize: 11, verticalAlign: 2 }}>
            ✓
          </span>
        </h1>
        <div style={{ marginTop: 10, fontFamily: D.sans, fontSize: 20, color: D.mute }}>
          Learnor student · @{handle}
        </div>

        <p style={{ margin: '32px 0 0', maxWidth: 330, fontFamily: D.sans, fontSize: 22, lineHeight: 1.38, color: D.ink, letterSpacing: '-0.025em' }}>
          {bio}
        </p>

        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', marginTop: 30, color: D.mute, fontFamily: D.sans, fontSize: 18 }}>
          <span><b style={{ color: D.ink }}>{courseCount}</b> Courses</span>
          <span><b style={{ color: D.ink }}>{stats.done}</b> Finished</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${D.faint}`, borderRadius: 999, padding: '8px 14px', color: D.ink }}>
            ✦ {profileScore}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
          <button
            onClick={onEdit}
            style={{
              border: `1px solid ${D.faint}`,
              borderRadius: 999,
              background: 'transparent',
              color: D.ink,
              padding: '14px 24px',
              fontFamily: D.sans,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Edit profile
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            style={{
              border: `1px solid ${D.faint}`,
              borderRadius: 999,
              background: 'transparent',
              color: D.ink,
              padding: '14px 24px',
              fontFamily: D.sans,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Share
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${D.faint}`, marginTop: 36, paddingTop: 28 }}>
          <div style={{ fontFamily: D.sans, fontSize: 19, fontWeight: 800, color: D.ink }}>Communities</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            {['Build3r', 'Cod3r'].map((item) => (
              <span key={item} style={{ border: `1px solid ${D.faint}`, borderRadius: 999, padding: '8px 14px', color: D.mute, fontFamily: D.sans, fontSize: 14 }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${D.faint}`, marginTop: 28, paddingTop: 26, display: 'grid', gap: 14, fontFamily: D.sans, fontSize: 17, color: D.mute }}>
          <span>⌖ Hyderabad</span>
          <span>↗ learnor.app</span>
          <span>▣ Joined {joined}</span>
        </div>
      </div>

      <div style={{ border: `1px solid ${D.faint}`, borderRadius: 28, padding: 24 }}>
        <div style={{ fontFamily: D.sans, fontSize: 19, fontWeight: 800, color: D.ink }}>Invite friends</div>
        <p style={{ margin: '12px 0 18px', fontFamily: D.sans, fontSize: 16, lineHeight: 1.45, color: D.mute }}>
          Share Learnor and earn profile score when friends finish courses.
        </p>
        <button
          onClick={() => navigator.clipboard?.writeText(window.location.origin)}
          style={{ width: '100%', border: `1px solid ${D.faint}`, borderRadius: 999, background: 'transparent', color: D.ink, padding: '13px 18px', fontFamily: D.sans, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
        >
          Invite friends
        </button>
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useStore();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const stats = useMemo(() => {
    const notStarted = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'completed' && !courseHasStarted(c)).length;
    const inProgress = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'completed' && courseHasStarted(c)).length;
    const done = state.courses.filter((c) => c.status === 'completed').length;
    const urgent = state.courses.filter((c) => c.status === 'active-urgent').length;
    const archived = state.courses.filter((c) => c.status === 'tombstone').length;
    return { notStarted, inProgress, done, urgent, archived };
  }, [state.courses]);

  const filteredCourses = useMemo(() => {
    const search = query.trim().toLowerCase();
    return state.courses.filter((course) => {
      if (filter === 'urgent' && course.status !== 'active-urgent') return false;
      if (filter !== 'all' && filter !== 'urgent' && getCourseFilter(course) !== filter) return false;
      if (!search) return true;
      const lesson = course.curriculum.modules[course.currentModule]?.lessons[course.currentLesson]?.title ?? '';
      return `${course.subject} ${lesson} ${course.curriculum.title}`.toLowerCase().includes(search);
    });
  }, [filter, query, state.courses]);

  const upcoming = useMemo(() => {
    return state.courses
      .filter((course) => course.status !== 'tombstone')
      .slice()
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 4);
  }, [state.courses]);

  function handleDeleteCourse(course: Course) {
    const confirmed = window.confirm(`Delete "${course.subject}" from your dashboard? This will remove your progress for this course.`);
    if (!confirmed) return;
    dispatch({ type: 'DELETE_COURSE', id: course.id });
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: state.courses.length },
    { key: 'not-started', label: 'Not started', count: stats.notStarted },
    { key: 'in-progress', label: 'In progress', count: stats.inProgress },
    { key: 'urgent', label: 'Urgent', count: stats.urgent },
    { key: 'done', label: 'Done', count: stats.done },
    { key: 'archived', label: 'Archived', count: stats.archived },
  ];

  const navItems = [
    ['Home', '/'],
    ['Browse', '/browse'],
    ['Leaderboard', '/leaderboard'],
    ['Settings', '/settings'],
  ] as const;
  const handle = makeHandle(state.username);
  const displayName = state.profile?.displayName?.trim() || (state.username === 'you' ? 'Learner' : state.username);
  const bio = state.profile?.bio?.trim() || 'Learning in public, racing deadlines, and turning unfinished curiosity into finished courses.';
  const avatarUrl = state.profile?.avatarUrl?.trim();
  const joined = state.courses.length
    ? new Date(Math.min(...state.courses.map((course) => new Date(course.createdAt).getTime()).filter(Number.isFinite))).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{
      minHeight: '100vh',
      background: D.bg,
      color: D.ink,
      fontFamily: D.sans,
      '--dash-bg': dark ? '#050505' : '#f4f0e8',
      '--dash-ink': dark ? '#f6f0e7' : '#1a1510',
      '--dash-mute': dark ? 'rgba(246,240,231,0.48)' : 'rgba(26,21,16,0.52)',
      '--dash-faint': dark ? 'rgba(246,240,231,0.10)' : 'rgba(26,21,16,0.12)',
      '--dash-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
      '--dash-red': dark ? '#ff5148' : '#c4221b',
      '--dash-amber': dark ? '#d99b45' : '#b87822',
      '--dash-green': dark ? '#72c089' : '#2d6a3f',
    } as React.CSSProperties}>
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: dark
          ? 'radial-gradient(circle at 72% 8%, rgba(255,81,72,0.10), transparent 30%), radial-gradient(circle at 15% 85%, rgba(246,240,231,0.06), transparent 28%)'
          : 'radial-gradient(circle at 72% 8%, rgba(196,34,27,0.08), transparent 30%), radial-gradient(circle at 15% 85%, rgba(26,21,16,0.045), transparent 28%)',
      }} />

      <main style={{ position: 'relative', maxWidth: 1520, margin: '0 auto', padding: '28px clamp(20px, 4vw, 58px) 64px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, paddingBottom: 42 }}>
          <button onClick={() => navigate('/')} style={{ border: 'none', background: 'transparent', color: D.ink, cursor: 'pointer', padding: 0, fontFamily: D.serif, fontSize: 30, letterSpacing: '-0.055em' }}>
            Learnor
          </button>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {navItems.map(([label, to]) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                style={{ border: 'none', background: 'transparent', color: D.mute, cursor: 'pointer', padding: 0, fontFamily: D.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 'clamp(34px, 5vw, 72px)', alignItems: 'start' }}>
          <ProfilePanel
            displayName={displayName}
            handle={handle}
            bio={bio}
            avatarUrl={avatarUrl}
            joined={joined}
            stats={stats}
            courseCount={state.courses.length}
            onEdit={() => navigate('/settings')}
          />

          <div style={{ minWidth: 0 }}>
        <section style={{ borderBottom: `1px solid ${D.faint}`, paddingBottom: 34 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 420px)', gap: 34, alignItems: 'end' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: D.red }}>
                Dashboard
              </div>
              <h1 style={{ margin: '10px 0 0', fontFamily: D.serif, fontWeight: 400, fontSize: 'clamp(54px, 7vw, 108px)', lineHeight: 0.82, letterSpacing: '-0.075em', color: D.ink }}>
                Your courses.
              </h1>
              <p style={{ maxWidth: 620, margin: '20px 0 0', color: D.mute, fontFamily: D.sans, fontSize: 18, lineHeight: 1.55 }}>
                Pick up anything, jump to any lesson, and keep the clock visible without the page feeling like a spreadsheet.
              </p>
            </div>

            <ConsistencyGrid courses={state.courses} />
          </div>

          <div style={{ marginTop: 34, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 }}>
            {[
              ['Active', stats.inProgress],
              ['Waiting', stats.notStarted],
              ['Urgent', stats.urgent],
              ['Done', stats.done],
            ].map(([label, value]) => (
              <div key={label} style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 14 }}>
                <div style={{ fontFamily: D.serif, fontSize: 52, lineHeight: 0.85, color: label === 'Urgent' ? D.red : D.ink }}>{value}</div>
                <div style={{ marginTop: 10, fontFamily: D.mono, fontSize: 9, color: D.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>

          <p style={{ maxWidth: 560, margin: '22px 0 0', color: D.mute, fontFamily: D.sans, fontSize: 15, lineHeight: 1.55 }}>
            {stats.urgent > 0
              ? `${stats.urgent} course${stats.urgent === 1 ? ' needs' : 's need'} attention before the deadline bites.`
              : `${stats.inProgress} active. ${stats.notStarted} waiting. ${stats.done} finished.`}
          </p>
        </section>

        <section style={{ display: 'flex', justifyContent: 'space-between', gap: 22, alignItems: 'center', padding: '26px 0 8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {filters.map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: active ? D.ink : D.mute,
                    borderBottom: active ? `1px solid ${D.ink}` : '1px solid transparent',
                    padding: '0 0 6px',
                    cursor: 'pointer',
                    fontFamily: D.mono,
                    fontSize: 9.5,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label} {item.count}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses"
              style={{
                width: 210,
                border: 'none',
                borderBottom: `1px solid ${D.faint}`,
                background: 'transparent',
                color: D.ink,
                outline: 'none',
                padding: '8px 0',
                fontFamily: D.sans,
                fontSize: 13,
              }}
            />
            <button
              onClick={() => navigate('/')}
              style={{ border: 'none', borderBottom: `1px solid ${D.ink}`, background: 'transparent', color: D.ink, cursor: 'pointer', padding: '8px 0', fontFamily: D.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}
            >
              New course
            </button>
          </div>
        </section>

        <section>
          {state.courses.length === 0 ? (
            <div style={{ borderTop: `1px solid ${D.faint}`, padding: '44px 0' }}>
              <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 58, fontWeight: 400, letterSpacing: '-0.06em' }}>No courses yet.</h2>
              <p style={{ margin: '12px 0 0', color: D.mute }}>Start one topic and Learnor will build the path.</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ borderTop: `1px solid ${D.faint}`, padding: '44px 0', color: D.mute }}>Nothing in this bucket.</div>
          ) : (
            filteredCourses.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                onDelete={() => handleDeleteCourse(course)}
                onOpen={() => {
                  if (course.status === 'completed') navigate(`/certificate/${course.id}`);
                  else navigate(`/learn/${course.id}`);
                }}
              />
            ))
          )}
        </section>

        {upcoming.length > 0 && (
          <section style={{ marginTop: 56, borderTop: `1px solid ${D.faint}`, paddingTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'baseline', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 44, fontWeight: 400, letterSpacing: '-0.055em' }}>Deadline line</h2>
              <span style={{ fontFamily: D.mono, color: D.mute, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Next on the clock</span>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {upcoming.map((course) => {
                const left = Math.max(0, Math.min(86, daysUntil(course.deadline) * 8));
                return (
                  <button
                    key={course.id}
                    onClick={() => navigate(course.status === 'completed' ? `/certificate/${course.id}` : `/learn/${course.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr) 90px',
                      gap: 20,
                      alignItems: 'center',
                      border: 'none',
                      background: 'transparent',
                      color: D.ink,
                      cursor: 'pointer',
                      padding: '8px 0',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontFamily: D.sans, fontSize: 13, color: D.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.subject}</span>
                    <span style={{ position: 'relative', height: 1, background: D.faint }}>
                      <span style={{ position: 'absolute', left: `${left}%`, top: -4, width: 9, height: 9, borderRadius: 999, background: course.status === 'active-urgent' ? D.red : D.ink }} />
                    </span>
                    <span style={{ fontFamily: D.mono, fontSize: 9, color: D.mute, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'right' }}>
                      {formatDeadline(course.deadline)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}
