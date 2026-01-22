'use client';

import { useEffect, useMemo, useState } from 'react';
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
      } catch {
        if (!mounted) return;
        setCount(0);
        setStatus('disconnected');
      } finally {
        if (!mounted) return;
        timer = window.setTimeout(tick, 10_000);
      }
    };

    void tick();
    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-nacho-border bg-nacho-surface px-3 py-2 text-xs text-nacho-secondary">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="hidden sm:inline">Cluster</span>
      <span className="text-nacho-primary">{count}</span>
    </div>
  );
}

