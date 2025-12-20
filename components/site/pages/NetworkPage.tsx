import React from 'react';

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
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
            GRID ONLINE • STABLE
          </div>
          <h1 className="mt-5 font-display text-6xl font-black tracking-tight text-white">Network</h1>
          <div className="font-display text-6xl font-black tracking-tight text-white/70">
            <span className="text-stroke-sm">Status</span>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-wider text-white/55">GLOBAL PEERS</div>
            <div className="mt-1 font-display text-4xl font-extrabold text-white">12,842</div>
            <div className="mt-3 h-1 w-28 rounded-full bg-white/10">
              <div className="h-full w-20 rounded-full bg-[#3b82f6]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <OutlineCard className="md:col-span-2">
          <div className="relative p-8">
            <div className="absolute inset-0 bg-[#3b82f6]/90" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-[10px] font-bold tracking-wider text-white">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  TURBO ACTIVE
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/95 text-black">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </div>
              </div>

              <div className="mt-5 font-display text-xl font-bold text-white/90">Collective Boost Factor</div>
              <div className="mt-4 flex items-end gap-2">
                <div className="font-display text-7xl font-black text-white">8.4</div>
                <div className="pb-3 font-display text-2xl font-bold text-white/80">x</div>
              </div>
              <div className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/90">
                Your browser is currently running <span className="underline">8.4x faster</span> thanks to distributed peer acceleration.
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[78%] rounded-full bg-white/90" />
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

              <div className="absolute left-[28%] top-[40%] h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.6)]" />
              <div className="absolute left-[56%] top-[52%] h-2 w-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
              <div className="absolute left-[68%] top-[62%] h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
              <div className="absolute left-[60%] top-[72%] h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-white/55">
              <span className="rounded-full bg-white/5 px-3 py-1">NA-East 42ms</span>
              <span className="rounded-full bg-white/5 px-3 py-1">EU-West 88ms</span>
              <span className="rounded-full bg-white/5 px-3 py-1">Asia 120ms</span>
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

              <div className="absolute left-[28%] top-[62%] rounded-xl bg-[#3b82f6] px-3 py-2 text-[11px] font-bold text-white shadow-[0_0_0_2px_rgba(255,255,255,0.85)]">
                <div className="text-[9px] font-semibold text-white/85">WORKER #441</div>
                Processing
              </div>

              <div className="absolute left-[62%] top-[54%] rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-200">
                Syncing
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-[10px] font-semibold text-white/55 backdrop-blur">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Node 0x82… connected
                </span>
                <span className="inline-flex items-center gap-2 text-emerald-300">
                  <span className="material-symbols-outlined text-[14px]">bolt</span> Job #2911 optimized (24ms)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/50" /> New region Tokyo added
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
          <div className="mt-5 flex h-10 items-end gap-2">
            {[12, 22, 14, 28, 20, 8].map((h, idx) => (
              <div key={idx} className="w-full rounded-md bg-white/10">
                <div className="rounded-md bg-[#3b82f6]" style={{ height: `${h}px` }} />
              </div>
            ))}
            <div className="w-full rounded-md bg-white/10">
              <div className="rounded-md bg-emerald-400" style={{ height: `10px` }} />
            </div>
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
          <div className="mt-4 text-sm font-semibold text-emerald-300">↗ +12.5% this hour</div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[62%] rounded-full bg-[#3b82f6]" />
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
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Audit Verified
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
                className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
              >
                Start Node
              </button>
              <button
                type="button"
                className="h-12 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Learn More
              </button>
            </div>
          </div>
        </OutlineCard>
      </div>
    </div>
  );
}


