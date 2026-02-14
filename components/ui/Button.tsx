import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'shimmer';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, variant = 'default', ...props }, ref) => {
    if (asChild) {
      console.warn("Button: asChild prop is not supported without @radix-ui/react-slot");
    }
    
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap text-sm disabled:pointer-events-none disabled:opacity-40 transition-all duration-150 font-mono';
    
    const variantStyles = {
      default: 'ocean-btn',
      primary: 'bg-ocean-accent/10 border-2 border-ocean-accent/40 text-ocean-accent px-5 py-2.5 font-pixel text-[10px] uppercase tracking-wider hover:bg-ocean-accent/20 hover:border-ocean-accent/60 hover:shadow-[0_0_15px_rgba(0,255,204,0.15)]',
      shimmer: 'bg-ocean-accent/10 border-2 border-ocean-accent/40 text-ocean-accent px-5 py-2.5 font-pixel text-[10px] uppercase tracking-wider hover:bg-ocean-accent/20 hover:border-ocean-accent/60',
      outline: 'border-2 border-ocean-border-hover bg-transparent text-ocean-text px-5 py-2.5 hover:border-ocean-biolum hover:text-ocean-biolum hover:bg-ocean-biolum/5',
      ghost: 'text-ocean-secondary hover:text-ocean-primary px-4 py-2 hover:bg-ocean-surface',
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
