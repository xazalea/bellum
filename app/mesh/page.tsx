'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCompute } from '@/components/providers/compute-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';
import { Network, User, Coins, HelpCircle, Eye, Clock, Gamepad2, Shield, Wifi, WifiOff, Radio } from 'lucide-react';

// Types for P2P status (imported dynamically to avoid SSR issues)
interface PeerStatus {
  peerId: string;
  nodeId: string | null;
  connectionState: string;
  iceState: string;
  channelState: string;
  rttMs: number;
  avgRttMs: number;
  bytesSent: number;
  bytesReceived: number;
  connectedAt: number | null;
}

// Helper: format bytes to human-readable string (outside component to avoid re-creation)
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

// Helper: get dot color based on WebRTC connection state
function getConnectionDotColor(state: string): string {
  switch (state) {
    case 'connected': return 'bg-primary/70';
    case 'connecting': case 'new': return 'bg-yellow-500/60 animate-pulse';
    case 'disconnected': case 'failed': return 'bg-red-500/50';
    default: return 'bg-muted-foreground/20';
  }
}

export default function MeshPage() {
  const { balance, tier, earningRate, streak, setComputeState, isInitialized } = useCompute();
  const { user } = useAuth();
  const { root, run } = useAnimeScope();
  const animatedRef = useRef(false);
  const [isContributing, setIsContributing] = useState(false);
  const [tabState, setTabState] = useState<'active' | 'idle' | 'background'>('active');
  const [contributeMinutes, setContributeMinutes] = useState(0);

  // P2P network status
  const [p2pStatus, setP2pStatus] = useState<{
    localNodeId: string | null;
    connectedPeers: number;
    totalPeers: number;
    signalingReady: boolean;
    peers: PeerStatus[];
  } | null>(null);

  // Poll P2P status every 3 seconds
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pollP2P = async () => {
      try {
        const { p2pNode } = await import('@/src/challenger/net/p2p_node');
        const { fabricMesh } = await import('@/lib/fabric/mesh');

        if (!p2pNode) {
          setP2pStatus({ localNodeId: null, connectedPeers: 0, totalPeers: 0, signalingReady: false, peers: [] });
          return;
        }

        const connections = p2pNode.getPeerConnections();
        const meshPeers = fabricMesh.getPeers();

        const peerStatuses: PeerStatus[] = connections.map(conn => {
          const stats = fabricMesh.getPeerStats(conn.peerId);
          return {
            peerId: conn.peerId,
            nodeId: fabricMesh.getPeerNodeId(conn.peerId),
            connectionState: conn.connectionState,
            iceState: conn.iceConnectionState,
            channelState: conn.dataChannelState,
            rttMs: stats?.rttMs ?? 0,
            avgRttMs: stats?.avgRttMs ?? 0,
            bytesSent: stats?.bytesSent ?? 0,
            bytesReceived: stats?.bytesReceived ?? 0,
            connectedAt: conn.connectedAt,
          };
        });

        setP2pStatus({
          localNodeId: p2pNode.getId(),
          connectedPeers: p2pNode.getConnectedPeerCount(),
          totalPeers: meshPeers.length,
          signalingReady: true, // If p2pNode exists, signaling was attempted
          peers: peerStatuses,
        });
      } catch {
        // Dynamic import or P2P access failed — show degraded state
        setP2pStatus(prev => prev ?? { localNodeId: null, connectedPeers: 0, totalPeers: 0, signalingReady: false, peers: [] });
      }
    };

    // Initial poll
    pollP2P();
    const interval = setInterval(pollP2P, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => setTabState(document.hidden ? 'background' : 'active');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Track contribute time
  useEffect(() => {
    if (!isContributing) return;
    const interval = setInterval(() => {
      setContributeMinutes(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [isContributing]);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="mesh-header"]', {
          translateY: [-12, 0], opacity: [0, 1], ease: ease.out, duration: dur.base,
        });
        animate('[data-anime="mesh-card"]', {
          translateY: [20, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(100, { start: 200 }),
        });
      });
    });
  }, [run]);

  const toggleContribution = useCallback(() => {
    const newState = !isContributing;
    setIsContributing(newState);
    setComputeState(newState);
  }, [isContributing, setComputeState]);

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -1, ease: spring({ bounce: 0.2 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <div ref={root} className="min-h-screen">
      <div className="cd-container py-8">
        {/* Header */}
        <div data-anime="mesh-header" className="mb-8" style={{ opacity: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Network size={22} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Mesh Network</h1>
          </div>
          <p className="text-[11px] text-muted-foreground">
            P2P distributed compute · Optional · Not required for gaming
          </p>
        </div>

        {/* P2P Network Status */}
        <div data-anime="mesh-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            {p2pStatus?.connectedPeers ? (
              <Wifi size={14} className="text-primary/70" />
            ) : (
              <WifiOff size={14} className="text-muted-foreground/30" />
            )}
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">P2P Network</h3>
            {p2pStatus?.connectedPeers ? (
              <span className="ml-auto text-[8px] font-mono text-primary/60 flex items-center gap-1">
                <Radio size={8} className="animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="ml-auto text-[8px] font-mono text-muted-foreground/30">STANDBY</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">{p2pStatus?.connectedPeers ?? 0}</p>
              <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Connected</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">{p2pStatus?.totalPeers ?? 0}</p>
              <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Discovered</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">
                {p2pStatus?.peers.length ? Math.round(p2pStatus.peers.reduce((sum, p) => sum + p.avgRttMs, 0) / p2pStatus.peers.length) : '—'}
              </p>
              <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Avg RTT</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tighter text-foreground">
                {p2pStatus?.peers.length ? formatBytes(p2pStatus.peers.reduce((sum, p) => sum + p.bytesSent + p.bytesReceived, 0)) : '0'}
              </p>
              <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Traffic</p>
            </div>
          </div>

          {/* Node ID */}
          {p2pStatus?.localNodeId && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-[9px] font-mono text-muted-foreground/50">Node {p2pStatus.localNodeId.slice(0, 8)}…{p2pStatus.localNodeId.slice(-4)}</span>
            </div>
          )}

          {/* Peer list */}
          {p2pStatus?.peers.length ? (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {p2pStatus.peers.map(peer => (
                <div key={peer.peerId} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/20 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getConnectionDotColor(peer.connectionState)}`} />
                  <span className="text-[10px] font-mono text-muted-foreground/60 truncate flex-1">
                    {peer.nodeId || peer.peerId.slice(0, 12)}
                  </span>
                  <span className="text-[8px] text-muted-foreground/30 shrink-0">
                    {peer.channelState === 'open' ? `${Math.round(peer.avgRttMs)}ms` : peer.connectionState}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/30 text-center py-2">
              {p2pStatus?.signalingReady ? 'Searching for peers…' : 'Initializing P2P node…'}
            </p>
          )}
        </div>

        {/* Compute Status */}
        <div data-anime="mesh-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isContributing ? 'bg-primary/80' : 'bg-muted-foreground/20'}`}>
                {isContributing && <div className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-ping" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{isContributing ? 'Contributing' : 'Idle'}</p>
                <p className="text-[10px] text-muted-foreground/50">
                  {tabState === 'background' ? 'Background tab · stealth compute' : tabState === 'idle' ? 'Idle · earning at idle rate' : 'Active · earning at active rate'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleContribution}
              className={`px-4 h-8 rounded-lg text-xs font-medium transition-colors ${
                isContributing
                  ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
              }`}
            >
              {isContributing ? 'Stop' : 'Start'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold tracking-tighter text-foreground">{earningRate.tokensPerMinute.toFixed(1)}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Tokens/min</p>
              <p className="text-[8px] text-primary/40">{earningRate.source}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold tracking-tighter text-foreground">{Math.round(balance.tokens)}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Balance</p>
              <p className="text-[8px]" style={{ color: tier.color }}>{tier.name}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold tracking-tighter text-foreground">{streak.currentStreak}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Day Streak</p>
              <p className="text-[8px] text-primary/40">{streak.currentStreak >= 3 ? `${streak.currentStreak >= 30 ? '3.0' : streak.currentStreak >= 14 ? '2.0' : streak.currentStreak >= 7 ? '1.5' : '1.2'}x` : '—'}</p>
            </div>
          </div>
        </div>

        {/* Your Node */}
        <div data-anime="mesh-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Your Node</h3>
          </div>
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${isContributing ? 'bg-primary/80' : 'bg-muted-foreground/30'}`} />
              <span className="text-[11px] font-medium text-foreground">{user?.username || 'You'}</span>
              <span className="text-[8px] text-primary/50 ml-auto font-mono">
                {isContributing ? `${contributeMinutes}m active` : 'inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground/40">{earningRate.tokensPerMinute.toFixed(1)} t/min</span>
              <span className="text-[8px] uppercase tracking-wider text-primary/50">{tabState}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/30 mt-3 text-center">
            {isContributing
              ? 'Your browser is contributing idle compute power to the mesh network.'
              : 'Start contributing to earn tokens at the mesh compute rate.'}
          </p>
        </div>

        {/* Compute Tiers */}
        <div data-anime="mesh-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Compute Tiers</h3>
            <span className="ml-auto text-[9px] text-primary/50">Optional</span>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Free', tokens: 0, nodes: 1, storage: '1 GB', color: 'hsl(0 0% 42%)' },
              { name: 'Plus', tokens: 1000, nodes: 2, storage: '3 GB', color: 'hsl(var(--primary))' },
              { name: 'Pro', tokens: 5000, nodes: 4, storage: '5 GB', color: 'hsl(var(--accent-orange))' },
              { name: 'Ultra', tokens: 20000, nodes: 8, storage: '10 GB', color: 'hsl(var(--accent-coral-dim))' },
              { name: 'Omega', tokens: 50000, nodes: 16, storage: '20 GB', color: 'hsl(var(--accent-warm))' },
            ].map((t) => (
              <div
                key={t.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                  tier.name === t.name ? 'border-primary/30 bg-primary/5' : 'border-border/30 hover:border-border/50'
                }`}
                onMouseEnter={onCardEnter}
                onMouseLeave={onCardLeave}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                <span className="text-xs font-medium text-foreground w-14">{t.name}</span>
                <span className="text-[10px] text-muted-foreground/50">{t.nodes} nodes</span>
                <span className="text-[10px] text-muted-foreground/50">{t.storage}</span>
                <span className="text-[10px] text-muted-foreground/30 ml-auto">{t.tokens === 0 ? 'Default' : `${t.tokens.toLocaleString()}t`}</span>
                {tier.name === t.name && <span className="text-[8px] text-primary font-medium">CURRENT</span>}
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div data-anime="mesh-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={14} className="text-muted-foreground/40" />
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">How It Works</h3>
          </div>
          <div className="space-y-3">
            {[
              { icon: Eye, title: 'Tab-Adaptive', desc: 'Active tab = minimal resources. Background = more compute. You never notice.' },
              { icon: Clock, title: 'Idle Earning', desc: 'Step away and your browser helps the mesh. 2x tokens per minute while idle.' },
              { icon: Gamepad2, title: 'Gaming Priority', desc: 'Games always get priority. Mesh pauses when you launch a game.' },
              { icon: Shield, title: 'Privacy', desc: 'Only computation tasks are shared — never your data, files, or personal info.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3" onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                <item.icon size={16} className="text-primary/40 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
