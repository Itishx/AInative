import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

interface ChromeProps {
  label?: string;
  right?: React.ReactNode;
}

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export function Chrome({ label, right }: ChromeProps) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, dark, toggle } = useTheme();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?';

  return (
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
  );
}
