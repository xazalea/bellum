import React from 'react';
import { LayoutGrid, Share2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full py-10 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-nacho-accent-green shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
            <span className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/70">Global CDN Active</span>
          </div>
          <div className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/40">
            Next-Gen Framework
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 w-10 rounded-full bg-nacho-card border border-nacho-border flex items-center justify-center text-nacho-subtext hover:text-white hover:bg-nacho-card-hover transition-all">
            <LayoutGrid size={18} />
          </button>
          <button className="h-10 w-10 rounded-full bg-nacho-card border border-nacho-border flex items-center justify-center text-nacho-subtext hover:text-white hover:bg-nacho-card-hover transition-all">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </footer>
  );
}

