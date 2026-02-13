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
    
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap text-sm disabled:pointer-events-none disabled:opacity-40 transition-colors duration-150';
    
    const variantStyles = {
      default: 'ocean-btn',
      primary: 'rounded-md bg-ocean-accent/90 hover:bg-ocean-accent text-ocean-bg px-5 py-2.5 font-medium',
      shimmer: 'rounded-md bg-ocean-accent/90 hover:bg-ocean-accent text-ocean-bg px-5 py-2.5 font-medium',
      outline: 'border border-ocean-border hover:border-ocean-border-hover bg-transparent text-ocean-primary rounded-md px-5 py-2.5',
      ghost: 'text-ocean-secondary hover:text-ocean-primary rounded-md px-4 py-2',
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
