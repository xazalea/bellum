'use client';

import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-nacho-border bg-nacho-surface/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-nacho-bg border border-nacho-border flex items-center justify-center">
              <span className="material-symbols-outlined text-nacho-accent">water</span>
            </div>
            <div>
              <p className="font-semibold text-nacho-primary">challenger deep</p>
              <p className="text-xs text-nacho-muted">deep ocean compute</p>
            </div>
          </div>
          <p className="text-sm text-nacho-secondary">
            Run APKs, EXEs, and games directly in the browser with a minimal, resilient runtime.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-nacho-primary font-semibold">Explore</p>
          <Link href="/virtual-machines" className="text-nacho-secondary hover:text-nacho-primary block">Virtual Machines</Link>
          <Link href="/games" className="text-nacho-secondary hover:text-nacho-primary block">Games</Link>
          <Link href="/library" className="text-nacho-secondary hover:text-nacho-primary block">Library</Link>
          <Link href="/storage" className="text-nacho-secondary hover:text-nacho-primary block">Storage</Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-nacho-primary font-semibold">System</p>
          <Link href="/cluster" className="text-nacho-secondary hover:text-nacho-primary block">Cluster</Link>
          <span className="text-nacho-secondary block">WebGPU Acceleration</span>
          <span className="text-nacho-secondary block">Discord Identity</span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-nacho-primary font-semibold">Status</p>
          <div className="flex items-center gap-2 text-nacho-secondary">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Systems Online
          </div>
          <div className="text-xs text-nacho-muted">© {new Date().getFullYear()} Challenger Deep</div>
        </div>
      </div>
    </footer>
  );
}
