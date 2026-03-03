import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'elevated';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-[var(--cd-surface)] border border-[var(--cd-border-default)] rounded-lg p-4 transition-all duration-200',
          variant === 'hover' && 'hover:bg-[var(--cd-elevated)] hover:border-[var(--cd-border-muted)]',
          variant === 'elevated' && 'bg-[var(--cd-elevated)] border-[var(--cd-border-muted)]',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export { Card };