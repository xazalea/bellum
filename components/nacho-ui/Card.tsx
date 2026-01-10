import React from 'react';
import { cn } from '@/lib/utils';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  animate?: boolean;
  loading?: boolean;
};

export function Card({ 
  className, 
  children, 
  hover = true, 
  animate = true,
  loading = false,
  ...props 
}: CardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "bg-nacho-card border border-nacho-border rounded-nacho p-6",
          "skeleton",
          className
        )}
        style={{ minHeight: '120px' }}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-nacho-card border border-nacho-border rounded-nacho p-6 transition-all duration-300 ease-out",
        hover && "hover:bg-nacho-card-hover hover:border-nacho-border-strong hover:-translate-y-1 hover:shadow-2xl hover:shadow-nacho-primary/5 cursor-pointer active:translate-y-0 active:shadow-lg",
        animate && "animate-slide-up",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
