'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';
import { getNachoIdentity } from '@/lib/auth/nacho-identity';

export type ClusterPeer = {
  userId: string;
  deviceId: string;
  userAgent?: string | null;
  label?: string | null;
  load?: number | null;
  uplinkKbps?: number | null;
  downlinkKbps?: number | null;
  caps?: string[] | null;
  lastSeenUnixMs: number;
};

async function fetchPeers(uid: string): Promise<ClusterPeer[]> {
  // Prefer local store (single-deployment reliable).
  const local = await fetch('/api/cluster/peers', {
    cache: 'no-store',
    headers: { 'X-Nacho-UserId': uid },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return Array.isArray(local) ? (local as ClusterPeer[]) : [];
}

export function useClusterPeers() {
  const [peers, setPeers] = useState<ClusterPeer[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getNachoIdentity();
        const d = await getDeviceFingerprintId();
        if (cancelled) return;
        setUid(id.uid);
        setDeviceId(d);
      } catch {
        if (cancelled) return;
        setUid(null);
        setDeviceId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uid) {
      setPeers([]);
      return;
    }
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      const list = await fetchPeers(uid);
      if (stopped) return;
      setPeers(list);
    };
    void tick();
    const t = window.setInterval(() => void tick(), 15_000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [uid]);

  const self = useMemo(() => {
    if (!deviceId) return null;
    return peers.find((p) => p.deviceId === deviceId) ?? null;
  }, [deviceId, peers]);

  return { uid, deviceId, peers, self };
}


