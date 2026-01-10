import React from 'react';
import { cn } from '@/lib/utils';

type ToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
};

export function Toggle({ checked, onCheckedChange, label, className }: ToggleProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className="text-sm font-medium text-nacho-subtext">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nacho-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nacho-bg",
          checked ? "bg-nacho-primary" : "bg-nacho-card border border-nacho-border"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out",
            checked ? "translate-x-6 bg-nacho-bg" : "translate-x-1 bg-nacho-subtext"
          )}
        />
      </button>
    </div>
  );
}

