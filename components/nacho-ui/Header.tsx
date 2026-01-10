import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';

export function Header() {
  const navItems = [
    { label: 'Components', href: '/', active: true },
    { label: 'Theming', href: '#', active: false },
    { label: 'Documentation', href: '/docs', active: false },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 bg-nacho-text text-nacho-bg rounded-full flex items-center justify-center transition-transform group-hover:scale-105">
            <Compass size={24} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold font-display tracking-tight text-white">Nacho UI</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-nacho-card/80 backdrop-blur-xl border border-nacho-border rounded-full p-1.5 shadow-2xl shadow-black/50">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                item.active 
                  ? "bg-nacho-primary text-nacho-bg shadow-lg shadow-nacho-primary/20" 
                  : "text-nacho-subtext hover:text-white hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Version Badge */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-full bg-nacho-card border border-nacho-border flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-nacho-subtext/50" />
            <span className="text-xs font-mono font-medium text-nacho-subtext">v1.0.4</span>
          </div>
        </div>
      </div>
    </header>
  );
}

