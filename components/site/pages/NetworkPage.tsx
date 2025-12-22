'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useClusterPeers } from '../hooks/useClusterPeers';
import { locateGeneralArea } from '@/lib/geolocator/client';
import { Globe, Activity, MapPin, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const AREA_DEFINITIONS = [
  { id: 'north-america', label: 'North America', center: { lat: 41, lon: -100 } },
  { id: 'south-america', label: 'South America', center: { lat: -15, lon: -60 } },
  { id: 'europe', label: 'Europe', center: { lat: 54, lon: 10 } },
  { id: 'asia', label: 'Asia', center: { lat: 35, lon: 105 } },
  { id: 'africa', label: 'Africa', center: { lat: 2, lon: 25 } },
  { id: 'oceania', label: 'Oceania', center: { lat: -20, lon: 135 } },
];

function pickAreaForPeer(deviceId: string) {
  if (!deviceId) return AREA_DEFINITIONS[0].id;
  const hash = deviceId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return AREA_DEFINITIONS[hash % AREA_DEFINITIONS.length].id;
}

function deriveLatLon(deviceId: string) {
  let latAccum = 0;
  let lonAccum = 0;
  for (let i = 0; i < deviceId.length; i += 1) {
    const code = deviceId.charCodeAt(i);
    latAccum += (code * (i + 1)) % 180;
    lonAccum += (code * (i + 2)) % 360;
  }
  const lat = (latAccum % 180) - 90;
  const lon = (lonAccum % 360) - 180;
  return { lat, lon };
}

function projectToGlobeCoords(lat: number, lon: number) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const radius = 42; // slightly larger for breathable layout
  const x = 50 + radius * Math.cos(latRad) * Math.sin(lonRad);
  const y = 50 - radius * Math.sin(latRad);
  return { x, y };
}

export function NetworkPage() {
  const { peers } = useClusterPeers();
  const [localArea, setLocalArea] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    locateGeneralArea().then((location) => {
      if (cancelled) return;
      if (location?.label) {
        setLocalArea(location.label);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const count: Record<string, number> = {};
    peers.forEach((peer) => {
      const areaId = pickAreaForPeer(peer.deviceId);
      count[areaId] = (count[areaId] || 0) + 1;
    });
    return count;
  }, [peers]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a]/90 to-[#1e293b]/90 p-10 shadow-2xl backdrop-blur-2xl border border-white/5">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Globe size={300} className="text-white" />
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Activity size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-cyan-400">AetherNet Status</span>
          </div>

          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              {peers.length} Active Nodes
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-400 leading-relaxed">
              The fabric connects distributed devices into a singular, resilient computing layer.
              Load logic and latency metrics are aggregated instantly, preserving privacy while enabling authoritative server capabilities.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-8">
            <StatCard label="Your Location" value={localArea ?? 'Earth Wide'} icon={<MapPin size={18} />} />
            <StatCard label="Mesh Strategy" value="Region Based" icon={<Shield size={18} />} />
            <StatCard label="Latency" value="~24ms" icon={<Zap size={18} />} />
          </div>
        </div>
      </section>

      {/* Globe Visualization */}
      <section className="grid lg:grid-cols-[1.5fr,1fr] gap-8">

        {/* Globe Container */}
        <div className="relative flex items-center justify-center rounded-3xl bg-[#020617]/80 border border-white/5 p-12 shadow-2xl overflow-hidden aspect-square lg:aspect-auto">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

          <div className="globe relative w-[400px] h-[400px]">
            <div className="globe-atmosphere" />
            <div className="globe-core" />
            <div className="globe-ring" />

            {/* Privacy Dots */}
            {peers.map((peer) => {
              const { lat, lon } = deriveLatLon(peer.deviceId);
              const { x, y } = projectToGlobeCoords(lat, lon);
              return (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={`${peer.userId}:${peer.deviceId}`}
                  className="globe-dot"
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              );
            })}

            {/* Region Markers */}
            {AREA_DEFINITIONS.map((area) => {
              const { x, y } = projectToGlobeCoords(area.center.lat, area.center.lon);
              const count = totals[area.id] ?? 0;
              return (
                <div key={`${area.id}-label`} className="globe-marker" style={{ top: `${y}%`, left: `${x}%` }}>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{area.label}</span>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md transition-all
                            ${count > 0 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800/50 border-white/5 text-slate-500'}
                        `}>
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Region Stats */}
        <div className="flex flex-col gap-4">
          {AREA_DEFINITIONS.map((area) => (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              key={area.id}
              className="flex-1 flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${(totals[area.id] ?? 0) > 0 ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'}`} />
                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">{area.label}</span>
              </div>
              <span className="text-xl font-bold font-mono text-white">
                {String(totals[area.id] ?? 0).padStart(2, '0')}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .globe {
          perspective: 1000px;
          transform-style: preserve-3d;
        }
        .globe-atmosphere {
            position: absolute;
            inset: -20%;
            background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
            border-radius: 50%;
            filter: blur(20px);
        }
        .globe-core {
          height: 100%;
          width: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 
            inset 0 0 50px rgba(0,0,0,0.8),
            0 0 30px rgba(56, 189, 248, 0.1);
          animation: spinGlobe 60s linear infinite;
        }
        .globe-ring {
          position: absolute;
          inset: -10%;
          border: 1px solid rgba(56, 189, 248, 0.1);
          border-radius: 50%;
          transform: rotateX(75deg);
        }
        .globe-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 10;
        }
        .globe-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 10px #22d3ee;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 5;
        }
        @keyframes spinGlobe {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-slate-300">
      <div className="p-2 rounded-lg bg-white/5 text-white/70">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
        <div className="font-medium text-white">{value}</div>
      </div>
    </div>
  );
}


