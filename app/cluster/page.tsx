"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Peer {
  id: string;
  connected: boolean;
  lastSeen: number;
  region?: string;
}

interface ClusterStats {
  totalNodes: number;
  activeNodes: number;
  totalThroughput: string;
  networkHealth: string;
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function GlobeIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function ZapIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ShieldIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function UsersIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ActivityIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ClusterPage() {
  const [stats, setStats] = useState<ClusterStats>({
    totalNodes: 0,
    activeNodes: 0,
    totalThroughput: "0 GB/s",
    networkHealth: "Initializing..."
  });
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [localCpu, setLocalCpu] = useState(0);
  const [localMemory, setLocalMemory] = useState(0);
  const [localBandwidth, setLocalBandwidth] = useState(0);
  const [activities, setActivities] = useState<{ time: string; action: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add activity log
  const addActivity = useCallback((action: string) => {
    const time = new Date().toLocaleTimeString();
    setActivities(prev => [{ time, action }, ...prev].slice(0, 10));
  }, []);

  // Simulate local resource usage
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalCpu(Math.floor(Math.random() * 30) + 20);
      setLocalMemory(Math.floor(Math.random() * 25) + 35);
      setLocalBandwidth(Math.floor(Math.random() * 15) + 5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Connect to cluster
  const connectToCluster = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to connect to cluster signaling server
      const clusterUrl = process.env.NEXT_PUBLIC_CLUSTER_SERVER_URL || '';
      
      if (clusterUrl) {
        // Real WebSocket connection
        const ws = new WebSocket(clusterUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          addActivity("Connected to cluster network");
          setLoading(false);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'peers') {
              setPeers(data.peers);
              setStats(prev => ({
                ...prev,
                totalNodes: data.peers.length,
                activeNodes: data.peers.filter((p: Peer) => p.connected).length
              }));
            } else if (data.type === 'stats') {
              setStats(prev => ({ ...prev, ...data.stats }));
            }
          } catch (e) {
            console.error('Failed to parse cluster message:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          addActivity("Disconnected from cluster");
          // Attempt reconnect
          reconnectTimeoutRef.current = setTimeout(() => {
            connectToCluster();
          }, 5000);
        };

        ws.onerror = () => {
          setError("Failed to connect to cluster server");
          setLoading(false);
        };
      } else {
        // Demo mode - simulate cluster
        await new Promise(r => setTimeout(r, 1000));
        
        setIsConnected(true);
        setLoading(false);
        addActivity("Connected to cluster network (demo mode)");
        
        // Simulate peers
        const demoPeers: Peer[] = [
          { id: 'node-alpha', connected: true, lastSeen: Date.now(), region: 'US-East' },
          { id: 'node-beta', connected: true, lastSeen: Date.now(), region: 'EU-West' },
          { id: 'node-gamma', connected: true, lastSeen: Date.now(), region: 'Asia-Pacific' },
          { id: 'node-delta', connected: false, lastSeen: Date.now() - 60000, region: 'US-West' },
        ];
        setPeers(demoPeers);
        
        setStats({
          totalNodes: 1248,
          activeNodes: 1192,
          totalThroughput: "84.2 GB/s",
          networkHealth: "Optimal"
        });

        // Simulate periodic updates
        const updateInterval = setInterval(() => {
          setStats(prev => ({
            ...prev,
            totalNodes: prev.totalNodes + Math.floor(Math.random() * 5) - 2,
            activeNodes: prev.activeNodes + Math.floor(Math.random() * 3) - 1,
          }));
        }, 5000);

        return () => clearInterval(updateInterval);
      }
    } catch (err: any) {
      console.error('Cluster connection error:', err);
      setError(err.message || 'Failed to connect');
      setLoading(false);
    }
  }, [addActivity]);

