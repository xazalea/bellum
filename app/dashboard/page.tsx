'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid';
import { CPUMonitor, RAMMonitor, LatencyMonitor, FPSMonitor } from '@/components/ui/system-monitor';
import { ConsoleLog } from '@/components/ui/console-log';
import { AchievementCard, type Achievement } from '@/components/ui/achievement-card';
import { SessionHistory, type SessionEntry } from '@/components/ui/session-history';
import { getRecentlyPlayed } from '@/lib/recently-played';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';

const defaultAchievements: Achievement[] = [
  { id: 'a1', title: 'First Launch', description: 'Run your first APK or EXE', icon: 'rocket_launch', unlocked: true, rarity: 'common', unlockedAt: 'Today' },
  { id: 'a2', title: 'Speed Demon', description: 'Hit 60 FPS during gameplay', icon: 'speed', unlocked: false, rarity: 'rare', progress: 0, maxProgress: 1 },
  { id: 'a3', title: 'Exporter', description: 'Export 5 apps to HTML', icon: 'upload_file', unlocked: false, rarity: 'epic', progress: 1, maxProgress: 5 },
  { id: 'a4', title: 'Library Builder', description: 'Play 25 different games', icon: 'library_add', unlocked: false, rarity: 'rare', progress: 3, maxProgress: 25 },
  { id: 'a5', title: 'No Install Hero', description: 'Play 100 games without installing anything', icon: 'cloud_done', unlocked: false, rarity: 'legendary', progress: 3, maxProgress: 100 },
  { id: 'a6', title: 'Night Owl', description: 'Play between midnight and 5am', icon: 'dark_mode', unlocked: false, rarity: 'common' },
  { id: 'a7', title: 'Power User', description: 'Run 10 different APK files', icon: 'phone_android', unlocked: false, rarity: 'rare', progress: 2, maxProgress: 10 },
  { id: 'a8', title: 'Cross Platform', description: 'Run both APK and EXE files', icon: 'devices', unlocked: false, rarity: 'epic', progress: 0, maxProgress: 2 },
];

// Demo session data — in production this would come from localStorage/API
const demoSessions: SessionEntry[] = [
  { id: 's1', gameTitle: 'Subway Surfers', platform: 'APK', playedAt: '2 hours ago', durationMinutes: 25, avgFps: 44, peakFps: 58, thumbnail: '' },
  { id: 's2', gameTitle: 'Minesweeper', platform: 'EXE', playedAt: '5 hours ago', durationMinutes: 12, avgFps: 60, peakFps: 60, thumbnail: '' },
  { id: 's3', gameTitle: 'Fruit Ninja', platform: 'APK', playedAt: 'Yesterday', durationMinutes: 8, avgFps: 38, peakFps: 52, thumbnail: '' },
  { id: 's4', gameTitle: 'Sudoku', platform: 'EXE', playedAt: 'Yesterday', durationMinutes: 45, avgFps: 55, peakFps: 60, thumbnail: '' },
  { id: 's5', gameTitle: 'Angry Birds', platform: 'APK', playedAt: '2 days ago', durationMinutes: 15, avgFps: 42, peakFps: 55, thumbnail: '' },
];

export default function DashboardPage() {
  const recent = getRecentlyPlayed().slice(0, 4);
  const [achievements, setAchievements] = useState(defaultAchievements);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const { root, run } = useAnimeScope();
  const animatedRef = useRef(false);

  useEffect(() => {
    // Load achievements from localStorage
    try {
      const stored = localStorage.getItem('bellum-achievements');
      if (stored) setAchievements(JSON.parse(stored));
    } catch { /* empty */ }

    // Load sessions from localStorage
    try {
      const stored = localStorage.getItem('bellum-sessions');
      if (stored) {
        setSessions(JSON.parse(stored));
      } else {
        setSessions(demoSessions);
      }
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="dash-header"]', {
          translateY: [-12, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.base,
        });
        animate('[data-anime="dash-card"]', {
          translateY: [20, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.reveal,
          delay: stagger(100, { from: 'center', start: 200 }),
        });
        animate('[data-anime="dash-achievement"]', {
          translateX: [-16, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.reveal,
          delay: stagger(60, { from: 0, start: 400 }),
        });
        animate('[data-anime="dash-stat"]', {
          scale: [0.85, 1],
          opacity: [0, 1],
          ease: spring({ bounce: 0.3, stiffness: 200, damping: 12 }),
          duration: dur.base,
          delay: stagger(80, { from: 0, start: 300 }),
        });
      });
    });
  }, [run]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalPlayTime = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const avgFps = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + s.avgFps, 0) / sessions.length)
    : 0;
  const totalSessions = sessions.length;

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -1, ease: spring({ bounce: 0.2, stiffness: 200, damping: 12 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  const items: BentoItem[] = [
    // Performance monitoring
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>monitoring</span>
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
            <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>speed</span>
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
            <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>analytics</span>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Stats</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div data-anime="dash-stat" style={{ opacity: 0 }} className="text-center">
              <p className="text-xl font-bold tracking-tighter text-foreground">{totalSessions}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Sessions</p>
            </div>
            <div data-anime="dash-stat" style={{ opacity: 0 }} className="text-center">
              <p className="text-xl font-bold tracking-tighter text-foreground">{totalPlayTime}m</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Play Time</p>
            </div>
            <div data-anime="dash-stat" style={{ opacity: 0 }} className="text-center">
              <p className={`text-xl font-bold tracking-tighter ${avgFps >= 40 ? 'text-green-400' : avgFps >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>{avgFps}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">Avg FPS</p>
            </div>
          </div>
        </div>
      ),
    },
    // Console log — large
    {
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>terminal</span>
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
    // Session History
    {
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>history</span>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Session History</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SessionHistory sessions={sessions} className="h-full" limit={8} />
          </div>
        </div>
      ),
    },
    // Achievements
    {
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div data-anime="dash-card" style={{ opacity: 0 }} className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>emoji_events</span>
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Achievements</h3>
            </div>
            <span className="text-[9px] text-muted-foreground/40">{unlockedCount}/{achievements.length}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <div className="grid grid-cols-1 gap-2">
              {achievements.map((a) => (
                <div key={a.id} data-anime="dash-achievement" style={{ opacity: 0 }}>
                  <AchievementCard achievement={a} compact />
                </div>
              ))}
            </div>
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
            <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>play_circle</span>
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
            <span className="material-symbols-outlined text-muted-foreground/40" style={{ fontSize: 14 }}>bolt</span>
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
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Runtime monitoring · Achievements · Session history
          </p>
        </div>

        <BentoGrid items={items} gap={3} />
      </div>
    </div>
  );
}
