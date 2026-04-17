'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { themes } from '@/lib/themes';

export function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentTheme = themes.find(t => t.name === theme);

  // Group themes
  const coreThemes = themes.filter(t => !t.name.startsWith('tweakcn-'));
  const communityThemes = themes.filter(t => t.name.startsWith('tweakcn-'));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost h-8 px-2.5 text-[10px] font-medium"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        {currentTheme?.label || 'Theme'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-fade-in">
          {/* Mode toggle */}
          <div className="p-3 border-b border-border">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-2">Mode</p>
            <div className="flex border border-border rounded overflow-hidden">
              {(['dark', 'light', 'system'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 px-2 h-7 text-[10px] font-medium transition-colors ${
                    mode === m
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Theme grid */}
          <div className="p-3 max-h-64 overflow-y-auto">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-2">Themes</p>
            <div className="grid grid-cols-4 gap-1.5">
              {coreThemes.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTheme(t.name)}
                  className={`group flex flex-col items-center gap-1 p-1.5 rounded transition-colors ${
                    theme === t.name ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  title={t.label}
                >
                  <div className="w-6 h-6 rounded-full border border-border overflow-hidden flex">
                    <div
                      className="w-1/2 h-full"
                      style={{ backgroundColor: `hsl(${t.dark.primary})` }}
                    />
                    <div
                      className="w-1/2 h-full"
                      style={{ backgroundColor: `hsl(${t.dark.background})` }}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground truncate w-full text-center leading-tight">
                    {t.label.length > 8 ? t.label.slice(0, 7) + '…' : t.label}
                  </span>
                </button>
              ))}
            </div>

            {communityThemes.length > 0 && (
              <>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-2 mt-3">Community</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {communityThemes.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setTheme(t.name)}
                      className={`group flex flex-col items-center gap-1 p-1.5 rounded transition-colors ${
                        theme === t.name ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      title={t.label}
                    >
                      <div className="w-6 h-6 rounded-full border border-border overflow-hidden flex">
                        <div
                          className="w-1/2 h-full"
                          style={{ backgroundColor: `hsl(${t.dark.primary})` }}
                        />
                        <div
                          className="w-1/2 h-full"
                          style={{ backgroundColor: `hsl(${t.dark.background})` }}
                        />
                      </div>
                      <span className="text-[8px] text-muted-foreground truncate w-full text-center leading-tight">
                        {t.label.replace('TW: ', '').length > 8
                          ? t.label.replace('TW: ', '').slice(0, 7) + '…'
                          : t.label.replace('TW: ', '')}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