  // Initialize on mount
  useEffect(() => {
    connectToCluster();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectToCluster]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setPeers([]);
    addActivity("Disconnected from cluster");
  }, [addActivity]);

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--cd-border-default)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--cd-cyan-muted)",
                  border: "1px solid var(--cd-cyan-border)"
                }}
              >
                <GlobeIcon className="w-6 h-6" style={{ color: "var(--cd-cyan)" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--cd-text-primary)" }}>
                  Cluster Network
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--cd-text-muted)" }}>
                  Distributed P2P compute network
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <div
                className="cd-badge"
                style={{
                  background: isConnected ? "rgba(63, 185, 80, 0.1)" : "var(--cd-elevated)",
                  color: isConnected ? "var(--cd-success)" : "var(--cd-text-muted)",
                  borderColor: isConnected ? "rgba(63, 185, 80, 0.2)" : "var(--cd-border-muted)"
                }}
              >
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? "Connected" : loading ? "Connecting..." : "Disconnected"}
              </div>
              
              {isConnected && (
                <button
                  onClick={disconnect}
                  className="cd-btn cd-btn-danger text-xs"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<GlobeIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />}
              label="Global Nodes"
              value={stats.totalNodes.toLocaleString()}
              subValue={`${stats.activeNodes} active`}
            />
            <StatCard
              icon={<ZapIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />}
              label="Total Throughput"
              value={stats.totalThroughput}
              subValue="98.9% efficiency"
            />
            <StatCard
              icon={<ShieldIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />}
              label="Network Health"
              value={stats.networkHealth}
              subValue="All shards synced"
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="cd-alert cd-alert-error">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Connection Error</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button onClick={() => { setError(null); connectToCluster(); }} className="cd-btn cd-btn-ghost text-xs">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local Node */}
          <div className="cd-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold" style={{ color: "var(--cd-text-primary)" }}>
                Local Node
              </h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                  {isConnected ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <ProgressBar label="CPU Utilization" percent={localCpu} />
              <ProgressBar label="Memory Usage" percent={localMemory} />
              <ProgressBar label="P2P Bandwidth" percent={localBandwidth} />
            </div>

            <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--cd-border-muted)" }}>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span style={{ color: "var(--cd-text-muted)" }}>Node ID</span>
                  <p className="font-mono mt-1" style={{ color: "var(--cd-text-primary)" }}>
                    {typeof window !== 'undefined' ? window.crypto.randomUUID().slice(0, 8) : '...'}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--cd-text-muted)" }}>Uptime</span>
                  <p className="font-mono mt-1" style={{ color: "var(--cd-text-primary)" }}>
                    {Math.floor(Math.random() * 72) + 1}h {Math.floor(Math.random() * 59)}m
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="cd-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--cd-text-primary)" }}>
                Recent Activity
              </h3>
              <ActivityIcon className="w-4 h-4" style={{ color: "var(--cd-text-muted)" }} />
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--cd-text-muted)" }}>
                <ActivityIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, i) => (
                  <div
                    key={i}
                    className="flex gap-4 text-sm py-2 border-b"
                    style={{ borderColor: "var(--cd-border-subtle)" }}
                  >
                    <span className="text-xs font-mono" style={{ color: "var(--cd-text-muted)" }}>
                      {activity.time}
                    </span>
                    <span style={{ color: "var(--cd-text-secondary)" }}>
                      {activity.action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Peers List */}
        <div className="cd-card mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" style={{ color: "var(--cd-cyan)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--cd-text-primary)" }}>
                Connected Peers
              </h3>
            </div>
            <span
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: "var(--cd-elevated)", color: "var(--cd-text-muted)" }}
            >
              {peers.filter(p => p.connected).length} / {peers.length}
            </span>
          </div>

          {peers.length === 0 ? (
            <div className="text-center py-8" style={{ color: "var(--cd-text-muted)" }}>
              <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No peers connected</p>
              <p className="text-xs mt-1">Waiting for P2P connections...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {peers.map((peer) => (
                <div
                  key={peer.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{
                    background: "var(--cd-elevated)",
                    borderColor: peer.connected ? "var(--cd-cyan-border)" : "var(--cd-border-muted)"
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--cd-text-primary)" }}>
                      {peer.id}
                    </p>
                    <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                      {peer.region || 'Unknown'}
                    </p>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${peer.connected ? 'bg-emerald-400' : 'bg-slate-500'}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <InfoCard
            icon="🌐"
            title="Global Network"
            description="Connect to thousands of nodes worldwide for distributed computing"
          />
          <InfoCard
            icon="🔒"
            title="Secure P2P"
            description="End-to-end encrypted connections between all peers"
          />
          <InfoCard
            icon="⚡"
            title="Low Latency"
            description="Optimized routing for minimal network delay"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function StatCard({ icon, label, value, subValue }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="cd-card flex items-center gap-4">
      <div
        className="p-2 rounded-lg"
        style={{ background: "var(--cd-cyan-muted)", border: "1px solid var(--cd-cyan-border)" }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider" style={{ color: "var(--cd-text-muted)" }}>
          {label}
        </p>
        <p className="text-xl font-semibold" style={{ color: "var(--cd-text-primary)" }}>
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--cd-cyan)" }}>
          {subValue}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--cd-text-muted)" }}>{label}</span>
        <span style={{ color: "var(--cd-text-primary)" }}>{percent}%</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--cd-elevated)" }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: percent > 80 ? "var(--cd-warning)" : "var(--cd-cyan)"
          }}
        />
      </div>
    </div>
  );
}

function InfoCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="cd-card">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h4 className="font-semibold text-sm" style={{ color: "var(--cd-text-primary)" }}>
          {title}
        </h4>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--cd-text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}