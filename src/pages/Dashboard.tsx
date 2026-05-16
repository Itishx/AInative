import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';
import { HC } from '../theme';
import { AppNav } from '../components/Chrome';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useTypingPlaceholder } from '../lib/useTypingPlaceholder';
import { buildBrowseRecommendations, buildGenericLearningSuggestions } from '../lib/onboarding';
import type { Course, QuizAttempt, UsageSnapshot } from '../types';

type Filter = 'all' | 'suggested' | 'not-started' | 'in-progress' | 'done' | 'urgent' | 'archived';
type DashboardMode = 'courses' | 'quizzes';
type StudyTab = 'sessions' | 'quizzes';

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

function getCourseFilter(course: Course): Exclude<Filter, 'all' | 'urgent' | 'suggested'> {
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

function formatTimeUntil(target: string, now = Date.now()) {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${Math.max(1, totalMinutes)}m`;
}

function seededShuffle<T>(items: T[], seed: number) {
  const shuffled = [...items];
  let cursor = Math.max(1, seed + 1);
  const random = () => {
    const x = Math.sin(cursor++) * 10000;
    return x - Math.floor(x);
  };

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function studyPreview(notes: string) {
  return notes
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 132);
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

function FilterTabs({ filters, filter, setFilter }: {
  filters: { key: Filter; label: string; count: number }[];
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const idx = filters.findIndex((f) => f.key === filter);
    const btn = btnRefs.current[idx];
    const container = containerRef.current;
    if (!btn || !container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPillStyle({ left: bRect.left - cRect.left, width: bRect.width });
    setReady(true);
  }, [filter, filters]);

  return (
    <section style={{ display: 'flex', justifyContent: 'center', padding: '26px 0 8px' }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'flex',
          gap: 0,
          alignItems: 'center',
          padding: 6,
          border: `1px solid ${D.faint}`,
          borderRadius: 999,
          background: D.softer,
        }}
      >
        {/* sliding pill */}
        {pillStyle && (
          <div style={{
            position: 'absolute',
            top: 6,
            bottom: 6,
            left: pillStyle.left,
            width: pillStyle.width,
            borderRadius: 999,
            background: D.ink,
            transition: ready ? 'left 220ms cubic-bezier(0.4,0,0.2,1), width 220ms cubic-bezier(0.4,0,0.2,1)' : 'none',
            pointerEvents: 'none',
          }} />
        )}
        {filters.map((item, idx) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              ref={(el) => { btnRefs.current[idx] = el; }}
              onClick={() => setFilter(item.key)}
              style={{
                position: 'relative',
                zIndex: 1,
                border: 'none',
                borderRadius: 999,
                background: 'transparent',
                color: active ? D.bg : D.mute,
                padding: '10px 13px',
                cursor: 'pointer',
                fontFamily: D.mono,
                fontSize: 9,
                letterSpacing: '0.11em',
                textTransform: 'uppercase',
                transition: 'color 180ms ease',
              }}
            >
              {item.label}
              <span style={{ marginLeft: 8, opacity: active ? 0.72 : 0.86 }}>{item.count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { state, dispatch, remoteLoaded } = useStore();
  const { user } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [suggestedRefreshTick, setSuggestedRefreshTick] = useState(0);

  const [appMode, setAppMode] = useState<'learn' | 'study'>('learn');
  const [studyTab, setStudyTab] = useState<StudyTab>('sessions');
  const [topic, setTopic] = useState('');
  const [studyFile, setStudyFile] = useState<File | null>(null);
  const [studyUploading, setStudyUploading] = useState(false);
  const [studyUsage, setStudyUsage] = useState<UsageSnapshot['study'] | null>(null);
  const [studyGateError, setStudyGateError] = useState('');
  const [checkingStudyAccess, setCheckingStudyAccess] = useState(false);
  const [heroFocused, setHeroFocused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const typingPlaceholder = useTypingPlaceholder({
    phrases: appMode === 'study'
      ? ['study for my economics exam', 'revise system design concepts', 'review my uploaded lecture notes', 'prep for product management interview']
      : HERO_PLACEHOLDER_PHRASES,
    enabled: !heroFocused && !topic.trim(),
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetch(apiUrl(`/api/usage?userId=${user.id}`))
      .then((res) => res.json())
      .then((data: UsageSnapshot) => setStudyUsage(data.study))
      .catch(() => {});
  }, [user?.id]);

  const stats = useMemo(() => {
    const notStarted = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'expired' && c.status !== 'completed' && !courseHasStarted(c)).length;
    const inProgress = state.courses.filter((c) => c.status !== 'tombstone' && c.status !== 'expired' && c.status !== 'completed' && courseHasStarted(c)).length;
    const done = state.courses.filter((c) => c.status === 'completed').length;
    const urgent = state.courses.filter((c) => c.status === 'active-urgent').length;
    const archived = state.courses.filter((c) => c.status === 'tombstone' || c.status === 'expired').length;
    return { notStarted, inProgress, done, urgent, archived };
  }, [state.courses]);

  const suggestionPool = useMemo(() => {
    const primary = remoteLoaded && state.profile?.onboardingCompleted
      ? buildBrowseRecommendations(state.profile)
      : [];
    const fallback = buildGenericLearningSuggestions();
    const seen = new Set<string>();

    return [...primary, ...fallback].filter((item) => {
      if (seen.has(item.title)) return false;
      seen.add(item.title);
      return true;
    });
  }, [remoteLoaded, state.profile]);

  const suggestedCards = useMemo(() => {
    return seededShuffle(suggestionPool, suggestedRefreshTick).slice(0, Math.min(8, suggestionPool.length));
  }, [suggestedRefreshTick, suggestionPool]);

  const filteredCourses = useMemo(() => {
    if (filter === 'suggested') return [];
    return state.courses.filter((course) => {
      if (filter === 'urgent' && course.status !== 'active-urgent') return false;
      if (filter !== 'all' && filter !== 'urgent' && getCourseFilter(course) !== filter) return false;
      return true;
    });
  }, [filter, state.courses]);

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

  async function handleStartStudy(e: React.FormEvent) {
    e.preventDefault();
    setStudyGateError('');
    const nextTopic = topic.trim();
    if (!nextTopic && !studyFile) return;
    if (user?.id && state.profile?.plan !== 'premium') {
      setCheckingStudyAccess(true);
      try {
        const res = await fetch(apiUrl(`/api/usage?userId=${user.id}`));
        const data: UsageSnapshot = await res.json();
        setStudyUsage(data.study);
        if (!data.isPremium && !data.study.available) {
          const unlockText = data.study.retryAt ? `Next free session in ${formatTimeUntil(data.study.retryAt)}.` : 'Try again later.';
          setStudyGateError(`Free study mode is limited to 1 session every ${data.study.windowHours} hours. ${unlockText}`);
          return;
        }
      } catch {
        // If the preflight check fails, let the server enforce the limit.
      } finally {
        setCheckingStudyAccess(false);
      }
    }
    if (!studyFile) sessionStorage.removeItem('study_notes_context');
    if (studyFile) {
      setStudyUploading(true);
      try {
        const fd = new FormData();
        fd.append('files', studyFile);
        const res = await fetch(apiUrl('/api/upload-materials'), { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || data.error) {
          setStudyGateError(data.error || 'Could not upload the file. Please try again.');
          setStudyUploading(false);
          return;
        }
        if (!data.materialsContext?.trim()) {
          setStudyGateError('Could not read text from this PDF. Try a different file or type your topic instead.');
          setStudyUploading(false);
          return;
        }
        sessionStorage.setItem('study_notes_context', data.materialsContext);
      } catch {
        setStudyGateError('Upload failed — check your connection and try again.');
        setStudyUploading(false);
        return;
      }
      setStudyUploading(false);
    }
    navigate(`/study?topic=${encodeURIComponent(nextTopic || studyFile!.name.replace(/\.pdf$/i, ''))}`);
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: state.courses.length },
    { key: 'suggested', label: 'Suggested', count: suggestedCards.length },
    { key: 'not-started', label: 'Not started', count: stats.notStarted },
    { key: 'in-progress', label: 'In progress', count: stats.inProgress },
    { key: 'urgent', label: 'Urgent', count: stats.urgent },
    { key: 'done', label: 'Done', count: stats.done },
    { key: 'archived', label: 'Expired', count: stats.archived },
  ];

  const displayName = state.profile?.displayName?.trim() || (state.username === 'you' ? 'learner' : state.username);
  const isPremium = state.profile?.plan === 'premium';
  const studyLocked = !isPremium && !!studyUsage?.retryAt && new Date(studyUsage.retryAt).getTime() > now;
  const studyUsedCount = studyLocked ? studyUsage?.count ?? 0 : 0;
  const studyRetryLabel = studyUsage?.retryAt ? formatTimeUntil(studyUsage.retryAt, now) : '';
  const studyUnlockStamp = studyUsage?.retryAt
    ? new Date(studyUsage.retryAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
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
        <section style={{ padding: '80px 24px 100px', textAlign: 'center' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* Learn / Study toggle */}
            <div style={{ display: 'inline-flex', border: `1px solid ${D.faint}`, borderRadius: 999, background: D.softer, padding: 4, marginBottom: 36, position: 'relative' }}>
              {(['learn', 'study'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setAppMode(m);
                    setStudyTab('sessions');
                    setTopic('');
                    setStudyFile(null);
                    setStudyGateError('');
                    sessionStorage.removeItem('study_notes_context');
                  }}
                  style={{
                    position: 'relative', zIndex: 1, border: 'none', borderRadius: 999,
                    background: appMode === m ? D.ink : 'transparent',
                    color: appMode === m ? D.bg : D.mute,
                    padding: '9px 22px', cursor: 'pointer',
                    fontFamily: D.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    transition: 'background 200ms ease, color 200ms ease',
                  }}
                >
                  {m === 'learn' ? 'Learn' : 'Study'}
                </button>
              ))}
            </div>

            <h1 style={{ margin: '0 0 20px', fontFamily: D.serif, fontWeight: 400, fontSize: 'clamp(42px, 6.8vw, 86px)', lineHeight: 0.94, letterSpacing: '-0.035em', color: D.ink }}>
              Hey {displayName},<br />
              {appMode === 'learn' ? (
                <>what do you want to{' '}<span style={{ fontStyle: 'italic', color: D.red }}>learn today?</span></>
              ) : (
                <>what are you{' '}<span style={{ fontStyle: 'italic', color: D.red }}>studying for?</span></>
              )}
            </h1>
            <p style={{ margin: '0 auto 36px', maxWidth: 460, fontFamily: D.serif, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: D.mute }}>
              {appMode === 'learn'
                ? 'Start something new, or jump back into what is already on the clock.'
                : 'Type a topic or upload your notes — we\'ll generate a study guide and quiz you on it.'}
            </p>

            {appMode === 'study' && !isPremium && studyUsage && (
              <div style={{
                maxWidth: 520,
                margin: '0 auto 24px',
                padding: '14px 16px',
                border: `1px solid ${studyLocked ? D.red : D.faint}`,
                background: dark ? 'rgba(255,81,72,0.06)' : 'rgba(26,21,16,0.03)',
                textAlign: 'left',
              }}>
                <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: studyLocked ? D.red : D.mute, marginBottom: 6 }}>
                  study mode
                </div>
                <div style={{ fontFamily: D.serif, fontSize: 22, letterSpacing: '-0.02em', color: D.ink }}>
                  {studyUsedCount} / {studyUsage.limit} free session used
                </div>
                <div style={{ marginTop: 6, fontFamily: D.mono, fontSize: 9, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.mute, lineHeight: 1.6 }}>
                  {studyLocked
                    ? `Next unlock in ${studyRetryLabel}${studyUnlockStamp ? ` · ${studyUnlockStamp}` : ''}`
                    : `Free plan includes 1 study session every ${studyUsage.windowHours} hours`}
                </div>
                {studyLocked && (
                  <a href="/settings?tab=billing" style={{ display: 'inline-block', marginTop: 10, fontFamily: D.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.ink, textDecoration: 'none', borderBottom: `1px solid ${D.ink}` }}>
                    Upgrade →
                  </a>
                )}
              </div>
            )}

            <form onSubmit={appMode === 'learn' ? handleStartCourse : handleStartStudy}>
              <div style={{
                border: `1.5px solid ${heroFocused ? D.ink : D.faint}`,
                background: dark ? '#1c1a16' : '#faf7f0',
                transition: 'border-color 0.15s',
                boxShadow: heroFocused ? `0 0 0 3px ${dark ? 'rgba(246,240,231,0.08)' : 'rgba(26,21,16,0.06)'}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', padding: '20px 20px 12px' }}>
                  <span style={{ fontFamily: D.mono, fontSize: 13, color: D.red, marginRight: 14, marginTop: 3, flexShrink: 0 }}>$</span>
                  <div style={{ position: 'relative', flex: 1 }}>
                    {typingPlaceholder.show && (
                      <div aria-hidden="true" style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        fontFamily: D.serif, fontSize: 22, lineHeight: 1.4, color: D.mute, minHeight: 56, whiteSpace: 'pre-wrap',
                      }}>
                        {typingPlaceholder.text}
                        <span style={{ opacity: typingPlaceholder.cursorVisible ? 1 : 0, transition: 'opacity 140ms ease' }}>|</span>
                      </div>
                    )}
                    <textarea
                      aria-label={appMode === 'learn' ? 'What do you want to learn?' : 'What are you studying for?'}
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
                          if (appMode === 'learn') handleStartCourse(event);
                          else handleStartStudy(event);
                        }
                      }}
                      placeholder=""
                      rows={2}
                      style={{
                        position: 'relative', zIndex: 1, flex: 1, width: '100%',
                        border: 'none', outline: 'none', background: 'transparent', resize: 'none',
                        fontFamily: D.serif, fontSize: 22, lineHeight: 1.4, color: D.ink, minHeight: 56, overflow: 'hidden',
                      }}
                    />
                  </div>
                </div>

                {/* Study mode: PDF upload row */}
                {appMode === 'study' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderTop: `1px dashed ${D.faint}` }}>
                    <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: D.mute, flexShrink: 0 }}>pdf</span>
                    <label style={{ cursor: 'pointer', flex: 1 }}>
                      <span style={{ fontFamily: D.mono, fontSize: 12, color: studyFile ? D.ink : D.mute, borderBottom: `1px solid ${studyFile ? D.ink : D.faint}`, paddingBottom: 2 }}>
                        {studyFile ? studyFile.name : 'attach your notes (optional)…'}
                      </span>
                      <input type="file" accept=".pdf" onChange={(e) => setStudyFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                    </label>
                    {studyFile && (
                      <button type="button" onClick={() => setStudyFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: D.mono, fontSize: 13, color: D.mute, padding: 0 }}>×</button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '12px 20px', borderTop: `1px solid ${D.faint}` }}>
                  <button
                    type="submit"
                    disabled={appMode === 'learn' ? !topic.trim() : (!topic.trim() && !studyFile) || studyUploading || checkingStudyAccess || studyLocked}
                    style={{
                      background: (appMode === 'learn' ? topic.trim() : topic.trim() || studyFile) && !studyUploading && !checkingStudyAccess && !studyLocked ? D.ink : D.faint,
                      color: (appMode === 'learn' ? topic.trim() : topic.trim() || studyFile) && !studyUploading && !checkingStudyAccess && !studyLocked ? D.bg : D.mute,
                      border: 'none', padding: '12px 24px', flexShrink: 0,
                      fontFamily: D.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: (appMode === 'learn' ? topic.trim() : topic.trim() || studyFile) && !studyUploading && !checkingStudyAccess && !studyLocked ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {studyUploading
                      ? 'Reading PDF…'
                      : checkingStudyAccess
                        ? 'Checking limit…'
                        : appMode === 'learn'
                          ? 'Start course →'
                          : studyLocked
                            ? `Locked · ${studyRetryLabel}`
                            : 'Study →'}
                  </button>
                </div>
              </div>
            </form>
            {appMode === 'study' && studyGateError && (
              <div style={{ maxWidth: 520, margin: '16px auto 0', padding: '12px 14px', border: `1px solid ${D.red}`, color: D.ink, background: dark ? 'rgba(255,81,72,0.08)' : 'rgba(196,34,27,0.05)', fontFamily: D.sans, fontSize: 14, lineHeight: 1.55, textAlign: 'left' }}>
                {studyGateError}
              </div>
            )}
          </div>
        </section>

        {appMode === 'study' ? (
          <section style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', paddingBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {([
                  ['sessions', 'Past study sessions', (state.studySessions ?? []).length],
                  ['quizzes', 'Your quizzes', state.quizAttempts.length],
                ] as const).map(([tab, label, count]) => (
                  <button
                    key={tab}
                    onClick={() => setStudyTab(tab)}
                    style={{
                      border: `1px solid ${studyTab === tab ? D.ink : D.faint}`,
                      borderRadius: 999,
                      background: studyTab === tab ? D.ink : D.softer,
                      color: studyTab === tab ? D.bg : D.ink,
                      cursor: 'pointer',
                      padding: '11px 16px',
                      fontFamily: D.mono,
                      fontSize: 9.5,
                      letterSpacing: '0.13em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                    <span style={{ marginLeft: 8, opacity: studyTab === tab ? 0.72 : 0.86 }}>{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {studyTab === 'quizzes' ? (
              <QuizHub
                courses={state.courses}
                attempts={state.quizAttempts}
                onOpenLessonQuiz={(course, moduleIndex, lessonIndex) => navigate(`/quiz/${course.id}/${moduleIndex}/${lessonIndex}`)}
                onOpenAnyQuiz={(topic) => navigate(`/quiz-any?topic=${encodeURIComponent(topic)}`)}
              />
            ) : (
              <>
                <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: D.mute, marginBottom: 24 }}>
                  — past sessions
                </div>
                {(state.studySessions ?? []).length === 0 ? (
                  <p style={{ fontFamily: `"Instrument Serif", Georgia, serif`, fontStyle: 'italic', fontSize: 22, color: D.mute, margin: 0 }}>
                    Your study sessions will appear here.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                    {(state.studySessions ?? []).map((session) => (
                      <article
                        key={session.id}
                        style={{
                          minHeight: 220,
                          border: `1px solid ${D.faint}`,
                          borderRadius: 28,
                          padding: 22,
                          background: 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(26,21,16,0.018))',
                          boxShadow: '0 24px 80px rgba(26,21,16,0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 18,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/study?topic=${encodeURIComponent(session.topic)}&sessionId=${session.id}`)}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 14 }}>
                            <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: D.red }}>
                              Study
                            </span>
                            <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.mute }}>
                              {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 'clamp(22px, 2.4vw, 34px)', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 400, color: D.ink }}>
                            {session.topic}
                          </h2>
                          <p style={{ margin: '12px 0 0', fontFamily: D.sans, fontSize: 13, lineHeight: 1.55, color: D.mute }}>
                            {studyPreview(session.notes) || 'Open the notes, quiz, and hands-on flow for this topic.'}
                          </p>
                        </div>
                        <div style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/study?topic=${encodeURIComponent(session.topic)}&sessionId=${session.id}`);
                            }}
                            style={{ border: 'none', background: 'transparent', color: D.ink, cursor: 'pointer', padding: 0, fontFamily: D.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', borderBottom: `1px solid ${D.ink}`, paddingBottom: 2 }}
                          >
                            Open session →
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_STUDY_SESSION', id: session.id }); }}
                            title="Delete session"
                            style={{ border: 'none', background: 'transparent', color: D.red, cursor: 'pointer', padding: 0, fontFamily: D.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
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

        <FilterTabs filters={filters} filter={filter} setFilter={setFilter} />


        <section>
          {filter === 'suggested' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'baseline', flexWrap: 'wrap', paddingTop: 18 }}>
                <div>
                  <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: D.red }}>
                    Suggested
                  </div>
                  <h2 style={{ margin: '10px 0 0', fontFamily: D.serif, fontSize: 40, fontWeight: 400, letterSpacing: '-0.055em', lineHeight: 0.94 }}>
                    Start from a sharper prompt.
                  </h2>
                </div>
                <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
                  <p style={{ maxWidth: 520, margin: 0, fontFamily: D.sans, fontSize: 14, lineHeight: 1.65, color: D.mute }}>
                    {state.profile?.onboardingCompleted
                      ? 'These suggestions are shaped by your saved role, occupation, and learning goals.'
                      : 'Suggested prompts live here now, and you can refresh them anytime for a different set.'}
                  </p>
                  <button
                    onClick={() => setSuggestedRefreshTick((tick) => tick + 1)}
                    style={{
                      border: `1px solid ${D.faint}`,
                      borderRadius: 999,
                      background: D.softer,
                      color: D.ink,
                      cursor: 'pointer',
                      padding: '10px 14px',
                      fontFamily: D.mono,
                      fontSize: 9.5,
                      letterSpacing: '0.13em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Refresh prompts ↻
                  </button>
                </div>
              </div>

              {suggestedCards.length === 0 ? (
                <div style={{ borderTop: `1px solid ${D.faint}`, padding: '44px 0', color: D.mute }}>
                  No prompts yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 18,
                    paddingTop: 18,
                  }}
                >
                  {suggestedCards.map((item) => (
                    <button
                      key={`${suggestedRefreshTick}-${item.title}`}
                      onClick={() => navigate(`/new?topic=${encodeURIComponent(item.title)}`)}
                      style={{
                        minHeight: 220,
                        border: `1px solid ${D.faint}`,
                        borderRadius: 28,
                        padding: 22,
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(26,21,16,0.018))',
                        boxShadow: '0 24px 80px rgba(26,21,16,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 18,
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: D.ink,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                          <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: D.red }}>
                            Prompt
                          </span>
                          <span style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.mute }}>
                            create course
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontFamily: D.serif, fontSize: 'clamp(22px, 2.4vw, 34px)', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 400, color: D.ink }}>
                          {item.title}
                        </h3>
                        <p style={{ margin: '12px 0 0', fontFamily: D.sans, fontSize: 13, lineHeight: 1.55, color: D.mute }}>
                          {item.reason}
                        </p>
                      </div>

                      <div style={{ borderTop: `1px solid ${D.faint}`, paddingTop: 14 }}>
                        <span style={{ fontFamily: D.mono, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: D.ink }}>
                          Start learning →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : state.courses.length === 0 ? (
            <div style={{ borderTop: `1px solid ${D.faint}`, padding: '44px 0' }}>
              <h2 style={{ margin: 0, fontFamily: D.serif, fontSize: 42, fontWeight: 400, letterSpacing: '-0.06em' }}>No courses yet.</h2>
              <p style={{ margin: '12px 0 0', color: D.mute }}>Start one topic and Learnor will build the path.</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div
              style={{
                borderTop: `1px solid ${D.faint}`,
                padding: '34px 0 0',
              }}
            >
              <div
                style={{
                  minHeight: 220,
                  border: `1px solid ${D.faint}`,
                  borderRadius: 28,
                  padding: 26,
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(26,21,16,0.018))',
                  boxShadow: '0 24px 80px rgba(26,21,16,0.04)',
                  display: 'grid',
                  alignItems: 'end',
                }}
              >
                <div>
                  <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: D.red }}>
                    {filters.find((item) => item.key === filter)?.label ?? 'Courses'}
                  </div>
                  <h2 style={{ margin: '12px 0 0', fontFamily: D.serif, fontSize: 'clamp(34px, 4vw, 52px)', lineHeight: 0.92, letterSpacing: '-0.06em', fontWeight: 400, color: D.ink }}>
                    Nothing here.
                  </h2>
                  <p style={{ margin: '14px 0 0', maxWidth: 420, fontFamily: D.sans, fontSize: 14, lineHeight: 1.6, color: D.mute }}>
                    This tab is empty right now. Try another bucket, or start a new course and it will show up here when it fits.
                  </p>
                </div>
              </div>
            </div>
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

        {filter !== 'suggested' && upcoming.length > 0 && (
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
