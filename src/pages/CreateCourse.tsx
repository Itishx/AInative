import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC, btn } from '../theme';
import { Chrome } from '../components/Chrome';
import { apiJson } from '../api';
import type { InstructorCurriculum } from '../types';

type Step = 'token' | 'upload' | 'review' | 'done';

export default function CreateCourse() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('token');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [topic, setTopic] = useState('');
  const [days, setDays] = useState(14);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [curriculum, setCurriculum] = useState<InstructorCurriculum | null>(null);
  const [publishedId, setPublishedId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadAndGenerate() {
    if (!topic.trim()) return;
    setSubmitError('');
    setLoading(true);
    try {
      let materialsContext = '';

      if (files.length > 0) {
        setLoadingMsg('Extracting text from your materials…');
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        const uploadData = await apiJson<{ materialsContext: string }>('/api/upload-materials', {
          method: 'POST',
          body: form,
        });
        materialsContext = uploadData.materialsContext;
      }

      setLoadingMsg(materialsContext ? 'Building curriculum from your materials…' : 'Researching sources and building curriculum…');
      const endpoint = materialsContext ? '/api/curriculum-from-materials' : '/api/curriculum';
      const currData = await apiJson<InstructorCurriculum>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, days, materialsContext }),
      });
      // Attach materialsContext so the AI tutor is grounded in it
      setCurriculum({ ...currData, materialsContext: currData.materialsContext || materialsContext } as InstructorCurriculum);
      setStep('review');
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  async function handlePublish() {
    if (!curriculum) return;
    if (!curriculum.modules.some((m) => m.lessons.length > 0)) {
      setSubmitError('Keep at least one lesson before publishing.');
      return;
    }
    setSubmitError('');
    setLoading(true);
    setLoadingMsg('Publishing…');
    try {
      const data = await apiJson<{ id: string }>('/api/publish-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorToken: token, curriculum, price }),
      });
      setPublishedId(data.id);
      setStep('done');
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  const input: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 14px', border: `1px solid ${HC.ruleFaint}`,
    background: HC.paper, fontFamily: HC.serif, fontSize: 16, color: HC.ink, outline: 'none',
    boxSizing: 'border-box',
  };

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

  return (
    <div style={{ minHeight: '100vh', background: HC.bg }}>
      <Chrome label="create a course" right={<button onClick={() => navigate('/')} style={{ ...btn.ghost, fontSize: 11 }}>← home</button>} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
        {/* Steps indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {(['token', 'upload', 'review', 'done'] as Step[]).map((s, i) => (
            <span key={s} style={{ color: step === s ? HC.ink : step > s ? HC.mute : HC.ruleFaint }}>
              {i > 0 && <span style={{ marginRight: 8, color: HC.ruleFaint }}>—</span>}
              {i + 1}. {s}
            </span>
          ))}
        </div>

        {/* Step 1: Token */}
        {step === 'token' && (
          <div>
            <h1 style={{ fontFamily: HC.serif, fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Teach on Learnor.
            </h1>
            <p style={{ fontFamily: HC.serif, fontStyle: 'italic', color: HC.mute, fontSize: 17, margin: '0 0 32px', lineHeight: 1.5 }}>
              Your knowledge. AI delivery. You still get paid.
            </p>
            <label style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute }}>
              Creator token
            </label>
            <input
              style={{ ...input, marginTop: 8, marginBottom: 8 }}
              type="password"
              value={token}
              onChange={(e) => { setToken(e.target.value); setTokenError(''); }}
              placeholder="Enter your creator token"
            />
            {tokenError && <div style={{ color: HC.red, fontFamily: HC.mono, fontSize: 11, marginBottom: 12 }}>{tokenError}</div>}
            <p style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute, margin: '0 0 24px', lineHeight: 1.6 }}>
              Don't have a token? Set CREATOR_TOKEN in your server .env file.
            </p>
            <button
              style={{ ...btn.primary, padding: '12px 28px' }}
              onClick={() => {
                if (!token.trim()) { setTokenError('Token is required.'); return; }
                setStep('upload');
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 'upload' && (
          <div>
            <h1 style={{ fontFamily: HC.serif, fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Upload your materials.
            </h1>
            <p style={{ fontFamily: HC.serif, fontStyle: 'italic', color: HC.mute, fontSize: 17, margin: '0 0 32px', lineHeight: 1.5 }}>
              PDFs, notes, text files — anything you'd hand a student.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files)); }}
              style={{
                border: `2px dashed ${files.length ? HC.ink : HC.ruleFaint}`,
                padding: '32px', textAlign: 'center', cursor: 'pointer', marginBottom: 24,
                background: HC.paper, transition: 'border-color 0.15s',
              }}
            >
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md" style={{ display: 'none' }}
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              {files.length > 0 ? (
                <div>
                  {files.map((f) => (
                    <div key={f.name} style={{ fontFamily: HC.mono, fontSize: 11, color: HC.ink, marginBottom: 4 }}>✓ {f.name}</div>
                  ))}
                  <div style={{ fontFamily: HC.mono, fontSize: 10, color: HC.mute, marginTop: 8 }}>click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily: HC.serif, fontStyle: 'italic', color: HC.mute, fontSize: 17 }}>
                    Drop files here or click to browse
                  </div>
                  <div style={{ fontFamily: HC.mono, fontSize: 10, color: HC.mute, marginTop: 6, letterSpacing: '0.1em' }}>
                    optional — PDF, .txt, .md
                  </div>
                </div>
              )}
            </div>

            <label style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute }}>
              Course topic
            </label>
            <input style={{ ...input, marginTop: 8, marginBottom: 20 }} value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Introduction to Machine Learning" />

            <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute }}>
                  Student deadline (days)
                </label>
                <input style={{ ...input, marginTop: 8 }} type="number" min={3} max={90} value={days}
                  onChange={(e) => setDays(Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.mute }}>
                  Price (USD, 0 = free)
                </label>
                <input style={{ ...input, marginTop: 8 }} type="number" min={0} value={price}
                  onChange={(e) => setPrice(Number(e.target.value))} />
              </div>
            </div>

            <button
              style={{ ...btn.primary, padding: '12px 28px', opacity: (!topic.trim() || loading) ? 0.5 : 1 }}
              disabled={!topic.trim() || loading}
              onClick={handleUploadAndGenerate}
            >
              {loading ? loadingMsg : 'Generate curriculum →'}
            </button>
            {submitError && (
              <div style={{
                marginTop: 14,
                padding: '12px 14px',
                border: `1px solid ${HC.red}`,
                background: 'rgba(196,34,27,0.06)',
                color: HC.ink,
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && curriculum && (
          <div>
            <h1 style={{ fontFamily: HC.serif, fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Review your curriculum.
            </h1>
            <p style={{ fontFamily: HC.serif, fontStyle: 'italic', color: HC.mute, fontSize: 17, margin: '0 0 32px' }}>
              Built entirely from your materials. Approve to publish.
            </p>

            <div style={{ background: HC.paper, border: `1px solid ${HC.ruleFaint}`, padding: '24px 28px', marginBottom: 28 }}>
              <div style={{ fontFamily: HC.serif, fontSize: 24, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 4 }}>{curriculum.title}</div>
              <div style={{ fontFamily: HC.mono, fontSize: 10, color: HC.mute, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 20 }}>
                {curriculum.level} · {curriculum.estimatedHours}h estimated
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={updateCurriculumSummary} style={{ ...btn.outline, padding: '10px 14px', fontSize: 10 }}>
                  Update curriculum
                </button>
                <span style={{ fontFamily: HC.mono, fontSize: 10, color: HC.mute, letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center' }}>
                  delete filler modules/lessons before publish
                </span>
              </div>
              {curriculum.modules.map((m, mi) => (
                <div key={m.title} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) 32px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: HC.mono, fontSize: 11, color: HC.red }}>
                      {String(mi + 1).padStart(2, '0')}
                    </span>
                    <input
                      value={m.title}
                      onChange={(e) => updateModuleTitle(mi, e.target.value)}
                      style={{ minWidth: 0, border: `1px solid ${HC.ruleFaint}`, background: HC.bg, color: HC.ink, padding: '8px 10px', fontFamily: HC.sans, fontSize: 14, fontWeight: 600 }}
                    />
                    <button onClick={() => removeModule(mi)} style={{ ...btn.ghost, padding: '6px 4px', color: HC.red, fontSize: 12 }} title="Remove module">
                      ×
                    </button>
                  </div>
                  {m.lessons.map((l, li) => (
                    <div key={l.title} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 68px 28px', gap: 8, marginLeft: 16, marginBottom: 6, fontSize: 13, color: HC.mute }}>
                      <input
                        value={l.title}
                        onChange={(e) => updateLesson(mi, li, { title: e.target.value })}
                        style={{ minWidth: 0, border: `1px solid ${HC.ruleFaint}`, background: HC.bg, color: HC.ink, padding: '7px 9px', fontFamily: HC.sans, fontSize: 13 }}
                      />
                      <input
                        value={l.objective}
                        onChange={(e) => updateLesson(mi, li, { objective: e.target.value })}
                        style={{ minWidth: 0, border: `1px solid ${HC.ruleFaint}`, background: HC.bg, color: HC.ink, padding: '7px 9px', fontFamily: HC.sans, fontSize: 13 }}
                      />
                      <input
                        type="number"
                        min={1}
                        value={l.minutes}
                        onChange={(e) => updateLesson(mi, li, { minutes: Number(e.target.value) })}
                        style={{ minWidth: 0, border: `1px solid ${HC.ruleFaint}`, background: HC.bg, color: HC.ink, padding: '7px 7px', fontFamily: HC.mono, fontSize: 10 }}
                      />
                      <button onClick={() => removeLesson(mi, li)} style={{ ...btn.ghost, padding: '6px 4px', color: HC.red, fontSize: 12 }} title="Remove lesson">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ ...btn.outline, padding: '12px 24px', fontSize: 13 }} onClick={() => setStep('upload')}>
                ← Re-upload
              </button>
              <button style={{ ...btn.primary, padding: '12px 28px', opacity: loading ? 0.5 : 1 }} disabled={loading} onClick={handlePublish}>
                {loading ? loadingMsg : 'Publish course →'}
              </button>
            </div>
            {submitError && (
              <div style={{
                marginTop: 14,
                padding: '12px 14px',
                border: `1px solid ${HC.red}`,
                background: 'rgba(196,34,27,0.06)',
                color: HC.ink,
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 56, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Published.
            </div>
            <div style={{ fontFamily: HC.mono, fontSize: 11, color: HC.mute, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Course ID
            </div>
            <div style={{ fontFamily: HC.mono, fontSize: 14, color: HC.ink, background: HC.paper, border: `1px solid ${HC.ruleFaint}`, padding: '10px 20px', display: 'inline-block', marginBottom: 32 }}>
              {publishedId}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button style={{ ...btn.outline, padding: '12px 24px' }} onClick={() => navigate('/browse')}>
                View marketplace →
              </button>
              <button style={{ ...btn.ghost, padding: '12px 24px' }} onClick={() => { setStep('token'); setFiles([]); setTopic(''); setCurriculum(null); }}>
                Create another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
