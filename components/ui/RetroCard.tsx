/**
 * Retro Pixel Card Component
 * Combines RetroUI principles with deep ocean theme
 * Inspired by: https://github.com/Dksie09/RetroUI
 */

import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface RetroCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'ocean' | 'abyss' | 'glow';
  scanlines?: boolean;
  pixelGrid?: boolean;
}

const variants = {
  default: {
    bg: 'rgba(30, 58, 95, 0.85)',
    border: '#4A6380',
    text: '#E2E8F0',
  },
  ocean: {
    bg: 'rgba(45, 74, 110, 0.85)',
    border: '#5A7090',
    text: '#CBD5E1',
  },
  abyss: {
    bg: 'rgba(10, 31, 61, 0.90)',
    border: '#2D4A6E',
    text: '#8B9DB8',
  },
  glow: {
    bg: 'rgba(74, 99, 128, 0.75)',
    border: '#6B98B8',
    text: '#F1F5F9',
  },
};

export const RetroCard = forwardRef<HTMLDivElement, RetroCardProps>(
  ({ 
    children, 
    className, 
    variant = 'default',
    scanlines = false,
    pixelGrid = false,
    ...props 
  }, ref) => {
    const colors = variants[variant];

    return (
      <div
        ref={ref}
        className={clsx(
          // Base pixel styling
          'pixel-border backdrop-blur-sm',
          // Spacing
          'p-6',
          // Effects
          scanlines && 'scanlines',
          pixelGrid && 'pixel-grid',
          // Hover state
          'hover:border-opacity-100 transition-none',
          // Custom class
          className
        )}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RetroCard.displayName = 'RetroCard';
