"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Play, Plus, Sliders, Smartphone } from "lucide-react";
import { subscribeInstalledApps, type InstalledApp } from "@/lib/apps/apps-service";
import { authService } from "@/lib/firebase/auth-service";
import { AdCard } from "@/components/AdCard";
import { unlockAchievement } from "@/lib/gamification/achievements";
import { getClusterBase } from "@/lib/cluster/cluster-base";

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
  const userUid = user?.uid ?? null;

  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [heapUsed, setHeapUsed] = useState<number | null>(null);
  const [clusterStatus, setClusterStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [deployedSite, setDeployedSite] = useState(false);

  const base = useMemo(() => {
    return getClusterBase();
  }, []);

  useEffect(() => authService.onAuthStateChange(setUser), []);

  useEffect(() => {
    if (!userUid) {
      setApps([]);
      return;
    }
    return subscribeInstalledApps(userUid, setApps);
  }, [userUid]);

  useEffect(() => {
    if (!userUid) return;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        setClusterStatus((s) => (s === "online" ? "online" : "connecting"));
        const bases = base ? [base, ""] : [""];
        let peers: any[] | null = null;
        for (const b of bases) {
          const u = authService.getCurrentUser();
          const res = await fetch(`${b}/api/cluster/peers`, {
            cache: "no-store",
            headers: u ? { "X-Nacho-UserId": u.uid } : undefined,
          });
          if (!res.ok) continue;
          peers = (await res.json()) as any[];
          break;
        }
        if (!peers) {
          setClusterStatus("offline");
          return;
        }
        if (!stopped) {
          setPeerCount(Array.isArray(peers) ? peers.length : 0);
          setClusterStatus("online");
          if (Array.isArray(peers) && peers.length > 0) unlockAchievement("joined_cluster");
        }
      } catch {
        setClusterStatus("offline");
      }
    };

    void poll();
    const t = window.setInterval(() => void poll(), 8000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [userUid, base]);

  useEffect(() => {
    try {
      setDeployedSite(window.localStorage.getItem("bellum.mission.deployed_site") === "1");
    } catch {
      setDeployedSite(false);
    }
  }, []);

  useEffect(() => {
    const anyPerf = performance as any;
    const t = window.setInterval(() => {
      if (anyPerf?.memory?.usedJSHeapSize) setHeapUsed(anyPerf.memory.usedJSHeapSize);
      else setHeapUsed(null);
    }, 2500);
    return () => window.clearInterval(t);
  }, []);

  const storedBytes = apps.reduce((s, a) => s + (a.storedBytes || 0), 0);
  const hasInstalledApp = apps.length > 0;
  const hasPeers = peerCount > 0;
  const missionDone = Number(!!userUid) + Number(hasInstalledApp) + Number(hasPeers) + Number(deployedSite);

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold mb-2 tracking-tight">
            Nacho<span className="text-white/40">OS</span>
          </h1>
          <p className="text-xl text-white/60">Run apps in your browser (Windows + Android)</p>
          <p className="text-sm text-white/40 mt-1">
            Tip: press <span className="font-mono text-white/60">⌘K</span> / <span className="font-mono text-white/60">Ctrl+K</span> for quick actions.
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="bellum-card p-8 h-64 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
            <Monitor size={120} />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">System Status</h2>
              <div className="flex gap-2 items-center text-white/70 text-sm font-mono">
                <span className={`w-2 h-2 rounded-full ${user ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                {user ? "Identity active" : "Booting…"}
              </div>
              <div className="text-xs text-white/45 mt-2">
                Cluster:{" "}
                {clusterStatus === "online" ? (
                  <span className="text-emerald-200">online</span>
                ) : clusterStatus === "connecting" ? (
                  <span className="text-amber-200">connecting…</span>
                ) : (
                  <span className="text-rose-200">offline</span>
                )}
              </div>
              <div className="text-xs text-white/40 mt-2">
                Missions: <span className="font-mono text-white/70">{missionDone}/4</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-8">
              <div>
                <div className="text-white/40 text-xs uppercase tracking-widest mb-1">WASM Heap</div>
                <div className="text-2xl font-mono">{heapUsed ? formatBytes(heapUsed) : "n/a"}</div>
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

          <div className="absolute inset-0 bg-sky-200/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.div>

        <div className="sticky top-24">
          <AdCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(hasInstalledApp
          ? apps.slice(0, 3)
          : ([{ id: "empty", name: "Install your first app", type: "other" }] as any[])
        ).map((app: any, i: number) => {
          if (app.id === "empty") {
            return (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bellum-card group p-6 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border-2 border-white/10 text-white/70">
                  <Sliders size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold">Install your first app</h3>
                  <p className="text-sm text-white/40">Add an Android APK or Windows EXE/MSI.</p>
                </div>
                <button type="button" onClick={onGoApps} className="ml-auto bellum-btn bellum-btn-secondary">
                  Install
                </button>
              </motion.div>
            );
          }

          const icon =
            app.type === "android" ? (
              <Smartphone size={24} />
            ) : app.type === "windows" ? (
              <Monitor size={24} />
            ) : (
              <Sliders size={24} />
            );

          const iconClass =
            app.type === "android"
              ? "bg-green-500/20 text-green-400"
              : app.type === "windows"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-purple-500/20 text-purple-400";

          return (
            <motion.div
              key={String(app.id || i)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bellum-card group p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5"
              onClick={() => onOpenRunner?.()}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconClass}`}>{icon}</div>
              <div className="min-w-0">
                <h3 className="font-bold truncate">{app.name}</h3>
                <p className="text-sm text-white/40">{String(app.type).toUpperCase()} • Ready</p>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <Play size={16} />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 items-start">
        <div className="bellum-card p-6 border-2 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white/90">Missions</div>
              <div className="text-xs text-white/45 mt-1">Lightweight goals that unlock real capabilities.</div>
            </div>
            <div className="text-xs font-mono text-white/60">{missionDone}/4</div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm text-white/80">Sign in</div>
              <div className={`text-xs font-mono ${userUid ? "text-emerald-200" : "text-white/40"}`}>{userUid ? "done" : "todo"}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm text-white/80">Install an app</div>
              <div className={`text-xs font-mono ${hasInstalledApp ? "text-emerald-200" : "text-white/40"}`}>{hasInstalledApp ? "done" : "todo"}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm text-white/80">Join the cluster</div>
              <div className={`text-xs font-mono ${hasPeers ? "text-emerald-200" : "text-white/40"}`}>{hasPeers ? "done" : "todo"}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm text-white/80">Deploy a site (Fabrik)</div>
              <div className={`text-xs font-mono ${deployedSite ? "text-emerald-200" : "text-white/40"}`}>{deployedSite ? "done" : "todo"}</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-white/40">
            Deploy a site from <span className="font-mono text-white/60">Fabrik</span> to grow the cluster and unlock edge-powered hosting.
          </div>
        </div>

      </div>
    </div>
  );
};
