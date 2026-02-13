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
          'ocean-card p-6 text-ocean-text',
          variant === 'hover' && 'hover:bg-ocean-card-hover transition-colors duration-150',
          variant === 'magic' && 'hover:bg-ocean-card-hover transition-colors duration-150',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export { Card };
