"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VPSInstance {
  id: string;
  name: string;
  status: "running" | "stopped" | "pending";
  region: string;
  specs: {
    cpu: string;
    memory: string;
    storage: string;
  };
  ip?: string;
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function ServerIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function PlusIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function PlayIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function StopIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
    </svg>
  );
}

function TrashIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function GlobeIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function CpuIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function VPSPage() {
  const [instances, setInstances] = useState<VPSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Load instances on mount
  useEffect(() => {
    const loadInstances = () => {
      try {
        const stored = localStorage.getItem("cd_vps_instances");
        if (stored) {
          setInstances(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load VPS instances:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInstances();
  }, []);

  // Save instances
  const saveInstances = useCallback((newInstances: VPSInstance[]) => {
    localStorage.setItem("cd_vps_instances", JSON.stringify(newInstances));
    setInstances(newInstances);
  }, []);

  // Create new instance
  const createInstance = useCallback(async () => {
    try {
      setCreating(true);

      // Simulate creation
      await new Promise((r) => setTimeout(r, 1000));

      const newInstance: VPSInstance = {
        id: `vps_${Date.now()}`,
        name: `vps-${String(instances.length + 1).padStart(3, "0")}`,
        status: "running",
        region: "us-east-1",
        specs: {
          cpu: "2 vCPU",
          memory: "4 GB",
          storage: "80 GB SSD",
        },
        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        createdAt: Date.now(),
      };

      saveInstances([newInstance, ...instances]);
    } catch (err) {
      console.error("Failed to create instance:", err);
    } finally {
      setCreating(false);
    }
  }, [instances, saveInstances]);

  // Toggle instance status
  const toggleInstance = useCallback((id: string) => {
    setInstances((prev) => {
      const updated = prev.map((inst) => {
        if (inst.id === id) {
          const newStatus = inst.status === "running" ? "stopped" as const : "running" as const;
          return {
            ...inst,
            status: newStatus,
          };
        }
        return inst;
      });
      saveInstances(updated);
      return updated;
    });
  }, [saveInstances]);

  // Delete instance
  const deleteInstance = useCallback((id: string) => {
    if (!confirm("Delete this VPS instance?")) return;
    const updated = instances.filter((inst) => inst.id !== id);
    saveInstances(updated);
  }, [instances, saveInstances]);

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

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
                <ServerIcon className="w-6 h-6" style={{ color: "var(--cd-cyan)" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--cd-text-primary)" }}>
                  VPS Instances
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--cd-text-muted)" }}>
                  Manage your virtual private servers
                </p>
              </div>
            </div>

            <button
              onClick={createInstance}
              disabled={creating}
              className="cd-btn cd-btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              {creating ? "Creating..." : "Create VPS"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="cd-card text-center py-12">
            <div className="cd-spinner cd-spinner-lg mx-auto mb-4" />
            <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>Loading instances...</p>
          </div>
        ) : instances.length === 0 ? (
          <div className="cd-card text-center py-16">
            <ServerIcon className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--cd-text-muted)" }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: "var(--cd-text-primary)" }}>
              No VPS instances
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--cd-text-muted)" }}>
              Create your first VPS instance to get started
            </p>
            <button
              onClick={createInstance}
              disabled={creating}
              className="cd-btn cd-btn-primary"
            >
              <PlusIcon className="w-4 h-4" />
              {creating ? "Creating..." : "Create VPS"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {instances.map((instance) => (
              <div key={instance.id} className="cd-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Instance Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--cd-elevated)" }}
                    >
                      <ServerIcon className="w-6 h-6" style={{ color: "var(--cd-cyan)" }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium" style={{ color: "var(--cd-text-primary)" }}>
                          {instance.name}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: instance.status === "running"
                              ? "rgba(63, 185, 80, 0.1)"
                              : instance.status === "pending"
                              ? "rgba(210, 153, 34, 0.1)"
                              : "rgba(110, 118, 129, 0.1)",
                            color: instance.status === "running"
                              ? "var(--cd-success)"
                              : instance.status === "pending"
                              ? "var(--cd-warning)"
                              : "var(--cd-text-muted)"
                          }}
                        >
                          {instance.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: "var(--cd-text-muted)" }}>
                        <span className="flex items-center gap-1">
                          <GlobeIcon className="w-3 h-3" />
                          {instance.region}
                        </span>
                        {instance.ip && (
                          <span className="font-mono">{instance.ip}</span>
                        )}
                        <span>Created {formatDate(instance.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="flex items-center gap-6 text-xs" style={{ color: "var(--cd-text-secondary)" }}>
                    <div className="flex items-center gap-1">
                      <CpuIcon className="w-3 h-3" />
                      {instance.specs.cpu}
                    </div>
                    <div>{instance.specs.memory}</div>
                    <div>{instance.specs.storage}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleInstance(instance.id)}
                      className={`cd-btn ${instance.status === "running" ? "cd-btn-ghost" : "cd-btn-primary"} text-xs`}
                    >
                      {instance.status === "running" ? (
                        <>
                          <StopIcon className="w-3 h-3" />
                          Stop
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-3 h-3" />
                          Start
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteInstance(instance.id)}
                      className="p-2 rounded-lg hover:bg-[var(--cd-elevated)] transition-colors"
                      style={{ color: "var(--cd-error)" }}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <InfoCard
            icon="⚡"
            title="Instant Deployment"
            description="New VPS instances are deployed within seconds"
          />
          <InfoCard
            icon="🔒"
            title="Secure & Isolated"
            description="Each VPS runs in its own isolated environment"
          />
          <InfoCard
            icon="📊"
            title="Full Control"
            description="Root access and complete control over your server"
          />
        </div>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--cd-border-muted)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--cd-text-muted)" }}>
            Related Services
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/virtual-machines"
              className="cd-card group flex items-center gap-4 hover:border-[var(--cd-cyan)] transition-colors"
            >
              <ServerIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />
              <div>
                <h4 className="font-medium text-sm" style={{ color: "var(--cd-text-primary)" }}>
                  Virtual Machines
                </h4>
                <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                  Boot Android/Windows
                </p>
              </div>
            </Link>
            <Link
              href="/cluster"
              className="cd-card group flex items-center gap-4 hover:border-[var(--cd-cyan)] transition-colors"
            >
              <GlobeIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />
              <div>
                <h4 className="font-medium text-sm" style={{ color: "var(--cd-text-primary)" }}>
                  Cluster Network
                </h4>
                <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                  P2P compute network
                </p>
              </div>
            </Link>
            <Link
              href="/storage"
              className="cd-card group flex items-center gap-4 hover:border-[var(--cd-cyan)] transition-colors"
            >
              <svg className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
              <div>
                <h4 className="font-medium text-sm" style={{ color: "var(--cd-text-primary)" }}>
                  Cloud Storage
                </h4>
                <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                  Unlimited file storage
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

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