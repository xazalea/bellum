'use client';

import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-ocean-border">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between gap-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-ocean-accent/15 border border-ocean-accent/20" />
              <span className="text-sm font-semibold text-ocean-primary">Bellum</span>
            </div>
            <p className="text-sm text-ocean-muted max-w-xs leading-relaxed">
              High-performance browser runtime for emulation, gaming, and cloud computing.
            </p>
          </div>

          <div className="flex gap-16">
            <div className="space-y-3">
              <p className="text-xs font-medium text-ocean-muted uppercase tracking-wider">Explore</p>
              <div className="space-y-2 text-sm">
                <Link href="/games" className="block text-ocean-secondary hover:text-ocean-primary transition-colors">Games</Link>
                <Link href="/ai" className="block text-ocean-secondary hover:text-ocean-primary transition-colors">AI Chat</Link>
                <Link href="/virtual-machines" className="block text-ocean-secondary hover:text-ocean-primary transition-colors">Virtual Machines</Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-ocean-muted uppercase tracking-wider">Platform</p>
              <div className="space-y-2 text-sm">
                <Link href="/library" className="block text-ocean-secondary hover:text-ocean-primary transition-colors">Library</Link>
                <Link href="/storage" className="block text-ocean-secondary hover:text-ocean-primary transition-colors">Storage</Link>
                <Link href="/account" className="block text-ocean-secondary hover:text-ocean-primary transition-colors">Account</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-ocean-border">
          <p className="text-xs text-ocean-muted">&copy; {new Date().getFullYear()} Bellum</p>
        </div>
      </div>
    </footer>
  );
}
