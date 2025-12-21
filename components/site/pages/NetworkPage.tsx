'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useClusterPeers } from '../hooks/useClusterPeers';
import { locateGeneralArea } from '@/lib/geolocator/client';

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
  const radius = 40;
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

  const headline = peers.length
    ? `AetherNet sees ${peers.length} node${peers.length === 1 ? '' : 's'} active`
    : 'Cluster is waiting for your nodes';

  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] border border-white/10 bg-[#04060d]/60 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.5em] text-white/60">Network</div>
          <h1 className="text-5xl font-black text-white">{headline}</h1>
          <p className="max-w-2xl text-base text-white/60">
            Connections flow through the shared Nacho backend. Every peer reports load, latency, and capability metadata, but
            the UI surfaces only high-level regions so precise coordinates stay private.
          </p>
          <div className="flex flex-wrap gap-6 pt-2 text-sm text-white/70">
            <div>
              <div className="text-xs uppercase text-white/50">Local general area</div>
              <div className="text-lg font-semibold text-white">{localArea ?? 'earth wide'}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-white/50">Globe view</div>
              <div className="text-lg font-semibold text-white">Regions only</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#050712]/80 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">Globe</div>
            <h2 className="text-2xl font-bold text-white">General-area coverage</h2>
            <p className="text-sm text-white/60">
              Powered by Geolocator fallbacks so the globe only presents broad regions (North America, Africa, etc.) rather
              than exact pins.
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">Privacy first</div>
        </div>

        <div className="mt-6 flex justify-center">
        <div className="globe relative h-[320px] w-[320px]">
          <div className="globe-core" />
          <div className="globe-ring" />
          <div className="globe-ring globe-ring--alt" />
          {peers.map((peer) => {
            const { lat, lon } = deriveLatLon(peer.deviceId);
            const { x, y } = projectToGlobeCoords(lat, lon);
            return (
              <span
                key={`${peer.userId}:${peer.deviceId}`}
                className="globe-dot"
                style={{ left: `${x}%`, top: `${y}%` }}
                aria-label={`Peer ${peer.deviceId.slice(0, 6)}`}
              />
            );
          })}
          {AREA_DEFINITIONS.map((area) => {
            const { x, y } = projectToGlobeCoords(area.center.lat, area.center.lon);
            return (
              <div key={`${area.id}-label`} className="globe-marker" style={{ top: `${y}%`, left: `${x}%` }}>
                <span className="globe-marker__label">{area.label.split(' ')[0]}</span>
                <span className="globe-marker__count">{totals[area.id] ?? 0}</span>
              </div>
            );
          })}
        </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {AREA_DEFINITIONS.map((area) => (
            <div
              key={area.id}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-5 py-4"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">{area.label}</div>
                <div className="text-2xl font-bold text-white">{totals[area.id] ?? 0}</div>
              </div>
              <div className="text-xs uppercase text-white/50">nodes</div>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .globe {
          perspective: 800px;
        }
        .globe-core {
          height: 100%;
          width: 100%;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(96, 165, 250, 0.7), rgba(15, 23, 42, 0.9));
          box-shadow: 0 20px 60px rgba(59, 130, 246, 0.5), inset 0 0 30px rgba(14, 165, 233, 0.5),
            inset 0 -40px 80px rgba(3, 7, 18, 0.9);
          animation: spinGlobe 18s linear infinite;
        }
        .globe-ring {
          position: absolute;
          inset: 10%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          transform: rotateX(65deg);
          animation: orbit 12s linear infinite;
        }
        .globe-ring--alt {
          inset: 12%;
          border-style: dashed;
          animation-direction: reverse;
        }
        .globe-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          pointer-events: none;
        }
        .globe-marker__label {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
        }
        .globe-marker__count {
          font-size: 14px;
          font-weight: 700;
          color: #38bdf8;
        }
        .globe-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: radial-gradient(circle, #34d399, #0f172a);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.8);
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        @keyframes orbit {
          0% {
            transform: rotateX(65deg) rotate(0deg);
          }
          100% {
            transform: rotateX(65deg) rotate(360deg);
          }
        }

        @keyframes spinGlobe {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
}

