'use client';

import Link from 'next/link';
import { GameGrid } from '@/components/game/game-grid';
import { Button } from '@/components/ui/button';
import { Gamepad2, Cpu, Smartphone, Monitor, ArrowRight, Zap, Globe, Shield, Clock, ChevronRight } from 'lucide-react';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);

  useEffect(() => {
    setRecentGames(getRecentlyPlayed().slice(0, 6));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.03] dark:opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container-max relative py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-3.5 w-3.5" />
              Now with 42 built-in themes
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight">
              Play{' '}
              <span className="text-gradient">Any Game</span>
              <br />
              On Any Device
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              HTML5 games, Android APKs, and Windows EXEs — all running
              instantly in your browser. No downloads, no installs.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/games">
                <Button size="lg" className="text-base px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                  Browse Games <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/android">
                <Button variant="outline" size="lg" className="text-base px-6">
                  Run APK
                </Button>
              </Link>
              <Link href="/windows">
                <Button variant="outline" size="lg" className="text-base px-6">
                  Run EXE
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg">
            {[{ val: '1000+', label: 'Games' }, { val: '3', label: 'Platforms' }, { val: '<1s', label: 'Load Time' }].map(s => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-primary">{s.val}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Played */}
      {recentGames.length > 0 && (
        <section className="py-10">
          <div className="container-max">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-bold">Continue Playing</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentGames.map(game => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="group block overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    {game.thumbnail ? (
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{game.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Games */}
      <section className="py-12">
        <div className="container-max">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Featured Games</h2>
              <p className="text-muted-foreground text-sm mt-1">Jump right in — click any game to play</p>
            </div>
            <Link href="/games">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <GameGrid limit={10} />
        </div>
      </section>

      {/* Platforms */}
      <section className="py-16 bg-muted/40">
        <div className="container-max">
          <h2 className="text-2xl font-bold text-center mb-10">One Platform, Every Runtime</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { href: '/games', icon: Gamepad2, gradient: 'bg-gradient-blue-purple', title: 'HTML5 Games', desc: 'Thousands of browser games loaded through our edge proxy for instant, smooth gameplay.' },
              { href: '/android', icon: Smartphone, gradient: 'bg-gradient-green-blue', title: 'Android APKs', desc: 'Upload and run Android applications compiled to WebAssembly through our custom runtime.' },
              { href: '/windows', icon: Monitor, gradient: 'bg-gradient-orange-red', title: 'Windows EXEs', desc: 'Run Windows executables in the browser using our x86-to-WASM translation pipeline.' },
            ].map(p => (
              <Link key={p.href} href={p.href} className="group block">
                <div className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/30 h-full">
                  <div className={`h-12 w-12 rounded-lg ${p.gradient} flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110`}>
                    <p.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-1">
                    {p.title}
                    <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
                  </h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container-max">
          <h2 className="text-2xl font-bold text-center mb-10">Built for Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: 'Instant Play', desc: 'No downloads — games start in under a second' },
              { icon: Globe, title: 'Edge Proxy', desc: 'Games load through Almostnode on Cloudflare edge' },
              { icon: Cpu, title: 'WASM Runtime', desc: 'Binary translation compiles APK/EXE to WebAssembly' },
              { icon: Shield, title: 'Sandboxed', desc: 'All code runs in secure, isolated environments' },
            ].map(f => (
              <div key={f.title} className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 transition-transform duration-200 hover:scale-110">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container-max">
          <div className="bg-gradient-blue-purple rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-3">Ready to Play?</h2>
              <p className="text-white/80 mb-6 max-w-lg mx-auto">
                Browse our library or upload your own APK/EXE to start playing now.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/games">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
                    Start Playing
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline" size="lg" className="text-white border-white/30 hover:bg-white/10">
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
