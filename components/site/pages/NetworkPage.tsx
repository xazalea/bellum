/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useMemo, useState } from 'react';
import { useClusterPeers } from '../hooks/useClusterPeers';

function OutlineCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border-2 border-white/80 bg-[#070b16]/60 shadow-[0_26px_90px_rgba(0,0,0,0.55)] ${className}`}
    >
      {children}
    </div>
  );
}

export function NetworkPage() {
  const { peers, self } = useClusterPeers();
  const [keepaliveEnabled, setKeepaliveEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('nacho.keepalive') !== 'off';
  });

  const activePeers = peers.length;
  const lastSeen = useMemo(() => {
    if (!self?.lastSeenUnixMs) return null;
    const s = Math.max(0, Date.now() - self.lastSeenUnixMs);
    const sec = Math.floor(s / 1000);
    return sec < 90 ? `${sec}s ago` : `${Math.floor(sec / 60)}m ago`;
  }, [self?.lastSeenUnixMs]);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/75">
            <span className={`h-2 w-2 rounded-full ${activePeers ? 'bg-emerald-400' : 'bg-amber-300'} shadow-[0_0_10px_rgba(52,211,153,0.55)]`} />
            {activePeers ? `CLUSTER CONNECTED • ${activePeers} PEER${activePeers === 1 ? '' : 'S'}` : 'CLUSTER CONNECTING'}
          </div>
          <h1 className="mt-5 font-display text-6xl font-black tracking-tight text-white">Network</h1>
          <div className="font-display text-6xl font-black tracking-tight text-white/70">
            <span className="text-stroke-sm">Status</span>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-wider text-white/55">ACTIVE PEERS</div>
            <div className="mt-1 font-display text-4xl font-extrabold text-white">{activePeers}</div>
            <div className="mt-3 h-1 w-28 rounded-full bg-white/10">
              <div className="h-full w-28 rounded-full bg-[#3b82f6]" style={{ width: `${Math.min(112, 20 + activePeers * 6)}px` }} />
            </div>
            {lastSeen && <div className="mt-2 text-xs font-semibold text-white/45">Last heartbeat: {lastSeen}</div>}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <OutlineCard className="md:col-span-2">
          <div className="relative p-8">
            <div className="absolute inset-0 bg-[#3b82f6]/85" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-[10px] font-bold tracking-wider text-white">
                  <span className="material-symbols-outlined text-[14px]">hub</span>
                  NODE STATUS
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-black">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </div>
              </div>

              <div className="mt-5 font-display text-xl font-bold text-white/95">Background Node</div>
              <div className="mt-2 text-sm font-semibold text-white/90">
                {keepaliveEnabled ? 'Enabled' : 'Disabled'} • Heartbeats are sent from the hidden keepalive frame.
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = !keepaliveEnabled;
                    setKeepaliveEnabled(next);
                    window.localStorage.setItem('nacho.keepalive', next ? 'on' : 'off');
                    // Reload to apply (ClientInit reads this when mounting).
                    window.location.reload();
                  }}
                  className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
                >
                  {keepaliveEnabled ? 'Stop Node' : 'Start Node'}
                </button>
                <div className="text-xs font-semibold text-white/75">
                  Self: {self ? `${self.deviceId.slice(0, 8)}…` : '—'}
                </div>
              </div>
            </div>
          </div>
        </OutlineCard>

        <OutlineCard>
          <div className="p-7">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white/55">ACTIVE REGIONS</div>
                <div className="mt-2 font-display text-2xl font-bold text-white">Global</div>
              </div>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:bg-white/10"
                aria-label="Map"
              >
                <span className="material-symbols-outlined text-[18px]">public</span>
              </button>
            </div>

            <div className="relative mt-6 grid aspect-square place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="absolute inset-0 opacity-35">
                <div className="absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
                <div className="absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
                <div className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
                <div className="absolute left-1/2 top-1/2 h-px w-[90%] -translate-x-1/2 bg-white/10" />
                <div className="absolute left-1/2 top-1/2 w-px h-[90%] -translate-y-1/2 bg-white/10" />
              </div>

              {peers.slice(0, 6).map((p, idx) => (
                <div
                  key={`${p.userId}:${p.deviceId}`}
                  className="absolute h-2 w-2 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                  style={{
                    left: `${28 + (idx * 9) % 44}%`,
                    top: `${38 + (idx * 11) % 44}%`,
                    backgroundColor: idx % 3 === 0 ? '#a855f7' : idx % 3 === 1 ? '#38bdf8' : '#34d399',
                  }}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-white/55">
              <span className="rounded-full bg-white/5 px-3 py-1">Peers: {activePeers}</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Window: 60s</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Heartbeat: 15s</span>
            </div>
          </div>
        </OutlineCard>
      </div>

      <div className="mt-6">
        <OutlineCard>
          <div className="p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-display text-2xl font-bold text-white">Grid Topology</div>
                <div className="mt-1 text-sm font-semibold text-white/55">Real-time visualization of node clusters.</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70">Idle</div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 p-1">
                  <button type="button" className="h-9 rounded-full bg-white px-4 text-xs font-semibold text-black">
                    2D View
                  </button>
                  <button type="button" className="h-9 rounded-full px-4 text-xs font-semibold text-white/70 hover:text-white">
                    3D View
                  </button>
                </div>
              </div>
            </div>

            <div className="relative mt-6 h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#060915]/70">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-purple-500/10" />
              <div className="absolute inset-0 opacity-30 ui-grid" />
              <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/20">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/95 text-black shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                  <span className="material-symbols-outlined text-[28px]">hub</span>
                </div>
              </div>

              {peers.slice(0, 3).map((p, idx) => (
                <div
                  key={`${p.userId}:${p.deviceId}`}
                  className="absolute rounded-xl bg-[#3b82f6] px-3 py-2 text-[11px] font-bold text-white shadow-[0_0_0_2px_rgba(255,255,255,0.85)]"
                  style={{ left: `${22 + idx * 18}%`, top: `${56 + (idx % 2) * 10}%` }}
                >
                  <div className="text-[9px] font-semibold text-white/85">{p.label || 'Peer'}</div>
                  {p.deviceId.slice(0, 8)}…
                </div>
              ))}

              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-[10px] font-semibold text-white/55 backdrop-blur">
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${keepaliveEnabled ? 'bg-emerald-400' : 'bg-amber-300'}`} /> Node{' '}
                  {keepaliveEnabled ? 'enabled' : 'disabled'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">devices</span> {activePeers} active peers
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">schedule</span> {lastSeen ? `last ${lastSeen}` : 'no heartbeat'}
                </span>
              </div>
            </div>
          </div>
        </OutlineCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <OutlineCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-wider text-white/55">AVG LATENCY</div>
              <div className="mt-2 font-display text-4xl font-extrabold text-white">
                24<span className="text-sm font-semibold text-white/60">ms</span>
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
              <span className="material-symbols-outlined text-[18px] text-white/70">speed</span>
            </div>
          </div>
          <div className="mt-5 text-sm font-semibold text-white/60">
            Reported load: {typeof self?.load === 'number' ? `${Math.round(self.load * 100)}%` : '—'}
          </div>
        </OutlineCard>

        <OutlineCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-wider text-white/55">JOBS PROCESSED</div>
              <div className="mt-2 font-display text-4xl font-extrabold text-white">8.2M</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
              <span className="material-symbols-outlined text-[18px] text-white/70">memory</span>
            </div>
          </div>
          <div className="mt-4 text-sm font-semibold text-white/60">
            Heartbeat source: /keepalive iframe (15s interval)
          </div>
        </OutlineCard>

        <OutlineCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-wider text-white/55">SECURITY</div>
              <div className="mt-2 font-display text-3xl font-extrabold text-white">Enclave</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
              <span className="material-symbols-outlined text-[18px] text-white/70">verified_user</span>
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
            <span className={`h-2 w-2 rounded-full ${keepaliveEnabled ? 'bg-emerald-400' : 'bg-amber-300'}`} />
            {keepaliveEnabled ? 'Participating' : 'Not participating'}
          </div>
        </OutlineCard>
      </div>

      <div className="mt-8">
        <OutlineCard className="p-8">
          <div className="text-center">
            <div className="font-display text-3xl font-black text-white">Want to boost the grid?</div>
            <div className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/55">
              Join the network by running a node in your browser background. Earn credits and help others run native binaries faster.
            </div>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const next = !keepaliveEnabled;
                  setKeepaliveEnabled(next);
                  window.localStorage.setItem('nacho.keepalive', next ? 'on' : 'off');
                  window.location.reload();
                }}
                className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
              >
                {keepaliveEnabled ? 'Stop Node' : 'Start Node'}
              </button>
              <button
                type="button"
                className="h-12 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                onClick={() => window.open('/keepalive', '_blank', 'noopener,noreferrer')}
              >
                Open keepalive
              </button>
            </div>
          </div>
        </OutlineCard>
      </div>
    </div>
  );
}


