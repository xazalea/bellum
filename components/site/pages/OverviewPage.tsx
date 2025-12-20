import React from 'react';

type GameCard = {
  title: string;
  category: string;
  playing: string;
  accent: string;
  icon: string;
};

const cards: GameCard[] = [
  { title: 'Void Bastion', category: 'Shooter', playing: '12k Playing', accent: 'from-violet-500 to-indigo-500', icon: 'rocket_launch' },
  { title: 'Pixel Odyssey', category: 'Adventure', playing: '8.5k Playing', accent: 'from-emerald-500 to-teal-500', icon: 'landscape' },
  { title: 'Iron Command', category: 'Strategy', playing: '4.1k Playing', accent: 'from-orange-500 to-red-500', icon: 'swords' },
  { title: 'Quantum Cubes', category: 'Puzzle', playing: '2.3k Playing', accent: 'from-sky-500 to-cyan-500', icon: 'sports_esports' },
  { title: 'Beat Runner', category: 'Rhythm', playing: '15k Playing', accent: 'from-pink-500 to-fuchsia-500', icon: 'piano' },
  { title: 'Tales of Nacho', category: 'RPG', playing: '6.8k Playing', accent: 'from-amber-500 to-yellow-500', icon: 'auto_stories' },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold tracking-wide text-white/80">
      {children}
    </span>
  );
}

export function OverviewPage() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-6">
        <Pill>
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.55)]" />
          FEATURED THIS WEEK
        </Pill>
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-white/90 backdrop-blur transition hover:bg-white/10"
            aria-label="Previous"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            type="button"
            className="h-11 w-11 rounded-full bg-white text-black shadow-[0_10px_20px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
            aria-label="Next"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="mt-5">
        <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-7xl">
          Play <span className="text-[#3b82f6]">Instantly</span>.
        </h1>
      </div>

      {/* Featured */}
      <section className="mt-8">
        <div className="relative overflow-hidden rounded-[2.25rem] border-2 border-white/80 bg-[#070b16]/70 shadow-[0_26px_90px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-purple-500/15" />
          </div>

          <div className="relative grid grid-cols-1 gap-8 p-8 md:grid-cols-2 md:p-10">
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold tracking-wider text-white">
                    EXCLUSIVE
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-wider text-white/70">
                    ACTION RPG
                  </span>
                </div>

                <h2 className="mt-6 font-display text-5xl font-extrabold tracking-tight text-white">
                  Neon Cuber
                </h2>
                <div className="font-display text-5xl font-extrabold tracking-tight text-white/70">
                  <span className="text-stroke-sm">Drifter</span>
                </div>

                <p className="mt-6 max-w-md text-sm font-medium leading-relaxed text-white/70">
                  Experience the high-octane thrill of futuristic racing combined with RPG elements. Run it natively in
                  your browser with zero install time.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#3b82f6] px-6 text-sm font-semibold text-white shadow-[0_0_0_3px_rgba(255,255,255,0.85),0_16px_30px_rgba(0,0,0,0.35)] transition hover:bg-[#4b8cff]"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Run Game Now
                </button>
                <button
                  type="button"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  Details
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="relative h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 md:h-full">
                <video
                  className="h-full w-full object-cover opacity-80"
                  src="/back.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>

              <div className="absolute bottom-5 right-5 w-[210px] rounded-2xl border border-white/15 bg-[#0b1020]/80 p-4 backdrop-blur shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold tracking-wider text-white/60">PERFORMANCE</div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Excellent
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                    <span className="material-symbols-outlined text-[18px] text-white/80">bolt</span>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl font-extrabold text-white">
                      60<span className="text-sm font-semibold text-white/70">FPS</span>
                    </div>
                    <div className="text-[10px] font-semibold tracking-wider text-white/40">NATIVE BINARY</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game library grid */}
      <section className="mt-14">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#2f7cfb]/20 ring-1 ring-white/10">
              <span className="material-symbols-outlined text-[18px] text-[#60a5fa]">grid_view</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-white">Game Library</h3>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 p-1">
            {['All', 'Action', 'Strategy', 'Puzzle', 'Retro'].map((label, idx) => (
              <button
                type="button"
                key={label}
                className={`h-9 rounded-full px-4 text-xs font-semibold transition ${
                  idx === 0 ? 'bg-white text-black shadow-[0_10px_18px_rgba(0,0,0,0.35)]' : 'text-white/70 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="group overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0a0f1f]/55 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur transition hover:border-white/25"
            >
              <div className={`relative h-40 overflow-hidden rounded-2xl bg-gradient-to-br ${card.accent}`}>
                <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[10px] font-bold tracking-wider text-white/85">
                  {card.category.toUpperCase()}
                </div>
                <div className="absolute inset-0 grid place-items-center opacity-25">
                  <span className="material-symbols-outlined text-[64px] text-white">{card.icon}</span>
                </div>
              </div>

              <div className="mt-5">
                <div className="font-display text-xl font-bold text-white">{card.title}</div>
                <div className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-white/50">
                  Defend, explore, or conquer—instant play with native performance and zero installs.
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-white/45">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  {card.playing}
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-black shadow-[0_10px_18px_rgba(0,0,0,0.35)] transition group-hover:translate-y-[-1px]"
                >
                  Run <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-6 text-xs font-semibold text-white/80 backdrop-blur transition hover:bg-white/10"
          >
            Load More Games <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </button>
        </div>
      </section>
    </div>
  );
}


