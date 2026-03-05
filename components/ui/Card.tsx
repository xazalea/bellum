import * as React from 'react';
import { cn } from '@/lib/utils';
import { GlowingEffect } from './glowing-effect';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'elevated' | 'glow';
  glow?: boolean;
  glowSpread?: number;
  glowBorderWidth?: number;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', glow = false, glowSpread = 20, glowBorderWidth = 1, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative bg-[var(--cd-surface)] border border-[var(--cd-border-default)] rounded-lg p-4 transition-all duration-200',
          variant === 'hover' && 'hover:bg-[var(--cd-elevated)] hover:border-[var(--cd-border-muted)]',
          variant === 'elevated' && 'bg-[var(--cd-elevated)] border-[var(--cd-border-muted)]',
          variant === 'glow' && 'overflow-hidden',
          className
        )}
        {...props}
      >
        {(variant === 'glow' || glow) && (
          <GlowingEffect
            spread={glowSpread}
            borderWidth={glowBorderWidth}
            disabled={false}
            proximity={40}
          />
        )}
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export { Card };
