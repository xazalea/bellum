'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';
import { useCompute } from '@/components/providers/compute-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { FeaturedBanner } from '@/components/ui/featured-banner';
import { Gamepad2, UserPlus, Upload, Play, Cpu, Globe, Zap, ArrowRight } from 'lucide-react';

function buildFeaturedItems(recentGames: RecentGame[]) {
  const items = [];
  
  if (recentGames.length > 0) {
    const latest = recentGames[0];
    items.push({
      id: latest.id,
      title: latest.title,
      subtitle: 'Continue Playing',
      description: `Last played ${new Date(latest.playedAt).toLocaleDateString()}. Pick up where you left off.`,
      tags: ['Recent'],
      accentColor: 'hsl(0 80% 60% / 0.06)',
    });
  }
  
  items.push({
    id: 'platform-run',
    title: 'Run Anything',
    subtitle: 'Browser-Native Execution',
    description: 'Drop an APK or EXE and it runs natively in your browser via WebGL2 + Dalvik/x86 interpreter. No downloads, no installs.',
    tags: ['Platform'],
    accentColor: 'hsl(24 90% 55% / 0.04)',
  });

  items.push({
    id: 'platform-mesh',
    title: 'Mesh Compute',
    subtitle: 'Earn While Idle',
    description: 'Contribute idle browser power to the P2P mesh network. Earn compute tokens passively. Optional and transparent.',
    tags: ['Mesh'],
    accentColor: 'hsl(30 80% 65% / 0.04)',
  });
  
  return items;
}

