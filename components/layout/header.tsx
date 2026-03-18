'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { Button } from '@/components/ui/button';
import { Gamepad2, Smartphone, Monitor, Cpu, Menu, X, User, LogOut } from 'lucide-react';

const NAV = [
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/android', label: 'Android', icon: Smartphone },
  { href: '/windows', label: 'Windows', icon: Monitor },
  { href: '/ai', label: 'AI', icon: Cpu },
] as const;

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="cd-container">
        <div className="flex items-center h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 group" onClick={close}>
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-black text-xs select-none">
              CD
            </div>
            <span className="font-bold tracking-tight text-sm hidden sm:block">CHALLENGER</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors duration-100 ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-1">
            <ThemeSwitcher />

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium max-w-[120px] truncate">{user.username}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} title="Logout" aria-label="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1">
                <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
                <Link href="/signup"><Button size="sm">Sign Up</Button></Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="cd-container py-3 space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <div className="border-t border-border pt-3 mt-2">
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => { logout(); close(); }} className="gap-2">
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" onClick={close}><Button variant="ghost" size="sm">Login</Button></Link>
                  <Link href="/signup" onClick={close}><Button size="sm">Sign Up</Button></Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
