'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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

  const clusterLabel = useMemo(() => {
    if (peers.length > 0) return `Cluster Connected (${peers.length})`;
    return 'Cluster Connecting';
  }, [peers.length]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-10 w-10 bg-nacho-text text-nacho-bg rounded-full flex items-center justify-center shadow-glow transition-shadow duration-300"
            >
              <Compass size={24} strokeWidth={2.5} />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold font-display tracking-tight text-white">Nacho</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-nacho-subtext uppercase">Platform</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-nacho-card/90 backdrop-blur-xl border border-nacho-border rounded-full p-1.5 shadow-2xl shadow-black/50 relative">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 z-10",
                    active 
                      ? "text-nacho-bg" 
                      : "text-nacho-subtext hover:text-white"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-nacho-primary rounded-full shadow-lg shadow-nacho-primary/20"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Cluster Status */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:flex items-center gap-2 rounded-full border border-nacho-border bg-nacho-card/90 backdrop-blur-xl px-3 py-2 shadow-lg"
            >
              <motion.span
                animate={{
                  scale: peers.length ? [1, 1.2, 1] : 1,
                  boxShadow: peers.length 
                    ? ['0 0 8px rgba(52,211,153,0.55)', '0 0 12px rgba(52,211,153,0.75)', '0 0 8px rgba(52,211,153,0.55)']
                    : '0 0 0 rgba(0,0,0,0)',
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  "h-2 w-2 rounded-full", 
                  peers.length ? 'bg-nacho-accent-green' : 'bg-nacho-accent-grey'
                )}
              />
              <span className="text-[11px] font-semibold tracking-wide text-nacho-subtext">{clusterLabel}</span>
            </motion.div>

            {/* Account Button */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAccountOpen(true)}
              className={cn(
                "relative h-10 rounded-full bg-white px-5 text-sm font-bold text-black shadow-lg transition-all",
                !user?.username && "after:absolute after:top-1 after:right-1 after:h-2 after:w-2 after:rounded-full after:bg-nacho-primary after:animate-pulse after:shadow-[0_0_8px_rgba(168,180,208,0.8)]"
              )}
            >
              Account
            </motion.button>
          </div>
        </div>
      </header>

      <AccountModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} user={user} />
    </>
  );
}
