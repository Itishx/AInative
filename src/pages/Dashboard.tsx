import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC } from '../theme';
import { useStore } from '../store';
import type { Course } from '../types';

type Filter = 'all' | 'not-started' | 'in-progress' | 'done' | 'urgent' | 'archived';
type Palette = typeof HC;

const HCDashboardDark: Palette = {
  ...HC,
  bg: '#141210',
  paper: '#1c1a16',
  ink: '#f1ecdf',
  mute: '#8a8373',
  ruleFaint: 'rgba(241,236,223,0.12)',
  red: '#e8514a',
  redDim: '#c43d36',
  amber: '#e3a447',
  green: '#6aae7f',
};

function readDarkMode() {
  try { return localStorage.getItem('ain_dark') === 'true'; } catch { return false; }
}

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

function initials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'L';
}

function pillTone(course: Course, t: Palette) {
  if (course.status === 'tombstone') return { label: 'Archived', color: t.mute, bg: 'transparent' };
  if (course.status === 'completed') return { label: 'Done', color: t.green, bg: 'rgba(45,106,63,0.10)' };
  if (course.status === 'active-urgent') return { label: 'Urgent', color: t.red, bg: 'rgba(196,34,27,0.10)' };
  if (courseHasStarted(course)) return { label: 'Active', color: t.green, bg: 'rgba(45,106,63,0.10)' };
  return { label: 'Planned', color: t.amber, bg: 'rgba(216,148,48,0.12)' };
}

