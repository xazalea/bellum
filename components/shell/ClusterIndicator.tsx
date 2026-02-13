'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getNachoIdentity } from '@/lib/auth/nacho-identity';

type Status = 'unknown' | 'connected' | 'disconnected';

export function ClusterIndicator() {
  const [status, setStatus] = useState<Status>('unknown');
  const [count, setCount] = useState<number>(0);

  const dotClass = useMemo(() => {
    if (status === 'connected') return 'bg-emerald-400';
    if (status === 'disconnected') return 'bg-rose-400';
    return 'bg-slate-500';
  }, [status]);

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;
    let failures = 0;

    const tick = async () => {
      try {
        const id = await getNachoIdentity();
        const res = await fetch('/api/cluster/proxy/peers', {
          cache: 'no-store',
          headers: { 'X-Nacho-UserId': id.uid },
        });
        if (!res.ok) throw new Error(`peers_status_${res.status}`);
        const peers = (await res.json()) as unknown[];

        if (!mounted) return;
        setCount(Array.isArray(peers) ? peers.length : 0);
        setStatus(Array.isArray(peers) ? 'connected' : 'disconnected');
        failures = 0;
      } catch {
        if (!mounted) return;
        setCount(0);
        setStatus('disconnected');
        failures++;
      } finally {
        if (!mounted) return;
        // Back off: 10s, 20s, 40s, 60s max
        const delay = Math.min(10_000 * Math.pow(2, failures), 60_000);
        timer = window.setTimeout(tick, delay);
      }
    };

    void tick();
    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <Link
      href="/cluster"
      className="flex items-center gap-2 rounded-md border border-ocean-border px-2.5 py-1.5 text-xs text-ocean-muted hover:text-ocean-secondary transition-colors"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className="hidden sm:inline">Cluster</span>
      <span className="text-ocean-secondary">{count}</span>
    </Link>
  );
}