function ParticleField() {
  const dots = useRef(
    Array.from({ length: 20 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      anim: [`particle-drift-${(Math.floor(Math.random() * 3) + 1)}`],
      duration: `${10 + Math.random() * 15}s`,
      delay: `${Math.random() * 8}s`,
      size: Math.random() > 0.7 ? '2px' : '1.5px',
      opacity: 0.2 + Math.random() * 0.3,
    }))
  );

  return (
    <div className="particle-field">
      {dots.current.map((d, i) => (
        <div
          key={i}
          className="dot"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            opacity: 0,
            animation: `${d.anim[0]} ${d.duration} ease-in-out ${d.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { root, run } = useAnimeScope();
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);
  const { balance, tier, streak, earningRate, isInitialized } = useCompute();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setRecentGames(getRecentlyPlayed().slice(0, 6));
  }, []);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="section"]', {
          translateY: [12, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(120, { from: 0, start: 200 }),
        });
        animate('[data-anime="recent-item"]', {
          scale: [0.96, 1], opacity: [0, 1], ease: spring({ bounce: 0.15 }), duration: dur.base,
          delay: stagger(60, { from: 0, start: 150 }),
        });
        animate('[data-anime="stat-card"]', {
          translateY: [8, 0], opacity: [0, 1], ease: ease.out, duration: dur.base,
          delay: stagger(50, { from: 'center', start: 400 }),
        });
        animate('[data-anime="feature-card"]', {
          translateY: [10, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(80, { from: 0, start: 500 }),
        });
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
    e.preventDefault(); setDragOver(false);
    if (dropZoneRef.current) animate(dropZoneRef.current, { scale: [1.005, 1], ease: spring({ bounce: 0.2 }), duration: dur.fast });
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragOver) { setDragOver(true); if (dropZoneRef.current) animate(dropZoneRef.current, { scale: 1.003, ease: spring({ bounce: 0.15 }), duration: dur.fast }); }
  }, [dragOver]);

  const onDragLeave = useCallback(() => {
    setDragOver(false); if (dropZoneRef.current) animate(dropZoneRef.current, { scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  const openRecent = useCallback((id: string) => {
    router.push(`/run?id=${encodeURIComponent(id)}`);
  }, [router]);

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -1, boxShadow: '0 2px 8px -2px hsl(var(--foreground) / 0.03)', ease: spring({ bounce: 0.1 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, boxShadow: '0 0 0 0 hsl(var(--foreground) / 0)', ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <div ref={root} className="min-h-screen">
      {/* Hero */}
      <FeaturedBanner
        items={buildFeaturedItems(recentGames)}
        onPlay={(id) => {
          if (id && id !== 'platform-run') {
            router.push(`/run?id=${encodeURIComponent(id)}`);
          } else {
            router.push('/games');
          }
        }}
        className="h-[320px] md:h-[400px]"
      />

      <div className="cd-container">
        {/* Quick Launch */}
        <div data-anime="section" style={{ opacity: 0 }} className="-mt-4 relative z-20 mb-8">
          <div
            ref={dropZoneRef}
            className={`relative glass-card-elevated rounded-md p-4 flex items-center gap-3 ${dragOver ? 'border-primary/20' : ''} cursor-pointer group premium-sweep`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".apk,.exe" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <div className="flex items-center justify-center w-9 h-9 rounded-md border border-border/50 bg-card/40 shrink-0 group-hover:border-primary/15 group-hover:bg-primary/5 transition-colors duration-300">
              <Upload size={14} className="text-muted-foreground/25 group-hover:text-primary/50 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-foreground tracking-tight">Quick Launch</p>
              <p className="text-[10px] text-muted-foreground/35 mt-0.5">Drop APK or EXE to run instantly</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="tag">.apk</span>
              <span className="tag">.exe</span>
              <Link href="/run" className="btn-primary text-[10px] h-7 px-3 btn-press" onClick={(e) => e.stopPropagation()}>
                <Play size={10} className="mr-1" />
                Run
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div data-anime="section" style={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: Gamepad2, title: 'Native Emulation', desc: 'APK & EXE run in-browser via WebGL2 + Dalvik/x86 interpreter', href: '/games' },
            { icon: Cpu, title: '40+ FPS', desc: 'Adaptive frame pacing with quality scaling ensures smooth gameplay', href: '/run' },
            { icon: Globe, title: 'Export to HTML', desc: 'Bundle any game into a single self-contained HTML file', href: '/run' },
          ].map((f) => (
            <Link
              key={f.title}
              href={f.href}
              data-anime="feature-card"
              style={{ opacity: 0 }}
              className="glass-card rounded-md p-4 group premium-sweep hover:border-primary/20 transition-colors"
              onMouseEnter={onCardEnter}
              onMouseLeave={onCardLeave}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                  <f.icon size={13} className="text-primary/50" />
                </div>
                <h3 className="text-[11px] font-semibold text-foreground tracking-tight">{f.title}</h3>
              </div>
              <p className="text-[10px] text-muted-foreground/40 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>

        {/* Token Stats (authenticated only) */}
        {isAuthenticated && isInitialized && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-8">
            <div className="glass-card rounded-md p-3">
              <div className="grid grid-cols-4 gap-2">
                <Link href="/referral" data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-2.5 rounded-md border border-border/20 hover:border-primary/15 hover:bg-primary/5 transition-all cursor-pointer">
                  <p className="text-lg font-bold tracking-tighter text-foreground">{Math.round(balance.tokens).toLocaleString()}</p>
                  <p className="text-[7px] text-muted-foreground/35 uppercase tracking-wider mt-0.5">Tokens</p>
                  <p className="text-[7px]" style={{ color: tier.color }}>{tier.name}</p>
                </Link>
                <div data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-2.5 rounded-md border border-border/20">
                  <p className="text-lg font-bold tracking-tighter text-foreground">{earningRate.tokensPerMinute.toFixed(1)}</p>
                  <p className="text-[7px] text-muted-foreground/35 uppercase tracking-wider mt-0.5">T/min</p>
                  <p className="text-[7px] text-primary/35">{earningRate.source}</p>
                </div>
                <div data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-2.5 rounded-md border border-border/20">
                  <p className="text-lg font-bold tracking-tighter text-foreground">{streak.currentStreak}d</p>
                  <p className="text-[7px] text-muted-foreground/35 uppercase tracking-wider mt-0.5">Streak</p>
                  <p className="text-[7px] text-primary/35">{streak.currentStreak >= 3 ? `${streak.currentStreak >= 30 ? '3.0' : streak.currentStreak >= 14 ? '2.0' : streak.currentStreak >= 7 ? '1.5' : '1.2'}x` : '—'}</p>
                </div>
                <Link href="/mesh" data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-2.5 rounded-md border border-primary/10 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <p className="text-lg font-bold tracking-tighter text-primary">{tier.maxMeshNodes}</p>
                  <p className="text-[7px] text-muted-foreground/35 uppercase tracking-wider mt-0.5">Nodes</p>
                  <p className="text-[7px] text-primary/40">Mesh →</p>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentGames.length > 0 && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-semibold text-foreground tracking-tight">Recent Sessions</h2>
              <Link href="/games" className="text-[9px] text-muted-foreground/40 hover:text-primary transition-colors flex items-center gap-1">
                Library <ArrowRight size={8} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  data-anime="recent-item"
                  style={{ opacity: 0 }}
                  className="glass-card rounded-md overflow-hidden cursor-pointer group premium-sweep"
                  onClick={() => openRecent(game.id)}
                  onMouseEnter={onCardEnter}
                  onMouseLeave={onCardLeave}
                >
                  <div className="aspect-video bg-card flex items-center justify-center overflow-hidden relative">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <Gamepad2 size={16} className="text-muted-foreground/15" />
                    )}
                    <div className="absolute inset-0 bg-background/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-7 h-7 rounded-full bg-background/70 flex items-center justify-center backdrop-blur-sm">
                        <Play size={11} className="text-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[9px] text-muted-foreground/50 truncate group-hover:text-foreground/60 transition-colors">{game.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div data-anime="section" style={{ opacity: 0 }} className="mb-8">
          <div className="glass-card-elevated rounded-md p-6 text-center relative overflow-hidden dot-grid">
            <ParticleField />
            <div className="relative z-10">
              <h2 className="text-base font-bold text-foreground tracking-tight mb-1.5">
                {isAuthenticated ? `Welcome back, ${user?.username}` : <span className="gradient-text">Run Anything In Your Browser</span>}
              </h2>
              <p className="text-[10px] text-muted-foreground/40 mb-4 max-w-sm mx-auto leading-relaxed">
                {isAuthenticated
                  ? 'You are earning compute tokens right now. Explore the mesh network or refer friends for bonus tokens.'
                  : 'No email. No password. Pick a username and your device fingerprint is your key. Start playing in seconds.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link href="/games" className="btn-primary text-[10px] h-8 px-5 btn-press">
                  <Upload size={12} className="mr-1.5" />
                  Upload APK or EXE
                </Link>
                {!isAuthenticated && (
                  <Link href="/login" className="btn-secondary text-[10px] h-8 px-5 btn-press">
                    <UserPlus size={12} className="mr-1.5" />
                    Sign Up
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
