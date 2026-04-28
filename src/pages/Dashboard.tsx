import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC, btn } from '../theme';
import { Chrome } from '../components/Chrome';
import { useStore } from '../store';
import type { Course } from '../types';

type Filter = 'all' | 'not-started' | 'in-progress' | 'done' | 'urgent' | 'archived';

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

function ProgressBar({ progress, urgent, tombstone }: { progress: number; urgent?: boolean; tombstone?: boolean }) {
  return (
    <div style={{ height: 7, borderRadius: 999, background: 'rgba(26,21,16,0.08)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.round(Math.min(1, progress) * 100)}%`,
        background: tombstone ? HC.mute : urgent ? HC.red : HC.green,
        transition: 'width 0.2s ease',
      }} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'red' | 'green' }) {
  return (
    <div style={{ background: HC.paper, border: `1px solid ${HC.ruleFaint}`, padding: '18px 20px', minHeight: 88 }}>
      <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute }}>
        {label}
      </div>
      <div style={{ fontFamily: HC.serif, fontSize: 42, lineHeight: 1, letterSpacing: '-0.03em', color: tone === 'red' ? HC.red : tone === 'green' ? HC.green : HC.ink, marginTop: 10 }}>
        {value}
      </div>
    </div>
  );
}

function CourseCard({ course, onOpen, onDelete }: { course: Course; onOpen: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isTomb = course.status === 'tombstone';
  const urgent = course.status === 'active-urgent';
  const completed = course.status === 'completed';
  const started = courseHasStarted(course);
  const doneLessons = course.curriculum.modules.flatMap((m) => m.lessons).filter((l) => l.completed).length;
  const totalLessons = course.curriculum.modules.flatMap((m) => m.lessons).length;
  const currentModule = course.curriculum.modules[course.currentModule];
  const currentLesson = currentModule?.lessons[course.currentLesson];
  const daysLeft = daysUntil(course.deadline);
  const statusLabel = isTomb
    ? 'Archived'
    : completed
      ? 'Done'
      : urgent
        ? 'Urgent'
        : started
          ? 'In progress'
          : 'Not started';

  return (
    <article style={{
      background: HC.paper,
      border: `1.5px solid ${urgent ? HC.red : completed ? HC.green : isTomb ? HC.ruleFaint : HC.ink}`,
      boxShadow: urgent ? `10px 10px 0 ${HC.red}` : completed ? `10px 10px 0 ${HC.green}` : 'none',
      opacity: isTomb ? 0.58 : 1,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{
                fontFamily: HC.mono,
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: urgent || isTomb ? HC.red : completed ? HC.green : HC.mute,
              }}>
                {statusLabel}
              </span>
              <span style={{ fontFamily: HC.mono, fontSize: 10, color: HC.ruleDash }}>·</span>
              <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: HC.mute }}>
                {course.curriculum.modules.length} modules
              </span>
            </div>
            <h3 style={{
              fontFamily: HC.serif,
              fontSize: 34,
              lineHeight: 1,
              letterSpacing: '-0.025em',
              margin: 0,
              color: HC.ink,
              textDecoration: isTomb ? 'line-through' : 'none',
            }}>
              {course.subject}
            </h3>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', color: HC.mute, textTransform: 'uppercase', marginBottom: 5 }}>
              Deadline
            </div>
            <div style={{ fontFamily: HC.serif, fontSize: 26, color: urgent ? HC.red : HC.ink, lineHeight: 1 }}>
              {formatDeadline(course.deadline)}
            </div>
            {!completed && !isTomb && (
              <div style={{ fontFamily: HC.mono, fontSize: 10, color: urgent ? HC.red : HC.mute, marginTop: 5 }}>
                {daysLeft <= 0 ? 'due today' : `${daysLeft}d left`}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <ProgressBar progress={course.progress} urgent={urgent} tombstone={isTomb} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: HC.mono, fontSize: 10, color: HC.mute, letterSpacing: '0.08em' }}>
            <span>{Math.round(course.progress * 100)}%</span>
            <span>{doneLessons}/{totalLessons} lessons</span>
          </div>
        </div>

        <div style={{
          marginTop: 22,
          padding: '14px 16px',
          background: 'rgba(26,21,16,0.035)',
          border: `1px solid ${HC.ruleFaint}`,
          minHeight: 66,
        }}>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute, marginBottom: 6 }}>
            {completed ? 'Completed course' : isTomb ? 'Last known lesson' : started ? 'Current lesson' : 'First lesson'}
          </div>
          <div style={{ fontFamily: HC.serif, fontSize: 18, lineHeight: 1.25, color: HC.ink }}>
            {currentLesson?.title ?? 'No lesson available'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 22 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            disabled={isTomb}
            style={{ ...btn.ghost, padding: '10px 0', fontSize: 10, color: isTomb ? HC.mute : HC.ink, opacity: isTomb ? 0.45 : 1 }}
          >
            {expanded ? 'Hide modules' : 'View modules'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isTomb && (
              <button onClick={onOpen} style={{ ...btn.primary, padding: '11px 16px', fontSize: 10 }}>
                {completed ? 'Certificate →' : started ? 'Resume →' : 'Start →'}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{ ...btn.ghost, padding: '11px 8px', fontSize: 10, color: HC.red }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {expanded && !isTomb && (
        <div style={{ borderTop: `1px solid ${HC.ruleFaint}`, background: HC.bg, padding: '16px 22px 20px' }}>
          {course.curriculum.modules.map((m, mi) => {
            const active = mi === course.currentModule;
            const done = m.quizPassed;
            return (
              <div key={m.title} style={{ padding: '9px 0', borderBottom: mi < course.curriculum.modules.length - 1 ? `1px dashed ${HC.ruleFaint}` : 'none' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: HC.mono, fontSize: 11, color: done ? HC.green : active ? HC.red : HC.mute }}>
                    {done ? '✓' : active ? '▸' : '○'}
                  </span>
                  <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: done ? HC.green : active ? HC.ink : HC.mute }}>
                    {String(mi + 1).padStart(2, '0')} · {m.title}
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: HC.mono, fontSize: 9, color: HC.mute }}>
                    {m.lessons.filter((l) => l.completed).length}/{m.lessons.length}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const stats = useMemo(() => {
    const notStarted = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'completed' && !courseHasStarted(c)).length;
    const inProgress = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'completed' && courseHasStarted(c)).length;
    const done = state.courses.filter((c) => c.status === 'completed').length;
    const urgent = state.courses.filter((c) => c.status === 'active-urgent').length;
    return { notStarted, inProgress, done, urgent, archived: state.courses.filter((c) => c.status === 'tombstone').length };
  }, [state.courses]);

  const filteredCourses = useMemo(() => {
    return state.courses.filter((course) => {
      if (filter === 'all') return true;
      if (filter === 'urgent') return course.status === 'active-urgent';
      return getCourseFilter(course) === filter;
    });
  }, [filter, state.courses]);

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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: HC.bg }}>
      <Chrome label="dashboard" right={state.username} />

      <main style={{ flex: 1, overflow: 'auto', padding: '34px clamp(20px, 4vw, 64px) 56px' }}>
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)',
          gap: 28,
          alignItems: 'stretch',
          marginBottom: 28,
        }}>
          <div style={{ background: HC.paper, border: `1.5px solid ${HC.ink}`, padding: '30px 34px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -50, top: -70, width: 220, height: 220, borderRadius: '50%', background: 'rgba(196,34,27,0.08)' }} />
            <div style={{ fontFamily: HC.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.red, marginBottom: 16 }}>
              Today
            </div>
            <h1 style={{ fontFamily: HC.serif, fontSize: 'clamp(44px, 6vw, 84px)', lineHeight: 0.9, letterSpacing: '-0.045em', margin: 0, color: HC.ink }}>
              Hey {state.username}.
            </h1>
            <p style={{ fontFamily: HC.serif, fontSize: 22, lineHeight: 1.35, color: HC.mute, margin: '20px 0 0', maxWidth: 560 }}>
              {state.courses.length === 0
                ? 'No courses yet. Pick something and start the clock.'
                : stats.urgent > 0
                  ? `${stats.urgent} course${stats.urgent === 1 ? ' needs' : 's need'} attention before the deadline bites.`
                  : `${stats.inProgress} in progress. ${stats.notStarted} waiting to be started.`}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard label="In progress" value={stats.inProgress} />
            <StatCard label="Not started" value={stats.notStarted} />
            <StatCard label="Urgent" value={stats.urgent} tone="red" />
            <StatCard label="Done" value={stats.done} tone="green" />
          </div>
        </section>

        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filters.map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  style={{
                    border: `1px solid ${active ? HC.ink : HC.ruleFaint}`,
                    background: active ? HC.ink : HC.paper,
                    color: active ? HC.bg : HC.ink,
                    padding: '10px 13px',
                    borderRadius: 999,
                    fontFamily: HC.mono,
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {item.label} {item.count}
                </button>
              );
            })}
          </div>
          <button onClick={() => navigate('/')} style={{ ...btn.primary, padding: '12px 20px' }}>
            + New course
          </button>
        </section>

        {state.courses.length === 0 ? (
          <section style={{ border: `1px solid ${HC.ruleFaint}`, background: HC.paper, padding: 44, textAlign: 'center' }}>
            <div style={{ fontFamily: HC.serif, fontSize: 40, letterSpacing: '-0.025em', color: HC.ink }}>No courses yet.</div>
            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20, color: HC.mute, marginTop: 8 }}>Start small. Seven days. One topic.</div>
            <button onClick={() => navigate('/')} style={{ ...btn.primary, marginTop: 24 }}>Start your first →</button>
          </section>
        ) : filteredCourses.length === 0 ? (
          <section style={{ border: `1px dashed ${HC.ruleFaint}`, background: HC.paper, padding: 38, textAlign: 'center', color: HC.mute, fontFamily: HC.serif, fontSize: 22 }}>
            Nothing in this bucket.
          </section>
        ) : (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 22 }}>
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={() => handleDeleteCourse(course)}
                onOpen={() => {
                  if (course.status === 'completed') navigate(`/certificate/${course.id}`);
                  else navigate(`/learn/${course.id}`);
                }}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
