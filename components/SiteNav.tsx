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
    <header className="sticky top-0 z-40 w-full">
      <div className="ocean-nav">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-nacho-surface border border-nacho-border flex items-center justify-center">
              <span className="material-symbols-outlined text-nacho-accent">water</span>
            </div>
            <div className="leading-tight">
              <span className="block text-nacho-primary font-semibold tracking-tight">challenger deep</span>
              <span className="block text-xs text-nacho-muted">deep ocean compute</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    active
                      ? 'bg-nacho-surface text-nacho-primary border-nacho-border'
                      : 'text-nacho-secondary border-transparent hover:border-nacho-border hover:bg-nacho-surface/60'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/virtual-machines"
              className="px-4 py-2 rounded-full bg-nacho-accent text-white text-sm font-semibold hover:bg-blue-500 transition-all"
            >
              Launch
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
