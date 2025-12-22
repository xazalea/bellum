'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';
import { useClusterPeers } from './hooks/useClusterPeers';
import { authService } from '@/lib/firebase/auth-service';

type NavItem = {
  href: string;
  label: string;
};

const nav: NavItem[] = [
  { href: '/', label: 'Overview' },
  { href: '/library', label: 'Library' },
  { href: '/network', label: 'Network' },
  { href: '/docs', label: 'Docs' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { peers } = useClusterPeers();
  const [accountOpen, setAccountOpen] = useState(false);
  const versionBadge = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_BUILD_VERSION ?? 'local';
    if (raw === 'local' || raw === 'unknown') {
      return 'local';
    }
    return raw.startsWith('v') ? raw : `v${raw}`;
  }, []);
  const versionLabel = versionBadge === 'local' ? 'local build' : versionBadge;

  const clusterLabel = useMemo(() => {
    if (peers.length > 0) return `Cluster Connected (${peers.length})`;
    return 'Cluster Connecting';
  }, [peers.length]);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Background wash + grid */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 ui-grid opacity-25" />
        <div className="absolute -top-48 right-[-20%] h-[720px] w-[720px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-48 left-[-15%] h-[680px] w-[680px] rounded-full bg-purple-600/20 blur-[140px]" />
      </div>

      <header className="sticky top-6 z-50 w-full px-4 md:px-6">
        <div className="mx-auto flex h-[4.6rem] max-w-7xl items-center justify-between rounded-full border-2 border-white/20 bg-[#070b16]/85 px-4 backdrop-blur-xl shadow-[0_18px_70px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2f7cfb] ring-2 ring-white/90 shadow-[0_0_24px_rgba(59,130,246,0.35)]">
              <span className="material-symbols-outlined text-[22px] font-bold text-white">bolt</span>
            </div>
            <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold tracking-tight text-white">Nacho</span>
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/60">{versionLabel}</span>
            </div>
          </div>

          <nav className="hidden items-center gap-10 md:flex">
            {nav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-semibold transition-colors ${
                    active ? 'text-white underline decoration-2 underline-offset-[10px]' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 md:flex">
              <span className={`h-2 w-2 rounded-full ${peers.length ? 'bg-emerald-400' : 'bg-amber-300'} shadow-[0_0_8px_rgba(52,211,153,0.55)]`} />
              <span className="text-[11px] font-semibold tracking-wide text-white/85">{clusterLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="h-10 rounded-full bg-white px-5 text-sm font-semibold text-black shadow-[0_10px_22px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
            >
              Account
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 md:px-6">{children}</main>

      <footer className="w-full border-t border-white/10 bg-[#060915]/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f7cfb] ring-1 ring-white/70">
              <span className="material-symbols-outlined text-[18px] font-bold text-white">bolt</span>
            </div>
            <span className="font-display text-sm font-semibold text-white/90">Nacho</span>
          </div>
          <div className="text-xs text-white/40">© 2024 Nacho Platform Inc. All rights reserved.</div>
          <div className="flex items-center gap-3 text-white/50">
            <a className="rounded-full p-2 transition hover:bg-white/5 hover:text-white" href="#" aria-label="Twitter">
              <span className="material-symbols-outlined text-[18px]">alternate_email</span>
            </a>
            <a className="rounded-full p-2 transition hover:bg-white/5 hover:text-white" href="#" aria-label="GitHub">
              <span className="material-symbols-outlined text-[18px]">code</span>
            </a>
          </div>
        </div>
      </footer>

      {accountOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/70"
            onClick={() => setAccountOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#070b16]/85 p-6 backdrop-blur shadow-[0_26px_90px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-display text-2xl font-bold text-white">Account</div>
                <div className="mt-1 text-sm font-semibold text-white/55">
                  Your Nacho identity is automatic (fingerprint-based).
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-[10px] font-bold tracking-wider text-white/55">USER ID</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="truncate font-mono text-sm font-semibold text-white/85">
                  {authService.getCurrentUser()?.uid ?? '…'}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const uid = authService.getCurrentUser()?.uid ?? (await authService.ensureIdentity()).uid;
                    await navigator.clipboard.writeText(uid);
                  }}
                  className="h-9 rounded-full bg-white px-4 text-xs font-bold text-black"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                onClick={() => setAccountOpen(false)}
              >
                Open Dashboard
              </Link>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


