import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC, btn } from '../theme';
import { Chrome } from '../components/Chrome';
import { Countdown } from '../components/Countdown';
import { useStore } from '../store';
import type { Course } from '../types';

function ProgressBar({ progress, urgent, tombstone }: { progress: number; urgent?: boolean; tombstone?: boolean }) {
  return (
    <div style={{ height: 2, background: tombstone ? HC.ruleFaint : HC.ink, position: 'relative' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: `${Math.min(1, progress) * 100}%`,
        background: tombstone ? HC.mute : urgent ? HC.red : HC.ink,
      }} />
      <div style={{ position: 'absolute', right: 0, top: -4, width: 1.5, height: 10, background: HC.red }} />
    </div>
  );
}

function CourseRow({ course, onClick, onDelete }: { course: Course; onClick: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isTomb = course.status === 'tombstone';
  const urgent = course.status === 'active-urgent';
  const completed = course.status === 'completed';
  const doneMods = course.curriculum.modules.filter((m) => m.quizPassed).length;
  const hasStarted = Object.values(course.lessonChats ?? {}).some((msgs) => msgs.length > 0);

  return (
    <div style={{ borderBottom: `1px solid ${HC.ruleFaint}` }}>
      <div onClick={onClick} style={{
        padding: '26px 0',
        display: 'grid', gridTemplateColumns: '1.3fr 1fr 200px 140px',
        gap: 32, alignItems: 'center', cursor: isTomb ? 'default' : 'pointer',
        opacity: isTomb ? 0.55 : 1, position: 'relative',
      }}
        onMouseEnter={(e) => { if (!isTomb) e.currentTarget.style.background = HC.paper; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {isTomb && (
          <div style={{
            position: 'absolute', left: -22, top: '50%', transform: 'translateY(-50%)',
            fontFamily: HC.mono, fontSize: 9, color: HC.red, letterSpacing: '0.16em',
            writingMode: 'vertical-rl',
          }}>† DELETED</div>
        )}

        <div>
          <div style={{ fontFamily: HC.mono, fontSize: 10, color: isTomb ? HC.red : urgent ? HC.red : HC.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {isTomb ? 'TOMBSTONE · locked forever' : completed ? 'COMPLETED' : urgent ? 'URGENT' : 'IN PROGRESS'}
          </div>
          <div style={{
            fontFamily: HC.serif, fontSize: 30, letterSpacing: '-0.01em', marginTop: 4,
            textDecoration: isTomb ? 'line-through' : 'none', color: HC.ink,
          }}>
            {course.subject}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <div style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute }}>
              {isTomb
                ? `Missed · ${Math.abs(Math.floor((Date.now() - new Date(course.deadline).getTime()) / 86400000))}d overdue · ${Math.round(course.progress * 100)}% complete at death`
                : `${doneMods}/${course.curriculum.modules.length} modules · ${Math.round(course.progress * 100)}%`}
            </div>
            {!isTomb && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                  fontFamily: HC.mono, fontSize: 11, color: HC.mute, letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {expanded ? '▴ hide' : '▾ modules'}
              </button>
            )}
          </div>
        </div>

        <div>
          <ProgressBar progress={course.progress} urgent={urgent} tombstone={isTomb} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: HC.mono, fontSize: 10, color: HC.mute }}>
            <span>NOW</span>
            <span style={{ color: HC.red }}>DEADLINE</span>
          </div>
        </div>

        <div>
          {isTomb ? (
            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: HC.red }}>Expired. Gone.</div>
          ) : completed ? (
            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 18, color: HC.green }}>Done ✓</div>
          ) : (
            <Countdown deadline={course.deadline} paused={course.paused} size={40} />
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          {isTomb ? (
            <button style={{ ...btn.outline, padding: '8px 14px', color: HC.mute, borderColor: HC.ruleFaint, cursor: 'not-allowed' }}>
              Archived
            </button>
          ) : completed ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button style={{ ...btn.outline, padding: '10px 16px', fontSize: 10 }}>Certificate →</button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{ ...btn.ghost, padding: '10px 8px', fontSize: 10, color: HC.red }}
              >
                Delete
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button style={{ ...btn.primary, padding: '10px 18px', fontSize: 10 }}>{hasStarted ? 'Resume →' : 'Start →'}</button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{ ...btn.ghost, padding: '10px 8px', fontSize: 10, color: HC.red }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expandable module tree */}
      {expanded && (
        <div style={{ padding: '0 0 20px 4px', background: HC.paper, borderTop: `1px solid ${HC.ruleFaint}` }}>
          {course.curriculum.modules.map((m, mi) => {
            const isCurrentMod = mi === course.currentModule;
            const modDone = m.quizPassed;
            const modLocked = mi > course.currentModule && !m.unlocked;
            const doneCount = m.lessons.filter((l) => l.completed).length;
            return (
              <div key={mi} style={{ paddingTop: 14, paddingLeft: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 10,
                  fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: modDone ? HC.green : isCurrentMod ? HC.ink : modLocked ? HC.ruleFaint : HC.mute,
                }}>
                  <span style={{ color: modDone ? HC.green : isCurrentMod ? HC.red : HC.mute, fontSize: 12 }}>
                    {modDone ? '✓' : isCurrentMod ? '▸' : modLocked ? '🔒' : '○'}
                  </span>
                  <span style={{ textDecoration: modDone ? 'line-through' : 'none' }}>
                    {String(mi + 1).padStart(2, '0')} · {m.title}
                  </span>
                  <span style={{ color: HC.mute, fontSize: 9, marginLeft: 4 }}>
                    {doneCount}/{m.lessons.length}
                  </span>
                </div>
                <div style={{ paddingLeft: 22, marginTop: 4 }}>
                  {m.lessons.map((l, li) => {
                    const isActive = isCurrentMod && li === course.currentLesson;
                    const isDone = l.completed;
                    return (
                      <div key={li} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
                        fontFamily: isDone ? HC.mono : HC.serif, fontSize: isDone ? 11 : 13,
                        color: isDone ? HC.mute : isActive ? HC.ink : modLocked ? HC.ruleFaint : HC.mute,
                        textDecoration: isDone ? 'line-through' : 'none',
                        opacity: modLocked ? 0.4 : 1,
                      }}>
                        <span style={{
                          fontFamily: HC.mono, fontSize: 10, flexShrink: 0,
                          color: isDone ? HC.green : isActive ? HC.red : HC.mute,
                        }}>
                          {isDone ? '✓' : isActive ? '▸' : '·'}
                        </span>
                        {l.title}
                        <span style={{ fontFamily: HC.mono, fontSize: 9, color: HC.ruleFaint, marginLeft: 'auto', paddingRight: 20 }}>
                          {l.minutes}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const openCount = state.courses.filter((c) => c.status === 'active' || c.status === 'active-urgent').length;
  const numeral = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][openCount] ?? openCount;

  function handleDeleteCourse(course: Course) {
    const confirmed = window.confirm(`Delete "${course.subject}" from your dashboard? This will remove your progress for this course.`);
    if (!confirmed) return;
    dispatch({ type: 'DELETE_COURSE', id: course.id });
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: HC.bg }}>
      <Chrome label="dashboard" right={state.username} />

      <div style={{ flex: 1, overflow: 'auto', padding: '40px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 36 }}>
          <h2 style={{ fontFamily: HC.serif, fontSize: 'clamp(32px, 5vw, 56px)', margin: 0, fontWeight: 400, letterSpacing: '-0.025em' }}>
            <span style={{ fontStyle: 'italic' }}>{numeral}</span> open contract{openCount !== 1 ? 's' : ''}.
          </h2>
          <button onClick={() => navigate('/')} style={{ ...btn.primary, padding: '12px 22px' }}>
            + New course
          </button>
        </div>

        {state.courses.length === 0 ? (
          <div style={{ borderTop: `1px solid ${HC.ink}`, paddingTop: 48, textAlign: 'center' }}>
            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 22, color: HC.mute }}>No contracts yet.</div>
            <button onClick={() => navigate('/')} style={{ ...btn.primary, marginTop: 20 }}>Start your first →</button>
          </div>
        ) : (
          <div style={{ borderTop: `1px solid ${HC.ink}` }}>
            {state.courses.map((c) => (
              <CourseRow
                key={c.id}
                course={c}
                onDelete={() => handleDeleteCourse(c)}
                onClick={() => {
                  if (c.status === 'tombstone') return;
                  if (c.status === 'completed') navigate(`/certificate/${c.id}`);
                  else navigate(`/learn/${c.id}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
