'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { safeAnimate, presets } from '@/lib/animation/engine';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onMouseDown, onMouseUp, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const localRef = React.useRef<HTMLButtonElement>(null);
    // Use a stable callback ref that always points to the latest DOM element
    const stableRef = React.useRef<HTMLButtonElement | null>(null);
    const setRef = React.useCallback((el: HTMLButtonElement | null) => {
      stableRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
      }
      (localRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    }, [ref]);

    const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (stableRef.current && !props.disabled) {
        safeAnimate(stableRef.current, presets.buttonPress());
      }
      onMouseDown?.(e);
    }, [onMouseDown, props.disabled]);

    const handleMouseUp = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (stableRef.current && !props.disabled) {
        safeAnimate(stableRef.current, presets.buttonRelease());
      }
      onMouseUp?.(e);
    }, [onMouseUp, props.disabled]);

    const handleMouseEnter = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (stableRef.current && !props.disabled) {
        safeAnimate(stableRef.current, presets.buttonHover());
      }
      onMouseEnter?.(e);
    }, [onMouseEnter, props.disabled]);

    const handleMouseLeave = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (stableRef.current && !props.disabled) {
        safeAnimate(stableRef.current, presets.buttonRelease());
      }
      onMouseLeave?.(e);
    }, [onMouseLeave, props.disabled]);

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={setRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
