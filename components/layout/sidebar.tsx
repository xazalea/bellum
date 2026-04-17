'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/games',
    label: 'Library',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h2M16 12h2" />
      </svg>
    ),
  },
  {
    href: '/run',
    label: 'Run',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Only show sidebar on dashboard-internal pages
  const showSidebar =
    pathname === '/dashboard' ||
    pathname === '/settings' ||
    pathname.startsWith('/games') ||
    pathname.startsWith('/run');
  if (!showSidebar) return null;

  return (
    <aside className="hidden lg:flex flex-col w-14 border-r border-border bg-card/30 py-4 shrink-0">
      {/* Logo mark */}
      <div className="flex items-center justify-center mb-6">
        <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-center w-9 h-9 rounded-md transition-colors group ${
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground/50 hover:text-foreground hover:bg-accent/50'
              }`}
              title={item.label}
            >
              {item.icon}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-popover border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </span>
              {/* Active indicator */}
              {isActive && (
                <span className="absolute -left-[7px] w-[3px] h-4 rounded-full bg-foreground" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        <div className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground/30">
          <div className="w-2 h-2 rounded-full bg-green-500/70 animate-breathe" title="System online" />
        </div>
      </div>
    </aside>
  );
}
