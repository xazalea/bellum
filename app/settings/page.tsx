'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useCompute } from '@/components/providers/compute-provider';
import { themes } from '@/lib/themes';
import { useState } from 'react';
import Link from 'next/link';
import { User, Coins } from 'lucide-react';

export default function SettingsPage() {
  const { theme, mode, setTheme, setMode } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const { balance, tier, earningRate, streak, referral, isInitialized } = useCompute();
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

        {/* Account Section */}
        <section className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <User size={14} className="text-primary/60" />
            Account
          </h2>
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Username</span>
                <span className="text-[11px] text-foreground/70 font-mono">{user.username}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Device ID</span>
                <span className="text-[11px] text-foreground/70 font-mono truncate max-w-[180px]">{user.fingerprint?.slice(0, 12)}…</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Member Since</span>
                <span className="text-[11px] text-foreground/70 font-mono">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <button
                onClick={() => { if (confirm('Sign out? You can sign back in from any trusted device.')) signOut(); }}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors mt-2"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground/50">Not signed in</p>
              <Link href="/login" className="text-[11px] text-primary hover:text-primary/80 transition-colors">
                Sign In →
              </Link>
            </div>
          )}
        </section>

        {/* Compute Tokens Section */}
        <section className="mb-10">
          <h2 className="text-xs font-medium text-foreground mb-4 flex items-center gap-2">
            <Coins size={14} className="text-primary/60" />
            Compute Tokens
            <span className="ml-auto text-[9px] text-primary/40 border border-primary/20 px-2 py-0.5 rounded-full">OPTIONAL</span>
          </h2>
          {isInitialized ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Balance</span>
                <span className="text-[11px] text-foreground/70 font-mono">{Math.round(balance.tokens).toLocaleString()} tokens</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Tier</span>
                <span className="text-[11px] font-mono" style={{ color: tier.color }}>{tier.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Earning Rate</span>
                <span className="text-[11px] text-foreground/70 font-mono">{earningRate.tokensPerMinute.toFixed(1)} t/min ({earningRate.source})</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Streak</span>
                <span className="text-[11px] text-foreground/70 font-mono">{streak.currentStreak} days{streak.currentStreak >= 3 ? ` (${streak.currentStreak >= 30 ? '3.0' : streak.currentStreak >= 14 ? '2.0' : streak.currentStreak >= 7 ? '1.5' : '1.2'}x bonus)` : ''}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Mesh Nodes</span>
                <span className="text-[11px] text-foreground/70 font-mono">{tier.maxMeshNodes} (max)</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Cloud Storage</span>
                <span className="text-[11px] text-foreground/70 font-mono">{tier.storageGB} GB</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[11px] text-muted-foreground">Referral Code</span>
                <span className="text-[11px] text-primary font-mono">{referral.code || '—'}</span>
              </div>
              <div className="pt-2">
                <Link href="/referral" className="text-[11px] text-primary hover:text-primary/80 transition-colors">
                  View Quests & Referrals →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/40">Loading token data…</p>
          )}
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
        </section>
      </div>
    </div>
  );
}
