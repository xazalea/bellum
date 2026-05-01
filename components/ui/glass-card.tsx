'use client';

import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { animate, spring, ease, dur } from '@/lib/hooks/use-anime';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  goldBorder?: boolean;
  onClick?: () => void;
}

const paddingMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-8' } as const;

export function GlassCard({ children, className, padding = 'md', glow = false, goldBorder = false, onClick }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const onEnter = useCallback(() => {
    if (cardRef.current) animate(cardRef.current, { borderColor: 'hsl(var(--primary) / 0.15)', boxShadow: '0 0 12px 0 hsl(var(--primary) / 0.04)', ease: spring({ bounce: 0.1, stiffness: 200, damping: 14 }), duration: dur.base });
  }, []);
  const onLeave = useCallback(() => {
    if (cardRef.current) animate(cardRef.current, { borderColor: 'hsl(var(--primary) / 0.1)', boxShadow: '0 0 0 0 hsl(var(--primary) / 0)', ease: ease.out, duration: dur.base });
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn('glass-card rounded-lg', paddingMap[padding], glow && 'shadow-[0_0_16px_1px_hsl(var(--primary)/0.15)]', onClick && 'cursor-pointer', className)}
      style={goldBorder ? { background: 'linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(135deg, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.4)) border-box', border: '1px solid transparent' } : undefined}
    >
      {children}
    </div>
  );
}
