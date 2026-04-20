'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecentlyPlayed, addRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';
import { GameCard } from '@/components/ui/game-card';
import { FeaturedBanner } from '@/components/ui/featured-banner';
import { AchievementCard, type Achievement } from '@/components/ui/achievement-card';

interface Game { id: string; title: string; thumbnail: string; url: string; platform?: string; }

const featuredItems = [
  {
    id: 'featured-1',
    title: 'Browser Gaming',
    subtitle: 'Reimagined',
    description: 'Run Android APKs and Windows EXEs natively in your browser at 40+ FPS. No downloads, no installs, no plugins — just play.',
    tags: ['Featured', 'New'],
    accentColor: 'hsl(45 100% 51% / 0.12)',
  },
  {
    id: 'featured-2',
    title: 'HTML Export',
    subtitle: 'One File. Zero Dependencies.',
    description: 'Convert any APK or EXE to a self-contained HTML file. Embedded runtime, compressed assets, shareable anywhere.',
    tags: ['Export', 'Self-Contained'],
    accentColor: 'hsl(142 71% 45% / 0.10)',
  },
  {
    id: 'featured-3',
    title: '40+ FPS',
    subtitle: 'In-Browser Performance',
    description: 'Adaptive frame pacing with WebGL2 pipeline, zero-copy texture uploads, and dynamic instruction batching for buttery-smooth gameplay.',
    tags: ['Performance', 'WebGL2'],
    accentColor: 'hsl(220 100% 55% / 0.10)',
  },
];

const defaultAchievements: Achievement[] = [
  { id: 'a1', title: 'First Launch', description: 'Run your first APK or EXE', icon: 'rocket_launch', unlocked: true, rarity: 'common', unlockedAt: 'Today' },
  { id: 'a2', title: 'Speed Demon', description: 'Hit 60 FPS during gameplay', icon: 'speed', unlocked: false, rarity: 'rare', progress: 0, maxProgress: 1 },
  { id: 'a3', title: 'Exporter', description: 'Export 5 apps to HTML', icon: 'upload_file', unlocked: false, rarity: 'epic', progress: 1, maxProgress: 5 },
  { id: 'a4', title: 'Library Builder', description: 'Play 25 different games', icon: 'library_add', unlocked: false, rarity: 'rare', progress: 3, maxProgress: 25 },
  { id: 'a5', title: 'No Install Hero', description: 'Play 100 games without installing anything', icon: 'cloud_done', unlocked: false, rarity: 'legendary', progress: 3, maxProgress: 100 },
  { id: 'a6', title: 'Night Owl', description: 'Play between midnight and 5am', icon: 'dark_mode', unlocked: false, rarity: 'common' },
];

