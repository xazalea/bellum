import React from 'react';
import { cn } from '@/lib/utils';
import { Palette } from 'lucide-react';

export function IconCard() {
  return (
    <div className="relative overflow-hidden bg-nacho-primary/90 rounded-[2rem] p-6 md:p-8 text-nacho-bg transition-transform hover:-translate-y-1 duration-300">
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs font-bold tracking-widest uppercase opacity-70 mb-1">Total Icons</div>
          <div className="text-4xl font-black font-display tracking-tight">1,240+</div>
        </div>
        <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center backdrop-blur-sm">
          <Palette className="h-6 w-6 opacity-80" />
        </div>
      </div>
    </div>
  );
}

