'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useCompute } from '@/components/providers/compute-provider';
import { themes } from '@/lib/themes';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { User, Coins, Settings, Palette, Info, Trash2 } from 'lucide-react';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';

export default function SettingsPage() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const { balance, tier, earningRate, streak, referral, isInitialized } = useCompute();
  const [search, setSearch] = useState('');
  const { root, run } = useAnimeScope();
  const animatedRef = useRef(false);

  const coreThemes = themes.filter(t => !t.name.startsWith('tweakcn-'));
  const communityThemes = themes.filter(t => t.name.startsWith('tweakcn-'));

  const filteredCore = search
    ? coreThemes.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : coreThemes;
  const filteredCommunity = search
    ? communityThemes.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : communityThemes;

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="settings-header"]', {
          translateY: [-12, 0], opacity: [0, 1], ease: ease.out, duration: dur.base,
        });
        animate('[data-anime="settings-section"]', {
          translateY: [16, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(80, { from: 0, start: 150 }),
        });
        animate('[data-anime="settings-row"]', {
          translateX: [8, 0], opacity: [0, 1], ease: ease.out, duration: dur.base,
          delay: stagger(30, { from: 0, start: 400 }),
        });
      });
    });
  }, [run]);

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -1, ease: spring({ bounce: 0.2 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  const onThemeClick = useCallback((name: string) => {
    setTheme(name);
    const btn = document.querySelector(`[data-theme="${name}"]`);
    if (btn) animate(btn, { scale: [1, 0.92, 1.04, 1], ease: spring({ bounce: 0.4 }), duration: 350 });
  }, [setTheme]);

  return (
    <div ref={root} className="min-h-screen">
      <div className="cd-container-narrow py-8">
        {/* Header */}
        <div data-anime="settings-header" className="mb-8" style={{ opacity: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Settings size={22} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Settings</h1>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Customize your experience
          </p>
        </div>

        {/* Appearance Section */}
        <section data-anime="settings-section" style={{ opacity: 0 }} className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <Palette size={14} className="text-primary/60" />
            Appearance
          </h2>

          {/* Mode toggle */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-2">Mode</p>
            <div className="flex border border-border rounded-lg overflow-hidden w-fit">
              {(['dark', 'light', 'system'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-5 h-8 text-[11px] font-medium transition-colors ${
                    mode === m
                      ? 'bg-primary text-primary-foreground'
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
                className="pl-8 pr-3 h-8 text-[11px] bg-card border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 w-full max-w-xs transition-colors rounded-lg"
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
                  data-theme={t.name}
                  onClick={() => onThemeClick(t.name)}
                  onMouseEnter={onCardEnter}
                  onMouseLeave={onCardLeave}
                  className={`group flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    theme === t.name
                      ? 'border-primary/40 bg-primary/5 animated-border'
                      : 'border-border hover:border-primary/20 hover:bg-accent/30'
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
                    data-theme={t.name}
                    onClick={() => onThemeClick(t.name)}
                    onMouseEnter={onCardEnter}
                    onMouseLeave={onCardLeave}
                    className={`group flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                      theme === t.name
                        ? 'border-primary/40 bg-primary/5 animated-border'
                        : 'border-border hover:border-primary/20 hover:bg-accent/30'
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
        <section data-anime="settings-section" style={{ opacity: 0 }} className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <Info size={14} className="text-primary/60" />
            About
          </h2>
          <div className="glass-card rounded-xl overflow-hidden">
            {[
              { label: 'Version', value: '0.1.0' },
              { label: 'Engine', value: 'Challenger Runtime' },
              { label: 'Renderer', value: 'WebGL2' },
              { label: 'Platform', value: 'Cloudflare Pages' },
            ].map((row, i) => (
              <div key={row.label} data-anime="settings-row" style={{ opacity: 0 }} className={`flex items-center justify-between px-4 py-3 ${i < 3 ? 'border-b border-border/50' : ''}`}>
                <span className="text-[11px] text-muted-foreground">{row.label}</span>
                <span className="text-[11px] text-foreground/70 font-mono">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Account Section */}
        <section data-anime="settings-section" style={{ opacity: 0 }} className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <User size={14} className="text-primary/60" />
            Account
          </h2>
          {isAuthenticated && user ? (
            <div className="glass-card rounded-xl overflow-hidden">
              <div data-anime="settings-row" style={{ opacity: 0 }} className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <span className="text-[11px] text-muted-foreground">Username</span>
                <span className="text-[11px] text-foreground/70 font-mono">{user.username}</span>
              </div>
              <div data-anime="settings-row" style={{ opacity: 0 }} className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <span className="text-[11px] text-muted-foreground">Device ID</span>
                <span className="text-[11px] text-foreground/70 font-mono truncate max-w-[180px]">{user.fingerprint?.slice(0, 12)}…</span>
              </div>
              <div data-anime="settings-row" style={{ opacity: 0 }} className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <span className="text-[11px] text-muted-foreground">Member Since</span>
                <span className="text-[11px] text-foreground/70 font-mono">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div data-anime="settings-row" style={{ opacity: 0 }} className="px-4 py-3">
                <button
                  onClick={() => { if (confirm('Sign out? You can sign back in from any trusted device.')) signOut(); }}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-5">
              <p className="text-[11px] text-muted-foreground/50 mb-2">Not signed in</p>
              <Link href="/login" className="text-[11px] text-primary hover:text-primary/80 transition-colors">
                Sign In →
              </Link>
            </div>
          )}
        </section>

        {/* Compute Tokens Section */}
        <section data-anime="settings-section" style={{ opacity: 0 }} className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <Coins size={14} className="text-primary/60" />
            Compute Tokens
            <span className="ml-auto text-[9px] text-primary/40 border border-primary/20 px-2 py-0.5 rounded-full">OPTIONAL</span>
          </h2>
          {isInitialized ? (
            <div className="glass-card rounded-xl overflow-hidden">
              {[
                { label: 'Balance', value: `${Math.round(balance.tokens).toLocaleString()} tokens` },
                { label: 'Tier', value: tier.name, color: tier.color },
                { label: 'Earning Rate', value: `${earningRate.tokensPerMinute.toFixed(1)} t/min (${earningRate.source})` },
                { label: 'Streak', value: `${streak.currentStreak} days${streak.currentStreak >= 3 ? ` (${streak.currentStreak >= 30 ? '3.0' : streak.currentStreak >= 14 ? '2.0' : streak.currentStreak >= 7 ? '1.5' : '1.2'}x bonus)` : ''}` },
                { label: 'Mesh Nodes', value: `${tier.maxMeshNodes} (max)` },
                { label: 'Cloud Storage', value: `${tier.storageGB} GB` },
                { label: 'Referral Code', value: referral.code || '—', highlight: true },
              ].map((row, i) => (
                <div key={row.label} data-anime="settings-row" style={{ opacity: 0 }} className={`flex items-center justify-between px-4 py-3 ${i < 6 ? 'border-b border-border/50' : ''}`}>
                  <span className="text-[11px] text-muted-foreground">{row.label}</span>
                  <span className={`text-[11px] font-mono ${row.highlight ? 'text-primary' : row.color ? '' : 'text-foreground/70'}`} style={row.color ? { color: row.color } : undefined}>{row.value}</span>
                </div>
              ))}
              <div data-anime="settings-row" style={{ opacity: 0 }} className="px-4 py-3">
                <Link href="/referral" className="text-[11px] text-primary hover:text-primary/80 transition-colors">
                  View Quests & Referrals →
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-5">
              <p className="text-[11px] text-muted-foreground/40">Loading token data…</p>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section data-anime="settings-section" style={{ opacity: 0 }} className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <Trash2 size={14} className="text-destructive/60" />
            Data
          </h2>
          <div className="glass-card rounded-xl p-4">
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (confirm('Clear all recently played games?')) {
                    localStorage.removeItem('challenger-recently-played');
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
              <br />
              <button
                onClick={() => {
                  if (confirm('Reset all compute token data? This cannot be undone.')) {
                    ['cd_token_balance', 'cd_token_transactions', 'cd_streak', 'cd_quests', 'cd_referral', 'cd_earning_state'].forEach(k => localStorage.removeItem(k));
                    window.location.reload();
                  }
                }}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Reset compute tokens
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
