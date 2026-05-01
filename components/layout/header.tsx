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
  const { root, run } = useAnimeScope();
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
        animate('[data-anime="logo"]', { translateY: [-4, 0], opacity: [0, 1], ease: ease.out, duration: dur.base });
        animate('[data-anime="nav-link"]', { opacity: [0, 1], ease: ease.out, duration: dur.base, delay: stagger(40, { start: 100 }) });
      });
    });
  }, [run]);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      const underline = document.querySelector('[data-anime="nav-underline"]');
      if (underline) animate(underline, { scaleX: [0, 1], ease: spring({ bounce: 0.2, stiffness: 200, damping: 14 }), duration: dur.base });
      prevPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (headerRef.current) animate(headerRef.current, { backgroundColor: scrolled ? 'hsl(var(--background) / 0.8)' : 'hsl(var(--background))', ease: ease.out, duration: dur.base });
  }, [scrolled]);

  useEffect(() => {
    if (menuOpen) {
      run(s => {
        s.add(self => {
          animate('[data-anime="mobile-item"]', { translateY: [4, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: stagger(30, { start: 30 }) });
        });
      });
    }
  }, [menuOpen, run]);

  const navItems = [{ href: '/games', label: 'Library' }, { href: '/run', label: 'Run' }, { href: '/mesh', label: 'Mesh' }, { href: '/referral', label: 'Rewards' }];

  return (
    <header ref={headerRef} className={`sticky top-0 z-50 border-b ${scrolled ? 'border-border/40 backdrop-blur-xl' : 'border-transparent'}`}>
      <div ref={root} className="cd-container flex h-11 items-center justify-between">
        <Link href="/" data-anime="logo" className="flex items-center gap-2.5 text-[12px] font-semibold tracking-tight text-foreground hover:text-foreground/80 transition-colors" style={{ opacity: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/80">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="tracking-[-0.02em]">BELLUM</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} data-anime="nav-link" className={`relative px-3 h-7 inline-flex items-center text-[11px] font-medium tracking-wide transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80'}`} style={{ opacity: 0 }}>
                {item.label}
                {isActive && <span data-anime="nav-underline" className="absolute bottom-0 left-3 right-3 h-px bg-primary/60 origin-left" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden flex items-center justify-center w-7 h-7 text-muted-foreground/60 hover:text-foreground transition-colors" aria-label="Menu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>
      <div className={`sm:hidden overflow-hidden ${menuOpen ? 'h-auto' : 'h-0'}`}>
        <div className="border-t border-border/30 bg-background/95 backdrop-blur-xl">
          <div className="cd-container py-1.5 flex flex-col gap-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} data-anime="mobile-item" className={`px-3 py-2 text-[11px] font-medium tracking-wide ${isActive ? 'text-foreground bg-accent/50' : 'text-muted-foreground/60 hover:text-foreground hover:bg-accent/30'}`} style={{ opacity: 0 }}>{item.label}</Link>;
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
