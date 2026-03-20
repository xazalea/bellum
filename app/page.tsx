'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BentoGrid, BentoItem } from '@/components/ui/bento-grid';
import { GlassCard } from '@/components/ui/glass-card';
import { GameGrid } from '@/components/game/game-grid';
import { Button } from '@/components/ui/button';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import {
  Gamepad2,
  Smartphone,
  Monitor,
  ArrowRight,
  Zap,
  Clock,
  Upload,
  Activity,
  Users,
} from 'lucide-react';

// ─── Hero bento item ───────────────────────────────────────────────────────────
function HeroItem() {
  return (
    <div
      className="h-full flex flex-col justify-between p-6 md:p-8 relative overflow-hidden min-h-[320px]"
      style={{
        background:
          'radial-gradient(ellipse 120% 100% at 50% -20%, hsl(var(--primary)/0.08) 0%, transparent 60%)',
      }}
    >
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/35 bg-primary/08 text-primary text-xs font-medium w-fit mb-4"
        style={{ backgroundColor: 'hsl(var(--primary)/0.08)' }}
      >
        <Zap className="h-3 w-3" />
        Edge-powered · Zero installs · Instant play
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.08] tracking-tight text-foreground mb-4">
          Play{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-[hsl(var(--primary)/0.7)]">
            Any Game
          </span>
          <br />
          On Any Device
        </h1>

        <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed mb-6">
          HTML5 games, Android APKs, and Windows EXEs — all running instantly in your browser
          through our global edge network. No downloads. No plugins. No waiting.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/games">
            <Button
              size="lg"
              className="text-sm px-6 h-11 shadow-lg shadow-primary/25 hover:shadow-primary/45 transition-shadow duration-200 font-semibold"
            >
              Browse Games <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/run">
            <Button variant="outline" size="lg" className="text-sm px-6 h-11">
              <Smartphone className="mr-2 h-4 w-4" /> Run APK
            </Button>
          </Link>
          <Link href="/run">
            <Button variant="outline" size="lg" className="text-sm px-6 h-11">
              <Monitor className="mr-2 h-4 w-4" /> Run EXE
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-8 mt-8 pt-6 border-t border-border/40">
        {[
          { val: '20,865', label: 'Games' },
          { val: '3', label: 'Platforms' },
          { val: 'Edge', label: 'Powered' },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-2xl font-bold text-primary">{s.val}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats widget ──────────────────────────────────────────────────────────────
function StatsItem() {
  return (
    <GlassCard padding="md" goldBorder className="h-full flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Platform Stats
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {[
          { val: '20,865', label: 'Games' },
          { val: '3', label: 'Platforms' },
          { val: '<50ms', label: 'Latency' },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="text-lg font-bold text-primary">{s.val}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Quick Drop widget ─────────────────────────────────────────────────────────
function QuickDropItem() {
  return (
    <Link href="/run" className="block h-full">
      <GlassCard
        padding="md"
        className="h-full flex flex-col items-center justify-center gap-3 text-center group hover:border-primary/40 transition-colors duration-200"
      >
        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center group-hover:bg-primary/18 transition-colors duration-200">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Drop APK / EXE</p>
          <p className="text-xs text-muted-foreground mt-0.5">Run any binary in your browser</p>
        </div>
        <div className="flex gap-2 mt-1">
          {['APK', 'EXE'].map((f) => (
            <span
              key={f}
              className="px-2 py-0.5 rounded-full text-xs font-mono border border-primary/30 bg-primary/5 text-primary"
            >
              {f}
            </span>
          ))}
        </div>
      </GlassCard>
    </Link>
  );
}

// ─── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({
  href,
  icon: Icon,
  iconBg,
  title,
  desc,
  cta,
}: {
  href: string;
  icon: React.ElementType;
  iconBg: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <GlassCard
        padding="md"
        className="h-full flex flex-col group hover:ring-2 hover:ring-primary/35 transition-all duration-200"
      >
        <div
          className={`h-11 w-11 rounded-lg ${iconBg} flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed flex-1">{desc}</p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-4">
          {cta}
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </GlassCard>
    </Link>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);

  useEffect(() => {
    setRecentGames(getRecentlyPlayed().slice(0, 6));
  }, []);

  const bentoItems: BentoItem[] = [
    {
      colSpan: 4,
      rowSpan: 2,
      content: <HeroItem />,
    },
    {
      colSpan: 2,
      rowSpan: 1,
      content: <StatsItem />,
    },
    {
      colSpan: 2,
      rowSpan: 1,
      content: <QuickDropItem />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Global primary radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% -20%, hsl(var(--primary)/0.06) 0%, transparent 60%)',
        }}
      />

      <div className="cd-container py-8 md:py-12 relative">
        {/* ── Bento hero grid ── */}
        <BentoGrid items={bentoItems} />

        {/* ── Recently played ── */}
        {recentGames.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Continue Playing</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:ring-1 hover:ring-primary/25 hover:shadow-lg"
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    {game.thumbnail ? (
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium truncate text-foreground">{game.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="py-4" />

        {/* ── Featured Games ── */}
        <section className="mt-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Featured Games</h2>
              <p className="text-muted-foreground text-sm mt-0.5">Click any game to play instantly</p>
            </div>
            <Link href="/games">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-primary"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <GameGrid limit={12} />
        </section>

        <div className="py-4" />

        {/* ── Platform cards ── */}
        <section className="mt-4">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-foreground">One Platform. Every Runtime.</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">Three game formats, three dedicated runtimes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PlatformCard
              href="/games"
              icon={Gamepad2}
              iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
              title="HTML5 Games"
              desc="Thousands of browser games delivered through our Cloudflare edge proxy for sub-second load times worldwide."
              cta="Open Library"
            />
            <PlatformCard
              href="/run"
              icon={Smartphone}
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
              title="Android APK"
              desc="Upload any Android APK and run it in the browser via our custom WebAssembly-compiled Android runtime."
              cta="Run APK"
            />
            <PlatformCard
              href="/run"
              icon={Monitor}
              iconBg="bg-gradient-to-br from-orange-500 to-red-600"
              title="Windows EXE"
              desc="Execute Windows binaries in your browser using our x86-to-WebAssembly JIT translation pipeline."
              cta="Run EXE"
            />
          </div>
        </section>

        <div className="py-4" />

        {/* ── Bottom CTA ── */}
        <section className="mt-4 mb-8">
          <div className="relative overflow-hidden rounded-2xl p-10 md:p-14 text-center"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--card)) 50%, hsl(var(--primary)/0.08) 100%)',
              border: '1px solid hsl(var(--primary)/0.2)',
            }}
          >
            {/* Primary shimmer accent */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary)/0.12) 0%, transparent 70%)',
              }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 text-primary text-xs font-medium mb-6"
                style={{ backgroundColor: 'hsl(var(--primary)/0.08)' }}
              >
                <Zap className="h-3 w-3" />
                Ready to Play?
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Start playing in{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-[hsl(var(--primary)/0.7)]">
                  seconds
                </span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Browse 20,865+ games or upload your own APK or EXE and start playing instantly —
                no account required.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/games">
                  <Button
                    size="lg"
                    className="font-semibold shadow-lg shadow-primary/30"
                  >
                    Start Playing
                  </Button>
                </Link>
                <Link href="/run">
                  <Button variant="outline" size="lg" className="border-primary/30 hover:border-primary/60">
                    <Upload className="mr-2 h-4 w-4" /> Upload Binary
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
