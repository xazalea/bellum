"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Zap, Cpu, Share2, Shield, Activity } from 'lucide-react';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';
import { authService } from '@/lib/firebase/auth-service';

export const ClusterPanel = () => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [peers, setPeers] = useState<Array<{
    userId: string;
    deviceId: string;
    userAgent?: string | null;
    label?: string | null;
    load?: number | null;
    lastSeenUnixMs: number;
  }>>([]);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(null);

  const base = useMemo(() => {
    return (
      (typeof process !== 'undefined' &&
        (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })
          ?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
      ''
    );
  }, []);

  useEffect(() => {
    void getDeviceFingerprintId().then(setMyDeviceId).catch(() => setMyDeviceId(null));
  }, []);

  useEffect(() => {
    return authService.onAuthStateChange(setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        setStatus((s) => (s === 'online' ? 'online' : 'connecting'));
        const bases = base ? [base, ''] : [''];
        let json: any[] | null = null;
        for (const b of bases) {
          const res = await fetch(`${b}/api/cluster/peers`, { cache: 'no-store' });
          if (!res.ok) continue;
          json = (await res.json()) as any[];
          break;
        }
        if (!json) {
          setStatus('offline');
          return;
        }
        if (!stopped) {
          setPeers(Array.isArray(json) ? json : []);
          setLastSyncMs(Date.now());
          setStatus('online');
        }
      } catch {
        setStatus('offline');
      }
    };

    void poll();
    const t = window.setInterval(() => void poll(), 8000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [user?.uid, base]);

  const onlineCount = peers.length;

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24">
        
        {/* Header */}
        <div className="mb-12 flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Network className="text-sky-300" />
                    AetherNet Cluster
                </h2>
                <p className="text-white/60">
                  See your active devices (and other nodes) while Nacho is open • {onlineCount} active
                </p>
                <div className="mt-2 text-xs text-white/45">
                  Status:{' '}
                  {status === 'online' ? (
                    <span className="text-emerald-200">online</span>
                  ) : status === 'connecting' ? (
                    <span className="text-amber-200">connecting…</span>
                  ) : (
                    <span className="text-rose-200">offline</span>
                  )}
                  {lastSyncMs ? (
                    <span className="text-white/35"> • updated {Math.max(0, Math.round((Date.now() - lastSyncMs) / 1000))}s ago</span>
                  ) : null}
                </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/40 uppercase">This device</div>
              <div className="text-sm font-mono text-white/70">{myDeviceId ? `${myDeviceId.slice(0, 10)}…` : "—"}</div>
            </div>
        </div>

        {!user && (
          <div className="bellum-card p-6 mb-8 border-2 border-white/10">
            <div className="text-white/80 font-semibold">Sign in to see your devices here.</div>
            <div className="text-white/50 text-sm mt-1">
              Tip: keep one tab open on each device to appear as “active”.
            </div>
          </div>
        )}
        {user && onlineCount === 0 && (
          <div className="bellum-card p-6 mb-8 border-2 border-white/10">
            <div className="text-white/80 font-semibold">No active nodes yet</div>
            <div className="text-white/50 text-sm mt-1">
              Open Nacho on another device (or another browser) while signed in, and keep it open for ~15 seconds.
            </div>
          </div>
        )}

        {/* Visualizer (Abstract) */}
        <div className="w-full h-64 bellum-card mb-8 relative overflow-hidden flex items-center justify-center">
            {/* Animated Mesh Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <line x1="80%" y1="50%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <line x1="50%" y1="20%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <line x1="50%" y1="80%" x2="50%" y2="50%" stroke="white" strokeDasharray="4" className="animate-pulse" />
                <circle cx="50%" cy="50%" r="40" fill="none" stroke="#93c5fd" strokeWidth="3" />
            </svg>
            
            <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-sky-200/10 rounded-full flex items-center justify-center backdrop-blur-md border-2 border-sky-200/30 mx-auto mb-4 animate-pulse">
                    <Zap size={32} className="text-sky-200" />
                </div>
                <div className="text-sm font-mono text-sky-200">This device</div>
            </div>
        </div>

        {/* Peer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {peers.map((peer, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bellum-card p-6 border-l-4 border-l-sky-200"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="font-bold text-lg">
                          {peer.deviceId === myDeviceId ? 'This device' : peer.deviceId.slice(0, 8)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded bg-white/5 
                            ${peer.deviceId === myDeviceId ? 'text-yellow-300 border border-yellow-300/20' : 'text-white/60'}`}>
                            {peer.deviceId === myDeviceId ? 'Self' : 'Peer'}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-white/60">
                            <Cpu size={16} />
                            <span className="truncate">{peer.label || peer.userAgent || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                            <Activity size={16} />
                            <span>Load: {typeof peer.load === 'number' ? `${Math.round(peer.load)}%` : '—'}</span>
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-sky-200/80" 
                                    style={{ width: `${typeof peer.load === 'number' ? Math.max(0, Math.min(100, peer.load)) : 0}%` }} 
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                            <Share2 size={16} />
                            <span>Seen: {Math.max(0, Math.round((Date.now() - peer.lastSeenUnixMs) / 1000))}s ago</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                        <button className="flex-1 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 rounded transition-colors text-white/80">
                            Send a task
                        </button>
                        <button className="flex-1 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 rounded transition-colors text-white/80">
                            Sync data
                        </button>
                    </div>
                </motion.div>
            ))}

            {/* Add Node */}
            <div className="bellum-card border-dashed border-white/10 flex flex-col items-center justify-center gap-2 p-6 cursor-pointer hover:border-white/40 transition-colors">
                <Shield size={32} className="text-white/20" />
                <span className="text-white/40 font-medium">Connect New Peer</span>
            </div>
        </div>
    </div>
  );
};

