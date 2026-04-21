'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { animate, spring, ease, dur } from '@/lib/hooks/use-anime';
import { getLucideIcon } from '@/lib/lucide-icons';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

const rarityColors = {
  common: 'text-muted-foreground border-border',
  rare: 'text-blue-400 border-blue-400/30',
  epic: 'text-purple-400 border-purple-400/30',
  legendary: 'text-amber-400 border-amber-400/30',
};

const rarityBg = {
  common: 'bg-muted/50',
  rare: 'bg-blue-400/10',
  epic: 'bg-purple-400/10',
  legendary: 'bg-amber-400/10',
};

const rarityGlow = {
  common: '',
  rare: 'shadow-[0_0_12px_2px_rgba(96,165,250,0.15)]',
  epic: 'shadow-[0_0_16px_2px_rgba(192,132,252,0.2)]',
  legendary: 'shadow-[0_0_20px_3px_rgba(251,191,36,0.25)]',
};

interface AchievementCardProps {
  achievement: Achievement;
  className?: string;
  compact?: boolean;
}

export function AchievementCard({ achievement, className, compact = false }: AchievementCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const rarity = achievement.rarity || 'common';

  const onEnter = useCallback(() => {
    if (!cardRef.current) return;
    if (achievement.unlocked) {
      animate(cardRef.current, {
        translateY: -1,
        ease: spring({ bounce: 0.2, stiffness: 200, damping: 12 }),
        duration: dur.fast,
      });
    }
  }, [achievement.unlocked]);

  const onLeave = useCallback(() => {
    if (cardRef.current) animate(cardRef.current, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        'relative flex items-start gap-3 rounded-lg border p-3 transition-all',
        achievement.unlocked
          ? `${rarityBg[rarity]} ${rarityColors[rarity]} ${rarityGlow[rarity]}`
          : 'bg-card/30 border-border/50 opacity-40 grayscale',
        compact ? 'p-2 gap-2' : 'p-3 gap-3',
        className,
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center rounded-md border shrink-0',
        achievement.unlocked ? rarityColors[rarity] : 'border-border/50 text-muted-foreground/30',
        compact ? 'w-8 h-8 text-base' : 'w-10 h-10 text-lg',
      )}>
        {(() => { const Icon = getLucideIcon(achievement.icon); return <Icon size={compact ? 16 : 20} />; })()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium truncate',
          compact ? 'text-[10px]' : 'text-xs',
          achievement.unlocked ? 'text-foreground' : 'text-muted-foreground/50',
        )}>
          {achievement.title}
        </p>
        {!compact && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-2">
            {achievement.description}
          </p>
        )}

        {/* Progress bar */}
        {achievement.maxProgress && achievement.maxProgress > 1 && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] text-muted-foreground/40">{achievement.progress || 0}/{achievement.maxProgress}</span>
            </div>
            <div className="h-1 rounded-full bg-border/50 overflow-hidden">
              <div className={cn(
                  'h-full rounded-full transition-all duration-500',
                  achievement.unlocked ? 'bg-primary/70' : 'bg-muted-foreground/20',
                )}
                style={{ width: `${((achievement.progress || 0) / achievement.maxProgress) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Unlocked timestamp */}
        {achievement.unlocked && achievement.unlockedAt && !compact && (
          <p className="text-[9px] text-muted-foreground/30 mt-1">{achievement.unlockedAt}</p>
        )}
      </div>

      {/* Rarity badge */}
      {!compact && achievement.unlocked && rarity !== 'common' && (
        <span className={cn(
          'px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider rounded-sm border',
          rarityColors[rarity],
        )}>
          {rarity}
        </span>
      )}
    </div>
  );
}
