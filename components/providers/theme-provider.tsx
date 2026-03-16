'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { themes, getTheme, applyTheme, type Theme } from '@/lib/themes';

type ColorMode = 'light' | 'dark';

interface ThemeContextType {
  themeName: string;
  colorMode: ColorMode;
  theme: Theme;
  allThemes: Theme[];
  setThemeName: (name: string) => void;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState('default');
  const [colorMode, setColorModeState] = useState<ColorMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('challenger-theme');
    const savedMode = localStorage.getItem('challenger-color-mode') as ColorMode | null;

    if (saved) setThemeNameState(saved);
    if (savedMode) {
      setColorModeState(savedMode);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setColorModeState('dark');
    } else {
      setColorModeState('light');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = getTheme(themeName);
    applyTheme(theme, colorMode);

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(colorMode);

    localStorage.setItem('challenger-theme', themeName);
    localStorage.setItem('challenger-color-mode', colorMode);
  }, [themeName, colorMode, mounted]);

  const setThemeName = useCallback((name: string) => {
    setThemeNameState(name);
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const theme = getTheme(themeName);

  return (
    <ThemeContext.Provider
      value={{
        themeName,
        colorMode,
        theme,
        allThemes: themes,
        setThemeName,
        toggleColorMode,
        setColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
