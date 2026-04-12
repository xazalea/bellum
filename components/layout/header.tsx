'use client';

import Link from 'next/link';
import { useState } from 'react';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="cd-container flex h-11 items-center justify-between">
        <Link href="/" className="text-sm font-medium tracking-tight text-foreground hover:text-muted-foreground transition-colors">
          BELLUM
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/games" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Games
          </Link>
          <Link href="/run" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Run
          </Link>
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 8h16M4 16h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-border bg-background">
          <div className="cd-container py-2 flex flex-col gap-2">
            <Link href="/games" onClick={() => setMenuOpen(false)} className="text-xs text-muted-foreground hover:text-foreground py-1">
              Games
            </Link>
            <Link href="/run" onClick={() => setMenuOpen(false)} className="text-xs text-muted-foreground hover:text-foreground py-1">
              Run
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
