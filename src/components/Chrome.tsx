import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

function SettingsCorner() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { dark, t } = useTheme();
  const isActive = loc.pathname === '/settings';
  return (
    <button
      onClick={() => navigate('/settings')}
      title="Settings"
      style={{
        position: 'fixed',
        bottom: 28,
        left: 28,
        zIndex: 50,
        width: 36,
        height: 36,
        borderRadius: 999,
        border: `1px solid ${isActive ? t.ink : (dark ? 'rgba(241,236,223,0.12)' : 'rgba(26,21,16,0.12)')}`,
        background: isActive ? t.ink : (dark ? 'rgba(28,26,22,0.80)' : 'rgba(250,247,240,0.84)'),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.24)' : '0 4px 16px rgba(26,21,16,0.09)',
        cursor: 'pointer',
        color: isActive ? (dark ? t.bg : '#faf7f0') : t.mute,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 160ms ease',
        padding: 0,
      }}
      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color = t.ink as string; (e.currentTarget as HTMLButtonElement).style.borderColor = t.ink as string; } }}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.color = t.mute as string; (e.currentTarget as HTMLButtonElement).style.borderColor = dark ? 'rgba(241,236,223,0.12)' : 'rgba(26,21,16,0.12)'; } }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}

interface ChromeProps {
  label?: string;
  right?: React.ReactNode;
}

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/learners', label: 'Learners' },
];

export function AppNav() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { dark, toggle, t } = useTheme();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onDashboard = loc.pathname === '/dashboard';

  return (
    <>
      <SettingsCorner />
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: 22,
          left: 48,
          zIndex: 50,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          opacity: scrolled ? 0 : 1,
          pointerEvents: scrolled ? 'none' : 'auto',
          transition: 'opacity 0.2s ease',
        }}
      >
        <b style={{ fontFamily: t.serif, fontSize: 26, fontWeight: 400, letterSpacing: '-0.055em', color: t.ink }}>Learnor</b>
      </button>

      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 24,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px',
          borderRadius: 999,
          border: `1px solid ${dark ? 'rgba(241,236,223,0.10)' : 'rgba(26,21,16,0.12)'}`,
          background: dark ? 'rgba(28,26,22,0.80)' : 'rgba(250,247,240,0.84)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.28)' : '0 8px 32px rgba(26,21,16,0.09)',
        }}
      >
        <button
          onClick={toggle}
          title={dark ? 'Light mode' : 'Dark mode'}
          style={{
            width: 38,
            height: 38,
            border: `1px solid ${dark ? 'rgba(241,236,223,0.10)' : 'rgba(26,21,16,0.12)'}`,
            borderRadius: 999,
            background: 'transparent',
            color: t.ink,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: t.mono,
            fontSize: 13,
          }}
        >
          {dark ? '☀' : '☾'}
        </button>

        <button
          onClick={() => navigate(onDashboard ? '/profile' : '/dashboard')}
          style={{
            border: `1px solid ${dark ? 'rgba(241,236,223,0.10)' : 'rgba(26,21,16,0.12)'}`,
            borderRadius: 999,
            background: 'transparent',
            color: t.ink,
            cursor: 'pointer',
            padding: '0 14px',
            height: 38,
            fontFamily: t.mono,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {onDashboard ? 'Profile' : 'Dashboard'}
        </button>
      </div>
    </>
  );
}

export function Chrome({ label, right }: ChromeProps) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, dark, toggle } = useTheme();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?';

  return (
    <>
    <SettingsCorner />
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      padding: '18px 22px 10px',
      background: dark
        ? 'linear-gradient(to bottom, rgba(20,18,16,0.95), rgba(20,18,16,0.5), transparent)'
        : 'linear-gradient(to bottom, rgba(244,240,232,0.92), rgba(244,240,232,0.45), transparent)',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        maxWidth: 1180,
        margin: '0 auto',
        padding: '14px 18px',
        border: `1px solid ${t.ruleFaint}`,
        borderRadius: 999,
        background: dark ? 'rgba(28,26,22,0.88)' : 'rgba(250,247,240,0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: dark ? '0 18px 50px rgba(0,0,0,0.3)' : '0 18px 50px rgba(26,21,16,0.10)',
        fontFamily: t.mono,
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: t.ink,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 360px', minWidth: 0, flexWrap: 'wrap' }}>
          <Link to="/" style={{
            textDecoration: 'none',
            color: t.ink,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <b style={{ fontFamily: t.serif, fontSize: 25, fontWeight: 400, letterSpacing: '-0.055em', textTransform: 'none' }}>Learnor</b>
          </Link>

          {label && (
            <div style={{
              minWidth: 0,
              maxWidth: 320,
              padding: '10px 14px',
              borderRadius: 999,
              background: dark ? 'rgba(241,236,223,0.06)' : 'rgba(26,21,16,0.04)',
              color: t.mute,
              fontSize: 10,
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {label}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 5,
          borderRadius: 999,
          background: dark ? 'rgba(241,236,223,0.06)' : 'rgba(26,21,16,0.05)',
          flexWrap: 'wrap',
        }}>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} style={{
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: loc.pathname.startsWith(n.to) ? (dark ? t.bg : '#faf7f0') : t.mute,
              background: loc.pathname.startsWith(n.to) ? t.ink : 'transparent',
              padding: '10px 15px',
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
            }}>{n.label}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {right && (
            <div style={{ color: t.mute, whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: 999, background: dark ? 'rgba(241,236,223,0.06)' : 'rgba(26,21,16,0.04)' }}>
              {right}
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title={dark ? 'Light mode' : 'Dark mode'}
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: dark ? 'rgba(241,236,223,0.08)' : 'rgba(26,21,16,0.06)',
              border: `1px solid ${t.ruleFaint}`,
              color: t.ink, cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {dark ? '☀' : '☾'}
          </button>

          {user && (
            <button
              onClick={() => navigate('/settings')}
              title="Settings"
              style={{
                width: 36, height: 36,
                borderRadius: 999,
                background: t.ink,
                color: dark ? t.bg : '#faf7f0',
                border: 'none',
                cursor: 'pointer',
                fontFamily: t.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initials}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
