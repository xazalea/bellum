'use client';

import { useEffect, useState } from 'react';
import { getNachoIdentity } from '@/lib/auth/nacho-identity';

export function ClientInit() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <Heartbeat />;
}

function Heartbeat() {
  useEffect(() => {
    let stopped = false;
    let interval: number | null = null;

    const getDeviceId = (): string => {
      const key = 'nacho.deviceId';
      try {
        const existing = window.localStorage.getItem(key);
        if (existing) return existing;
      } catch {
        // ignore
      }
      const id = (globalThis.crypto?.randomUUID?.() || `dev_${Date.now()}_${Math.random()}`).toString();
      try {
        window.localStorage.setItem(key, id);
      } catch {
        // ignore
      }
      return id;
    };

    const send = async () => {
      try {
        const id = await getNachoIdentity();
        const deviceId = getDeviceId();
        await fetch('/api/cluster/proxy/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: id.uid,
            deviceId,
            userAgent: navigator.userAgent,
            label: navigator.platform || 'browser',
            caps: ['web', 'storage'],
          }),
          cache: 'no-store',
        });
      } catch {
        // Ignore: indicator will show disconnected if unreachable
      }
    };

    void send();
    interval = window.setInterval(() => {
      if (stopped) return;
      void send();
    }, 30_000);

    return () => {
      stopped = true;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  return null;
}
