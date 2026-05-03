import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC } from '../theme';
import { AppNav } from '../components/Chrome';
import { useStore } from '../store';
import { useTheme } from '../lib/theme';
import { useTypingPlaceholder } from '../lib/useTypingPlaceholder';
import type { Course, QuizAttempt } from '../types';

type Filter = 'all' | 'not-started' | 'in-progress' | 'done' | 'urgent' | 'archived';
type DashboardMode = 'courses' | 'quizzes';

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

const HERO_PLACEHOLDER_PHRASES = [
  'Learn SQL joins for analytics',
  'Master Python for automation',
  'Understand AWS from scratch',
  'Get fluent in spoken French',
];

function courseHasStarted(course: Course) {
  return course.progress > 0 || Object.values(course.lessonChats ?? {}).some((msgs) => msgs.length > 0);
}

function getCourseFilter(course: Course): Exclude<Filter, 'all' | 'urgent'> {
  if (course.status === 'tombstone' || course.status === 'expired') return 'archived';
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

function countdownParts(deadline: string, now: number) {
  const ms = Math.max(0, new Date(deadline).getTime() - now);
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, expired: ms <= 0, urgent: ms > 0 && ms < 72 * 3600000 };
}

function statusFor(course: Course) {
  if (course.status === 'tombstone') return { label: 'Archived', color: D.mute };
  if (course.status === 'expired') return { label: 'Expired', color: D.amber };
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
  const activeDays = new Set<string>();

  courses.forEach((course) => {
    // studyLog is the canonical signal; backfill from lessonChats for historical sessions
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
  // Only mark missed days from the first day the user ever showed up
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
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: D.mute }}>
          consistency
        </div>
        <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: D.mute }}>
          {streak > 0 ? `${streak}d streak` : 'no streak'} · last 12 weeks
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 5 }}>
        {days.map((day) => {
          const color = !day.isPast
            ? D.softer
            : day.active
              ? D.green
              : 'rgba(255,81,72,0.35)';
          return (
            <div
              key={day.key}
              title={day.key}
              style={{
                aspectRatio: '1 / 1',
                minWidth: 8,
                borderRadius: 3,
                background: color,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function CourseCard({
  course,
  now,
  onOpen,
  onDelete,
  onRecommit,
  onNotes,
}: {
  course: Course;
  now: number;
  onOpen: () => void;
  onDelete: () => void;
  onRecommit: (newDeadline: string) => void;
  onNotes: () => void;
}) {
  const [recommitting, setRecommitting] = useState(false);
  const [newDeadlineDate, setNewDeadlineDate] = useState('');

  const lessons = course.curriculum.modules.flatMap((m) => m.lessons);
  const doneLessons = lessons.filter((l) => l.completed).length;
  const hasNotes = lessons.some((l) => l.notes);
  const currentLesson = course.curriculum.modules[course.currentModule]?.lessons[course.currentLesson];
  const progress = Math.round(course.progress * 100);
  const daysLeft = daysUntil(course.deadline);
  const timeLeft = countdownParts(course.deadline, now);
  const status = statusFor(course);
  const isExpired = course.status === 'expired' || course.status === 'tombstone';
  const clockColor = course.paused ? D.amber : timeLeft.expired || isExpired ? D.amber : timeLeft.urgent ? D.red : D.ink;

  const minDeadline = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  function handleConfirmRecommit() {
    if (!newDeadlineDate) return;
    onRecommit(new Date(newDeadlineDate + 'T23:59:59').toISOString());
    setRecommitting(false);
    setNewDeadlineDate('');
  }

  return (
    <article
      style={{
        minHeight: 260,
        border: `1px solid ${isExpired ? D.amber + '55' : D.faint}`,
        borderRadius: 28,
        padding: 22,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(26,21,16,0.018))',
        boxShadow: '0 24px 80px rgba(26,21,16,0.06)',
        opacity: isExpired ? 0.72 : 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 22,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: status.color }}>
            {status.label}
          </span>
          <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.mute }}>
            {course.curriculum.modules.length} modules
          </span>
        </div>

        <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 'clamp(30px, 3vw, 46px)', lineHeight: 0.92, letterSpacing: '-0.055em', fontWeight: 400, color: D.ink }}>
            {course.subject}
        </h2>
        <p style={{ margin: '14px 0 0', fontFamily: D.sans, fontSize: 14, lineHeight: 1.45, color: D.mute }}>
          {currentLesson?.title ?? 'No lesson selected'}
        </p>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: D.mono, fontSize: 9, color: D.mute, letterSpacing: '0.08em' }}>
          <span>{progress}%</span>
          <span>{doneLessons}/{lessons.length}</span>
        </div>
        <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: D.softer, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: isExpired ? D.amber : course.status === 'active-urgent' ? D.red : D.ink }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.mute }}>Deadline</div>
          <div style={{ marginTop: 5, fontFamily: D.sans, fontSize: 14, color: D.ink }}>{formatDeadline(course.deadline)}</div>
        </div>
        <div>
          <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.mute }}>Clock</div>
          <div style={{ marginTop: 5, fontFamily: D.mono, fontSize: 13, letterSpacing: '0.04em', color: clockColor }}>
            {course.status === 'completed'
              ? 'finished'
              : isExpired
                ? 'expired'
                : course.paused
                  ? 'paused'
                  : timeLeft.expired || daysLeft <= 0
                    ? 'due now'
                    : `${String(timeLeft.days).padStart(2, '0')}d ${String(timeLeft.hours).padStart(2, '0')}h ${String(timeLeft.minutes).padStart(2, '0')}m ${String(timeLeft.seconds).padStart(2, '0')}s`}
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 16 }}>
        {isExpired ? (
          recommitting ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={newDeadlineDate}
                min={minDeadline}
                onChange={(e) => setNewDeadlineDate(e.target.value)}
                style={{ flex: 1, border: `1px solid ${D.faint}`, borderRadius: 8, background: 'transparent', color: D.ink, padding: '8px 10px', fontFamily: D.mono, fontSize: 10, outline: 'none' }}
              />
              <button
                onClick={handleConfirmRecommit}
                disabled={!newDeadlineDate}
                style={{ border: `1px solid ${D.ink}`, borderRadius: 999, background: D.ink, color: D.bg, cursor: newDeadlineDate ? 'pointer' : 'not-allowed', opacity: newDeadlineDate ? 1 : 0.45, padding: '10px 14px', fontFamily: D.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', flexShrink: 0 }}
              >
                Commit →
              </button>
              <button onClick={() => setRecommitting(false)} style={{ border: 'none', background: 'transparent', color: D.mute, cursor: 'pointer', padding: '8px 4px', fontFamily: D.mono, fontSize: 14 }}>×</button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <button
                onClick={() => setRecommitting(true)}
                style={{ border: 'none', background: 'transparent', color: D.amber, cursor: 'pointer', padding: '6px 0', fontFamily: D.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', borderBottom: `1px solid ${D.amber}` }}
              >
                Recommit
              </button>
              <button onClick={onDelete} style={{ border: 'none', background: 'transparent', color: D.red, cursor: 'pointer', padding: '8px 0', fontFamily: D.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                Delete
              </button>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={onOpen} style={{ border: `1px solid ${D.ink}`, borderRadius: 999, background: D.ink, color: D.bg, cursor: 'pointer', padding: '10px 16px', fontFamily: D.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                {course.status === 'completed' ? 'Cert' : courseHasStarted(course) ? 'Resume' : 'Start'}
              </button>
              {hasNotes && (
                <button onClick={onNotes} style={{ border: `1px solid ${D.faint}`, borderRadius: 999, background: 'transparent', color: D.mute, cursor: 'pointer', padding: '10px 14px', fontFamily: D.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                  Notes
                </button>
              )}
            </div>
            <button onClick={onDelete} style={{ border: 'none', background: 'transparent', color: D.red, cursor: 'pointer', padding: '8px 0', fontFamily: D.mono, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
              Delete
            </button>
          </div>
        )}
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
  activeMode,
  onModeChange,
  onEdit,
}: {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string | undefined;
  joined: string;
  stats: { notStarted: number; inProgress: number; done: number; urgent: number; archived: number };
  courseCount: number;
  activeMode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  onEdit: () => void;
}) {
  const profileScore = Math.max(1, Math.round((stats.inProgress * 7 + stats.done * 18 + courseCount * 3) * 10) / 10);

  return (
    <aside style={{
      position: 'sticky',
      top: 28,
      minHeight: 'calc(100vh - 56px)',
      borderRight: `1px solid ${D.faint}`,
      padding: '24px 28px 28px 0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 34,
    }}>
      <div>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, rgba(246,240,231,0.12), rgba(255,81,72,0.28))',
            border: `1px solid ${D.faint}`,
            overflow: 'hidden',
            color: D.ink,
            fontFamily: D.serif,
            fontSize: 44,
            letterSpacing: '-0.06em',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            displayName[0]?.toUpperCase() ?? 'L'
          )}
        </div>

        <h1 style={{ margin: '24px 0 0', fontFamily: D.sans, fontSize: 21, lineHeight: 1, letterSpacing: '-0.045em', color: D.ink }}>
          {displayName}
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 16, height: 16, borderRadius: 999, marginLeft: 7, background: D.red, color: D.bg, fontFamily: D.mono, fontSize: 9, verticalAlign: 2 }}>
            ✓
          </span>
        </h1>
        <div style={{ marginTop: 8, fontFamily: D.sans, fontSize: 14, color: D.mute }}>
          Learnor student · @{handle}
        </div>

        <p style={{ margin: '24px 0 0', maxWidth: 290, fontFamily: D.sans, fontSize: 15, lineHeight: 1.5, color: D.ink, letterSpacing: '-0.01em' }}>
          {bio}
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 22, color: D.mute, fontFamily: D.sans, fontSize: 13 }}>
          <span><b style={{ color: D.ink }}>{courseCount}</b> Courses</span>
          <span><b style={{ color: D.ink }}>{stats.done}</b> Finished</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${D.faint}`, borderRadius: 999, padding: '8px 14px', color: D.ink }}>
            {profileScore}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
          <button
            onClick={onEdit}
            style={{
              border: `1px solid ${D.faint}`,
              borderRadius: 999,
              background: 'transparent',
              color: D.ink,
              padding: '10px 18px',
              fontFamily: D.sans,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Edit profile
          </button>
          <button
            onClick={onEdit}
            style={{
              border: `1px solid ${D.faint}`,
              borderRadius: 999,
              background: 'transparent',
              color: D.ink,
              padding: '10px 18px',
              fontFamily: D.sans,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Settings
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${D.faint}`, marginTop: 28, paddingTop: 22 }}>
          <div style={{ fontFamily: D.sans, fontSize: 15, fontWeight: 800, color: D.ink }}>Dashboard</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            {[
              ['courses', 'Courses'],
              ['quizzes', 'Quizzes'],
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => onModeChange(mode as DashboardMode)}
                style={{
                  border: `1px solid ${activeMode === mode ? D.ink : D.faint}`,
                  borderRadius: 999,
                  padding: '7px 12px',
                  color: activeMode === mode ? D.ink : D.mute,
                  background: activeMode === mode ? D.softer : 'transparent',
                  fontFamily: D.sans,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${D.faint}`, marginTop: 22, paddingTop: 20, display: 'grid', gap: 10, fontFamily: D.sans, fontSize: 13, color: D.mute }}>
          <span>⌖ Hyderabad</span>
          <span>↗ learnor.app</span>
          <span>▣ Joined {joined}</span>
        </div>
      </div>

      <div style={{ border: `1px solid ${D.faint}`, borderRadius: 22, padding: 18 }}>
        <div style={{ fontFamily: D.sans, fontSize: 15, fontWeight: 800, color: D.ink }}>Invite friends</div>
        <p style={{ margin: '10px 0 14px', fontFamily: D.sans, fontSize: 13, lineHeight: 1.45, color: D.mute }}>
          Share Learnor and earn profile score when friends finish courses.
        </p>
        <button
          onClick={() => navigator.clipboard?.writeText(window.location.origin)}
          style={{ width: '100%', border: `1px solid ${D.faint}`, borderRadius: 999, background: 'transparent', color: D.ink, padding: '10px 14px', fontFamily: D.sans, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
        >
          Invite friends
        </button>
      </div>
    </aside>
  );
}

function QuizHub({
  courses,
  attempts,
  onOpenLessonQuiz,
  onOpenAnyQuiz,
}: {
  courses: Course[];
  attempts: QuizAttempt[];
  onOpenLessonQuiz: (course: Course, moduleIndex: number, lessonIndex: number) => void;
  onOpenAnyQuiz: (topic: string) => void;
}) {
  const [topic, setTopic] = useState('');
  const quizTargets = courses
    .filter((course) => course.status !== 'tombstone' && course.status !== 'expired')
    .flatMap((course) => course.curriculum.modules.flatMap((mod, mi) =>
      mod.lessons.map((lesson, li) => ({ course, mod, lesson, mi, li }))
    ))
    .slice(0, 8);

  return (
    <>
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 22, alignItems: 'end', borderBottom: `1px solid ${D.faint}`, paddingBottom: 30 }}>
        <div>
          <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: D.red }}>
            Quiz mode
          </div>
          <h1 style={{ margin: '10px 0 0', fontFamily: D.serif, fontWeight: 400, fontSize: 'clamp(42px, 5.4vw, 78px)', lineHeight: 0.88, letterSpacing: '-0.07em', color: D.ink }}>
            Your quizzes.
          </h1>
          <p style={{ maxWidth: 560, margin: '16px 0 0', color: D.mute, fontFamily: D.sans, fontSize: 14, lineHeight: 1.55 }}>
            Take a quick MCQ check from any course lesson, or generate a fresh quiz on any topic.
          </p>
        </div>

        <div style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 14 }}>
          <div style={{ fontFamily: D.serif, fontSize: 38, lineHeight: 0.9, color: D.ink }}>
            {attempts.length
              ? `${Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score / Math.max(1, attempt.total)), 0) / attempts.length * 100)}%`
              : '0/0'}
          </div>
          <div style={{ marginTop: 10, fontFamily: D.mono, fontSize: 9, color: D.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            avg quiz score
          </div>
        </div>
      </section>

      <section style={{ padding: '28px 0', borderBottom: `1px solid ${D.faint}` }}>
        <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: D.mute, marginBottom: 12 }}>
          any topic
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Quiz me on SQL joins, French verbs, investing..."
            style={{ flex: '1 1 320px', border: 'none', borderBottom: `1px solid ${D.faint}`, background: 'transparent', color: D.ink, outline: 'none', padding: '12px 0', fontFamily: D.sans, fontSize: 15 }}
          />
          <button
            onClick={() => {
              const clean = topic.trim();
              if (clean) onOpenAnyQuiz(clean);
            }}
            style={{ border: 'none', borderBottom: `1px solid ${D.ink}`, background: 'transparent', color: D.ink, cursor: topic.trim() ? 'pointer' : 'not-allowed', opacity: topic.trim() ? 1 : 0.45, padding: '10px 0', fontFamily: D.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}
          >
            Start quiz
          </button>
        </div>
      </section>

      <section style={{ paddingTop: 18 }}>
        {quizTargets.length === 0 ? (
          <div style={{ padding: '44px 0', color: D.mute }}>No course lessons available yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {quizTargets.map(({ course, mod, lesson, mi, li }) => (
              <article key={`${course.id}-${mi}-${li}`} style={{
                minHeight: 200,
                border: `1px solid ${D.faint}`,
                borderRadius: 28,
                padding: 22,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(26,21,16,0.018))',
                boxShadow: '0 24px 80px rgba(26,21,16,0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: D.red }}>Quiz</span>
                    <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.mute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{course.subject}</span>
                  </div>
                  <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 'clamp(22px, 2.4vw, 34px)', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 400, color: D.ink }}>
                    {lesson.title}
                  </h2>
                  <p style={{ margin: '10px 0 0', fontFamily: D.sans, fontSize: 13, lineHeight: 1.4, color: D.mute }}>
                    {mod.title}
                  </p>
                </div>
                <div style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 14 }}>
                  <button
                    onClick={() => onOpenLessonQuiz(course, mi, li)}
                    style={{ border: 'none', background: 'transparent', color: D.ink, cursor: 'pointer', padding: 0, fontFamily: D.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', borderBottom: `1px solid ${D.ink}`, paddingBottom: 2 }}
                  >
                    Take quiz →
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {attempts.length > 0 && (
          <div style={{ marginTop: 42, borderTop: `1px solid ${D.faint}`, paddingTop: 22 }}>
            <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 34, fontWeight: 400, letterSpacing: '-0.055em' }}>Recent scores</h2>
            {attempts.slice(0, 5).map((attempt) => (
              <div key={attempt.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '14px 0', borderTop: `1px solid ${D.faint}`, color: D.mute, fontSize: 13 }}>
                <span>{attempt.topic}{attempt.courseTitle ? ` · ${attempt.courseTitle}` : ''}</span>
                <span style={{ color: D.ink, fontFamily: D.mono }}>{attempt.score}/{attempt.total}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useStore();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<DashboardMode>('courses');
  const [topic, setTopic] = useState('');
  const [heroFocused, setHeroFocused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const typingPlaceholder = useTypingPlaceholder({
    phrases: HERO_PLACEHOLDER_PHRASES,
    enabled: !heroFocused && !topic.trim(),
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const notStarted = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'expired' && c.status !== 'completed' && !courseHasStarted(c)).length;
    const inProgress = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'expired' && c.status !== 'completed' && courseHasStarted(c)).length;
    const done = state.courses.filter((c) => c.status === 'completed').length;
    const urgent = state.courses.filter((c) => c.status === 'active-urgent').length;
    const archived = state.courses.filter((c) => c.status === 'tombstone' || c.status === 'expired').length;
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
      .filter((course) => course.status !== 'tombstone' && course.status !== 'expired')
      .slice()
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 4);
  }, [state.courses]);

  function handleDeleteCourse(course: Course) {
    const confirmed = window.confirm(`Delete "${course.subject}" from your dashboard? This will remove your progress for this course.`);
    if (!confirmed) return;
    dispatch({ type: 'DELETE_COURSE', id: course.id });
  }

  function handleStartCourse(e: React.FormEvent) {
    e.preventDefault();
    const nextTopic = topic.trim();
    if (!nextTopic) return;
    navigate(`/new?topic=${encodeURIComponent(nextTopic)}`);
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: state.courses.length },
    { key: 'not-started', label: 'Not started', count: stats.notStarted },
    { key: 'in-progress', label: 'In progress', count: stats.inProgress },
    { key: 'urgent', label: 'Urgent', count: stats.urgent },
    { key: 'done', label: 'Done', count: stats.done },
    { key: 'archived', label: 'Expired', count: stats.archived },
  ];

  const displayName = state.profile?.displayName?.trim() || (state.username === 'you' ? 'learner' : state.username);
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

      <AppNav />
      <main style={{ position: 'relative', maxWidth: 1520, margin: '0 auto', padding: '28px clamp(20px, 4vw, 58px) 64px' }}>

        <div style={{ minWidth: 0 }}>
        <section
          style={{
            padding: '100px 24px 120px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ fontFamily: D.mono, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: D.red, marginBottom: 32 }}>
              — dashboard
            </div>
            <h1 style={{ margin: '0 0 28px', fontFamily: D.serif, fontWeight: 400, fontSize: 'clamp(42px, 6.8vw, 86px)', lineHeight: 0.94, letterSpacing: '-0.035em', color: D.ink }}>
              Hey {displayName},<br />
              what do you want to{' '}
              <span style={{ fontStyle: 'italic', color: D.red }}>learn today?</span>
            </h1>
            <p style={{ margin: '0 auto 42px', maxWidth: 460, fontFamily: D.serif, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: D.mute }}>
              Start something new, or jump back into what is already on the clock.
            </p>

            <form onSubmit={handleStartCourse}>
              <div
                style={{
                  border: `1.5px solid ${heroFocused ? D.ink : D.faint}`,
                  background: dark ? '#1c1a16' : '#faf7f0',
                  transition: 'border-color 0.15s',
                  boxShadow: heroFocused ? `0 0 0 3px ${dark ? 'rgba(246,240,231,0.08)' : 'rgba(26,21,16,0.06)'}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', padding: '20px 20px 12px' }}>
                  <span style={{ fontFamily: D.mono, fontSize: 13, color: D.red, marginRight: 14, marginTop: 3, flexShrink: 0 }}>$</span>
                  <div style={{ position: 'relative', flex: 1 }}>
                    {typingPlaceholder.show && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          pointerEvents: 'none',
                          fontFamily: D.serif,
                          fontSize: 22,
                          lineHeight: 1.4,
                          color: D.mute,
                          minHeight: 56,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {typingPlaceholder.text}
                        <span style={{ opacity: typingPlaceholder.cursorVisible ? 1 : 0, transition: 'opacity 140ms ease' }}>|</span>
                      </div>
                    )}
                    <textarea
                      aria-label="What do you want to learn?"
                      value={topic}
                      onChange={(event) => {
                        setTopic(event.target.value);
                        event.target.style.height = 'auto';
                        event.target.style.height = `${event.target.scrollHeight}px`;
                      }}
                      onFocus={() => setHeroFocused(true)}
                      onBlur={() => setHeroFocused(false)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleStartCourse(event);
                        }
                      }}
                      placeholder=""
                      rows={2}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        flex: 1,
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        resize: 'none',
                        fontFamily: D.serif,
                        fontSize: 22,
                        lineHeight: 1.4,
                        color: D.ink,
                        minHeight: 56,
                        overflow: 'hidden',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '12px 20px', borderTop: `1px solid ${D.faint}` }}>
                  <button
                    type="submit"
                    disabled={!topic.trim()}
                    style={{
                      background: topic.trim() ? D.ink : D.faint,
                      color: topic.trim() ? D.bg : D.mute,
                      border: 'none',
                      padding: '12px 24px',
                      flexShrink: 0,
                      fontFamily: D.mono,
                      fontSize: 11,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      cursor: topic.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Start course →
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', padding: '28px 0 24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['courses', 'quizzes'] as DashboardMode[]).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                style={{
                  border: `1px solid ${mode === item ? D.ink : D.faint}`,
                  borderRadius: 999,
                  background: mode === item ? D.ink : D.softer,
                  color: mode === item ? D.bg : D.ink,
                  cursor: 'pointer',
                  padding: '11px 16px',
                  fontFamily: D.mono,
                  fontSize: 9.5,
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                }}
              >
                {item === 'courses' ? 'Your courses' : 'Your quizzes'}
              </button>
            ))}
          </div>
        </section>
        {mode === 'quizzes' ? (
          <QuizHub
            courses={state.courses}
            attempts={state.quizAttempts}
            onOpenLessonQuiz={(course, moduleIndex, lessonIndex) => navigate(`/quiz/${course.id}/${moduleIndex}/${lessonIndex}`)}
            onOpenAnyQuiz={(topic) => navigate(`/quiz-any?topic=${encodeURIComponent(topic)}`)}
          />
        ) : (
          <>
        <section style={{ borderBottom: `1px solid ${D.faint}`, paddingBottom: 34 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 34, alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
              <div>
                <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: D.red }}>
                  Courses
                </div>
                <h1 style={{ margin: '10px 0 0', fontFamily: D.serif, fontWeight: 400, fontSize: 'clamp(42px, 5.4vw, 78px)', lineHeight: 0.88, letterSpacing: '-0.07em', color: D.ink }}>
                  Your courses.
                </h1>
                <p style={{ maxWidth: 560, margin: '16px 0 0', color: D.mute, fontFamily: D.sans, fontSize: 14, lineHeight: 1.55 }}>
                  Pick up anything, jump to any lesson, and keep the clock visible without the page feeling like a spreadsheet.
                </p>
              </div>

              <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 }}>
                {[
                  ['Active', stats.inProgress],
                  ['Waiting', stats.notStarted],
                  ['Urgent', stats.urgent],
                  ['Done', stats.done],
                ].map(([label, value]) => (
                  <div key={label} style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 14 }}>
                    <div style={{ fontFamily: D.serif, fontSize: 38, lineHeight: 0.9, color: label === 'Urgent' ? D.red : D.ink }}>{value}</div>
                    <div style={{ marginTop: 10, fontFamily: D.mono, fontSize: 9, color: D.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p style={{ maxWidth: 560, margin: '22px 0 0', color: D.mute, fontFamily: D.sans, fontSize: 15, lineHeight: 1.55 }}>
            {stats.urgent > 0
              ? `${stats.urgent} course${stats.urgent === 1 ? ' needs' : 's need'} attention before the deadline bites.`
              : `${stats.inProgress} active. ${stats.notStarted} waiting. ${stats.done} finished.`}
          </p>
        </section>

        <section style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', padding: '26px 0 8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: 6,
              border: `1px solid ${D.faint}`,
              borderRadius: 999,
              background: D.softer,
            }}
          >
            {filters.map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  style={{
                    border: `1px solid ${active ? D.ink : 'transparent'}`,
                    borderRadius: 999,
                    background: active ? D.ink : 'transparent',
                    color: active ? D.bg : D.mute,
                    padding: '10px 13px',
                    cursor: 'pointer',
                    fontFamily: D.mono,
                    fontSize: 9,
                    letterSpacing: '0.11em',
                    textTransform: 'uppercase',
                    transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
                  }}
                >
                  {item.label}
                  <span style={{ marginLeft: 8, opacity: active ? 0.72 : 0.86 }}>{item.count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: 'min(320px, 54vw)',
                border: `1px solid ${D.faint}`,
                borderRadius: 999,
                background: D.softer,
                padding: '0 14px',
              }}
            >
              <span style={{ color: D.mute, fontFamily: D.mono, fontSize: 12 }}>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search courses"
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: D.ink,
                  outline: 'none',
                  padding: '12px 0',
                  fontFamily: D.sans,
                  fontSize: 13,
                }}
              />
            </label>
            <button
              onClick={() => navigate('/')}
              aria-label="Create a new course"
              title="Create a new course"
              style={{
                width: 44,
                height: 44,
                border: `1px solid ${D.ink}`,
                borderRadius: '50%',
                background: D.ink,
                color: D.bg,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontFamily: D.sans,
                fontSize: 24,
                lineHeight: 1,
              }}
            >
              +
            </button>
          </div>
        </section>

        <section>
          {state.courses.length === 0 ? (
            <div style={{ borderTop: `1px solid ${D.faint}`, padding: '44px 0' }}>
              <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 42, fontWeight: 400, letterSpacing: '-0.06em' }}>No courses yet.</h2>
              <p style={{ margin: '12px 0 0', color: D.mute }}>Start one topic and Learnor will build the path.</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ borderTop: `1px solid ${D.faint}`, padding: '44px 0', color: D.mute }}>Nothing in this bucket.</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 18,
                paddingTop: 18,
              }}
            >
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  now={now}
                  onDelete={() => handleDeleteCourse(course)}
                  onOpen={() => {
                    if (course.status === 'completed') navigate(`/certificate/${course.id}`);
                    else navigate(`/learn/${course.id}`);
                  }}
                  onRecommit={(newDeadline) => dispatch({ type: 'RECOMMIT', id: course.id, newDeadline })}
                  onNotes={() => navigate(`/notes/${course.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {upcoming.length > 0 && (
          <section style={{ marginTop: 56, borderTop: `1px solid ${D.faint}`, paddingTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'baseline', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 34, fontWeight: 400, letterSpacing: '-0.055em' }}>Deadline line</h2>
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
          </>
        )}
          </div>
      </main>
    </div>
  );
}
