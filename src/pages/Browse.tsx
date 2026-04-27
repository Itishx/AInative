import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC, btn } from '../theme';
import { Chrome } from '../components/Chrome';
import { useEnrollCourse } from '../store';
import type { PublishedCourse, EnrolledCourse, Module } from '../types';

export default function Browse() {
  const navigate = useNavigate();
  const enrollCourse = useEnrollCourse();
  const [courses, setCourses] = useState<PublishedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/published-courses')
      .then((r) => r.json())
      .then((data) => { setCourses(Array.isArray(data) ? data : []); setLoading(false); })
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

      const deadline = new Date(Date.now() + (full.curriculum.estimatedHours / 1) * 3600000 * 1.5).toISOString();
      const modules: Module[] = full.curriculum.modules.map((m: { title: string; lessons: { title: string; objective: string; minutes: number }[] }, mi: number) => ({
        title: m.title,
        unlocked: mi === 0,
        quizPassed: false,
        lessons: m.lessons.map((l) => ({ title: l.title, objective: l.objective, minutes: l.minutes, completed: false, quizPassed: false })),
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
        curriculum: { title: full.curriculum.title, level: full.curriculum.level, estimatedHours: full.curriculum.estimatedHours, modules },
        lessonChats: {},
        moduleNotes: {},
        currentModule: 0,
        currentLesson: 0,
      };

      enrollCourse(enrolled);
      navigate(`/learn/${enrolled.id}`);
    } catch (e) {
      alert(`Enroll failed: ${(e as Error).message}`);
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: HC.bg }}>
      <Chrome
        label="browse courses"
        right={
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/create')} style={{ ...btn.ghost, fontSize: 11 }}>Teach →</button>
            <button onClick={() => navigate('/dashboard')} style={{ ...btn.ghost, fontSize: 11 }}>← Dashboard</button>
          </div>
        }
      />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontFamily: HC.serif, fontSize: 42, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Courses by real instructors.
        </h1>
        <p style={{ fontFamily: HC.serif, fontStyle: 'italic', color: HC.mute, fontSize: 18, margin: '0 0 40px' }}>
          Human knowledge. AI delivery. Deadline-enforced mastery.
        </p>

        {loading && (
          <div style={{ fontFamily: HC.serif, fontStyle: 'italic', color: HC.mute, fontSize: 18 }}>Loading…</div>
        )}

        {!loading && courses.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 28, color: HC.mute, marginBottom: 16 }}>
              No courses yet.
            </div>
            <div style={{ fontFamily: HC.mono, fontSize: 12, color: HC.mute, marginBottom: 28 }}>
              Be the first to publish a course.
            </div>
            <button onClick={() => navigate('/create')} style={{ ...btn.primary, padding: '12px 28px' }}>
              Start teaching →
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {courses.map((c) => (
            <div key={c.id} style={{ background: HC.paper, border: `1px solid ${HC.ruleFaint}`, padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', color: HC.mute, textTransform: 'uppercase', marginBottom: 8 }}>
                {c.curriculum.level} · {c.curriculum.estimatedHours}h · {c.enrollCount} enrolled
              </div>
              <div style={{ fontFamily: HC.serif, fontSize: 20, fontWeight: 400, letterSpacing: '-0.01em', flex: 1, marginBottom: 12 }}>
                {c.curriculum.title}
              </div>
              <div style={{ fontFamily: HC.mono, fontSize: 10, color: HC.mute, marginBottom: 16 }}>
                {c.curriculum.modules.length} modules · {c.curriculum.modules.reduce((s, m) => s + m.lessons.length, 0)} lessons
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: HC.serif, fontSize: 26, fontWeight: 400 }}>
                  {c.price === 0 ? <span style={{ color: HC.green, fontStyle: 'italic' }}>Free</span> : `$${c.price}`}
                </div>
                <button
                  style={{ ...btn.primary, padding: '10px 20px', fontSize: 12, opacity: enrolling === c.id ? 0.5 : 1 }}
                  disabled={enrolling === c.id}
                  onClick={() => handleEnroll(c)}
                >
                  {enrolling === c.id ? 'Enrolling…' : 'Enroll →'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
