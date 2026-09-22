import React, { createContext, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = 'idp_theme';

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  resolvedMode: 'light',
  setThemeMode: () => undefined,
});

interface ThemeProviderProps {
  children: ReactNode;
}

const applyThemeClass = (theme: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${theme}`);
  root.style.colorScheme = theme;
};

const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return 'light';
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);

  // Only two themes exist (Light / Dark), so the resolved theme is always
  // the same as the selected mode. Kept as a separate value for API
  // compatibility with components that read `resolvedMode`.
  const resolvedMode = useMemo<ResolvedTheme>(() => mode, [mode]);

  // Apply synchronously before the browser paints, so there is no flash of
  // the wrong theme on refresh, login, or navigation.
  useLayoutEffect(() => {
    applyThemeClass(resolvedMode);
  }, [resolvedMode]);

  // Keep theme in sync across browser tabs/windows.
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || !event.newValue) return;
      if (event.newValue === 'light' || event.newValue === 'dark') {
        setMode(event.newValue);
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, []);

  const value = useMemo(
    () => ({ mode, resolvedMode, setThemeMode }),
    [mode, resolvedMode, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