function CourseCard({
  course,
  t,
  dark,
  onOpen,
  onDelete,
}: {
  course: Course;
  t: Palette;
  dark: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const doneLessons = course.curriculum.modules.flatMap((m) => m.lessons).filter((l) => l.completed).length;
  const totalLessons = course.curriculum.modules.flatMap((m) => m.lessons).length;
  const currentModule = course.curriculum.modules[course.currentModule];
  const currentLesson = currentModule?.lessons[course.currentLesson];
  const status = pillTone(course, t);
  const progress = Math.round(course.progress * 100);
  const daysLeft = daysUntil(course.deadline);
  const isArchived = course.status === 'tombstone';

  return (
    <article
      style={{
        background: t.paper,
        border: `1px solid ${t.ruleFaint}`,
        borderRadius: 18,
        padding: 14,
        boxShadow: dark ? '0 18px 42px rgba(0,0,0,0.18)' : '0 18px 42px rgba(26,21,16,0.06)',
        opacity: isArchived ? 0.58 : 1,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              background: dark ? 'rgba(241,236,223,0.08)' : 'rgba(26,21,16,0.06)',
              border: `1px solid ${t.ruleFaint}`,
              fontFamily: t.mono,
              fontSize: 11,
              color: t.ink,
            }}
          >
            {initials(course.subject)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 700, color: t.ink, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {course.subject}
            </div>
            <div style={{ marginTop: 5, fontFamily: t.sans, fontSize: 12, color: t.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentLesson?.title ?? 'No lesson selected'}
            </div>
          </div>
        </div>
        <span
          style={{
            flexShrink: 0,
            borderRadius: 999,
            padding: '5px 8px',
            background: status.bg,
            color: status.color,
            fontFamily: t.mono,
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {status.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          ['Due', formatDeadline(course.deadline)],
          ['Left', course.status === 'completed' ? 'Done' : daysLeft <= 0 ? 'Today' : `${daysLeft}d`],
          ['Lessons', `${doneLessons}/${totalLessons}`],
        ].map(([label, value]) => (
          <div key={label} style={{ border: `1px solid ${t.ruleFaint}`, borderRadius: 13, padding: '10px 9px', background: dark ? 'rgba(241,236,223,0.03)' : 'rgba(26,21,16,0.025)' }}>
            <div style={{ fontFamily: t.mono, fontSize: 8.5, color: t.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ marginTop: 5, fontFamily: t.sans, fontSize: 13, fontWeight: 700, color: t.ink }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: 7, borderRadius: 999, background: t.ruleFaint, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: course.status === 'active-urgent' ? t.red : course.status === 'completed' ? t.green : t.ink,
              borderRadius: 999,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 }}>
          <button
            onClick={onOpen}
            disabled={isArchived}
            style={{
              border: 'none',
              borderRadius: 999,
              background: isArchived ? t.ruleFaint : t.ink,
              color: t.bg,
              cursor: isArchived ? 'not-allowed' : 'pointer',
              padding: '9px 13px',
              fontFamily: t.mono,
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: isArchived ? 0.45 : 1,
            }}
          >
            {course.status === 'completed' ? 'Certificate' : courseHasStarted(course) ? 'Resume' : 'Start'}
          </button>
          <button
            onClick={onDelete}
            style={{
              border: 'none',
              background: 'transparent',
              color: t.red,
              cursor: 'pointer',
              fontFamily: t.mono,
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: 8,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(readDarkMode);
  const t = dark ? HCDashboardDark : HC;

  useEffect(() => {
    const syncDark = () => setDark(readDarkMode());
    window.addEventListener('storage', syncDark);
    window.addEventListener('focus', syncDark);
    const interval = window.setInterval(syncDark, 300);
    return () => {
      window.removeEventListener('storage', syncDark);
      window.removeEventListener('focus', syncDark);
      window.clearInterval(interval);
    };
  }, []);

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
      .slice(0, 5);
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

  const sidebarGroups = [
    { title: 'Essentials', items: ['Home', 'Tasks', 'Calendar', 'Courses', 'Notes'] },
    { title: 'Projects', items: state.courses.slice(0, 5).map((course) => course.subject) },
    { title: 'System', items: ['Settings', 'Leaderboard'] },
  ];

  return (
    <div style={{ minHeight: '100vh', background: t.bg, padding: 22, color: t.ink, fontFamily: t.sans }}>
      <div
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          minHeight: 'calc(100vh - 44px)',
          display: 'grid',
          gridTemplateColumns: '240px minmax(0, 1fr)',
          gap: 18,
        }}
      >
        <aside
          style={{
            border: `1px solid ${t.ruleFaint}`,
            borderRadius: 22,
            background: dark ? 'rgba(28,26,22,0.72)' : 'rgba(250,247,240,0.72)',
            boxShadow: dark ? '0 24px 70px rgba(0,0,0,0.20)' : '0 24px 70px rgba(26,21,16,0.07)',
            padding: 14,
            position: 'sticky',
            top: 22,
            height: 'calc(100vh - 44px)',
            overflow: 'auto',
          }}
        >
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              border: `1px solid ${t.ruleFaint}`,
              background: t.paper,
              borderRadius: 15,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              color: t.ink,
              textAlign: 'left',
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: 10, background: t.ink, color: t.bg, display: 'grid', placeItems: 'center', fontFamily: t.serif, fontSize: 18 }}>L</span>
            <span>
              <span style={{ display: 'block', fontFamily: t.sans, fontWeight: 800, fontSize: 13 }}>Learnor</span>
              <span style={{ display: 'block', fontFamily: t.mono, color: t.mute, fontSize: 9, marginTop: 2 }}>Course workspace</span>
            </span>
          </button>

          <div style={{ marginTop: 14, position: 'relative' }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: `1px solid ${t.ruleFaint}`,
                borderRadius: 13,
                background: t.paper,
                color: t.ink,
                padding: '10px 12px',
                outline: 'none',
                fontFamily: t.sans,
                fontSize: 12,
              }}
            />
          </div>

          {sidebarGroups.map((group) => (
            <div key={group.title} style={{ marginTop: 22 }}>
              <div style={{ fontFamily: t.mono, fontSize: 9, color: t.mute, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 9px 4px' }}>
                {group.title}
              </div>
              <div style={{ display: 'grid', gap: 3 }}>
                {group.items.length === 0 ? (
                  <div style={{ color: t.mute, fontSize: 12, padding: '8px 9px' }}>No courses yet</div>
                ) : group.items.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      if (item === 'Home') navigate('/');
                      if (item === 'Leaderboard') navigate('/leaderboard');
                      if (item === 'Settings') navigate('/settings');
                    }}
                    style={{
                      border: 'none',
                      borderRadius: 11,
                      background: item === 'Courses' ? t.paper : 'transparent',
                      color: item === 'Courses' ? t.ink : t.mute,
                      padding: '8px 9px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: t.sans,
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main
          style={{
            border: `1px solid ${t.ruleFaint}`,
            borderRadius: 22,
            background: dark ? 'rgba(28,26,22,0.78)' : 'rgba(250,247,240,0.82)',
            boxShadow: dark ? '0 24px 70px rgba(0,0,0,0.22)' : '0 24px 70px rgba(26,21,16,0.08)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '22px 24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: t.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.mute }}>Dashboard</div>
                <h1 style={{ margin: '6px 0 0', fontFamily: t.sans, fontSize: 34, letterSpacing: '-0.045em', lineHeight: 1, color: t.ink }}>
                  Hey {state.username}
                </h1>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/browse')}
                  style={{ border: `1px solid ${t.ruleFaint}`, background: t.paper, color: t.ink, borderRadius: 10, padding: '10px 13px', fontFamily: t.sans, fontSize: 12, cursor: 'pointer' }}
                >
                  Browse
                </button>
                <button
                  onClick={() => navigate('/')}
                  style={{ border: 'none', background: t.ink, color: t.bg, borderRadius: 10, padding: '10px 13px', fontFamily: t.sans, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  New course
                </button>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 8, borderBottom: `1px solid ${t.ruleFaint}`, paddingBottom: 10, overflowX: 'auto' }}>
              {filters.map((item) => {
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setFilter(item.key)}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      background: active ? t.ink : 'transparent',
                      color: active ? t.bg : t.mute,
                      padding: '8px 11px',
                      fontFamily: t.sans,
                      fontSize: 12,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label} {item.count}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 14 }}>
              {state.courses.length === 0 ? (
                <section style={{ gridColumn: '1 / -1', border: `1px dashed ${t.ruleFaint}`, borderRadius: 18, padding: 38, textAlign: 'center', background: t.paper }}>
                  <div style={{ fontFamily: t.sans, fontSize: 24, fontWeight: 800, color: t.ink }}>No courses yet.</div>
                  <div style={{ marginTop: 6, color: t.mute, fontSize: 14 }}>Start one topic and Learnor will build the path.</div>
                  <button onClick={() => navigate('/')} style={{ marginTop: 18, border: 'none', borderRadius: 999, background: t.ink, color: t.bg, padding: '11px 16px', fontFamily: t.sans, fontWeight: 800, cursor: 'pointer' }}>
                    Start your first course
                  </button>
                </section>
              ) : filteredCourses.length === 0 ? (
                <section style={{ gridColumn: '1 / -1', border: `1px dashed ${t.ruleFaint}`, borderRadius: 18, padding: 34, textAlign: 'center', background: t.paper, color: t.mute }}>
                  Nothing in this bucket.
                </section>
              ) : (
                filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    t={t}
                    dark={dark}
                    onDelete={() => handleDeleteCourse(course)}
                    onOpen={() => {
                      if (course.status === 'completed') navigate(`/certificate/${course.id}`);
                      else navigate(`/learn/${course.id}`);
                    }}
                  />
                ))
              )}
            </div>

            <section style={{ marginTop: 18, border: `1px solid ${t.ruleFaint}`, borderRadius: 18, background: t.paper, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 800, color: t.ink }}>Deadline board</div>
                  <div style={{ marginTop: 3, fontFamily: t.mono, fontSize: 9, color: t.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Next courses on the clock
                  </div>
                </div>
                <div style={{ fontFamily: t.sans, color: t.mute, fontSize: 12 }}>Day / Week / Month</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 14 }}>
                {(upcoming.length ? upcoming : state.courses.slice(0, 1)).map((course, index) => {
                  const left = Math.max(0, Math.min(78, daysUntil(course.deadline) * 8));
                  const width = Math.max(16, Math.round(course.progress * 64) + 18);
                  return (
                    <div key={course.id} style={{ display: 'contents' }}>
                      <div style={{ fontFamily: t.sans, fontSize: 12, color: t.mute, padding: '8px 0' }}>
                        {course.subject}
                      </div>
                      <div style={{ position: 'relative', height: 38, borderLeft: `1px solid ${t.ruleFaint}`, background: `repeating-linear-gradient(90deg, transparent 0, transparent 79px, ${t.ruleFaint} 80px)` }}>
                        <button
                          onClick={() => navigate(course.status === 'completed' ? `/certificate/${course.id}` : `/learn/${course.id}`)}
                          style={{
                            position: 'absolute',
                            left: `${left}%`,
                            top: 6,
                            width: `${width}%`,
                            minWidth: 112,
                            maxWidth: 280,
                            height: 26,
                            border: 'none',
                            borderRadius: 999,
                            background: index % 3 === 0 ? t.ink : index % 3 === 1 ? t.green : t.amber,
                            color: index % 3 === 0 ? t.bg : '#141210',
                            fontFamily: t.sans,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            padding: '0 12px',
                          }}
                        >
                          {formatDeadline(course.deadline)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
