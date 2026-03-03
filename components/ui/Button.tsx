import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'danger';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, variant = 'default', ...props }, ref) => {
    if (asChild) {
      console.warn("Button: asChild prop is not supported without @radix-ui/react-slot");
    }
    
    const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 transition-all duration-150 rounded-md';
    
    const variantStyles = {
      default: 'cd-btn',
      primary: 'cd-btn cd-btn-primary',
      outline: 'cd-btn cd-btn-ghost',
      ghost: 'cd-btn cd-btn-ghost',
      danger: 'cd-btn cd-btn-danger',
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