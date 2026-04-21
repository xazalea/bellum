'use client';

import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { animate, spring, ease, dur } from '@/lib/hooks/use-anime';

export interface GameCardProps {
  id: string;
  title: string;
  thumbnail?: string;
  platform?: string;
  onClick?: (id: string) => void;
  className?: string;
  aspectRatio?: 'video' | 'portrait';
  'data-anime'?: string;
}

export function GameCard({
  id, title, thumbnail, platform, onClick, className, aspectRatio = 'video',
  'data-anime': dataAnime,
}: GameCardProps) {
  const aspectClass = aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-video';
  const cardRef = useRef<HTMLButtonElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const onEnter = useCallback(() => {
    if (cardRef.current) animate(cardRef.current, { translateY: -3, boxShadow: '0 8px 24px -4px hsl(var(--foreground) / 0.08)', borderColor: 'hsl(var(--primary) / 0.2)', ease: spring({ bounce: 0.2, stiffness: 200, damping: 12 }), duration: dur.fast });
    if (imgRef.current) animate(imgRef.current, { scale: 1.05, ease: spring({ bounce: 0.1 }), duration: dur.base });
    if (overlayRef.current) animate(overlayRef.current, { opacity: 1, scale: [0.8, 1], ease: spring({ bounce: 0.35, stiffness: 280, damping: 14 }), duration: dur.base });
  }, []);

  const onLeave = useCallback(() => {
    if (cardRef.current) animate(cardRef.current, { translateY: 0, boxShadow: '0 0 0 0 hsl(var(--foreground) / 0)', borderColor: 'hsl(var(--border))', ease: ease.out, duration: dur.fast });
    if (imgRef.current) animate(imgRef.current, { scale: 1, ease: ease.out, duration: dur.base });
    if (overlayRef.current) animate(overlayRef.current, { opacity: 0, scale: 0.8, ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <button
      ref={cardRef}
      onClick={() => onClick?.(id)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn('group relative text-left overflow-hidden rounded-lg border border-border bg-card/50 premium-sweep', className)}
      data-anime={dataAnime}
    >
      <div className={cn('relative overflow-hidden bg-muted', aspectClass)}>
        {thumbnail ? (
          <img ref={imgRef} src={thumbnail} alt={title} className="w-full h-full object-cover grayscale-[30%]" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground/10"><path d="M8 5v14l11-7z" /></svg>
          </div>
        )}
        <div ref={overlayRef} className="absolute inset-0 bg-background/20 backdrop-blur-[2px] flex items-center justify-center" style={{ opacity: 0 }}>
          <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center shadow-lg border border-border/50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-foreground ml-0.5"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
        {platform && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-mono font-medium uppercase tracking-wider bg-background/70 backdrop-blur-sm border border-border/50 text-muted-foreground rounded">
            {platform}
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[11px] text-muted-foreground truncate font-medium">{title}</p>
      </div>
    </button>
  );
}
