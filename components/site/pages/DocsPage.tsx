import React from 'react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[1.75rem] border border-white/12 bg-[#070b16]/55 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

function OutlineCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[2rem] border-2 border-white/80 bg-[#070b16]/60 shadow-[0_26px_90px_rgba(0,0,0,0.55)] ${className}`}>
      {children}
    </div>
  );
}

export function DocsPage() {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-6">
        <div className="w-full">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/75">
            <span className="material-symbols-outlined text-[16px] text-amber-300">emoji_objects</span>
            LEARN &amp; CONNECT
          </div>

          <div className="mt-6 text-center">
            <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl">
              Docs &amp; <span className="text-[#3b82f6]">Community</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-white/60">
              Everything you need to master native browser computing. Join our friendly community, browse tutorials, or get help with the grid.
            </p>
          </div>

          <div className="mx-auto mt-7 flex max-w-2xl items-center gap-3 rounded-full border-2 border-white/20 bg-white/5 p-2 backdrop-blur">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
              <span className="material-symbols-outlined text-[18px] text-white/60">search</span>
            </div>
            <input
              className="w-full bg-transparent px-1 text-sm font-semibold text-white/85 placeholder:text-white/35 outline-none"
              placeholder="Search docs, tutorials, or questions..."
            />
            <button
              type="button"
              className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2f7cfb]/20 ring-1 ring-white/10">
          <span className="material-symbols-outlined text-[20px] text-[#60a5fa]">school</span>
        </div>
        <div className="font-display text-2xl font-bold text-white">Start Learning</div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
            <span className="material-symbols-outlined text-[18px] text-emerald-300">rocket_launch</span>
          </div>
          <div className="mt-4 font-display text-lg font-bold text-white">Quick Start</div>
          <div className="mt-2 text-xs font-semibold leading-relaxed text-white/55">
            Set up your first native binary in under 5 minutes.
          </div>
          <div className="mt-4 text-xs font-bold text-emerald-300">Read Guide →</div>
        </Card>

        <Card>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 ring-1 ring-sky-500/25">
            <span className="material-symbols-outlined text-[18px] text-sky-300">terminal</span>
          </div>
          <div className="mt-4 font-display text-lg font-bold text-white">CLI Reference</div>
          <div className="mt-2 text-xs font-semibold leading-relaxed text-white/55">
            Complete command line documentation for power users.
          </div>
          <div className="mt-4 text-xs font-bold text-sky-300">View Docs →</div>
        </Card>

        <Card>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500/15 ring-1 ring-pink-500/25">
            <span className="material-symbols-outlined text-[18px] text-pink-300">sports_esports</span>
          </div>
          <div className="mt-4 font-display text-lg font-bold text-white">Game Porting</div>
          <div className="mt-2 text-xs font-semibold leading-relaxed text-white/55">
            Learn how to compile native games for the browser grid.
          </div>
          <div className="mt-4 text-xs font-bold text-pink-300">Start Porting →</div>
        </Card>

        <Card>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
            <span className="material-symbols-outlined text-[18px] text-amber-300">extension</span>
          </div>
          <div className="mt-4 font-display text-lg font-bold text-white">API Integration</div>
          <div className="mt-2 text-xs font-semibold leading-relaxed text-white/55">
            Connect your frontend apps to the distributed cluster.
          </div>
          <div className="mt-4 text-xs font-bold text-amber-300">See API →</div>
        </Card>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600/20 ring-1 ring-white/10">
              <span className="material-symbols-outlined text-[20px] text-purple-300">forum</span>
            </div>
            <div className="font-display text-2xl font-bold text-white">Join the Conversation</div>
          </div>

          <OutlineCard className="p-0">
            <div className="p-6">
              {[
                {
                  title: 'Best practices for WebAssembly memory management?',
                  meta: '12 replies • 2h ago • #performance',
                  body: "I'm trying to optimize a large C++ application port and running into some heap issues when scaling across nodes…",
                },
                {
                  title: 'Showcase: Running Doom 3 on the Nacho Grid',
                  meta: '45 likes • 5h ago • #showcase',
                  body: "Just finished the initial port and it's running at a steady 60fps across 3 worker nodes! Check out the demo link below…",
                },
                {
                  title: 'Help with authentication enclave setup',
                  meta: '7 replies • 1d ago • #support',
                  body: 'The local verify step is failing on macOS Sonoma. Has anyone encountered error code 0x442?',
                },
              ].map((post) => (
                <div key={post.title} className="rounded-2xl border border-white/10 bg-black/25 p-5 mb-4 last:mb-0">
                  <div className="font-display text-sm font-bold text-white">{post.title}</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/45">{post.meta}</div>
                  <div className="mt-3 text-xs font-semibold leading-relaxed text-white/55">{post.body}</div>
                </div>
              ))}
              <div className="mt-4 text-right">
                <button type="button" className="inline-flex items-center gap-2 text-xs font-bold text-[#60a5fa] hover:text-white">
                  View all discussions <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </OutlineCard>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <span className="material-symbols-outlined text-[20px] text-white/70">help</span>
            </div>
            <div className="font-display text-2xl font-bold text-white">Common Questions</div>
          </div>

          <div className="space-y-3">
            {[
              'Is Nacho free to use?',
              'Do I need to install anything?',
              'How secure is the grid?',
              'What languages are supported?',
            ].map((q) => (
              <details
                key={q}
                className="group rounded-2xl border border-white/12 bg-white/5 px-5 py-4 text-white/85 backdrop-blur"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  {q}
                  <span className="material-symbols-outlined text-[18px] text-white/50 transition group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div className="mt-3 text-xs font-semibold leading-relaxed text-white/55">
                  This is placeholder copy — we’ll wire real docs content and FAQ sources next.
                </div>
              </details>
            ))}

            <OutlineCard className="p-6">
              <div className="rounded-2xl bg-[#3b82f6]/90 p-6 shadow-[0_0_0_3px_rgba(255,255,255,0.85)]">
                <div className="font-display text-xl font-black text-white">Need more help?</div>
                <div className="mt-2 text-xs font-semibold leading-relaxed text-white/90">
                  Our support team is available 24/7 for grid issues.
                </div>
                <button
                  type="button"
                  className="mt-5 h-11 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)]"
                >
                  Contact Support
                </button>
              </div>
            </OutlineCard>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <OutlineCard className="p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="font-display text-3xl font-black text-white">Contribute to the Docs</div>
              <div className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-white/55">
                Spot a typo? Know a better way to do something? Our documentation is open source and community driven.
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/95"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit on GitHub
            </button>
          </div>
        </OutlineCard>
      </div>
    </div>
  );
}


