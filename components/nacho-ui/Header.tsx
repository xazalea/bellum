'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';
import { useClusterPeers } from '@/components/site/hooks/useClusterPeers';
import { authService, User } from '@/lib/firebase/auth-service';
import { AccountModal } from './AccountModal';

export function Header() {
  const pathname = usePathname();
  const { peers } = useClusterPeers();
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  useEffect(() => {
    return authService.onAuthStateChange(setUser);
  }, []);

  const navItems = [
    { label: 'Overview', href: '/' },
    { label: 'Library', href: '/library' },
    { label: 'Network', href: '/network' },
    { label: 'Docs', href: '/docs' },
  ];

  function isActivePath(path: string, href: string) {
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  }

  const versionBadge = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_BUILD_VERSION ?? 'local';
    if (raw === 'local' || raw === 'unknown') {
      return 'local';
    }
    return raw.startsWith('v') ? raw : `v${raw}`;
  }, []);

  const clusterLabel = useMemo(() => {
    if (peers.length > 0) return `Cluster Connected (${peers.length})`;
    return 'Cluster Connecting';
  }, [peers.length]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 bg-nacho-text text-nacho-bg rounded-full flex items-center justify-center transition-transform group-hover:scale-105 shadow-glow">
              <Compass size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold font-display tracking-tight text-white">Nacho</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-nacho-subtext uppercase">Platform</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-nacho-card/80 backdrop-blur-xl border border-nacho-border rounded-full p-1.5 shadow-2xl shadow-black/50">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                    active 
                      ? "bg-nacho-primary text-nacho-bg shadow-lg shadow-nacho-primary/20" 
                      : "text-nacho-subtext hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Cluster Status */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-nacho-border bg-nacho-card px-3 py-2">
              <span className={cn(
                "h-2 w-2 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.55)]", 
                peers.length ? 'bg-nacho-accent-green' : 'bg-nacho-accent-grey'
              )} />
              <span className="text-[11px] font-semibold tracking-wide text-nacho-subtext">{clusterLabel}</span>
            </div>

            {/* Account Button */}
            <button
              onClick={() => setAccountOpen(true)}
              className="h-10 rounded-full bg-white px-5 text-sm font-bold text-black shadow-lg hover:shadow-xl hover:bg-white/95 transition-all active:scale-95"
            >
              Account
            </button>
          </div>
        </div>
      </header>

      <AccountModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} user={user} />
    </>
  );
}
