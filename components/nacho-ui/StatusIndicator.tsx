import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'active' | 'maintenance' | 'pending' | 'info';

type StatusIndicatorProps = {
  status: Status;
  label?: string;
  className?: string;
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const styles = {
    active: {
      dot: "bg-nacho-accent-green shadow-[0_0_8px_rgba(74,222,128,0.5)]",
      text: "text-white"
    },
    maintenance: {
      dot: "bg-nacho-accent-pink shadow-[0_0_8px_rgba(244,114,182,0.5)]",
      text: "text-nacho-subtext"
    },
    pending: {
      dot: "bg-nacho-accent-grey",
      text: "text-nacho-subtext opacity-60"
    },
    info: {
      dot: "bg-nacho-accent-blue shadow-[0_0_8px_rgba(96,165,250,0.5)]",
      text: "text-white"
    }
  };

  const currentStyle = styles[status];
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border border-nacho-border bg-nacho-card/50 px-3 py-1.5", className)}>
      <span className={cn("h-2 w-2 rounded-full", currentStyle.dot)} />
      <span className={cn("text-xs font-medium", currentStyle.text)}>
        {displayLabel}
      </span>
    </div>
  );
}
