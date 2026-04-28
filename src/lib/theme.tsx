import React, { createContext, useContext, useState, useEffect } from 'react';
import { HC, HCDark, type Colors } from '../theme';

interface ThemeCtx {
  dark: boolean;
  toggle: () => void;
  t: Colors;
}

const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {}, t: HC });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('ain_dark') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('ain_dark', String(dark)); } catch {}
    document.body.style.background = dark ? HCDark.bg : HC.bg;
    document.body.style.color = dark ? HCDark.ink : HC.ink;
  }, [dark]);

  return (
    <Ctx.Provider value={{ dark, toggle: () => setDark((d) => !d), t: dark ? HCDark : HC }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  return useContext(Ctx);
}
