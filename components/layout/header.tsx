'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { Button } from '@/components/ui/button';
import { Gamepad2, Cpu, Smartphone, Monitor, User, Menu, X } from 'lucide-react';
import { useState, useCallback } from 'react';

const NAV_LINKS = [
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/ai', label: 'AI', icon: Cpu },
  { href: '/android', label: 'Android', icon: Smartphone },
  { href: '/windows', label: 'Windows', icon: Monitor },
] as const;

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b transition-colors duration-300">
      <div className="container-max">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Gamepad2 className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Challenger</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 ml-8">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 ml-auto">
            <ThemeSwitcher />
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{user.username}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
                <Link href="/signup"><Button size="sm">Sign Up</Button></Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-1">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background animate-in slide-in-from-top-2 duration-200">
          <nav className="container-max py-3 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobile}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
            <div className="border-t pt-3 mt-3 px-3">
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => { logout(); closeMobile(); }}>Logout</Button>
              ) : (
                <div className="flex gap-1">
                  <Link href="/login" onClick={closeMobile}><Button variant="ghost" size="sm">Login</Button></Link>
                  <Link href="/signup" onClick={closeMobile}><Button size="sm">Sign Up</Button></Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
