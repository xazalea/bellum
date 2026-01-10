import React from 'react';
import { cn } from '@/lib/utils';

type ProgressBarProps = {
  value: number; // 0 to 100
  label?: string;
  showValue?: boolean;
  className?: string;
};

export function ProgressBar({ value, label, showValue = true, className }: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-end mb-2">
        {label && <span className="text-sm font-medium text-nacho-text">{label}</span>}
        {showValue && <span className="text-sm font-bold text-nacho-text">{Math.round(value)}%</span>}
      </div>
      <div className="h-3 w-full bg-nacho-card-2 rounded-full overflow-hidden">
        <div 
          className="h-full bg-nacho-primary/80 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(168,180,208,0.3)]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

