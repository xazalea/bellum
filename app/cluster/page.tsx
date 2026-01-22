'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { listActivePeersForUser, type ClusterPeer } from '@/lib/cluster/presence-store';
import { useAuth } from '@/lib/auth/auth-context';

const ACTIVE_WINDOW_MS = 60_000;

export default function ClusterPage() {
  const [peers, setPeers] = useState<ClusterPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth?.() || { user: null };

  const loadPeers = useCallback(async () => {
    try {
      setLoading(true);
      if (!auth.user) {
        setPeers([]);
        return;
      }
      const activePeers = listActivePeersForUser(auth.user.uid, ACTIVE_WINDOW_MS);
      setPeers(activePeers);
    } catch (err) {
      console.error('Error loading cluster peers:', err);
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    loadPeers();
    const interval = setInterval(loadPeers, 10_000);
    return () => clearInterval(interval);
  }, [loadPeers]);

  return (
    <main className="min-h-screen bg-nacho-bg p-6 pt-24">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-nacho-border pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-nacho-primary tracking-tight">Cluster Management</h1>
            <p className="text-nacho-secondary text-lg">Distributed node network & resource pooling.</p>
          </div>
          <Button onClick={loadPeers} disabled={loading} className="bg-nacho-surface border-nacho-border text-nacho-primary hover:bg-nacho-card-hover">
            <span className="material-symbols-outlined mr-2">refresh</span>
            Refresh Nodes
          </Button>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-nacho-surface border-nacho-border p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <span className="material-symbols-outlined text-2xl">hub</span>
            </div>
                    <div>
                        <p className="text-2xl font-bold text-nacho-primary">{peers.length}</p>
                        <p className="text-xs text-nacho-muted uppercase tracking-wider">Active Nodes</p>
                  </div>
                </div>
            </Card>
            <Card className="bg-nacho-surface border-nacho-border p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <span className="material-symbols-outlined text-2xl">speed</span>
                  </div>
                    <div>
                        <p className="text-2xl font-bold text-nacho-primary">
                             {Math.round(peers.reduce((sum, p) => sum + (p.uplinkKbps || 0), 0) / 1000)} Mbps
                        </p>
                        <p className="text-xs text-nacho-muted uppercase tracking-wider">Total Bandwidth</p>
                    </div>
                </div>
            </Card>
            <Card className="bg-nacho-surface border-nacho-border p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <span className="material-symbols-outlined text-2xl">memory</span>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-nacho-primary">
                             {peers.reduce((sum, p) => sum + (p.load || 0), 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-nacho-muted uppercase tracking-wider">Total Load</p>
                    </div>
                </div>
              </Card>
            <Card className="bg-nacho-surface border-nacho-border p-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <span className="material-symbols-outlined text-2xl">bolt</span>
          </div>
                    <div>
                        <p className="text-2xl font-bold text-nacho-primary">99.9%</p>
                        <p className="text-xs text-nacho-muted uppercase tracking-wider">Uptime</p>
              </div>
                </div>
            </Card>
              </div>

        {/* Node Grid */}
        <div>
            <h3 className="text-lg font-bold text-nacho-primary mb-4">Active Nodes</h3>
            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="w-8 h-8 border-2 border-nacho-accent border-t-transparent rounded-full animate-spin"></span>
                </div>
            ) : peers.length === 0 ? (
                <div className="text-center py-20 bg-nacho-surface rounded-nacho border border-nacho-border">
                    <span className="material-symbols-outlined text-6xl text-nacho-muted mb-4">cloud_off</span>
                    <h3 className="text-xl font-bold text-nacho-primary">No Nodes Connected</h3>
                    <p className="text-nacho-secondary">Connect devices to your cluster to see them here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {peers.map((peer, idx) => (
                        <Card key={`${peer.userId}:${peer.deviceId}`} className="bg-nacho-surface border-nacho-border hover:border-nacho-accent transition-all p-6 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-nacho-bg flex items-center justify-center text-nacho-secondary">
                                        <span className="material-symbols-outlined">desktop_windows</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-nacho-primary text-sm">
                                            {peer.label || `Node ${idx + 1}`}
                                        </h4>
                                        <p className="text-xs text-nacho-muted font-mono">{peer.deviceId.substring(0, 8)}...</p>
                                    </div>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-nacho-secondary">
                                        <span>CPU Load</span>
                                        <span>{Math.round((peer.load || 0) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-nacho-bg rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 transition-all duration-500" 
                                            style={{ width: `${Math.min(100, (peer.load || 0) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap pt-2">
                                    {peer.caps?.map(cap => (
                                        <span key={cap} className="px-2 py-0.5 bg-nacho-bg border border-nacho-border rounded text-[10px] text-nacho-secondary uppercase tracking-wider">
                                            {cap}
                                        </span>
                                    ))}
              </div>
            </div>
            </Card>
                    ))}
                </div>
        )}
        </div>
      </div>
    </main>
  );
}
