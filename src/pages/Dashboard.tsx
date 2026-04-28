import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC } from '../theme';
import { useStore } from '../store';
import type { Course } from '../types';

type Filter = 'all' | 'not-started' | 'in-progress' | 'done' | 'urgent' | 'archived';

const D = {
  bg: '#050505',
  ink: '#f6f0e7',
  mute: 'rgba(246,240,231,0.48)',
  faint: 'rgba(246,240,231,0.10)',
  softer: 'rgba(246,240,231,0.05)',
  red: '#ff5148',
  amber: '#d99b45',
  green: '#72c089',
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

export default function Dashboard() {
  const { state, dispatch } = useStore();
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

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.ink, fontFamily: D.sans }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 72% 8%, rgba(255,81,72,0.10), transparent 30%), radial-gradient(circle at 15% 85%, rgba(246,240,231,0.06), transparent 28%)',
      }} />

      <main style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '28px clamp(20px, 4vw, 58px) 64px' }}>
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

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 52, alignItems: 'end', borderBottom: `1px solid ${D.faint}`, paddingBottom: 34 }}>
          <div>
            <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: D.red }}>
              Dashboard
            </div>
            <h1 style={{ margin: '14px 0 0', fontFamily: D.serif, fontWeight: 400, fontSize: 'clamp(74px, 10vw, 148px)', lineHeight: 0.78, letterSpacing: '-0.075em', color: D.ink }}>
              Hey<br />{state.username}.
            </h1>
          </div>

          <div style={{ display: 'grid', gap: 22 }}>
            <p style={{ margin: 0, color: D.mute, fontFamily: D.sans, fontSize: 16, lineHeight: 1.55 }}>
              {stats.urgent > 0
                ? `${stats.urgent} course${stats.urgent === 1 ? ' needs' : 's need'} attention before the deadline bites.`
                : `${stats.inProgress} active. ${stats.notStarted} waiting. ${stats.done} finished.`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                ['Active', stats.inProgress],
                ['Waiting', stats.notStarted],
                ['Urgent', stats.urgent],
                ['Done', stats.done],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontFamily: D.serif, fontSize: 42, lineHeight: 0.85, color: label === 'Urgent' ? D.red : D.ink }}>{value}</div>
                  <div style={{ marginTop: 8, fontFamily: D.mono, fontSize: 8.5, color: D.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
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
      </main>
    </div>
  );
}
