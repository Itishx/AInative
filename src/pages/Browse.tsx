import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC } from '../theme';
import { useEnrollCourse, useStore } from '../store';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import type { EnrolledCourse, Module, PublishedCourse } from '../types';

const B = {
  bg: 'var(--browse-bg)',
  ink: 'var(--browse-ink)',
  mute: 'var(--browse-mute)',
  faint: 'var(--browse-faint)',
  softer: 'var(--browse-softer)',
  red: 'var(--browse-red)',
  amber: 'var(--browse-amber)',
  green: 'var(--browse-green)',
  paper: 'var(--browse-paper)',
  serif: HC.serif,
  sans: HC.sans,
  mono: HC.mono,
};

function lessonCount(course: PublishedCourse) {
  return course.curriculum.modules.reduce((sum, module) => sum + module.lessons.length, 0);
}

export default function Browse() {
  const navigate = useNavigate();
  const enrollCourse = useEnrollCourse();
  const { state, remoteLoaded } = useStore();
  const { user } = useAuth();
  const { dark } = useTheme();

  const [courses, setCourses] = useState<PublishedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/published-courses')
      .then((response) => response.json())
      .then((data) => {
        setCourses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleEnroll(course: PublishedCourse) {
    setEnrolling(course.id);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      const full = await res.json();
      if (full.error) throw new Error(full.error);

      const deadline = new Date(Date.now() + full.curriculum.estimatedHours * 3600000 * 1.5).toISOString();
      const modules: Module[] = full.curriculum.modules.map((module: { title: string; lessons: { title: string; objective: string; minutes: number }[] }) => ({
        title: module.title,
        unlocked: true,
        quizPassed: false,
        lessons: module.lessons.map((lesson) => ({
          title: lesson.title,
          objective: lesson.objective,
          minutes: lesson.minutes,
          completed: false,
          quizPassed: false,
        })),
      }));

      const enrolled: EnrolledCourse = {
        id: `enrolled-${full.id}-${Date.now()}`,
        instructorCourseId: full.id,
        materialsContext: full.curriculum.materialsContext ?? '',
        subject: full.curriculum.title,
        createdAt: new Date().toISOString(),
        deadline,
        progress: 0,
        streak: 0,
        status: 'active',
        paused: false,
        pauseUsed: false,
        curriculum: {
          title: full.curriculum.title,
          level: full.curriculum.level,
          estimatedHours: full.curriculum.estimatedHours,
          modules,
        },
        lessonChats: {},
        moduleNotes: {},
        currentModule: 0,
        currentLesson: 0,
      };

      enrollCourse(enrolled);
      navigate(`/learn/${enrolled.id}`);
    } catch (err) {
      alert(`Enroll failed: ${(err as Error).message}`);
    } finally {
      setEnrolling(null);
    }
  }

  const hasOnboarding = !!state.profile?.onboardingCompleted;

  const vars = {
    '--browse-bg': dark ? '#050505' : '#f4f0e8',
    '--browse-paper': dark ? '#1c1a16' : '#faf7f0',
    '--browse-ink': dark ? '#f6f0e7' : '#1a1510',
    '--browse-mute': dark ? 'rgba(246,240,231,0.48)' : 'rgba(26,21,16,0.52)',
    '--browse-faint': dark ? 'rgba(246,240,231,0.10)' : 'rgba(26,21,16,0.12)',
    '--browse-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
    '--browse-red': dark ? '#ff5148' : '#c4221b',
    '--browse-amber': dark ? '#d99b45' : '#b87822',
    '--browse-green': dark ? '#72c089' : '#2d6a3f',
  } as React.CSSProperties;

  const shellButton: React.CSSProperties = {
    border: `1px solid ${B.faint}`,
    borderRadius: 999,
    background: 'transparent',
    color: B.ink,
    cursor: 'pointer',
    padding: '10px 16px',
    fontFamily: B.mono,
    fontSize: 9.5,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
  };

  return (
    <main style={{ minHeight: '100vh', background: B.bg, color: B.ink, fontFamily: B.sans, position: 'relative', ...vars }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: dark
          ? 'radial-gradient(circle at 76% 10%, rgba(255,81,72,0.10), transparent 28%), radial-gradient(circle at 18% 88%, rgba(246,240,231,0.06), transparent 26%)'
          : 'radial-gradient(circle at 76% 10%, rgba(196,34,27,0.08), transparent 28%), radial-gradient(circle at 18% 88%, rgba(26,21,16,0.05), transparent 26%)',
      }} />

      <div style={{ position: 'relative', maxWidth: 1360, margin: '0 auto', padding: '32px clamp(20px, 4vw, 56px) 88px' }}>
        <section style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 42 }}>
          <button onClick={() => navigate(user ? '/dashboard' : '/')} style={shellButton}>
            {user ? '← Dashboard' : '← Home'}
          </button>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(user ? (hasOnboarding ? '/settings' : '/onboarding') : '/auth')} style={shellButton}>
              {user ? (hasOnboarding ? 'Tune profile →' : 'Finish onboarding →') : 'Sign in →'}
            </button>
            <button onClick={() => navigate('/create')} style={{ ...shellButton, borderColor: B.ink, background: B.ink, color: B.bg }}>
              Teach →
            </button>
          </div>
        </section>

        <section style={{ borderBottom: `1px solid ${B.faint}`, paddingBottom: 34 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, alignItems: 'end' }}>
            <div>
              <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: B.red }}>
                Browse
              </div>
              <h1 style={{ margin: '12px 0 0', fontFamily: B.serif, fontWeight: 400, fontSize: 'clamp(46px, 6vw, 88px)', lineHeight: 0.9, letterSpacing: '-0.07em', color: B.ink }}>
                Marketplace
                <br />
                courses.
              </h1>
              <p style={{ maxWidth: 640, margin: '18px 0 0', color: B.mute, fontFamily: B.sans, fontSize: 15, lineHeight: 1.65 }}>
                Your personalized suggestions live on the dashboard now. Browse is where you explore ready-made courses by real instructors.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 16, borderLeft: `1px solid ${B.faint}`, paddingLeft: 'clamp(18px, 3vw, 34px)' }}>
              <div style={{ borderTop: `1px solid ${B.faint}`, paddingTop: 14 }}>
                <div style={{ fontFamily: B.serif, fontSize: 32, lineHeight: 0.92, color: B.ink }}>
                  Dashboard suggestions
                </div>
                <div style={{ marginTop: 10, fontFamily: B.mono, fontSize: 9, color: B.mute, letterSpacing: '0.11em', textTransform: 'uppercase', lineHeight: 1.7 }}>
                  {user && remoteLoaded && hasOnboarding
                    ? 'refreshable prompts now live on your dashboard'
                    : 'go back home for personalized prompt suggestions'}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${B.faint}`, paddingTop: 14 }}>
                <div style={{ fontFamily: B.serif, fontSize: 32, lineHeight: 0.92, color: B.ink }}>
                  {courses.length}
                </div>
                <div style={{ marginTop: 10, fontFamily: B.mono, fontSize: 9, color: B.mute, letterSpacing: '0.11em', textTransform: 'uppercase' }}>
                  Published courses in marketplace
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 34 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'baseline', marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: B.mute }}>
                Marketplace
              </div>
              <h2 style={{ margin: '10px 0 0', fontFamily: B.serif, fontSize: 40, fontWeight: 400, letterSpacing: '-0.055em', lineHeight: 0.94 }}>
                Courses by real instructors.
              </h2>
            </div>
            <p style={{ maxWidth: 520, margin: 0, fontFamily: B.sans, fontSize: 14, lineHeight: 1.65, color: B.mute }}>
              Human-built curricula you can enroll into directly if you want a ready-made path instead of generating one from a prompt.
            </p>
          </div>

          {loading && (
            <div style={{ padding: '36px 0', fontFamily: B.serif, fontStyle: 'italic', color: B.mute, fontSize: 22 }}>
              Loading published courses…
            </div>
          )}

          {!loading && courses.length === 0 ? (
            <div style={{ border: `1px solid ${B.faint}`, borderRadius: 28, padding: '34px 30px', background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(26,21,16,0.018))' }}>
              <div style={{ fontFamily: B.serif, fontSize: 32, letterSpacing: '-0.04em', marginBottom: 10 }}>
                No published courses yet.
              </div>
              <div style={{ fontFamily: B.sans, fontSize: 14, lineHeight: 1.6, color: B.mute, marginBottom: 18 }}>
                Personalized prompt suggestions are on the dashboard already. The instructor marketplace will fill up as courses get published.
              </div>
              <button onClick={() => navigate('/create')} style={{ ...shellButton, borderColor: B.ink, background: B.ink, color: B.bg }}>
                Start teaching →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              {courses.map((course) => (
                <article
                  key={course.id}
                  style={{
                    minHeight: 240,
                    border: `1px solid ${B.faint}`,
                    borderRadius: 28,
                    padding: 22,
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(26,21,16,0.018))',
                    boxShadow: '0 24px 80px rgba(26,21,16,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 18,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                      <span style={{ fontFamily: B.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: B.red }}>
                        {course.curriculum.level}
                      </span>
                      <span style={{ fontFamily: B.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: B.mute }}>
                        {course.enrollCount} enrolled
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontFamily: B.serif, fontSize: 'clamp(22px, 2.4vw, 34px)', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 400, color: B.ink }}>
                      {course.curriculum.title}
                    </h3>
                    <p style={{ margin: '12px 0 0', fontFamily: B.mono, fontSize: 9.5, lineHeight: 1.7, color: B.mute, letterSpacing: '0.11em', textTransform: 'uppercase' }}>
                      {course.curriculum.estimatedHours}h · {course.curriculum.modules.length} modules · {lessonCount(course)} lessons
                    </p>
                  </div>

                  <div style={{ borderTop: `1px solid ${B.faint}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                    <div style={{ fontFamily: B.serif, fontSize: 28, lineHeight: 0.92, color: course.price === 0 ? B.green : B.ink }}>
                      {course.price === 0 ? 'Free' : `$${course.price}`}
                    </div>
                    <button
                      onClick={() => handleEnroll(course)}
                      disabled={enrolling === course.id}
                      style={{
                        border: `1px solid ${B.ink}`,
                        borderRadius: 999,
                        background: B.ink,
                        color: B.bg,
                        cursor: enrolling === course.id ? 'wait' : 'pointer',
                        opacity: enrolling === course.id ? 0.6 : 1,
                        padding: '10px 16px',
                        fontFamily: B.mono,
                        fontSize: 9.5,
                        letterSpacing: '0.13em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {enrolling === course.id ? 'Enrolling…' : 'Enroll →'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
