import { useState } from 'react';
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
    padding: '12px 14px',
    background: 'rgba(250,247,240,0.06)',
    border: '1px solid rgba(250,247,240,0.14)',
    borderRadius: 10,
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.45)', marginBottom: 14 }}>
            AINative
          </div>
          <div style={{ fontFamily: HC.serif, fontSize: 42, lineHeight: 1, letterSpacing: '-0.03em', color: HC.paper }}>
            {mode === 'login' ? 'Welcome back.' : 'Get started.'}
          </div>
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
            <div style={{ fontFamily: HC.mono, fontSize: 11, color: '#ff6b5b', letterSpacing: '0.04em', padding: '10px 12px', background: 'rgba(196,34,27,0.12)', borderRadius: 8, border: '1px solid rgba(196,34,27,0.22)' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ fontFamily: HC.mono, fontSize: 11, color: '#7ad08b', letterSpacing: '0.04em', padding: '10px 12px', background: 'rgba(45,106,63,0.12)', borderRadius: 8, border: '1px solid rgba(45,106,63,0.22)' }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              background: HC.paper,
              color: HC.ink,
              border: 'none',
              borderRadius: 10,
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

        <div style={{ marginTop: 24, textAlign: 'center' }}>
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
            }}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
