import { useState, useEffect } from 'react';
import { HC } from '../theme';
import { useTheme } from '../lib/theme';

function msLeft(deadline: string, paused: boolean): number {
  if (paused) return Infinity;
  return new Date(deadline).getTime() - Date.now();
}

interface CountdownProps {
  deadline: string;
  paused: boolean;
  size?: number;
}

export function Countdown({ deadline, paused, size = 44 }: CountdownProps) {
  const [ms, setMs] = useState(() => msLeft(deadline, paused));

  useEffect(() => {
    if (paused) { setMs(Infinity); return; }
    setMs(msLeft(deadline, false));
    const id = setInterval(() => setMs(msLeft(deadline, false)), 30000);
    return () => clearInterval(id);
  }, [deadline, paused]);

  if (paused) {
    return (
      <span style={{ fontFamily: HC.mono, fontSize: size * 0.3, letterSpacing: '0.1em', textTransform: 'uppercase', color: HC.amber }}>
        paused
      </span>
    );
  }

  const gone = ms <= 0;
  const totalH = Math.max(0, Math.floor(ms / 3600000));
  const days = Math.floor(totalH / 24);
  const hours = totalH % 24;
  const danger = !gone && ms < 72 * 3600000;
  const col = gone ? HC.mute : danger ? HC.red : HC.ink;

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: col, fontFamily: HC.serif }}>
      {gone ? (
        <span style={{ fontFamily: HC.mono, fontSize: size * 0.5, letterSpacing: '0.1em', fontStyle: 'italic' }}>expired.</span>
      ) : (
        <>
          <span style={{ fontSize: size, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {String(days).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: HC.mono, fontSize: size * 0.22, letterSpacing: '0.1em', textTransform: 'uppercase', color: HC.mute }}>d</span>
          <span style={{ fontSize: size, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, marginLeft: 6 }}>
            {String(hours).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: HC.mono, fontSize: size * 0.22, letterSpacing: '0.1em', textTransform: 'uppercase', color: HC.mute }}>h</span>
        </>
      )}
    </div>
  );
}

export function CountdownInline({ deadline, paused }: { deadline: string; paused: boolean }) {
  const { t } = useTheme();
  const [ms, setMs] = useState(() => msLeft(deadline, paused));
  useEffect(() => {
    if (paused) { setMs(Infinity); return; }
    setMs(msLeft(deadline, false));
    const id = setInterval(() => setMs(msLeft(deadline, false)), 30000);
    return () => clearInterval(id);
  }, [deadline, paused]);

  if (paused) return <span style={{ color: t.amber, fontFamily: HC.mono, fontSize: 11 }}>paused</span>;
  if (ms <= 0) return <span style={{ color: t.mute, fontStyle: 'italic', fontFamily: HC.serif }}>expired</span>;

  const totalH = Math.floor(ms / 3600000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  const danger = ms < 72 * 3600000;
  return (
    <span style={{ fontFamily: HC.serif, fontStyle: 'italic', color: danger ? t.red : t.ink }}>
      {d}d {String(h).padStart(2, '0')}h
    </span>
  );
}
