/**
 * Retro Pixel Button Component
 * Combines RetroUI principles with deep ocean theme
 * Inspired by: https://github.com/Dksie09/RetroUI
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ocean';
  pixelStyle?: 'normal' | 'thick' | 'glow';
}

const variants = {
  primary: {
    bg: '#1E3A5F',
    text: '#E2E8F0',
    shadow: '#0A1F3D',
    border: '#4A6380',
  },
  secondary: {
    bg: '#2D4A6E',
    text: '#CBD5E1',
    shadow: '#1E3A5F',
    border: '#5A7090',
  },
  danger: {
    bg: '#7F3F3F',
    text: '#FEE2E2',
    shadow: '#5A2A2A',
    border: '#9F5F5F',
  },
  ocean: {
    bg: '#4A6380',
    text: '#F1F5F9',
    shadow: '#2D4A6E',
    border: '#6B98B8',
  },
};

export const RetroButton = forwardRef<HTMLButtonElement, RetroButtonProps>(
  ({ 
    children, 
    className, 
    variant = 'primary',
    pixelStyle = 'normal',
    disabled,
    ...props 
  }, ref) => {
    const colors = variants[variant];
    
    const pixelClasses = {
      normal: 'pixel-shadow-sm',
      thick: 'pixel-shadow-lg pixel-border-thick',
      glow: 'pixel-shadow-ocean text-glow-pixel',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          // Base pixel styling
          'pixel-border font-minecraft transition-none',
          // Spacing
          'px-6 py-3',
          // Interactive states - pixel-perfect movement
          'hover:translate-x-[1px] hover:translate-y-[1px]',
          'hover:shadow-[2px_2px_0px_0px_rgba(10,31,61,1)]',
          'active:translate-x-[3px] active:translate-y-[3px]',
          'active:shadow-none',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'disabled:hover:translate-x-0 disabled:hover:translate-y-0',
          // Pixel style variant
          pixelClasses[pixelStyle],
          // Custom class
          className
        )}
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
          boxShadow: disabled ? 'none' : `4px 4px 0px 0px ${colors.shadow}`,
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

RetroButton.displayName = 'RetroButton';
