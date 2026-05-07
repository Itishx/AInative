import { useEffect, useState } from 'react';
import { HC } from '../theme';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stacked, setStacked] = useState(() => typeof window !== 'undefined' && window.innerWidth < 980);

  useEffect(() => {
    const onResize = () => setStacked(window.innerWidth < 980);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function handleGoogle() {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Check your email to confirm your account, then log in.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(250,247,240,0.06)',
    border: '1px solid rgba(250,247,240,0.12)',
    color: HC.paper,
    fontFamily: HC.sans,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#171410',
      display: 'grid',
      gridTemplateColumns: stacked ? 'minmax(0, 1fr)' : 'minmax(320px, 1.05fr) minmax(360px, 0.95fr)',
      color: HC.paper,
    }}>
      <section style={{
        padding: '48px clamp(28px, 5vw, 64px)',
        borderRight: stacked ? 'none' : '1px solid rgba(250,247,240,0.1)',
        borderBottom: stacked ? '1px solid rgba(250,247,240,0.1)' : 'none',
        background: 'radial-gradient(circle at top left, rgba(255,81,72,0.18), transparent 26%), radial-gradient(circle at 20% 85%, rgba(250,247,240,0.08), transparent 32%), #120f0c',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 32,
      }}>
        <div>
          <div style={{ fontFamily: HC.serif, fontSize: 32, letterSpacing: '-0.05em' }}>
            Learnor
          </div>
          <div style={{ marginTop: 72, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ff6b5b' }}>
            Deadline-driven AI learning
          </div>
          <h1 style={{ margin: '16px 0 18px', fontFamily: HC.serif, fontSize: 'clamp(56px, 7vw, 98px)', lineHeight: 0.9, letterSpacing: '-0.06em', fontWeight: 400 }}>
            Learn faster.
            <br />
            Keep it moving.
          </h1>
          <p style={{ maxWidth: 470, margin: 0, fontFamily: HC.sans, fontSize: 17, lineHeight: 1.65, color: 'rgba(250,247,240,0.72)' }}>
            Learnor gives you a tutor, an interactive workspace, and a real finish line. Sign in, answer a few onboarding questions, and we will shape the first courses around what fits you.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {[
            'Tutor chat on the left. Workspace on the right.',
            'Coding lessons open hands-on practice inside the lesson.',
            'Study mode turns notes or PDFs into notes, quizzes, and drills.',
          ].map((item, index) => (
            <div key={item} style={{ padding: '16px 18px', border: '1px solid rgba(250,247,240,0.1)', background: 'rgba(250,247,240,0.04)' }}>
              <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: index === 0 ? '#ff6b5b' : 'rgba(250,247,240,0.42)' }}>
                0{index + 1}
              </div>
              <div style={{ marginTop: 9, fontFamily: HC.sans, fontSize: 14, lineHeight: 1.55, color: 'rgba(250,247,240,0.76)' }}>
                {item}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{
        display: 'grid',
        placeItems: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: 430, background: 'rgba(250,247,240,0.03)', border: '1px solid rgba(250,247,240,0.1)', padding: '30px 28px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.42)', marginBottom: 14 }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </div>
            <div style={{ fontFamily: HC.serif, fontSize: 46, lineHeight: 0.96, letterSpacing: '-0.05em', color: HC.paper }}>
              {mode === 'login' ? 'Pick up where you left off.' : 'Start your first deadline.'}
            </div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(250,247,240,0.07)',
              border: '1px solid rgba(250,247,240,0.14)',
              color: HC.paper,
              fontFamily: HC.sans,
              fontSize: 15,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.55 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(250,247,240,0.1)' }} />
            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.3)' }}>or</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(250,247,240,0.1)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />

            {error && (
              <div style={{ fontFamily: HC.mono, fontSize: 11, color: '#ff6b5b', letterSpacing: '0.04em', padding: '10px 12px', background: 'rgba(196,34,27,0.12)', border: '1px solid rgba(196,34,27,0.22)' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ fontFamily: HC.mono, fontSize: 11, color: '#7ad08b', letterSpacing: '0.04em', padding: '10px 12px', background: 'rgba(45,106,63,0.12)', border: '1px solid rgba(45,106,63,0.22)' }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '15px',
                background: HC.paper,
                color: HC.ink,
                border: 'none',
                fontFamily: HC.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.55 : 1,
                marginTop: 4,
              }}
            >
              {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: HC.mono,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(250,247,240,0.45)',
                padding: 0,
              }}
            >
              {mode === 'login' ? "Need an account? Sign up" : 'Already signed up? Sign in'}
            </button>
            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.32)' }}>
              Takes under a minute
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
