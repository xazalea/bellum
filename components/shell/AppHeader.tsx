'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ClusterIndicator } from '@/components/shell/ClusterIndicator';

const NAV = [
  { href: '/android', label: 'Android' },
  { href: '/windows', label: 'Windows' },
  { href: '/library', label: 'Library' },
  { href: '/games', label: 'Games' },
  { href: '/storage', label: 'Storage' },
  { href: '/account', label: 'Account' },
];

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-nacho-border/50 bg-nacho-bg/80 backdrop-blur-xl shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-6">
          <Link href="/games" className="flex items-center gap-3 group">
            <div className="h-8 w-8 rounded-lg border border-nacho-accent/30 bg-gradient-to-br from-nacho-accent/20 to-nacho-surface group-hover:border-nacho-accent/50 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-nacho-primary group-hover:text-nacho-accent transition-colors">Bellum</div>
              <div className="text-[11px] text-nacho-muted">browser runtime</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm transition-all duration-300 relative',
                    active
                      ? 'bg-nacho-surface text-nacho-primary shadow-md'
                      : 'text-nacho-secondary hover:bg-nacho-surface/70 hover:text-nacho-primary hover:scale-105'
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-nacho-accent rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ClusterIndicator />
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nacho-border bg-nacho-surface text-nacho-primary hover:border-nacho-accent hover:bg-nacho-card-hover transition-all duration-300"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[18px]">menu</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md animate-fade-in" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[86vw] max-w-sm border-l border-nacho-border/50 bg-nacho-bg/95 backdrop-blur-xl p-4 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-nacho-primary">Menu</div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nacho-border bg-nacho-surface text-nacho-primary"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-4">
              <ClusterIndicator />
            </div>

            <div className="mt-4 space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block rounded-xl px-4 py-3 text-sm transition-all duration-300',
                      active ? 'bg-nacho-surface text-nacho-primary shadow-md border-l-2 border-nacho-accent' : 'text-nacho-secondary hover:bg-nacho-surface/70 hover:translate-x-1'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

