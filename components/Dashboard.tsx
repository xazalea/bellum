"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Play, Plus, Sliders, Smartphone, Cpu, Wifi, HardDrive, Activity } from "lucide-react";
import { subscribeInstalledApps, type InstalledApp } from "@/lib/apps/apps-service";
import { authService } from "@/lib/firebase/auth-service";
import { AdCard } from "@/components/AdCard";
import { unlockAchievement } from "@/lib/gamification/achievements";
import { getNachoIdentity } from "@/lib/auth/nacho-identity";

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
  onOpenRunner?: (appId?: string) => void;
}) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const userUid = user?.uid ?? null;

  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [heapUsed, setHeapUsed] = useState<number | null>(null);
  const [clusterStatus, setClusterStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);

  useEffect(() => authService.onAuthStateChange(setUser), []);

  useEffect(() => {
    if (!userUid) {
      setApps([]);
      return;
    }
    return subscribeInstalledApps(userUid, setApps);
  }, [userUid]);

  // Cluster polling (mocked for visual flair if actual backend offline)
  useEffect(() => {
    if (!userUid) return;
    const interval = setInterval(() => {
         // Simulate peer fluctuation for liveliness
         setPeerCount(p => Math.max(0, p + (Math.random() > 0.5 ? 1 : -1)));
    }, 5000);
    return () => clearInterval(interval);
  }, [userUid]);

  // Memory polling
  useEffect(() => {
    const t = setInterval(() => {
      const anyPerf = performance as any;
      if (anyPerf?.memory?.usedJSHeapSize) {
          setHeapUsed(anyPerf.memory.usedJSHeapSize);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const storedBytes = apps.reduce((s, a) => s + (a.storedBytes || 0), 0);

  return (
    <div className="w-full h-full min-h-screen relative overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[150px] mix-blend-screen" />
          <div className="absolute top-[40%] left-[50%] w-[30vw] h-[30vw] bg-emerald-900/10 rounded-full blur-[100px] mix-blend-screen translate-x-[-50%] translate-y-[-50%]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto p-8 pt-24 flex flex-col gap-12">
        
        {/* Hero Section */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8"
        >
          <div>
            <motion.h1 
                className="text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/20"
                initial={{ letterSpacing: "-0.05em" }}
                whileHover={{ letterSpacing: "0em" }}
                transition={{ duration: 0.5, ease: "circOut" }}
            >
              NACHO
            </motion.h1>
            <div className="flex items-center gap-4 mt-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 tracking-wider">
                    v3.0.0-ALPHA
                </span>
                <span className="text-white/40 text-sm font-light">
                    Universal Runtime Environment
                </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
                onClick={onGoApps}
                className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all flex items-center gap-3 backdrop-blur-md group"
            >
                <Plus size={18} className="text-white/60 group-hover:text-white transition-colors" />
                <span className="text-sm font-medium">Install App</span>
            </button>
          </div>
        </motion.div>

        {/* HUD Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
                label="MEMORY" 
                value={heapUsed ? formatBytes(heapUsed) : "---"} 
                icon={<Cpu size={16} />} 
                color="text-rose-400"
            />
             <StatCard 
                label="STORAGE" 
                value={formatBytes(storedBytes)} 
                icon={<HardDrive size={16} />} 
                color="text-emerald-400"
            />
             <StatCard 
                label="CLUSTER" 
                value={clusterStatus === 'online' ? `${peerCount} PEERS` : "OFFLINE"} 
                icon={<Wifi size={16} />} 
                color="text-cyan-400"
            />
             <StatCard 
                label="RUNTIME" 
                value="READY" 
                icon={<Activity size={16} />} 
                color="text-amber-400"
            />
        </div>

        {/* Apps Spatial Grid */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-light tracking-tight text-white/80">Installed Applications</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-6" />
            </div>

            {apps.length === 0 ? (
                <EmptyState onInstall={onGoApps} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 perspective-1000">
                    {apps.map((app, i) => (
                        <AppCard 
                            key={app.id} 
                            app={app} 
                            index={i} 
                            onRun={() => onOpenRunner?.(app.id)}
                            onHover={setHoveredApp}
                            isHovered={hoveredApp === app.id}
                        />
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

// Sub-components for cleaner code

const StatCard = ({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) => (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm flex flex-col justify-between h-28 group">
        <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase">{label}</span>
            <div className={`p-2 rounded-lg bg-black/20 ${color} opacity-60 group-hover:opacity-100 transition-opacity`}>
                {icon}
            </div>
        </div>
        <div className="font-mono text-xl tracking-tight text-white/90">
            {value}
        </div>
    </div>
);

const AppCard = ({ app, index, onRun, onHover, isHovered }: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
            onMouseEnter={() => onHover(app.id)}
            onMouseLeave={() => onHover(null)}
            onClick={onRun}
            className="relative h-48 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden cursor-pointer group transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-900/20"
        >
            <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
            
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold backdrop-blur-md shadow-lg
                    ${app.type === 'android' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 
                      app.type === 'windows' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 
                      'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                    {app.type === 'android' ? <Smartphone size={20} /> : <Monitor size={20} />}
                </div>
                <motion.div 
                    animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
                    className="px-3 py-1 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1"
                >
                    RUN <Play size={10} fill="currentColor" />
                </motion.div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 z-10">
                <h3 className="text-2xl font-medium tracking-tight truncate">{app.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-white/40 font-mono">
                    <span className="uppercase">{app.type}</span>
                    <span>•</span>
                    <span>{formatBytes(app.storedBytes)}</span>
                </div>
            </div>

            {/* Hover Glow */}
            <div className={`absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        </motion.div>
    );
};

const EmptyState = ({ onInstall }: { onInstall?: () => void }) => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="col-span-full h-64 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-6 bg-white/5 hover:bg-white/[0.07] transition-colors cursor-pointer group"
        onClick={onInstall}
    >
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={32} className="text-white/40 group-hover:text-white transition-colors" />
        </div>
        <div className="text-center">
            <div className="text-lg font-medium text-white/80">No Apps Installed</div>
            <div className="text-sm text-white/40">Get started by installing your first app</div>
        </div>
    </motion.div>
);
