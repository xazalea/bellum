'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { root, scope, run } = useAnimeScope();
  const prevPathname = useRef(pathname);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    run(s => {
      s.add(self => {
        animate('[data-anime="logo"]', { translateY: [-6, 0], opacity: [0, 1], ease: ease.out, duration: dur.base });
        animate('[data-anime="nav-link"]', { translateX: [6, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: stagger(50, { start: 120 }) });
      });
    });
  }, [run]);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      const underline = document.querySelector('[data-anime="nav-underline"]');
      if (underline) animate(underline, { scaleX: [0, 1], ease: spring({ bounce: 0.3, stiffness: 250, damping: 14 }), duration: dur.base });
      prevPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (headerRef.current) animate(headerRef.current, { backgroundColor: scrolled ? 'hsl(var(--background) / 0.85)' : 'hsl(var(--background))', ease: ease.out, duration: dur.base });
  }, [scrolled]);

  useEffect(() => {
    if (menuOpen) {
      run(s => {
        s.add(self => {
          animate('[data-anime="mobile-item"]', { translateY: [6, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: stagger(40, { start: 40 }) });
        });
      });
    }
  }, [menuOpen, run]);

  const navItems = [{ href: '/games', label: 'Library' }, { href: '/run', label: 'Run' }, { href: '/mesh', label: 'Mesh' }, { href: '/referral', label: 'Referrals' }];

  return (
    <header ref={headerRef} className={`sticky top-0 z-50 border-b ${scrolled ? 'border-border backdrop-blur-xl' : 'border-transparent'}`}>
      <div ref={root} className="cd-container flex h-12 items-center justify-between">
        <Link href="/" data-anime="logo" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground hover:text-foreground/80" style={{ opacity: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-70"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>BELLUM</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} data-anime="nav-link" className={`relative px-3 h-8 inline-flex items-center text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`} style={{ opacity: 0 }}>
                {item.label}
                {isActive && <span data-anime="nav-underline" className="absolute bottom-0 left-3 right-3 h-px bg-primary origin-left" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground" aria-label="Menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>
      <div className={`sm:hidden overflow-hidden ${menuOpen ? 'h-auto' : 'h-0'}`}>
        <div className="border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="cd-container py-2 flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} data-anime="mobile-item" className={`px-3 py-2 text-xs font-medium ${isActive ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`} style={{ opacity: 0 }}>{item.label}</Link>;
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
