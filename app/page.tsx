'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GameGrid } from '@/components/game/game-grid';
import { Button } from '@/components/ui/button';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import { Gamepad2, Smartphone, Monitor, ArrowRight, Zap, Clock } from 'lucide-react';

export default function HomePage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);

  useEffect(() => {
    setRecentGames(getRecentlyPlayed().slice(0, 6));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary)/0.18) 0%, transparent 70%)',
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" />

        <div className="cd-container relative w-full py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
              <Zap className="h-3.5 w-3.5" />
              Edge-powered · Zero installs · Instant play
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground">
              Play{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-400 to-purple-500">
                Any Game
              </span>
              <br />
              On Any Device
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              HTML5 games, Android APKs, and Windows EXEs — all running
              instantly in your browser through our global edge network.
              No downloads. No plugins. No waiting.
            </p>

            <div className="flex flex-wrap gap-3 mt-10">
              <Link href="/games">
                <Button size="lg" className="text-base px-7 h-12 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow duration-200">
                  Browse Games <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/android">
                <Button variant="outline" size="lg" className="text-base px-7 h-12">
                  <Smartphone className="mr-2 h-4 w-4" /> Run APK
                </Button>
              </Link>
              <Link href="/windows">
                <Button variant="outline" size="lg" className="text-base px-7 h-12">
                  <Monitor className="mr-2 h-4 w-4" /> Run EXE
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-10 mt-16">
              {[
                { val: '10,000+', label: 'Games' },
                { val: '3', label: 'Platforms' },
                { val: 'Edge', label: 'Powered' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-bold text-foreground">{s.val}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recently Played */}
      {recentGames.length > 0 && (
        <section className="py-10 border-t border-border/50">
          <div className="cd-container">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Continue Playing</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
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
          </div>
        </section>
      )}

      {/* Featured Games */}
      <section className="py-14">
        <div className="cd-container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Games</h2>
              <p className="text-muted-foreground text-sm mt-1">Click any game to play instantly</p>
            </div>
            <Link href="/games">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <GameGrid limit={12} />
        </div>
      </section>

      {/* Platform Cards */}
      <section className="py-16 border-t border-border/50">
        <div className="cd-container">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground">One Platform. Every Runtime.</h2>
            <p className="text-muted-foreground mt-2 text-sm">Three game formats, three dedicated runtimes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                href: '/games',
                icon: Gamepad2,
                iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
                title: 'HTML5 Games',
                desc: 'Thousands of browser games delivered through our Cloudflare edge proxy for sub-second load times worldwide.',
                cta: 'Open Library',
              },
              {
                href: '/android',
                icon: Smartphone,
                iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
                title: 'Android APK',
                desc: 'Upload any Android APK and run it in the browser via our custom WebAssembly-compiled Android runtime.',
                cta: 'Run APK',
              },
              {
                href: '/windows',
                icon: Monitor,
                iconBg: 'bg-gradient-to-br from-orange-500 to-red-600',
                title: 'Windows EXE',
                desc: 'Execute Windows binaries in your browser using our x86-to-WebAssembly JIT translation pipeline.',
                cta: 'Run EXE',
              },
            ].map((p) => (
              <Link key={p.href} href={p.href} className="group block">
                <div className="h-full rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
                  <div className={`h-11 w-11 rounded-lg ${p.iconBg} flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-105`}>
                    <p.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{p.desc}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {p.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16">
        <div className="cd-container">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-primary to-purple-700 p-10 md:p-14 text-center">
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-3">Ready to Play?</h2>
              <p className="text-white/75 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Browse 10,000+ games or upload your own APK or EXE and start playing in seconds.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/games">
                  <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow-lg">
                    Start Playing
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
