'use client';

import { useState } from 'react';
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid';
import { CPUMonitor, RAMMonitor, LatencyMonitor, FPSMonitor } from '@/components/ui/system-monitor';
import { ConsoleLog } from '@/components/ui/console-log';
import { getRecentlyPlayed } from '@/lib/recently-played';
import Link from 'next/link';

export default function DashboardPage() {
  const recent = getRecentlyPlayed().slice(0, 4);

  const items: BentoItem[] = [
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              Performance
            </h3>
          </div>
          <div className="grid grid-cols-2 flex-1">
            <CPUMonitor />
            <RAMMonitor />
          </div>
        </div>
      ),
    },
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              Runtime
            </h3>
          </div>
          <div className="grid grid-cols-2 flex-1">
            <FPSMonitor />
            <LatencyMonitor />
          </div>
        </div>
      ),
    },
    {
      colSpan: 2,
      rowSpan: 2,
      content: (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              Console
            </h3>
            <span className="text-[9px] text-muted-foreground/30 font-mono">stream</span>
          </div>
          <div className="flex-1 min-h-0">
            <ConsoleLog className="h-full" />
          </div>
        </div>
      ),
    },
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              Recent
            </h3>
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
                    href={`/games`}
                    className="group flex items-center gap-2 p-1.5 rounded hover:bg-accent/30 transition-colors"
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
    {
      colSpan: 2,
      rowSpan: 1,
      content: (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              Quick Actions
            </h3>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-2 justify-center">
            <Link
              href="/run"
              className="btn-primary w-full text-[10px] h-8"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mr-2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run APK / EXE
            </Link>
            <Link
              href="/games"
              className="btn-secondary w-full text-[10px] h-8"
            >
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
    <div className="min-h-screen">
      <div className="cd-container py-8">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Runtime monitoring and system status
          </p>
        </div>

        <BentoGrid items={items} gap={3} />
      </div>
    </div>
  );
}
