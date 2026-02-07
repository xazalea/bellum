'use client';

import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-nacho-border/50 bg-nacho-surface/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-nacho-bg border border-nacho-border flex items-center justify-center shadow-glow">
              <span className="material-symbols-outlined text-nacho-accent">water</span>
            </div>
            <div>
              <p className="font-semibold text-nacho-primary">Bellum</p>
              <p className="text-xs text-nacho-muted">browser runtime platform</p>
            </div>
          </div>
          <p className="text-sm text-nacho-secondary leading-relaxed">
            A high-performance runtime platform for running Windows, Android, and games directly in your browser using advanced emulation.
          </p>
        </div>

        <div className="space-y-4 text-sm">
          <p className="text-nacho-primary font-semibold tracking-wider uppercase text-[11px]">Explore</p>
          <div className="space-y-2">
            <Link href="/games" className="text-nacho-secondary hover:text-nacho-accent block transition-colors">Games Arcade</Link>
            <Link href="/ai" className="text-nacho-secondary hover:text-nacho-accent block transition-colors">AI Chat</Link>
            <Link href="/virtual-machines" className="text-nacho-secondary hover:text-nacho-accent block transition-colors">Virtual Machine Hub</Link>
            <Link href="/android" className="text-nacho-secondary hover:text-nacho-accent block transition-colors pl-4 border-l border-nacho-border/30">Android Runtime</Link>
            <Link href="/windows" className="text-nacho-secondary hover:text-nacho-accent block transition-colors pl-4 border-l border-nacho-border/30">Windows Emulator</Link>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <p className="text-nacho-primary font-semibold tracking-wider uppercase text-[11px]">Platform</p>
          <div className="space-y-2">
            <Link href="/library" className="text-nacho-secondary hover:text-nacho-accent block transition-colors">Personal Library</Link>
            <Link href="/storage" className="text-nacho-secondary hover:text-nacho-accent block transition-colors">Cloud Storage</Link>
            <Link href="/account" className="text-nacho-secondary hover:text-nacho-accent block transition-colors">My Account</Link>
            <Link href="/cluster" className="text-nacho-secondary hover:text-nacho-accent block transition-colors">Cluster Status</Link>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <p className="text-nacho-primary font-semibold tracking-wider uppercase text-[11px]">Status</p>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-nacho-secondary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </div>
            <div className="p-3 rounded-lg bg-nacho-bg/50 border border-nacho-border">
              <p className="text-[10px] text-nacho-muted uppercase font-bold mb-1">Architecture</p>
              <p className="text-xs text-nacho-secondary">Hybrid API Emulation</p>
            </div>
            <div className="text-[11px] text-nacho-muted italic">© {new Date().getFullYear()} Bellum Runtime Platform</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
