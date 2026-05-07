import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { HC } from '../theme';
import {
  ROLE_OPTIONS,
  OCCUPATION_SUGGESTIONS,
  LEARNING_GOAL_OPTIONS,
  buildLearningGoalSummary,
  buildOnboardingHeadline,
  labelForOption,
} from '../lib/onboarding';

const STEP_COUNT = 3;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, dispatch, remoteLoaded } = useStore();
  const [step, setStep] = useState(0);
  const [bestDescribesYou, setBestDescribesYou] = useState(state.profile?.bestDescribesYou ?? '');
  const [occupation, setOccupation] = useState(state.profile?.occupation ?? '');
  const [learningGoals, setLearningGoals] = useState<string[]>(state.profile?.learningGoals ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [stacked, setStacked] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1040);

  useEffect(() => {
    if (!remoteLoaded) return;
    setBestDescribesYou(state.profile?.bestDescribesYou ?? '');
    setOccupation(state.profile?.occupation ?? '');
    setLearningGoals(state.profile?.learningGoals ?? []);
  }, [remoteLoaded, state.profile?.bestDescribesYou, state.profile?.occupation, state.profile?.learningGoals]);

  useEffect(() => {
    const onResize = () => setStacked(window.innerWidth < 1040);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!remoteLoaded) return;
    if (state.profile?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, remoteLoaded, state.profile?.onboardingCompleted]);

  const profileLabel = state.profile?.displayName?.trim()
    || state.username
    || user?.email?.split('@')[0]
    || 'learner';
  const roleLabel = labelForOption(ROLE_OPTIONS, bestDescribesYou);
  const goalLabels = buildLearningGoalSummary(learningGoals);
  const suggestedHeadline = useMemo(() => buildOnboardingHeadline({
    ...state.profile,
    bestDescribesYou,
    occupation,
    learningGoals,
  }), [bestDescribesYou, occupation, learningGoals, state.profile]);

  function toggleGoal(goalId: string) {
    setLearningGoals((current) => {
      if (current.includes(goalId)) return current.filter((id) => id !== goalId);
      if (current.length >= 3) return [...current.slice(1), goalId];
      return [...current, goalId];
    });
  }

  function canContinue() {
    if (step === 0) return !!bestDescribesYou;
    if (step === 1) return occupation.trim().length > 1;
    return learningGoals.length > 0;
  }

  async function handleFinish() {
    if (!user?.id) return;
    setSaving(true);
    setSaveError('');

    const profile = {
      ...state.profile,
      bestDescribesYou,
      occupation: occupation.trim(),
      learningGoals,
      onboardingCompleted: true,
      headline: state.profile?.headline?.trim() || suggestedHeadline,
    };

    dispatch({ type: 'SET_PROFILE', profile });

    try {
      const { error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: user.id,
          courses: state.courses,
          username: state.username,
          profile,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setSaveError((err as Error).message || 'Could not save onboarding.');
      setSaving(false);
    }
  }

  if (!remoteLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#171410', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.5)' }}>
          Loading your setup…
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#171410',
      color: HC.paper,
      display: 'grid',
      gridTemplateColumns: stacked ? 'minmax(0, 1fr)' : 'minmax(320px, 0.92fr) minmax(0, 1.08fr)',
    }}>
      <section style={{
        position: 'relative',
        padding: '48px clamp(28px, 4vw, 56px)',
        borderRight: stacked ? 'none' : '1px solid rgba(250,247,240,0.1)',
        borderBottom: stacked ? '1px solid rgba(250,247,240,0.1)' : 'none',
        background: 'radial-gradient(circle at top left, rgba(255,81,72,0.16), transparent 28%), radial-gradient(circle at bottom left, rgba(250,247,240,0.08), transparent 36%), #120f0c',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 32,
      }}>
        <div>
          <div style={{ fontFamily: HC.serif, fontSize: 30, letterSpacing: '-0.05em', color: HC.paper }}>
            Learnor
          </div>
          <div style={{ marginTop: 60, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ff6b5b' }}>
            Welcome in
          </div>
          <h1 style={{ margin: '16px 0 18px', fontFamily: HC.serif, fontSize: 'clamp(54px, 7vw, 94px)', lineHeight: 0.92, letterSpacing: '-0.06em', fontWeight: 400 }}>
            Let’s shape
            <br />
            your path.
          </h1>
          <p style={{ maxWidth: 420, margin: 0, fontFamily: HC.sans, fontSize: 17, lineHeight: 1.6, color: 'rgba(250,247,240,0.72)' }}>
            A few quick answers help Learnor recommend stronger starting points, better Browse cards, and a cleaner first course for {profileLabel}.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {[
            {
              label: 'Best describes you',
              value: roleLabel || 'Choose one role to shape your starting point.',
              active: step === 0,
              done: !!bestDescribesYou,
            },
            {
              label: 'Current occupation',
              value: occupation.trim() || 'Tell Learnor what you do right now.',
              active: step === 1,
              done: occupation.trim().length > 1,
            },
            {
              label: 'What you want to learn',
              value: goalLabels.length ? goalLabels.join(' · ') : 'Pick up to three focus areas.',
              active: step === 2,
              done: learningGoals.length > 0,
            },
          ].map((item, index) => (
            <div key={item.label} style={{
              padding: '18px 20px',
              border: `1px solid ${item.active ? 'rgba(255,81,72,0.55)' : 'rgba(250,247,240,0.12)'}`,
              background: item.active ? 'rgba(255,81,72,0.08)' : 'rgba(250,247,240,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: item.active ? '#ff6b5b' : 'rgba(250,247,240,0.5)' }}>
                  {String(index + 1).padStart(2, '0')} · {item.label}
                </div>
                {item.done && (
                  <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7ad08b' }}>
                    saved
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, fontFamily: HC.sans, fontSize: 14, lineHeight: 1.55, color: 'rgba(250,247,240,0.74)' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{
        padding: '48px clamp(28px, 5vw, 72px) 56px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 36,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginBottom: 30 }}>
            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.42)' }}>
              Step {step + 1} of {STEP_COUNT}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Array.from({ length: STEP_COUNT }, (_, index) => (
                <div key={index} style={{
                  width: 54,
                  height: 4,
                  background: index <= step ? HC.paper : 'rgba(250,247,240,0.12)',
                  opacity: index <= step ? 1 : 0.55,
                }} />
              ))}
            </div>
          </div>

          {step === 0 && (
            <>
              <h2 style={{ margin: 0, fontFamily: HC.serif, fontSize: 'clamp(38px, 5vw, 70px)', lineHeight: 0.95, letterSpacing: '-0.055em', fontWeight: 400 }}>
                What best describes you?
              </h2>
              <p style={{ maxWidth: 560, margin: '16px 0 0', fontFamily: HC.sans, fontSize: 16, lineHeight: 1.6, color: 'rgba(250,247,240,0.68)' }}>
                This helps Learnor pick better examples, better starting points, and smarter course prompts.
              </p>
              <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {ROLE_OPTIONS.map((option) => {
                  const active = bestDescribesYou === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setBestDescribesYou(option.id)}
                      style={{
                        textAlign: 'left',
                        padding: '18px 20px',
                        background: active ? HC.paper : 'rgba(250,247,240,0.04)',
                        color: active ? HC.ink : HC.paper,
                        border: `1px solid ${active ? HC.paper : 'rgba(250,247,240,0.12)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: active ? 'rgba(23,20,16,0.6)' : '#ff6b5b' }}>
                        {option.label}
                      </div>
                      <div style={{ marginTop: 10, fontFamily: HC.sans, fontSize: 14, lineHeight: 1.55, color: active ? 'rgba(23,20,16,0.72)' : 'rgba(250,247,240,0.68)' }}>
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 style={{ margin: 0, fontFamily: HC.serif, fontSize: 'clamp(38px, 5vw, 70px)', lineHeight: 0.95, letterSpacing: '-0.055em', fontWeight: 400 }}>
                What’s your current occupation?
              </h2>
              <p style={{ maxWidth: 560, margin: '16px 0 0', fontFamily: HC.sans, fontSize: 16, lineHeight: 1.6, color: 'rgba(250,247,240,0.68)' }}>
                Pick a suggested answer or type your own. We use this to make Browse recommendations feel less generic.
              </p>
              <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {OCCUPATION_SUGGESTIONS.map((suggestion) => {
                  const active = occupation.trim().toLowerCase() === suggestion.toLowerCase();
                  return (
                    <button
                      key={suggestion}
                      onClick={() => setOccupation(suggestion)}
                      style={{
                        border: `1px solid ${active ? HC.paper : 'rgba(250,247,240,0.14)'}`,
                        background: active ? HC.paper : 'transparent',
                        color: active ? HC.ink : HC.paper,
                        padding: '10px 14px',
                        fontFamily: HC.mono,
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      {suggestion}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.45)', marginBottom: 8 }}>
                  Your answer
                </div>
                <input
                  value={occupation}
                  onChange={(event) => setOccupation(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canContinue()) {
                      event.preventDefault();
                      setStep(2);
                    }
                  }}
                  placeholder="e.g. Backend engineer, CA student, growth marketer..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '16px 18px',
                    background: 'rgba(250,247,240,0.04)',
                    border: '1px solid rgba(250,247,240,0.14)',
                    color: HC.paper,
                    fontFamily: HC.sans,
                    fontSize: 16,
                    outline: 'none',
                  }}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ margin: 0, fontFamily: HC.serif, fontSize: 'clamp(38px, 5vw, 70px)', lineHeight: 0.95, letterSpacing: '-0.055em', fontWeight: 400 }}>
                What do you want to learn right now?
              </h2>
              <p style={{ maxWidth: 560, margin: '16px 0 0', fontFamily: HC.sans, fontSize: 16, lineHeight: 1.6, color: 'rgba(250,247,240,0.68)' }}>
                Pick up to three. Learnor will use these to seed your Browse recommendations and default starting prompts.
              </p>
              <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
                {LEARNING_GOAL_OPTIONS.map((option) => {
                  const active = learningGoals.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleGoal(option.id)}
                      style={{
                        textAlign: 'left',
                        padding: '18px 20px',
                        background: active ? 'rgba(250,247,240,0.1)' : 'rgba(250,247,240,0.04)',
                        color: HC.paper,
                        border: `1px solid ${active ? HC.paper : 'rgba(250,247,240,0.12)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: active ? HC.paper : '#ff6b5b' }}>
                          {option.label}
                        </div>
                        {active && (
                          <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7ad08b' }}>
                            added
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: 10, fontFamily: HC.sans, fontSize: 14, lineHeight: 1.55, color: 'rgba(250,247,240,0.68)' }}>
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div>
          {saveError && (
            <div style={{ marginBottom: 16, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.08em', color: '#ff6b5b', lineHeight: 1.6 }}>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <button
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || saving}
              style={{
                border: 'none',
                background: 'transparent',
                color: step === 0 ? 'rgba(250,247,240,0.28)' : 'rgba(250,247,240,0.62)',
                cursor: step === 0 || saving ? 'not-allowed' : 'pointer',
                padding: 0,
                fontFamily: HC.mono,
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Back
            </button>

            {step < STEP_COUNT - 1 ? (
              <button
                onClick={() => setStep((current) => Math.min(STEP_COUNT - 1, current + 1))}
                disabled={!canContinue()}
                style={{
                  padding: '14px 22px',
                  background: canContinue() ? HC.paper : 'rgba(250,247,240,0.12)',
                  color: canContinue() ? HC.ink : 'rgba(250,247,240,0.42)',
                  border: 'none',
                  fontFamily: HC.mono,
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: canContinue() ? 'pointer' : 'not-allowed',
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canContinue() || saving}
                style={{
                  padding: '14px 22px',
                  background: canContinue() && !saving ? HC.paper : 'rgba(250,247,240,0.12)',
                  color: canContinue() && !saving ? HC.ink : 'rgba(250,247,240,0.42)',
                  border: 'none',
                  fontFamily: HC.mono,
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: canContinue() && !saving ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Saving…' : 'Finish setup →'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
