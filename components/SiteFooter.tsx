'use client';

import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="w-full border-t-2 border-ocean-border relative">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between gap-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="font-pixel text-xs text-ocean-accent retro-glow">CHALLENGER DEEP</span>
            </div>
            <p className="font-mono text-sm text-ocean-muted max-w-xs leading-relaxed">
              High-performance browser runtime for emulation, gaming, and cloud computing.
            </p>
            <div className="font-pixel text-[8px] text-ocean-muted/40 pt-2">
              ～～～～～～～～～～～～
            </div>
          </div>

          <div className="flex gap-16">
            <div className="space-y-3">
              <p className="font-pixel text-[8px] text-ocean-muted uppercase tracking-wider">Explore</p>
              <div className="space-y-2 font-mono text-sm">
                <Link href="/games" className="block text-ocean-secondary hover:text-ocean-accent transition-colors">▶ Games</Link>
                <Link href="/ai" className="block text-ocean-secondary hover:text-ocean-accent transition-colors">▶ AI Chat</Link>
                <Link href="/virtual-machines" className="block text-ocean-secondary hover:text-ocean-accent transition-colors">▶ Virtual Machines</Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-pixel text-[8px] text-ocean-muted uppercase tracking-wider">Platform</p>
              <div className="space-y-2 font-mono text-sm">
                <Link href="/library" className="block text-ocean-secondary hover:text-ocean-accent transition-colors">▶ Library</Link>
                <Link href="/storage" className="block text-ocean-secondary hover:text-ocean-accent transition-colors">▶ Storage</Link>
                <Link href="/account" className="block text-ocean-secondary hover:text-ocean-accent transition-colors">▶ Account</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t-2 border-ocean-border flex items-center justify-between">
          <p className="font-pixel text-[8px] text-ocean-muted">&copy; {new Date().getFullYear()} CHALLENGER DEEP</p>
          <p className="font-pixel text-[8px] text-ocean-muted/40">DEPTH: 10,994m</p>
        </div>
      </div>
    </footer>
  );
}
