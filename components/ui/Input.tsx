import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full px-3 py-2.5 text-sm bg-[var(--cd-surface)] border border-[var(--cd-border-default)] rounded-md text-[var(--cd-text-primary)] placeholder:text-[var(--cd-text-muted)] focus:outline-none focus:border-[var(--cd-cyan-border)] focus:ring-2 focus:ring-[var(--cd-glow-cyan)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };