'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { useState, useRef, useEffect } from 'react';
import { Palette, Moon, Sun, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeSwitcher() {
  const { themeName, colorMode, allThemes, setThemeName, toggleColorMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={toggleColorMode}
          title={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {colorMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setOpen(!open)}
          title="Change theme"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-h-[400px] overflow-auto rounded-xl border bg-popover p-3 shadow-lg z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="mb-2 px-1">
            <p className="text-sm font-semibold">Theme</p>
            <p className="text-xs text-muted-foreground">Choose from {allThemes.length} themes</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {allThemes.map(t => {
              const colors = colorMode === 'dark' ? t.dark : t.light;
              const isActive = t.name === themeName;
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    setThemeName(t.name);
                    setOpen(false);
                  }}
                  className={`relative flex flex-col items-center gap-1 rounded-lg p-2 text-xs transition-all hover:bg-accent ${
                    isActive ? 'ring-2 ring-primary bg-accent' : ''
                  }`}
                  title={t.label}
                >
                  <div className="flex gap-0.5">
                    <div
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: `hsl(${colors.primary})` }}
                    />
                    <div
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: `hsl(${colors.background})` }}
                    />
                  </div>
                  <span className="text-[10px] leading-tight truncate w-full text-center text-muted-foreground">
                    {t.label}
                  </span>
                  {isActive && (
                    <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2 w-2 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
