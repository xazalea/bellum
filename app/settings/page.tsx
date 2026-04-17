'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { themes } from '@/lib/themes';
import { useState } from 'react';

export default function SettingsPage() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const [search, setSearch] = useState('');

  const coreThemes = themes.filter(t => !t.name.startsWith('tweakcn-'));
  const communityThemes = themes.filter(t => t.name.startsWith('tweakcn-'));

  const filteredCore = search
    ? coreThemes.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : coreThemes;
  const filteredCommunity = search
    ? communityThemes.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : communityThemes;

  return (
    <div className="min-h-screen">
      <div className="cd-container-narrow py-8">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Customize your experience
          </p>
        </div>

        {/* Appearance Section */}
        <section className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Appearance
          </h2>

          {/* Mode toggle */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-2">Mode</p>
            <div className="flex border border-border rounded-md overflow-hidden w-fit">
              {(['dark', 'light', 'system'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-5 h-8 text-[11px] font-medium transition-colors ${
                    mode === m
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Theme search */}
          <div className="mb-4">
            <div className="relative">
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search themes..."
                className="pl-8 pr-3 h-8 text-[11px] bg-card border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 w-full max-w-xs transition-colors rounded-sm"
              />
            </div>
          </div>

          {/* Core Themes */}
          <div className="mb-6">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-3">Core Themes</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {filteredCore.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTheme(t.name)}
                  className={`group flex flex-col items-center gap-2 p-3 rounded-md border transition-all ${
                    theme === t.name
                      ? 'border-foreground/30 bg-accent'
                      : 'border-border hover:border-foreground/15 hover:bg-accent/30'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full border border-border overflow-hidden flex shrink-0">
                    <div
                      className="w-1/2 h-full"
                      style={{ backgroundColor: `hsl(${t.dark.primary})` }}
                    />
                    <div
                      className="w-1/2 h-full"
                      style={{ backgroundColor: `hsl(${t.dark.background})` }}
                    />
                  </div>
                  <span className={`text-[10px] truncate w-full text-center leading-tight ${
                    theme === t.name ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Community Themes */}
          {filteredCommunity.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-3">Community</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {filteredCommunity.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    className={`group flex flex-col items-center gap-2 p-3 rounded-md border transition-all ${
                      theme === t.name
                        ? 'border-foreground/30 bg-accent'
                        : 'border-border hover:border-foreground/15 hover:bg-accent/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full border border-border overflow-hidden flex shrink-0">
                      <div
                        className="w-1/2 h-full"
                        style={{ backgroundColor: `hsl(${t.dark.primary})` }}
                      />
                      <div
                        className="w-1/2 h-full"
                        style={{ backgroundColor: `hsl(${t.dark.background})` }}
                      />
                    </div>
                    <span className={`text-[10px] truncate w-full text-center leading-tight ${
                      theme === t.name ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}>
                      {t.label.replace('TW: ', '')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* About Section */}
        <section className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            About
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-[11px] text-muted-foreground">Version</span>
              <span className="text-[11px] text-foreground/70 font-mono">0.1.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-[11px] text-muted-foreground">Engine</span>
              <span className="text-[11px] text-foreground/70 font-mono">Challenger Runtime</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-[11px] text-muted-foreground">Renderer</span>
              <span className="text-[11px] text-foreground/70 font-mono">WebGL2</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[11px] text-muted-foreground">Platform</span>
              <span className="text-[11px] text-foreground/70 font-mono">Cloudflare Pages</span>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Data
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => {
                if (confirm('Clear all recently played games?')) {
                  localStorage.removeItem('bellum-recently-played');
                  window.location.reload();
                }
              }}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear recently played
            </button>
            <br />
            <button
              onClick={() => {
                if (confirm('Reset all settings to defaults?')) {
                  localStorage.removeItem('bellum-theme');
                  window.location.reload();
                }
              }}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Reset theme to default
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
