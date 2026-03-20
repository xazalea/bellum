'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';

export interface BentoItem {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6;
  rowSpan?: 1 | 2;
  content: React.ReactNode;
  className?: string;
}

interface BentoGridProps {
  items: BentoItem[];
  className?: string;
  gap?: number;
}

const colSpanMap: Record<number, string> = {
  1: 'col-span-6 md:col-span-1',
  2: 'col-span-6 md:col-span-2',
  3: 'col-span-6 md:col-span-3',
  4: 'col-span-6 md:col-span-4',
  5: 'col-span-6 md:col-span-5',
  6: 'col-span-6',
};

const rowSpanMap: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
};

export function BentoGrid({ items, className, gap = 4 }: BentoGridProps) {
  return (
    <div
      className={cn('grid grid-cols-6', className)}
      style={{ gap: `${gap * 4}px` }}
    >
      {items.map((item, i) => {
        const col = item.colSpan ?? 1;
        const row = item.rowSpan ?? 1;
        return (
          <div
            key={i}
            className={cn(
              colSpanMap[col],
              rowSpanMap[row],
              item.className,
            )}
          >
            <GlassCard padding="none" className="h-full w-full overflow-hidden">
              {item.content}
            </GlassCard>
          </div>
        );
      })}
    </div>
  );
}
