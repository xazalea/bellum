import React from 'react';

type LibraryItem = {
  title: string;
  subtitle: string;
  status: { label: string; tone: 'ready' | 'cached' | 'syncing' };
  icon: string;
  accent: string;
  primaryCta: string;
  primaryIcon: string;
  secondary: string[];
  progress?: number;
};

const items: LibraryItem[] = [
  {
    title: 'Cyber Racer',
    subtitle: 'Racing Simulation',
    status: { label: 'Ready', tone: 'ready' },
    icon: 'sports_esports',
    accent: 'from-fuchsia-500 to-pink-500',
    primaryCta: 'Launch Game',
    primaryIcon: 'rocket_launch',
    secondary: ['Manage', 'Delete'],
  },
  {
    title: 'Node.js',
    subtitle: 'Runtime Env',
    status: { label: 'Cached', tone: 'cached' },
    icon: 'terminal',
    accent: 'from-slate-600 to-slate-800',
    primaryCta: 'Run Binary',
    primaryIcon: 'play_arrow',
    secondary: ['Config', 'Delete'],
  },
  {
    title: 'Pixel Quest',
    subtitle: 'Adventure RPG',
    status: { label: 'Syncing', tone: 'syncing' },
    icon: 'stadia_controller',
    accent: 'from-orange-500 to-rose-500',
    primaryCta: 'Updating…',
    primaryIcon: 'progress_activity',
    secondary: ['Manage', 'Delete'],
    progress: 0.63,
  },
];

function StatusPill({ tone, label }: { tone: LibraryItem['status']['tone']; label: string }) {
  const styles =
    tone === 'ready'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : tone === 'cached'
        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
        : 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider ${styles}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {label.toUpperCase()}
    </span>
  );
}

function Segmented({ labels }: { labels: string[] }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-full border border-white/12 bg-white/5 p-1 backdrop-blur md:w-auto">
      {labels.map((label, idx) => (
        <button
          key={label}
          type="button"
          className={`h-10 rounded-full px-5 text-xs font-semibold transition ${
            idx === 0 ? 'bg-white text-black shadow-[0_10px_18px_rgba(0,0,0,0.35)]' : 'text-white/70 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function LibraryPage() {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
            CLUSTER CONNECTED
          </div>
          <h1 className="mt-5 font-display text-6xl font-black tracking-tight text-white">My Library</h1>
          <div className="font-display text-3xl font-bold tracking-tight text-[#3b82f6]">Games &amp; Binaries</div>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-[340px]">
          <div className="rounded-[1.75rem] border-2 border-white/80 bg-[#070b16]/70 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white/55">STORAGE</div>
                <div className="mt-1 font-display text-3xl font-extrabold text-white">
                  42.8<span className="text-sm font-semibold text-white/60">GB</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white/55">ITEMS</div>
                <div className="mt-1 font-display text-3xl font-extrabold text-white">12</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#3b82f6] shadow-[0_0_0_3px_rgba(255,255,255,0.85)]">
                <span className="material-symbols-outlined text-[22px] text-white">cloud</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Segmented labels={['All Items', 'Games', 'Binaries', 'Favorites']} />

        <div className="flex w-full items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-3 backdrop-blur md:w-[360px]">
          <span className="material-symbols-outlined text-[18px] text-white/50">search</span>
          <input
            className="w-full bg-transparent text-sm font-medium text-white/85 placeholder:text-white/35 outline-none"
            placeholder="Search library..."
          />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="overflow-hidden rounded-[2rem] border-2 border-white/80 bg-[#070b16]/60 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${item.accent} ring-2 ring-white/15`}>
                  <span className="material-symbols-outlined text-[24px] text-white">{item.icon}</span>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-white">{item.title}</div>
                  <div className="text-sm font-semibold text-white/55">{item.subtitle}</div>
                </div>
              </div>
              <StatusPill tone={item.status.tone} label={item.status.label} />
            </div>

            {typeof item.progress === 'number' && (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-amber-400" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold shadow-[0_16px_30px_rgba(0,0,0,0.35)] transition ${
                  item.status.tone === 'syncing'
                    ? 'bg-white/10 text-white/45'
                    : 'bg-white text-black hover:bg-white/95'
                }`}
                disabled={item.status.tone === 'syncing'}
              >
                <span className="material-symbols-outlined text-[18px]">{item.primaryIcon}</span>
                {item.primaryCta}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {item.secondary.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {label === 'Delete' ? 'delete' : label === 'Config' ? 'tune' : 'settings'}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="relative overflow-hidden rounded-[2rem] border-2 border-white/15 bg-[#070b16]/40 p-8 shadow-[0_26px_90px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 to-transparent" />
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center rounded-[1.6rem] border-2 border-dashed border-white/20 bg-white/5">
              <span className="material-symbols-outlined text-[34px] text-white/70">add</span>
            </div>
            <div className="mt-6 font-display text-2xl font-bold text-white">Add New Item</div>
            <div className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-white/55">
              Upload a native binary or install a new game from the global grid.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


