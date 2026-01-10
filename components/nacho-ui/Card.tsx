import React from 'react';
import { cn } from '@/lib/utils/cn'; // Assuming there's a cn utility, if not I'll just use template literals or clsx directly. Wait, I should check.

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export function Card({ className, children, hover = true, ...props }: CardProps) {
  return (
    <div
      className={`bg-nacho-card border border-nacho-border rounded-nacho p-6 transition-all duration-200 
        ${hover ? 'hover:bg-nacho-card-hover hover:border-nacho-border-strong hover:-translate-y-0.5 hover:shadow-nacho-hover' : ''} 
        ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
}

