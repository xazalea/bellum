import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'magic';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'nacho-card p-6 text-nacho-text relative overflow-hidden backdrop-blur-sm',
          variant === 'hover' && 'hover:bg-nacho-card-hover hover:-translate-y-1 hover:shadow-xl transition-all duration-300',
          variant === 'magic' && 'group hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-300',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export { Card };
