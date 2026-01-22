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
    <header className="fixed top-0 z-50 w-full border-b border-nacho-border bg-nacho-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-6">
          <Link href="/games" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg border border-nacho-border bg-nacho-surface" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-nacho-primary">Bellum</div>
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
                    'rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-nacho-surface text-nacho-primary'
                      : 'text-nacho-secondary hover:bg-nacho-surface/70 hover:text-nacho-primary'
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
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-nacho-border bg-nacho-surface text-nacho-primary"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[18px]">menu</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[86vw] max-w-sm border-l border-nacho-border bg-nacho-bg p-4"
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
                      'block rounded-xl px-4 py-3 text-sm',
                      active ? 'bg-nacho-surface text-nacho-primary' : 'text-nacho-secondary hover:bg-nacho-surface/70'
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

