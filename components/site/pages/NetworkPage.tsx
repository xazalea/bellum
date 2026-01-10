'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useClusterPeers } from '../hooks/useClusterPeers';
import { locateGeneralArea } from '@/lib/geolocator/client';
import { Globe, Activity, MapPin, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/nacho-ui/Card';
import { cn } from '@/lib/utils';

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
    <div className="space-y-10 pb-20">
      {/* Hero Section */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-nacho-card to-nacho-bg border-nacho-border shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
          <Globe size={400} className="text-white" />
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-nacho-accent-blue/10 text-nacho-accent-blue border border-nacho-accent-blue/20">
              <Activity size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-nacho-accent-blue">AetherNet Status</span>
          </div>

          <div>
            <h1 className="text-5xl md:text-7xl font-black font-display tracking-tight text-white">
              {peers.length} <span className="text-nacho-subtext">Active Nodes</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-nacho-subtext leading-relaxed font-light">
              The fabric connects distributed devices into a singular, resilient computing layer.
              Load logic and latency metrics are aggregated instantly, preserving privacy while enabling authoritative server capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <StatCard label="Your Location" value={localArea ?? 'Earth Wide'} icon={<MapPin size={18} />} />
            <StatCard label="Mesh Strategy" value="Region Based" icon={<Shield size={18} />} />
            <StatCard label="Latency" value="~24ms" icon={<Zap size={18} />} />
          </div>
        </div>
      </Card>

      {/* Globe Visualization */}
      <div className="grid lg:grid-cols-[1.5fr,1fr] gap-8">

        {/* Globe Container */}
        <Card className="relative flex items-center justify-center bg-[#020617] border-nacho-border shadow-2xl overflow-hidden aspect-square lg:aspect-auto min-h-[500px]">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 bg-center" />
          
          <div className="globe relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1 drop-shadow-md">{area.label}</span>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md transition-all",
                      count > 0 
                        ? "bg-nacho-accent-blue/20 border-nacho-accent-blue text-nacho-accent-blue shadow-[0_0_15px_rgba(96,165,250,0.3)]" 
                        : "bg-white/5 border-white/5 text-nacho-subtext/50"
                    )}>
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Region Stats */}
        <div className="flex flex-col gap-4">
          {AREA_DEFINITIONS.map((area, i) => (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={area.id}
            >
              <Card className="flex items-center justify-between !p-5 hover:bg-nacho-card-hover transition-colors group cursor-default">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-500",
                    (totals[area.id] ?? 0) > 0 ? "bg-nacho-accent-blue shadow-[0_0_8px_#60A5FA]" : "bg-nacho-card-2"
                  )} />
                  <span className="font-medium text-nacho-subtext group-hover:text-white transition-colors">{area.label}</span>
                </div>
                <span className="text-xl font-bold font-mono text-white">
                  {String(totals[area.id] ?? 0).padStart(2, '0')}
                </span>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .globe {
          perspective: 1000px;
          transform-style: preserve-3d;
        }
        .globe-atmosphere {
            position: absolute;
            inset: -20%;
            background: radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%);
            border-radius: 50%;
            filter: blur(20px);
        }
        .globe-core {
          height: 100%;
          width: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #0B0F1A 0%, #141A26 100%);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 
            inset 0 0 50px rgba(0,0,0,0.8),
            0 0 30px rgba(96, 165, 250, 0.05);
          animation: spinGlobe 60s linear infinite;
        }
        .globe-ring {
          position: absolute;
          inset: -10%;
          border: 1px solid rgba(255, 255, 255, 0.03);
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
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #60A5FA;
          box-shadow: 0 0 8px #60A5FA;
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
    <div className="flex items-center gap-4 bg-nacho-bg/30 p-4 rounded-2xl border border-nacho-border/50">
      <div className="p-2.5 rounded-xl bg-nacho-card text-nacho-primary">{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-nacho-subtext font-bold mb-0.5">{label}</div>
        <div className="font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}
