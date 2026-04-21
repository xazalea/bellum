'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';

const sidebarItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { href: '/games', label: 'Library', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h2M16 12h2" /></svg> },
  { href: '/run', label: 'Run', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg> },
  { href: '/mesh', label: 'Mesh', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><line x1="12" y1="10" x2="7.5" y2="7.5" /><line x1="12" y1="10" x2="16.5" y2="7.5" /><line x1="12" y1="14" x2="7.5" y2="16.5" /><line x1="12" y1="14" x2="16.5" y2="16.5" /></svg> },
  { href: '/referral', label: 'Referrals', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
  { href: '/settings', label: 'Settings', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { root, scope, run } = useAnimeScope();

  const showSidebar = pathname === '/dashboard' || pathname === '/settings' || pathname === '/mesh' || pathname === '/referral' || pathname.startsWith('/games') || pathname.startsWith('/run');
  if (!showSidebar) return null;

  useEffect(() => {
    run(s => {
      s.add(self => {
        if (!self) return;
        animate('[data-anime="sidebar-icon"]', {
          scale: [0.6, 1], opacity: [0, 1],
          ease: spring({ bounce: 0.3, stiffness: 250, damping: 14 }),
          duration: dur.base,
          delay: stagger(50, { from: 0, start: 80 }),
        });
        animate('[data-anime="status-dot"]', {
          opacity: [0, 1], scale: [0, 1],
          ease: spring({ bounce: 0.5 }), duration: dur.base, delay: 400,
        });
        self.add('pulseStatus', () => {
          animate('[data-anime="status-dot"] .dot', {
            opacity: [0.4, 0.9, 0.4],
            boxShadow: ['0 0 3px hsl(var(--primary) / 0.2)', '0 0 8px hsl(var(--primary) / 0.4)', '0 0 3px hsl(var(--primary) / 0.2)'],
            ease: 'inOut(2)', duration: 1500, loop: true,
          });
        });
        self.methods.pulseStatus();
      });
    });
  }, [run]);

  const onIconEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { scale: 1.1, ease: spring({ bounce: 0.3, stiffness: 300, damping: 15 }), duration: dur.fast });
  }, []);
  const onIconLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <aside ref={root} className="hidden lg:flex flex-col w-14 border-r border-border bg-card/30 py-4 shrink-0">
      <div className="flex items-center justify-center mb-6">
        <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-70"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </div>
      <nav className="flex flex-col items-center gap-1 flex-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} data-anime="sidebar-icon" className={`relative flex items-center justify-center w-9 h-9 rounded-md group ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground/50 hover:text-foreground hover:bg-accent/50'}`} title={item.label} style={{ opacity: 0 }} onMouseEnter={onIconEnter} onMouseLeave={onIconLeave}>
              {item.icon}
              <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-popover border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">{item.label}</span>
              {isActive && <span className="absolute -left-[7px] w-[3px] h-4 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
      <div data-anime="status-dot" className="flex flex-col items-center gap-2 mt-auto" style={{ opacity: 0 }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground/30">
          <div className="dot w-2 h-2 rounded-full bg-primary/60" title="System online" />
        </div>
      </div>
    </aside>
  );
}
