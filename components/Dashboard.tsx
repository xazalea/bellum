"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Sliders, Smartphone, Monitor } from 'lucide-react';
import { subscribeInstalledApps, type InstalledApp } from '@/lib/apps/apps-service';
import { authService } from '@/lib/firebase/auth-service';

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export const Dashboard = ({
  onGoApps,
  onOpenRunner,
}: {
  onGoApps?: () => void;
  onOpenRunner?: () => void;
}) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [heapUsed, setHeapUsed] = useState<number | null>(null);
  const [clusterStatus, setClusterStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  const base = useMemo(() => {
    return (
      (typeof process !== 'undefined' &&
        (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })
          ?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
      ''
    );
    }, []);

  useEffect(() => authService.onAuthStateChange(setUser), []);

  useEffect(() => {
    if (!user) {
      setApps([]);
      return;
    }
    return subscribeInstalledApps(user.uid, setApps);
  }, [user?.uid]);

    useEffect(() => {
    if (!user) return;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        setClusterStatus((s) => (s === 'online' ? 'online' : 'connecting'));
        const bases = base ? [base, ''] : [''];
        let peers: any[] | null = null;
        for (const b of bases) {
          const res = await fetch(`${b}/api/cluster/peers`, { cache: 'no-store' });
          if (!res.ok) continue;
          peers = (await res.json()) as any[];
          break;
        }
        if (!peers) {
          setClusterStatus('offline');
          return;
        }
        if (!stopped) {
          setPeerCount(Array.isArray(peers) ? peers.length : 0);
          setClusterStatus('online');
        }
      } catch {
        setClusterStatus('offline');
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 8000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [user?.uid, base]);

  useEffect(() => {
    const anyPerf = performance as any;
    const t = window.setInterval(() => {
      if (anyPerf?.memory?.usedJSHeapSize) setHeapUsed(anyPerf.memory.usedJSHeapSize);
      else setHeapUsed(null);
    }, 2500);
    return () => window.clearInterval(t);
  }, []);

  const storedBytes = apps.reduce((s, a) => s + (a.storedBytes || 0), 0);

    return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 space-y-8">
      
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end"
      >
        <div>
            <h1 className="text-5xl font-bold mb-2 tracking-tight">Nacho<span className="text-white/40">OS</span></h1>
            <p className="text-xl text-white/60">Run apps in your browser (Windows + Android)</p>
            <p className="text-sm text-white/40 mt-1">New here? Start with “Install an app”, then “Run an app”.</p>
        </div>
        <div className="flex gap-4">
            <button onClick={onOpenRunner} className="bellum-btn flex items-center gap-2">
                <Play size={18} fill="currentColor" />
                Run an app
                                </button>
            <button onClick={onGoApps} className="bellum-btn bellum-btn-secondary flex items-center gap-2">
                <Plus size={18} />
                Install an app
                                </button>
                        </div>
      </motion.div>

      {/* Stats / Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bellum-card p-8 h-64 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
            <Monitor size={120} />
                        </div>

        <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
                <h2 className="text-2xl font-bold mb-1">System Status</h2>
                <div className="flex gap-2 items-center text-white/70 text-sm font-mono">
                    <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                    {user ? 'Signed in' : 'Not signed in'}
                </div>
                <div className="text-xs text-white/45 mt-2">
                  Cluster:{" "}
                  {clusterStatus === 'online' ? (
                    <span className="text-emerald-200">online</span>
                  ) : clusterStatus === 'connecting' ? (
                    <span className="text-amber-200">connecting…</span>
                  ) : (
                    <span className="text-rose-200">offline</span>
                  )}
                </div>
                        </div>

            <div className="grid grid-cols-4 gap-8">
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">WASM Heap</div>
                    <div className="text-2xl font-mono">{heapUsed ? formatBytes(heapUsed) : 'n/a'}</div>
                                </div>
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Peers</div>
                    <div className="text-2xl font-mono">{peerCount} Nodes</div>
                                </div>
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Apps</div>
                    <div className="text-2xl font-mono">{apps.length}</div>
                    </div>
                <div>
                    <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Storage</div>
                    <div className="text-2xl font-mono">{formatBytes(storedBytes)}</div>
                    </div>
                        </div>
                    </div>

        {/* Abstract Background Graphic */}
        <div className="absolute inset-0 bg-sky-200/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.div>

      {/* Quick Launch / Recent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {apps.slice(0, 3).map((app, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="bellum-card group p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5"
                onClick={() => onOpenRunner?.()}
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${app.type === 'android' ? 'bg-green-500/20 text-green-400' : app.type === 'windows' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {app.type === 'android' ? <Smartphone size={24} /> : app.type === 'windows' ? <Monitor size={24} /> : <Sliders size={24} />}
                        </div>
                <div>
                    <h3 className="font-bold">{app.name}</h3>
                    <p className="text-sm text-white/40">{app.type.toUpperCase()} • Cluster</p>
                    </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} />
                </div>
            </motion.div>
        ))}
      </div>

        </div>
    );
};
