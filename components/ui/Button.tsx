import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    // Simplified without Slot for now due to environment restrictions
    if (asChild) {
      console.warn("Button: asChild prop is not supported without @radix-ui/react-slot");
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          'nacho-btn inline-flex items-center justify-center whitespace-nowrap',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
