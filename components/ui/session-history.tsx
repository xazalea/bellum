'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { animate, spring, ease, dur } from '@/lib/hooks/use-anime';

export interface SessionEntry {
  id: string;
  gameTitle: string;
  thumbnail?: string;
  platform?: string;
  playedAt: string;
  durationMinutes: number;
  avgFps: number;
  peakFps: number;
}

interface SessionHistoryProps {
  sessions: SessionEntry[];
  className?: string;
  limit?: number;
}

export function SessionHistory({ sessions, className, limit = 10 }: SessionHistoryProps) {
  const onRowEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, {
      backgroundColor: 'hsl(var(--accent) / 0.5)',
      translateX: 2,
      ease: spring({ bounce: 0.2, stiffness: 200, damping: 12 }),
      duration: dur.fast,
    });
  }, []);

  const onRowLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, {
      backgroundColor: 'hsl(var(--card) / 0)',
      translateX: 0,
      ease: ease.out,
      duration: dur.fast,
    });
  }, []);

  const displayed = sessions.slice(0, limit);

  if (displayed.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="text-center">
          <span className="material-symbols-outlined text-muted-foreground/20" style={{ fontSize: 24 }}>history</span>
          <p className="text-[10px] text-muted-foreground/40 mt-2">No sessions yet</p>
        </div>
      </div>
    );
  }

  const fpsColor = (fps: number) =>
    fps >= 40 ? 'text-green-400' : fps >= 20 ? 'text-yellow-400' : 'text-red-400';

  const formatDuration = (mins: number) => {
    if (mins < 1) return '<1m';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center px-3 py-2 border-b border-border text-[9px] uppercase tracking-widest text-muted-foreground/40 font-medium">
        <span className="flex-1 min-w-0">Game</span>
        <span className="w-16 text-right">Duration</span>
        <span className="w-14 text-right">Avg FPS</span>
        <span className="w-14 text-right">Peak</span>
      </div>

      {/* Rows */}
      {displayed.map((session) => (
        <div
          key={session.id}
          onMouseEnter={onRowEnter}
          onMouseLeave={onRowLeave}
          className="flex items-center px-3 py-2 border-b border-border/30 cursor-default"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
              {session.thumbnail ? (
                <img src={session.thumbnail} alt={session.gameTitle} className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted-foreground/20 text-[8px]">▶</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-foreground/70 truncate">{session.gameTitle}</p>
              <p className="text-[9px] text-muted-foreground/40">{session.playedAt}</p>
            </div>
            {session.platform && (
              <span className="tag text-[7px] ml-1 shrink-0">{session.platform}</span>
            )}
          </div>
          <span className="w-16 text-right text-[10px] text-muted-foreground/60 font-mono">
            {formatDuration(session.durationMinutes)}
          </span>
          <span className={cn('w-14 text-right text-[10px] font-mono', fpsColor(session.avgFps))}>
            {session.avgFps}
          </span>
          <span className={cn('w-14 text-right text-[10px] font-mono', fpsColor(session.peakFps))}>
            {session.peakFps}
          </span>
        </div>
      ))}

      {sessions.length > limit && (
        <div className="flex items-center justify-center py-2">
          <span className="text-[9px] text-muted-foreground/40">
            +{sessions.length - limit} more sessions
          </span>
        </div>
      )}
    </div>
  );
}
