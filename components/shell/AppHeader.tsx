'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ClusterIndicator } from '@/components/shell/ClusterIndicator';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/games', label: 'Games' },
  { href: '/ai', label: 'AI' },
  { href: '/android', label: 'Android' },
  { href: '/windows', label: 'Windows' },
  { href: '/library', label: 'Library' },
  { href: '/storage', label: 'Storage' },
  { href: '/account', label: 'Account' },
];

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-ocean-border bg-ocean-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-ocean-accent/15 border border-ocean-accent/20" />
            <span className="text-sm font-semibold tracking-tight text-ocean-primary">Challenger Deep</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-1.5 text-[13px] rounded-md transition-colors',
                    active
                      ? 'text-ocean-primary bg-ocean-surface'
                      : 'text-ocean-muted hover:text-ocean-secondary'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ClusterIndicator />
          <button
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-ocean-muted hover:text-ocean-primary transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 border-l border-ocean-border bg-ocean-bg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold text-ocean-primary">Menu</span>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ocean-muted hover:text-ocean-primary"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mb-4">
              <ClusterIndicator />
            </div>

            <div className="space-y-0.5">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block rounded-md px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'text-ocean-primary bg-ocean-surface'
                        : 'text-ocean-muted hover:text-ocean-secondary'
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
