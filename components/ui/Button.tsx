import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'shimmer' | 'outline' | 'ghost';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, variant = 'default', ...props }, ref) => {
    // Simplified without Slot for now due to environment restrictions
    if (asChild) {
      console.warn("Button: asChild prop is not supported without @radix-ui/react-slot");
    }
    
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 transition-all duration-300';
    
    const variantStyles = {
      default: 'nacho-btn',
      shimmer: 'relative overflow-hidden rounded-lg bg-nacho-accent hover:bg-nacho-accent-hover text-white px-6 py-2.5 font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
      outline: 'border-2 border-nacho-border hover:border-nacho-accent bg-transparent hover:bg-nacho-surface text-nacho-primary rounded-lg px-6 py-2.5',
      ghost: 'hover:bg-nacho-surface text-nacho-primary rounded-lg px-6 py-2.5',
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
