'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid';
import { CPUMonitor, RAMMonitor, LatencyMonitor, FPSMonitor } from '@/components/ui/system-monitor';
import { ConsoleLog } from '@/components/ui/console-log';
import { SessionHistory, type SessionEntry } from '@/components/ui/session-history';
import { getRecentlyPlayed } from '@/lib/recently-played';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';
import { useCompute } from '@/components/providers/compute-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Coins, Activity, Gauge, BarChart3, Terminal, History, Gamepad2, Trophy, Play, Zap } from 'lucide-react';
import { getLucideIcon } from '@/lib/lucide-icons';

function loadSessions(): SessionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('bellum-sessions');
    if (stored) return JSON.parse(stored);
  } catch { /* empty */ }
  return [];
}

export default function DashboardPage() {
  const recent = getRecentlyPlayed().slice(0, 4);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const { root, run } = useAnimeScope();
  const animatedRef = useRef(false);
  const { balance, tier, earningRate, streak, referral, quests, recentTransactions, isInitialized } = useCompute();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="dash-header"]', {
          translateY: [-12, 0], opacity: [0, 1], ease: ease.out, duration: dur.base,
        });
        animate('[data-anime="dash-card"]', {
          translateY: [20, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(100, { from: 'center', start: 200 }),
        });
        animate('[data-anime="dash-stat"]', {
          scale: [0.85, 1], opacity: [0, 1], ease: spring({ bounce: 0.3, stiffness: 200, damping: 12 }),
          duration: dur.base, delay: stagger(80, { from: 0, start: 300 }),
        });
      });
    });
  }, [run]);

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -1, ease: spring({ bounce: 0.2, stiffness: 200, damping: 12 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  const completedQuests = quests.filter(q => q.completedAt);
  const inProgressQuests = quests.filter(q => !q.completedAt);
  const totalPlayTime = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const avgFps = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + s.avgFps, 0) / sessions.length)
    : 0;

  const items: BentoItem[] = [
    // Compute Token Economy
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Coins size={14} className="text-primary/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Compute Tokens</h3>
            <span className="ml-auto text-[9px]" style={{ color: tier.color }}>{tier.name}</span>
          </div>
          <div className="grid grid-cols-4 flex-1 p-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">{Math.round(balance.tokens).toLocaleString()}</p>
              <p className="text-[8px] text-muted-foreground/50 uppercase">Balance</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">{earningRate.tokensPerMinute.toFixed(1)}</p>
              <p className="text-[8px] text-muted-foreground/50 uppercase">T/min</p>
              <p className="text-[7px] text-primary/40">{earningRate.source}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">{streak.currentStreak}d</p>
              <p className="text-[8px] text-muted-foreground/50 uppercase">Streak</p>
              <p className="text-[7px] text-primary/40">{streak.currentStreak >= 3 ? `${streak.currentStreak >= 30 ? '3.0' : streak.currentStreak >= 14 ? '2.0' : streak.currentStreak >= 7 ? '1.5' : '1.2'}x` : '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">{referral.referredUsers.length}</p>
              <p className="text-[8px] text-muted-foreground/50 uppercase">Referrals</p>
              <p className="text-[7px] text-primary/40">{referral.earnedTokens}t</p>
            </div>
          </div>
        </div>
      ),
    },
    // Performance monitoring
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Activity size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Performance</h3>
            <span className="ml-auto telemetry-dot w-1.5 h-1.5 rounded-full bg-green-500/70" />
          </div>
          <div className="grid grid-cols-2 flex-1">
            <CPUMonitor />
            <RAMMonitor />
          </div>
        </div>
      ),
    },
    // Runtime monitoring
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Gauge size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Runtime</h3>
          </div>
          <div className="grid grid-cols-2 flex-1">
            <FPSMonitor />
            <LatencyMonitor />
          </div>
        </div>
      ),
    },
    // Quick stats
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Stats</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div data-anime="dash-stat" style={{ opacity: 0 }} className="text-center">
              <p className="text-xl font-bold tracking-tighter text-foreground">{sessions.length}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Sessions</p>
            </div>
            <div data-anime="dash-stat" style={{ opacity: 0 }} className="text-center">
              <p className="text-xl font-bold tracking-tighter text-foreground">{totalPlayTime}m</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Play Time</p>
            </div>
            <div data-anime="dash-stat" style={{ opacity: 0 }} className="text-center">
              <p className={`text-xl font-bold tracking-tighter ${avgFps >= 40 ? 'text-green-400' : avgFps >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>{avgFps || '—'}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Avg FPS</p>
            </div>
          </div>
        </div>
      ),
    },
    // Console log
    {
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-muted-foreground/40" />
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Console</h3>
            </div>
            <span className="text-[9px] text-muted-foreground/30 font-mono">stream</span>
          </div>
          <div className="flex-1 min-h-0">
            <ConsoleLog className="h-full" />
          </div>
        </div>
      ),
    },
    // Session History (real data only)
    {
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <History size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Session History</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {sessions.length > 0 ? (
              <SessionHistory sessions={sessions} className="h-full" limit={8} />
            ) : (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center">
                  <Gamepad2 size={28} className="text-muted-foreground/20 block mb-2" />
                  <p className="text-[10px] text-muted-foreground/30">No sessions yet</p>
                  <p className="text-[9px] text-muted-foreground/20 mt-1">Play a game to see session history</p>
                  <Link href="/games" className="btn-secondary text-[10px] h-7 px-3 mt-3 inline-flex">Browse Games</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
    // Quests (from real compute engine)
    {
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-muted-foreground/40" />
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Quests</h3>
            </div>
            <span className="text-[9px] text-muted-foreground/40">{completedQuests.length}/{quests.length}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {quests.length > 0 ? (
              <div className="space-y-1.5">
                {quests.slice(0, 8).map((q) => {
                  const QIcon = getLucideIcon(q.icon);
                  return (
                  <div key={q.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${q.completedAt ? 'border-green-500/20 bg-green-500/5' : 'border-border/30'}`}>
                    <QIcon size={16} className={q.completedAt ? 'text-green-400' : q.rarity === 'rare' ? 'text-blue-400' : q.rarity === 'epic' ? 'text-purple-400' : q.rarity === 'legendary' ? 'text-yellow-400' : 'text-muted-foreground/40'} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-medium ${q.completedAt ? 'text-green-400 line-through' : 'text-foreground'}`}>{q.title}</p>
                      {!q.completedAt && q.progress > 0 && (
                        <div className="mt-1 h-0.5 rounded-full bg-border/50 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/50 transition-all" style={{ width: `${(q.progress / q.requirement) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-primary/50">{q.reward}t</span>
                  </div>
                  );
                })}
                <Link href="/referral" className="text-[9px] text-primary/50 hover:text-primary/70 transition-colors block text-center mt-2">View all quests →</Link>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[10px] text-muted-foreground/30">Loading quests...</p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    // Recent games
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Play size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Recent</h3>
          </div>
          <div className="p-3 flex-1">
            {recent.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[10px] text-muted-foreground/30">No recent games</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {recent.map((game) => (
                  <Link
                    key={game.id}
                    href={`/games/${game.id}`}
                    className="group flex items-center gap-2 p-1.5 rounded hover:bg-accent/30 transition-colors"
                    onMouseEnter={onCardEnter}
                    onMouseLeave={onCardLeave}
                  >
                    <div className="w-8 h-8 rounded bg-card flex items-center justify-center shrink-0 overflow-hidden">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground/20 text-[8px]">▶</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate group-hover:text-foreground/70 transition-colors">
                      {game.title}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    // Quick Actions
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Zap size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Quick Actions</h3>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-2 justify-center">
            <Link href="/run" className="btn-primary w-full text-[10px] h-8" onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mr-2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run APK / EXE
            </Link>
            <Link href="/games" className="btn-secondary w-full text-[10px] h-8" onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mr-2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              Browse Library
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div ref={root} className="min-h-screen">
      <div className="cd-container py-8">
        <div data-anime="dash-header" className="mb-8" style={{ opacity: 0 }}>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {isAuthenticated && user ? `Hey, ${user.username}` : 'Dashboard'}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isAuthenticated && isInitialized
              ? `${tier.name} tier · ${Math.round(balance.tokens).toLocaleString()} tokens · ${streak.currentStreak > 0 ? streak.currentStreak + 'd streak' : 'No streak'}`
              : 'Runtime monitoring · Quests · Session history'}
          </p>
        </div>

        <BentoGrid items={items} gap={3} />
      </div>
    </div>
  );
}
