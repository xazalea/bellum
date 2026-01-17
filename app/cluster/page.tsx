'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { listActivePeersForUser, type ClusterPeer } from '@/lib/cluster/presence-store';
import { useAuth } from '@/lib/auth/auth-context';

const ACTIVE_WINDOW_MS = 60_000; // Consider nodes active if seen in last 60 seconds

export default function ClusterPage() {
  const [peers, setPeers] = useState<ClusterPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth?.() || { user: null };

  // Fetch active peers
  const loadPeers = async () => {
    try {
      setLoading(true);
      setError(null);

      // If no user, can't fetch
      if (!auth.user) {
        setPeers([]);
        setLoading(false);
        return;
      }

      // Get peers from presence store
      const activePeers = listActivePeersForUser(auth.user.uid, ACTIVE_WINDOW_MS);
      setPeers(activePeers);
    } catch (err) {
      console.error('Error loading cluster peers:', err);
      setError('Failed to load cluster nodes');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    loadPeers();
    const interval = setInterval(loadPeers, 10_000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [auth.user]);

  // Send heartbeat to register this device
  const sendHeartbeat = async () => {
    if (!auth.user) return;

    try {
      const deviceId = `web-${navigator.userAgent.slice(0, 50)}`;
      await fetch('/api/cluster/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          userAgent: navigator.userAgent,
          label: 'Web Browser',
          load: 0.5,
          uplinkKbps: 1000,
          downlinkKbps: 5000,
          caps: ['web', 'storage']
        })
      });
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  };

  // Send heartbeat on mount and periodically
  useEffect(() => {
    if (auth.user) {
      sendHeartbeat();
      const interval = setInterval(sendHeartbeat, 30_000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [auth.user]);

  const formatUptime = (lastSeen: number) => {
    const seconds = Math.floor((Date.now() - lastSeen) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!auth.user) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
        <div className="w-full max-w-6xl space-y-8">
          <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
            <h1 className="text-3xl font-pixel text-[#8B9DB8]">Cluster Management</h1>
            <p className="font-retro text-xl text-[#64748B]">Manage distributed nodes and computing resources.</p>
          </header>

          <Card className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-[#4A5A6F] mb-4 inline-block">lock</span>
            <h2 className="text-xl font-pixel text-[#8B9DB8] mb-2">Authentication Required</h2>
            <p className="font-retro text-lg text-[#64748B]">
              Please sign in to view and manage your cluster nodes.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-pixel text-[#8B9DB8]">Cluster Management</h1>
          <p className="font-retro text-xl text-[#64748B]">Manage distributed nodes and computing resources.</p>
          </div>
          <Button onClick={loadPeers} disabled={loading} className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh
          </Button>
        </header>

        {error && (
          <Card className="p-6 border-[#EF4444]/30 bg-[#EF4444]/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#EF4444]">error</span>
              <p className="font-retro text-lg text-[#EF4444]">{error}</p>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-[#64748B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-retro text-lg text-[#64748B]">Loading cluster nodes...</p>
          </div>
        ) : peers.length === 0 ? (
          <Card className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-[#4A5A6F] mb-4 inline-block">devices</span>
            <h2 className="text-xl font-pixel text-[#8B9DB8] mb-2">No Active Nodes</h2>
            <p className="font-retro text-lg text-[#64748B] mb-6">
              No cluster nodes are currently active. Connect devices to build your distributed network.
            </p>
            <Button className="flex items-center gap-2 mx-auto">
              <span className="material-symbols-outlined text-base">add</span>
              Add Node
            </Button>
          </Card>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {peers.map((peer, idx) => (
              <Card key={`${peer.userId}:${peer.deviceId}`} className="space-y-5 p-6 group hover:border-[#64748B]/50">
              <div className="flex items-center justify-between">
                  <span className="font-pixel text-[10px] text-[#64748B] uppercase tracking-wider">
                    {peer.label || `NODE-${String(idx + 1).padStart(2, '0')}`}
                  </span>
                  <div className="relative">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(5,150,105,0.6)] block"></span>
                    <span className="absolute inset-0 w-2 h-2 bg-emerald-600/30 rounded-full animate-ping"></span>
                  </div>
                </div>

                <div className="h-32 bg-gradient-to-br from-[#0C1016] to-[#1E2A3A] border border-[#2A3648] rounded-lg p-3 font-retro text-sm space-y-2 group-hover:border-[#4A5A6F] transition-colors">
                  <div className="text-[#8B9DB8]">
                    &gt; last seen: <span className="text-[#64748B]">{formatUptime(peer.lastSeenUnixMs)}</span>
                  </div>
                  {peer.load !== null && peer.load !== undefined && (
                    <div className="text-[#8B9DB8]">
                      &gt; load: <span className="text-[#64748B]">{peer.load.toFixed(2)}</span>
                    </div>
                  )}
                  {peer.caps && peer.caps.length > 0 && (
                    <div className="text-[#8B9DB8]">
                      &gt; caps: <span className="text-[#64748B]">{peer.caps.join(', ')}</span>
                    </div>
                  )}
                  {peer.uplinkKbps && (
                    <div className="text-[#8B9DB8]">
                      &gt; uplink: <span className="text-[#64748B]">{Math.round(peer.uplinkKbps / 1000)} Mbps</span>
                    </div>
                  )}
                </div>

                <Button className="w-full text-xs flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">settings</span>
                  Manage Node
                </Button>
              </Card>
            ))}
          </div>
        )}

        {peers.length > 0 && (
          <Card className="p-6">
            <h3 className="font-pixel text-sm text-[#8B9DB8] mb-4">Cluster Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-pixel text-[#8B9DB8] mb-2">{peers.length}</div>
                <div className="font-retro text-sm text-[#64748B]">Active Nodes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-pixel text-[#8B9DB8] mb-2">
                  {peers.reduce((sum, p) => sum + (p.load || 0), 0).toFixed(1)}
                </div>
                <div className="font-retro text-sm text-[#64748B]">Total Load</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-pixel text-[#8B9DB8] mb-2">
                  {new Set(peers.flatMap(p => p.caps || [])).size}
                </div>
                <div className="font-retro text-sm text-[#64748B]">Capabilities</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-pixel text-[#8B9DB8] mb-2">
                  {Math.round(peers.reduce((sum, p) => sum + (p.uplinkKbps || 0), 0) / 1000)}
                </div>
                <div className="font-retro text-sm text-[#64748B]">Total Mbps</div>
              </div>
            </div>
            </Card>
        )}
      </div>
    </main>
  );
}
