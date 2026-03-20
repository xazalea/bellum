'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { X, Search, Moon, Sun, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemePanelProps {
  open: boolean;
  onClose: () => void;
}

export function ThemePanel({ open, onClose }: ThemePanelProps) {
  const { themeName, colorMode, allThemes, setThemeName, toggleColorMode } = useTheme();
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? allThemes.filter(t => t.label.toLowerCase().includes(query.toLowerCase()) || t.name.includes(query.toLowerCase()))
    : allThemes;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const handleSelect = useCallback((name: string) => {
    setThemeName(name);
  }, [setThemeName]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Theme selector"
        className="fixed right-0 top-0 z-50 h-full w-[340px] max-w-full bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        style={{ animationDuration: '200ms' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div>
            <p className="font-semibold text-sm">Themes</p>
            <p className="text-xs text-muted-foreground">{allThemes.length} themes available</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleColorMode}
              title={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle color mode"
            >
              {colorMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Close theme panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search themes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-8 rounded-md border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Search themes"
            />
          </div>
        </div>

        {/* Theme grid */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No themes found</p>
          ) : (() => {
            const originals = filtered.filter(t => !t.name.startsWith('tweakcn-'));
            const tweakcn = filtered.filter(t => t.name.startsWith('tweakcn-'));
            const renderGrid = (items: typeof filtered) => (
              <div className="grid grid-cols-5 gap-1.5">
                {items.map(t => {
                  const colors = colorMode === 'dark' ? t.dark : t.light;
                  const isActive = t.name === themeName;
                  const bg = `hsl(${colors.background})`;
                  const pr = `hsl(${colors.primary})`;
                  const ac = `hsl(${colors.accent})`;
                  return (
                    <button
                      key={t.name}
                      onClick={() => handleSelect(t.name)}
                      className={`relative flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] transition-all hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive ? 'ring-2 ring-primary bg-accent' : ''
                      }`}
                      title={t.label}
                      aria-label={`Select ${t.label} theme${isActive ? ' (active)' : ''}`}
                      aria-pressed={isActive}
                    >
                      {/* 3-color swatch strip */}
                      <div className="flex gap-0.5 overflow-hidden rounded-sm border border-black/10 dark:border-white/10">
                        <div className="h-4 w-4" style={{ backgroundColor: bg }} />
                        <div className="h-4 w-4" style={{ backgroundColor: pr }} />
                        <div className="h-4 w-4" style={{ backgroundColor: ac }} />
                      </div>
                      <span className="truncate w-full text-center leading-tight text-muted-foreground">
                        {t.label.replace(/^TW: /, '')}
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
            );
            return (
              <>
                {originals.length > 0 && (
                  <div className="mb-4">
                    {tweakcn.length > 0 && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Originals</p>
                    )}
                    {renderGrid(originals)}
                  </div>
                )}
                {tweakcn.length > 0 && (
                  <div>
                    {originals.length > 0 && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">TweakCN Presets</p>
                    )}
                    {renderGrid(tweakcn)}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Footer — active theme info */}
        <div className="px-4 py-3 border-t shrink-0 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Active: <span className="font-medium text-foreground">{allThemes.find(t => t.name === themeName)?.label ?? themeName}</span>
            {' · '}
            <span className="capitalize">{colorMode} mode</span>
          </p>
        </div>
      </div>
    </>
  );
}
