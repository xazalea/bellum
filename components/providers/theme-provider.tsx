'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { themes } from '@/lib/themes';

const STORAGE_KEY = 'bellum-theme';
const DEFAULT_THEME = 'challenger-gold';

type Mode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: string;
  mode: Mode;
  resolvedMode: 'dark' | 'light';
  setTheme: (theme: string) => void;
  setMode: (mode: Mode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  mode: 'dark',
  resolvedMode: 'dark',
  setTheme: () => {},
  setMode: () => {},
  cycleMode: () => {},
});

function getSystemDarkMode(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveMode(mode: Mode): 'dark' | 'light' {
  if (mode === 'system') return getSystemDarkMode();
  return mode;
}

function applyThemeToDOM(themeName: string, resolvedMode: 'dark' | 'light') {
  const theme = themes.find(t => t.name === themeName);
  if (!theme) return;
  const colors = resolvedMode === 'dark' ? theme.dark : theme.light;
  const root = document.documentElement;
  const vars: Record<string, string> = {
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--card': colors.card,
    '--card-foreground': colors.cardForeground,
    '--popover': colors.popover,
    '--popover-foreground': colors.popoverForeground,
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground,
    '--muted': colors.muted,
    '--muted-foreground': colors.mutedForeground,
    '--accent': colors.accent,
    '--accent-foreground': colors.accentForeground,
    '--destructive': colors.destructive,
    '--destructive-foreground': colors.destructiveForeground,
    '--border': colors.border,
    '--input': colors.input,
    '--ring': colors.ring,
    '--radius': colors.radius,
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string>(DEFAULT_THEME);
  const [mode, setModeState] = useState<Mode>('dark');
  const [resolvedMode, setResolvedMode] = useState<'dark' | 'light'>('dark');

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.theme) setThemeState(prefs.theme);
        if (prefs.mode) setModeState(prefs.mode);
      }
    } catch {}
  }, []);

  // Resolve mode and apply theme whenever theme or mode changes
  useEffect(() => {
    const resolved = resolveMode(mode);
    setResolvedMode(resolved);
    applyThemeToDOM(theme, resolved);

    // Persist
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, mode }));
    } catch {}
  }, [theme, mode]);

  // Listen for system dark mode changes
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = getSystemDarkMode();
      setResolvedMode(resolved);
      applyThemeToDOM(theme, resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, theme]);

  const setTheme = useCallback((t: string) => setThemeState(t), []);
  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const cycleMode = useCallback(() => {
    setModeState(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, resolvedMode, setTheme, setMode, cycleMode }}>
      <div className={resolvedMode === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
