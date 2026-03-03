'use client';

import { useEffect, useState } from 'react';
import { getChallengerIdentity } from '@/lib/auth/challenger-identity';

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
    let timer: number | null = null;
    let failures = 0;

    const getDeviceId = (): string => {
      const key = 'challenger.deviceId';
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
        const id = await getChallengerIdentity();
        const deviceId = getDeviceId();
        const res = await fetch('/api/cluster/proxy/heartbeat', {
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
        if (!res.ok) throw new Error('heartbeat_failed');
        failures = 0;
      } catch {
        failures++;
      } finally {
        if (stopped) return;
        // Back off: 30s, 60s, 120s, 120s max
        const delay = Math.min(30_000 * Math.pow(2, failures), 120_000);
        timer = window.setTimeout(send, delay);
      }
    };

    void send();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return null;
}