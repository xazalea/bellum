'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/virtual-machines', label: 'Virtual Machines' },
  { href: '/games', label: 'Games' },
  { href: '/library', label: 'Library' },
  { href: '/storage', label: 'Storage' },
  { href: '/cluster', label: 'Cluster' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ocean-border bg-ocean-bg/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-ocean-accent/15 border border-ocean-accent/20" />
          <span className="text-sm font-semibold text-ocean-primary tracking-tight">Challenger Deep</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                  active
                    ? 'bg-ocean-surface text-ocean-primary'
                    : 'text-ocean-muted hover:text-ocean-secondary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/virtual-machines"
          className="px-4 py-1.5 rounded-md bg-ocean-accent/90 text-ocean-bg text-sm font-medium hover:bg-ocean-accent transition-colors"
        >
          Launch
        </Link>
      </div>
    </header>
  );
}
