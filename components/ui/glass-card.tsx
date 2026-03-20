'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  goldBorder?: boolean;
  onClick?: () => void;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
} as const;

export function GlassCard({
  children,
  className,
  padding = 'md',
  glow = false,
  goldBorder = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-xl',
        paddingMap[padding],
        glow && 'shadow-[0_0_24px_2px_hsl(var(--primary)/0.25)]',
        onClick && 'cursor-pointer',
        className,
      )}
      style={
        goldBorder
          ? {
              background:
                'linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, ' +
                'linear-gradient(135deg, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.4)) border-box',
              border: '1px solid transparent',
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
