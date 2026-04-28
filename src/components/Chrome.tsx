import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HC } from '../theme';

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

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      padding: '18px 22px 10px',
      background: 'linear-gradient(to bottom, rgba(244,240,232,0.92), rgba(244,240,232,0.45), transparent)',
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
        border: `1px solid rgba(26,21,16,0.08)`,
        borderRadius: 999,
        background: 'rgba(250,247,240,0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 18px 50px rgba(26,21,16,0.10)',
        fontFamily: HC.mono,
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: HC.ink,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 360px', minWidth: 0, flexWrap: 'wrap' }}>
          <Link to="/" style={{
            textDecoration: 'none',
            color: HC.ink,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 999,
            background: 'rgba(26,21,16,0.045)',
            flexShrink: 0,
          }}>
            <span style={{ width: 9, height: 9, background: HC.red, display: 'inline-block', borderRadius: 999, flexShrink: 0, transform: 'translateY(-3px)' }} />
            <b style={{ fontFamily: HC.serif, fontSize: 25, fontWeight: 400, letterSpacing: '-0.055em', textTransform: 'none' }}>Learnor</b>
          </Link>

          {label && (
            <div style={{
              minWidth: 0,
              maxWidth: 320,
              padding: '10px 14px',
              borderRadius: 999,
              background: 'rgba(26,21,16,0.04)',
              color: HC.ink,
              fontSize: 10,
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            >
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
          background: 'rgba(26,21,16,0.05)',
          flexWrap: 'wrap',
        }}>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} style={{
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: loc.pathname.startsWith(n.to) ? HC.paper : HC.mute,
              background: loc.pathname.startsWith(n.to) ? HC.ink : 'rgba(250,247,240,0.55)',
              padding: '10px 15px',
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
            }}>{n.label}</Link>
          ))}
        </div>

        {right && (
          <div style={{
            color: HC.mute,
            whiteSpace: 'nowrap',
            padding: '10px 14px',
            borderRadius: 999,
            background: 'rgba(26,21,16,0.04)',
          }}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
}
