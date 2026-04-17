'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: '/games', label: 'Library' },
    { href: '/run', label: 'Run' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? 'border-border bg-background/80 backdrop-blur-xl'
          : 'border-transparent bg-background'
      }`}
    >
      <div className="cd-container flex h-12 items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground hover:text-foreground/80 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>BELLUM</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 h-8 inline-flex items-center text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px bg-foreground transition-all duration-200"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-200 ${
          menuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="cd-container py-2 flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    isActive ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
