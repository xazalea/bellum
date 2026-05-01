'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';

const navItems = [
  { href: '/', label: 'Home', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { href: '/games', label: 'Library', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h2M16 12h2" /></svg> },
  { href: '/mesh', label: 'Mesh', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><line x1="12" y1="10" x2="7.5" y2="7.5" /><line x1="12" y1="10" x2="16.5" y2="7.5" /><line x1="12" y1="14" x2="7.5" y2="16.5" /><line x1="12" y1="14" x2="16.5" y2="16.5" /></svg> },
  { href: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { href: '/referral', label: 'Rewards', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
];

export function MobileNav() {
  const pathname = usePathname();
  const { root, run } = useAnimeScope();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    run(s => {
      s.add(self => {
        animate('[data-anime="mobile-tab"]', {
          translateY: [8, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.base,
          delay: stagger(30, { from: 0, start: 80 }),
        });
      });
    });
  }, [run]);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      const activeIcon = document.querySelector('[data-anime="tab-icon-active"]');
      if (activeIcon) animate(activeIcon, { scale: [0.85, 1], ease: spring({ bounce: 0.4, stiffness: 250, damping: 12 }), duration: dur.base });
      prevPathname.current = pathname;
    }
  }, [pathname]);

  return (
    <nav ref={root} className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/90 backdrop-blur-xl safe-area-inset">
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} data-anime="mobile-tab" className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground/80'}`} style={{ opacity: 0 }}>
              <div data-anime={isActive ? 'tab-icon-active' : undefined}>{item.icon}</div>
              <span className="text-[8px] font-medium tracking-wide leading-none">{item.label}</span>
              {isActive && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary/50" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
