import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { HC, btn } from '../theme';
import { Chrome } from '../components/Chrome';
import { apiJson } from '../api';
import { useStore } from '../store';
import type { Course, Module } from '../types';

const DEADLINE_OPTIONS = [7, 14, 21, 30, 45, 60, 75, 90];

function genId() {
  return 'AIN-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export default function NewCourse() {
  const [params] = useSearchParams();
  const topic = params.get('topic') || '';
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = useStore();

  // Curriculum passed directly from Udemy import (via router state — no API call needed)
  const udemyCurriculum = (location.state as any)?.udemyCurriculum ?? null;

  const [days, setDays] = useState(30);
  const [curriculum, setCurriculum] = useState<null | {
    title: string; level: string; estimatedHours: number;
    modules: Array<{ title: string; lessons: Array<{ title: string; objective: string; minutes: number }> }>;
    materialsContext?: string;
    researchSources?: Array<{ title: string; url: string }>;
    researchStatus?: string;
  }>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [materialsContext] = useState<string>(() => {
    try {
      const v = sessionStorage.getItem('ainative_materials_context') ?? '';
      if (v) sessionStorage.removeItem('ainative_materials_context');
      return v;
    } catch { return ''; }
  });
  const [generatedMaterialsContext, setGeneratedMaterialsContext] = useState('');

  function updateCurriculumSummary() {
    setCurriculum((current) => {
      if (!current) return current;
      const modules = current.modules
        .map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.title.trim()) }))
        .filter((m) => m.title.trim() && m.lessons.length > 0);
      const minutes = modules.reduce((sum, m) => sum + m.lessons.reduce((lessonSum, l) => lessonSum + (Number(l.minutes) || 0), 0), 0);
      return { ...current, modules, estimatedHours: Number(Math.max(1, minutes / 60).toFixed(1)) };
    });
  }

  function removeModule(moduleIndex: number) {
    setCurriculum((current) => current ? {
      ...current,
      modules: current.modules.filter((_, i) => i !== moduleIndex),
    } : current);
  }

  function removeLesson(moduleIndex: number, lessonIndex: number) {
    setCurriculum((current) => current ? {
      ...current,
      modules: current.modules.map((m, i) =>
        i !== moduleIndex ? m : { ...m, lessons: m.lessons.filter((_, li) => li !== lessonIndex) }
      ),
    } : current);
  }

  function updateModuleTitle(moduleIndex: number, title: string) {
    setCurriculum((current) => current ? {
      ...current,
      modules: current.modules.map((m, i) => i === moduleIndex ? { ...m, title } : m),
    } : current);
  }

  function updateLesson(moduleIndex: number, lessonIndex: number, patch: Partial<{ title: string; objective: string; minutes: number }>) {
    setCurriculum((current) => current ? {
      ...current,
      modules: current.modules.map((m, i) =>
        i !== moduleIndex ? m : {
          ...m,
          lessons: m.lessons.map((l, li) => li === lessonIndex ? { ...l, ...patch } : l),
        }
      ),
    } : current);
  }

  useEffect(() => {
    if (!topic) { navigate('/'); return; }

    // Pre-parsed curriculum from Udemy import — skip API entirely
    if (udemyCurriculum) {
      setCurriculum(udemyCurriculum);
      setGeneratedMaterialsContext(udemyCurriculum.materialsContext || '');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const endpoint = materialsContext ? '/api/curriculum-from-materials' : '/api/curriculum';
    apiJson<{
      title: string; level: string; estimatedHours: number;
      modules: Array<{ title: string; lessons: Array<{ title: string; objective: string; minutes: number }> }>;
      materialsContext?: string;
      researchSources?: Array<{ title: string; url: string }>;
      researchStatus?: string;
    }>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, days, ...(materialsContext ? { materialsContext } : {}) }),
    })
      .then((data) => {
        setCurriculum(data);
        setGeneratedMaterialsContext(data.materialsContext || materialsContext);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  async function handleCommit() {
    if (!curriculum || !accepted) return;
    if (!curriculum.modules.length || curriculum.modules.every((m) => m.lessons.length === 0)) {
      setError('Keep at least one lesson before starting the course.');
      return;
    }
    setCommitting(true);
    const deadline = addDays(days);
    const effectiveMaterialsContext = generatedMaterialsContext || curriculum.materialsContext || materialsContext;
    const modules: Module[] = curriculum.modules.map((m, i) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({ ...l, completed: false, quizPassed: false })),
      unlocked: true,
      quizPassed: false,
    }));
    const course: Course = {
      id: crypto.randomUUID(),
      subject: curriculum.title,
      createdAt: new Date().toISOString(),
      deadline,
      progress: 0,
      streak: 0,
      status: 'active',
      paused: false,
      pauseUsed: false,
      curriculum: { title: curriculum.title, level: curriculum.level, estimatedHours: curriculum.estimatedHours, modules },
      lessonChats: {},
      moduleNotes: {},
      currentModule: 0,
      currentLesson: 0,
      certId: genId(),
      ...(effectiveMaterialsContext ? { materialsContext: effectiveMaterialsContext } : {}),
    } as Course;
    dispatch({ type: 'ADD_COURSE', course });
    navigate('/dashboard');
  }

  const deadline = addDays(days);
  const hoursPerDay = curriculum ? (curriculum.estimatedHours / days).toFixed(1) : '—';
  const canStart = !!curriculum?.modules.some((m) => m.lessons.length > 0);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: HC.bg }}>
      <Chrome label="new course" right="step 2 of 2" />

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: HC.serif, fontSize: 56, fontStyle: 'italic', color: HC.mute, letterSpacing: '-0.02em' }}>
            Building…
          </div>
          <div style={{ fontFamily: HC.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute }}>
            generating curriculum for "{topic}"
          </div>
        </div>
      )}

      {error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
          <div style={{
            padding: '14px 18px', border: `1px solid ${HC.red}`, background: 'rgba(196,34,27,0.06)',
            display: 'flex', gap: 12, maxWidth: 520,
          }}>
            <span style={{ color: HC.red, fontFamily: HC.mono, fontSize: 14, fontWeight: 700 }}>!</span>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: HC.ink }}>
              {error.includes('ANTHROPIC_API_KEY') || error.includes('not set')
                ? 'API key not configured. Copy .env.example → .env and add your ANTHROPIC_API_KEY, then restart the server.'
                : error}
            </div>
          </div>
          <button onClick={() => navigate('/')} style={btn.outline}>← Back</button>
        </div>
      )}

      {!loading && !error && curriculum && (
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 60px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48 }}>
          {/* Curriculum */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', color: HC.mute, textTransform: 'uppercase' }}>
                  Generated curriculum
                </div>
                {(generatedMaterialsContext || materialsContext) && (
                  <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: HC.green, border: `1px solid ${HC.green}`, padding: '2px 8px' }}>
                    {materialsContext ? 'grounded in your materials' : 'researched from web'}
                  </div>
                )}
              </div>
              <button
                onClick={() => { if (editing) updateCurriculumSummary(); setEditing(!editing); }}
                style={{ ...btn.outline, padding: '6px 12px', fontSize: 10 }}
              >
                {editing ? 'Done editing' : 'Edit'}
              </button>
            </div>
            <h2 style={{ fontFamily: HC.serif, fontSize: 'clamp(32px, 4vw, 54px)', letterSpacing: '-0.025em', margin: '8px 0 0', fontWeight: 400 }}>
              {curriculum.title}
            </h2>
            <div style={{ display: 'flex', gap: 24, marginTop: 14, fontFamily: HC.mono, fontSize: 11, color: HC.mute }}>
              <span>{curriculum.modules.length} modules</span>
              <span>·</span>
              <span>~{curriculum.estimatedHours}h total</span>
              <span>·</span>
              <span>{curriculum.level}</span>
            </div>

            <div style={{ marginTop: 28, borderTop: `1px solid ${HC.ink}` }}>
              {curriculum.modules.map((m, i) => (
                <details key={m.title} open={i < 2} style={{ borderBottom: `1px solid ${HC.ruleFaint}`, padding: '16px 0' }}>
                  <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: HC.mono, fontSize: 11, color: HC.red, width: 22, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    {editing ? (
                      <input
                        value={m.title}
                        onClick={(e) => e.preventDefault()}
                        onChange={(e) => updateModuleTitle(i, e.target.value)}
                        style={{ flex: 1, minWidth: 0, border: `1px solid ${HC.ruleFaint}`, background: HC.paper, color: HC.ink, padding: '8px 10px', fontFamily: HC.sans, fontSize: 15, fontWeight: 600 }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontFamily: HC.sans, fontSize: 15, fontWeight: 600, color: HC.ink }}>{m.title}</span>
                    )}
                    <span style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute, flexShrink: 0 }}>{m.lessons.length} lessons</span>
                    {editing && (
                      <button onClick={(e) => { e.preventDefault(); removeModule(i); }} style={{ ...btn.ghost, padding: '6px 8px', color: HC.red, fontSize: 12 }} title="Remove module">×</button>
                    )}
                  </summary>
                  <div style={{ paddingLeft: 38, marginTop: 10 }}>
                    {m.lessons.map((l, li) => (
                      editing ? (
                        <div key={l.title + li} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) 70px 32px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: `1px dashed ${HC.ruleFaint}` }}>
                          <input value={l.title} onChange={(e) => updateLesson(i, li, { title: e.target.value })} style={{ minWidth: 0, border: `1px solid ${HC.ruleFaint}`, background: HC.paper, color: HC.ink, padding: '8px 10px', fontFamily: HC.sans, fontSize: 13 }} />
                          <input value={l.objective ?? ''} onChange={(e) => updateLesson(i, li, { objective: e.target.value })} placeholder="Objective" style={{ minWidth: 0, border: `1px solid ${HC.ruleFaint}`, background: HC.paper, color: HC.ink, padding: '8px 10px', fontFamily: HC.sans, fontSize: 13 }} />
                          <input type="number" min={1} value={l.minutes} onChange={(e) => updateLesson(i, li, { minutes: Number(e.target.value) })} style={{ width: '100%', border: `1px solid ${HC.ruleFaint}`, background: HC.paper, color: HC.ink, padding: '8px 8px', fontFamily: HC.mono, fontSize: 11 }} />
                          <button onClick={() => removeLesson(i, li)} style={{ ...btn.ghost, padding: '6px 4px', color: HC.red, fontSize: 12 }} title="Remove lesson">×</button>
                        </div>
                      ) : (
                        <div key={l.title + li} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '9px 0', borderBottom: `1px dashed ${HC.ruleFaint}` }}>
                          <span style={{ fontFamily: HC.sans, fontSize: 13, color: HC.ink, fontWeight: 500, minWidth: 0, flex: '0 0 auto', maxWidth: '45%' }}>{l.title}</span>
                          <span style={{ fontFamily: HC.sans, fontSize: 12, color: HC.mute, flex: 1, minWidth: 0 }}>{l.objective}</span>
                          <span style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute, flexShrink: 0 }}>{l.minutes}m</span>
                        </div>
                      )
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Deadline sidebar */}
          <aside>
            <div style={{ border: `1px solid ${HC.ink}`, background: HC.paper, padding: 28, position: 'sticky', top: 0 }}>
              <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: HC.mute }}>
                Set your deadline
              </div>
              <h3 style={{ fontFamily: HC.serif, fontSize: 28, margin: '8px 0 4px', fontWeight: 400, letterSpacing: '-0.01em', color: HC.ink }}>
                When will this be yours?
              </h3>
              <p style={{ fontSize: 13, color: HC.mute, lineHeight: 1.5 }}>
                Choose a window between 3 and 90 days. <u>Cannot be extended.</u>
              </p>

              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {DEADLINE_OPTIONS.map((d) => (
                  <button key={d} onClick={() => setDays(d)} style={{
                    padding: '10px 0',
                    background: d === days ? HC.ink : 'transparent',
                    color: d === days ? HC.paper : HC.ink,
                    border: `1px solid ${d === days ? HC.ink : HC.ruleFaint}`,
                    fontFamily: HC.mono, fontSize: 13, cursor: 'pointer', letterSpacing: '0.04em',
                  }}>
                    {d}d
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 20, borderTop: `1px solid ${HC.ruleFaint}`, paddingTop: 16 }}>
                {[
                  ['DEADLINE', formatDate(deadline) + ' · 23:59'],
                  ['DURATION', `${days} DAYS`],
                  ['SUGGESTED / DAY', `~${hoursPerDay}H`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: HC.mono, fontSize: 11, marginTop: 6 }}>
                    <span style={{ color: HC.mute }}>{k}</span>
                    <span style={{ color: HC.ink, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 18, padding: '12px 14px',
                border: `1px solid ${HC.red}`, background: 'rgba(196,34,27,0.04)',
                display: 'flex', gap: 12,
              }}>
                <span style={{ color: HC.red, fontFamily: HC.mono, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>!</span>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: HC.ink }}>
                  If you don't finish by <b>{formatDate(deadline)} at 23:59</b>, every lesson, every quiz attempt,
                  every note will be permanently deleted. This course will be locked from your account forever.
                </div>
              </div>

              <label style={{ display: 'flex', gap: 10, marginTop: 16, fontSize: 13, color: HC.ink, alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => setAccepted(!accepted)}>
                <span style={{
                  width: 14, height: 14, border: `1.5px solid ${HC.ink}`, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                  background: accepted ? HC.ink : 'transparent',
                }}>
                  {accepted && <span style={{ color: HC.paper, fontSize: 10 }}>✓</span>}
                </span>
                I understand. Lock the deadline.
              </label>

              <button onClick={handleCommit} disabled={!accepted || !canStart || committing} style={{
                ...btn.danger, width: '100%', marginTop: 16, padding: '14px',
                opacity: accepted && canStart ? 1 : 0.4,
                cursor: accepted && canStart ? 'pointer' : 'not-allowed',
              }}>
                {committing ? 'Starting…' : 'Begin the clock →'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