export default function HomePage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [achievements, setAchievements] = useState(defaultAchievements);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { root, run } = useAnimeScope();
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    setRecentGames(getRecentlyPlayed().slice(0, 8));

    // Load trending games
    async function loadTrending() {
      try {
        const res = await fetch('/api/games?page=1&limit=12');
        if (res.ok) {
          const data = await res.json();
          setTrendingGames((data.games || []).slice(0, 12).map((g: Record<string, unknown>, idx: number) => ({
            id: String(g.id ?? g.game_id ?? `game-${idx}`),
            title: String(g.title ?? g.name ?? 'Untitled'),
            thumbnail: String(g.thumbnail ?? g.image ?? ''),
            url: String(g.url ?? g.game_url ?? ''),
            platform: g.platform ? String(g.platform) : undefined,
          })));
        }
      } catch { /* empty */ }
    }
    loadTrending();

    // Load achievements from localStorage
    try {
      const stored = localStorage.getItem('bellum-achievements');
      if (stored) setAchievements(JSON.parse(stored));
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="section"]', {
          translateY: [24, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.reveal,
          delay: stagger(200, { from: 0, start: 400 }),
        });
        animate('[data-anime="stat"]', {
          translateY: [10, 0],
          opacity: [0, 1],
          ease: ease.out,
          duration: dur.base,
          delay: stagger(100, { from: 0, start: 600 }),
        });
        self!.add('animateCounters', () => {
          const stat40 = document.querySelector('[data-anime="stat-40"]');
          if (stat40) {
            animate(stat40, {
              innerHTML: [0, 40],
              round: 1,
              ease: ease.outExpo,
              duration: 1200,
              delay: 400,
              onComplete: () => { stat40.textContent = '40+'; },
            });
          }
          const stat0 = document.querySelector('[data-anime="stat-0"]');
          if (stat0) animate(stat0, { innerHTML: [0, 0], round: 1, duration: 1, delay: 600 });
          const stat1 = document.querySelector('[data-anime="stat-1"]');
          if (stat1) animate(stat1, { innerHTML: [0, 1], round: 1, ease: ease.outExpo, duration: 600, delay: 700 });
        });
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              self!.methods.animateCounters();
              observer.disconnect();
            }
          });
        }, { threshold: 0.3 });
        const statsSection = document.querySelector('[data-anime="stats-section"]');
        if (statsSection) observer.observe(statsSection);
      });
    });
  }, [run]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'apk' || ext === 'exe') {
      window.location.href = `/run?file=${encodeURIComponent(file.name)}`;
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (dropZoneRef.current) animate(dropZoneRef.current, { scale: [1.02, 1], ease: spring({ bounce: 0.4 }), duration: dur.fast });
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragOver) {
      setDragOver(true);
      if (dropZoneRef.current) animate(dropZoneRef.current, { scale: 1.01, ease: spring({ bounce: 0.3 }), duration: dur.fast });
    }
  }, [dragOver]);

  const onDragLeave = useCallback(() => {
    setDragOver(false);
    if (dropZoneRef.current) animate(dropZoneRef.current, { scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  const onFeatureEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -2, ease: spring({ bounce: 0.2, stiffness: 200, damping: 12 }), duration: dur.fast });
  }, []);
  const onFeatureLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  const router = useRouter();
  const openGame = useCallback((id: string) => {
    const game = trendingGames.find(g => g.id === id);
    if (game) addRecentlyPlayed({ id: game.id, title: game.title, thumbnail: game.thumbnail });
    router.push(`/games/${id}`);
  }, [trendingGames, router]);

  const features = [
    { icon: 'phone_android', title: 'Android Runtime', description: 'Custom Dalvik interpreter with DEX parsing, JIT to WASM, and WebGL2-accelerated rendering.', accent: 'hsl(142 71% 45%)' },
    { icon: 'computer', title: 'Windows Runtime', description: 'x86 instruction decoder with PE loader, Win32 API emulation, and GDI→Canvas rendering.', accent: 'hsl(220 100% 55%)' },
    { icon: 'upload_file', title: 'HTML Export', description: 'Convert any APK or EXE to a self-contained HTML file. Embedded runtime, zero dependencies.', accent: 'hsl(45 100% 51%)' },
    { icon: 'bolt', title: '40+ FPS', description: 'Adaptive frame pacing with dynamic instruction batching. WebGL2 pipeline with zero-copy texture uploads.', accent: 'hsl(0 84% 60%)' },
    { icon: 'shield', title: 'Sandboxed', description: 'Browser-native isolation. No native plugins, no server-side execution. Everything runs client-side.', accent: 'hsl(280 80% 60%)' },
    { icon: 'language', title: 'Web Native', description: 'No downloads, no installs. Works on any modern browser with WebGL2. Desktop, mobile, ChromeOS.', accent: 'hsl(180 100% 40%)' },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div ref={root} className="min-h-screen">
      {/* Hero — Featured Banner */}
      <FeaturedBanner
        items={featuredItems}
        onPlay={() => router.push('/run')}
        className="h-[420px] md:h-[480px]"
      />

      <div className="cd-container">
        {/* Quick Launch Drop Zone */}
        <div data-anime="section" style={{ opacity: 0 }} className="-mt-8 relative z-20 mb-12">
          <div
            ref={dropZoneRef}
            className={`relative glass-card rounded-xl p-6 flex items-center gap-6 ${dragOver ? 'border-primary/40' : ''} cursor-pointer group`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".apk,.exe" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <div className="flex items-center justify-center w-12 h-12 rounded-lg border border-border bg-card shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Quick Launch</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Drop APK or EXE to run instantly — or click to browse</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="tag">.apk</span>
              <span className="tag">.exe</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/run" className="btn-primary text-[10px] h-7 px-3" onClick={(e) => e.stopPropagation()}>Run APK</Link>
              <Link href="/run" className="btn-secondary text-[10px] h-7 px-3" onClick={(e) => e.stopPropagation()}>Run EXE</Link>
            </div>
          </div>
        </div>

        {/* Recently Played */}
        {recentGames.length > 0 && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Continue Playing</h2>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Pick up where you left off</p>
              </div>
              <Link href="/games" className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors">View Library →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {recentGames.map((game) => (
                <Link key={game.id} href={`/games/${game.id}`} className="group block rounded-lg border border-border/50 hover:border-primary/20 overflow-hidden glass-card">
                  <div className="aspect-video bg-card flex items-center justify-center overflow-hidden">
                    {game.thumbnail ? <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <span className="text-muted-foreground/20 text-[10px]">▶</span>}
                  </div>
                  <div className="px-2 py-1.5"><p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground/70">{game.title}</p></div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending Games */}
        {trendingGames.length > 0 && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Trending</h2>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Popular right now</p>
              </div>
              <Link href="/games" className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors">Browse All →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {trendingGames.slice(0, 6).map((game) => (
                <GameCard key={game.id} id={game.id} title={game.title} thumbnail={game.thumbnail} platform={game.platform} onClick={openGame} />
              ))}
            </div>
          </div>
        )}

        {/* Achievements Preview */}
        <div data-anime="section" style={{ opacity: 0 }} className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Achievements</h2>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{unlockedCount}/{achievements.length} unlocked</p>
            </div>
            <Link href="/dashboard" className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors">View All →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {achievements.slice(0, 6).map((a) => (
              <AchievementCard key={a.id} achievement={a} compact />
            ))}
          </div>
        </div>

        {/* Platform Features */}
        <div data-anime="section" style={{ opacity: 0 }} className="mb-12">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Platform</h2>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Browser-native execution engine for Android and Windows binaries</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/50 rounded-lg overflow-hidden">
            {features.map((f) => (
              <div key={f.title} className="bg-background p-5 group relative" onMouseEnter={onFeatureEnter} onMouseLeave={onFeatureLeave}>
                <div className="absolute top-0 left-0 w-0.5 h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: f.accent }} />
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" style={{ fontSize: 20 }}>{f.icon}</span>
                  <h3 className="text-xs font-medium text-foreground">{f.title}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed pl-8">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div data-anime="stats-section" className="mb-12">
          <div className="glass-card rounded-xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div data-anime="stat" style={{ opacity: 0 }}>
                <p className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground" data-anime="stat-40">0</p>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-1">FPS Target</p>
                <p className="text-[9px] text-muted-foreground/30 mt-0.5">Buttery smooth</p>
              </div>
              <div data-anime="stat" style={{ opacity: 0 }}>
                <p className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground" data-anime="stat-0">0</p>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-1">Dependencies</p>
                <p className="text-[9px] text-muted-foreground/30 mt-0.5">Zero install</p>
              </div>
              <div data-anime="stat" style={{ opacity: 0 }}>
                <p className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground" data-anime="stat-1">0</p>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-1">File Export</p>
                <p className="text-[9px] text-muted-foreground/30 mt-0.5">Self-contained HTML</p>
              </div>
              <div data-anime="stat" style={{ opacity: 0 }}>
                <p className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground">∞</p>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-1">Browser Native</p>
                <p className="text-[9px] text-muted-foreground/30 mt-0.5">Any device, anywhere</p>
              </div>
            </div>
          </div>
        </div>

        {/* Competitive Edge — Why Bellum vs GeForce Now / Steam */}
        <div data-anime="section" style={{ opacity: 0 }} className="mb-12">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Why Bellum</h2>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">vs. GeForce Now · vs. Steam</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: 'wifi_off', title: 'No Server Required', desc: 'Unlike GeForce Now, games run locally in your browser. Zero latency from server round-trips. No subscription needed.', vs: 'GeForce Now: Cloud-dependent, subscription required' },
              { icon: 'lock_open', title: 'No DRM, No Install', desc: 'Unlike Steam, there\'s nothing to install. No DRM. No storefront lock-in. Just open and play.', vs: 'Steam: Requires desktop app, DRM-locked' },
              { icon: 'share', title: 'Instantly Shareable', desc: 'Export any game as a single HTML file. Share via link, email, USB. No account required to play.', vs: 'Both: Require accounts, installs, or subscriptions' },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-lg p-5" onMouseEnter={onFeatureEnter} onMouseLeave={onFeatureLeave}>
                <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 22 }}>{item.icon}</span>
                <h3 className="text-xs font-medium text-foreground mt-3 mb-1">{item.title}</h3>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{item.desc}</p>
                <p className="text-[10px] text-muted-foreground/30 mt-2 border-t border-border/50 pt-2">{item.vs}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
