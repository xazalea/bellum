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

const featuredItems = [
  {
    id: 'featured-1',
    title: 'Challenger Deep',
    subtitle: 'Browser Gaming Platform',
    description: 'Run Android APKs and Windows EXEs natively in your browser. No downloads, no installs, no plugins.',
    tags: ['Featured'],
    accentColor: 'hsl(250 60% 65% / 0.08)',
  },
  {
    id: 'featured-2',
    title: 'Mesh Compute',
    subtitle: 'Earn While Idle',
    description: 'Contribute idle browser power to the P2P mesh network. Earn compute tokens passively. Optional.',
    tags: ['Mesh'],
    accentColor: 'hsl(230 60% 60% / 0.06)',
  },
];

function ParticleField() {
  const dots = useRef(
    Array.from({ length: 30 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      anim: [`particle-drift-${(Math.floor(Math.random() * 3) + 1)}`],
      duration: `${8 + Math.random() * 12}s`,
      delay: `${Math.random() * 6}s`,
      size: Math.random() > 0.7 ? '3px' : '2px',
      opacity: 0.3 + Math.random() * 0.4,
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
          translateY: [20, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(150, { from: 0, start: 300 }),
        });
        animate('[data-anime="recent-item"]', {
          scale: [0.95, 1], opacity: [0, 1], ease: spring({ bounce: 0.2 }), duration: dur.base,
          delay: stagger(80, { from: 0, start: 200 }),
        });
        animate('[data-anime="stat-card"]', {
          translateY: [12, 0], opacity: [0, 1], ease: ease.out, duration: dur.base,
          delay: stagger(60, { from: 'center', start: 500 }),
        });
        animate('[data-anime="feature-card"]', {
          translateY: [16, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(100, { from: 0, start: 600 }),
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
    if (dropZoneRef.current) animate(dropZoneRef.current, { scale: [1.01, 1], ease: spring({ bounce: 0.3 }), duration: dur.fast });
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragOver) { setDragOver(true); if (dropZoneRef.current) animate(dropZoneRef.current, { scale: 1.005, ease: spring({ bounce: 0.2 }), duration: dur.fast }); }
  }, [dragOver]);

  const onDragLeave = useCallback(() => {
    setDragOver(false); if (dropZoneRef.current) animate(dropZoneRef.current, { scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  const openRecent = useCallback((id: string) => {
    router.push(`/run?id=${encodeURIComponent(id)}`);
  }, [router]);

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -3, boxShadow: '0 8px 24px -4px hsl(var(--foreground) / 0.08)', ease: spring({ bounce: 0.2 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, boxShadow: '0 0 0 0 hsl(var(--foreground) / 0)', ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <div ref={root} className="min-h-screen">
      {/* Hero */}
      <FeaturedBanner
        items={featuredItems}
        onPlay={() => router.push('/games')}
        className="h-[360px] md:h-[440px]"
      />

      <div className="cd-container">
        {/* Quick Launch */}
        <div data-anime="section" style={{ opacity: 0 }} className="-mt-6 relative z-20 mb-10">
          <div
            ref={dropZoneRef}
            className={`relative glass-card-elevated rounded-xl p-5 flex items-center gap-4 ${dragOver ? 'border-primary/30' : ''} cursor-pointer group premium-sweep`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".apk,.exe" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <div className="flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-card/60 shrink-0 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors duration-300">
              <Upload size={18} className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground tracking-tight">Quick Launch</p>
              <p className="text-[11px] text-muted-foreground/40 mt-0.5">Drop APK or EXE to run instantly — no install needed</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="tag">.apk</span>
              <span className="tag">.exe</span>
              <Link href="/run" className="btn-primary text-[11px] h-8 px-4 btn-press" onClick={(e) => e.stopPropagation()}>
                <Play size={12} className="mr-1.5" />
                Run
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div data-anime="section" style={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
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
              className="glass-card rounded-xl p-5 group premium-sweep hover:border-primary/20 transition-colors"
              onMouseEnter={onCardEnter}
              onMouseLeave={onCardLeave}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                  <f.icon size={16} className="text-primary/60" />
                </div>
                <h3 className="text-xs font-semibold text-foreground tracking-tight">{f.title}</h3>
              </div>
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>

        {/* Token Stats (authenticated only) */}
        {isAuthenticated && isInitialized && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-10">
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-4 gap-3">
                <Link href="/referral" data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-3 rounded-xl border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer">
                  <p className="text-xl font-bold tracking-tighter text-foreground">{Math.round(balance.tokens).toLocaleString()}</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider mt-0.5">Tokens</p>
                  <p className="text-[7px]" style={{ color: tier.color }}>{tier.name}</p>
                </Link>
                <div data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-3 rounded-xl border border-border/30">
                  <p className="text-xl font-bold tracking-tighter text-foreground">{earningRate.tokensPerMinute.toFixed(1)}</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider mt-0.5">T/min</p>
                  <p className="text-[7px] text-primary/40">{earningRate.source}</p>
                </div>
                <div data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-3 rounded-xl border border-border/30">
                  <p className="text-xl font-bold tracking-tighter text-foreground">{streak.currentStreak}d</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider mt-0.5">Streak</p>
                  <p className="text-[7px] text-primary/40">{streak.currentStreak >= 3 ? `${streak.currentStreak >= 30 ? '3.0' : streak.currentStreak >= 14 ? '2.0' : streak.currentStreak >= 7 ? '1.5' : '1.2'}x` : '—'}</p>
                </div>
                <Link href="/mesh" data-anime="stat-card" style={{ opacity: 0 }} className="text-center p-3 rounded-xl border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <p className="text-xl font-bold tracking-tighter text-primary">{tier.maxMeshNodes}</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider mt-0.5">Nodes</p>
                  <p className="text-[7px] text-primary/50">Mesh →</p>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentGames.length > 0 && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Recent Sessions</h2>
              <Link href="/games" className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1">
                Library <ArrowRight size={10} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  data-anime="recent-item"
                  style={{ opacity: 0 }}
                  className="glass-card rounded-xl overflow-hidden cursor-pointer group premium-sweep"
                  onClick={() => openRecent(game.id)}
                  onMouseEnter={onCardEnter}
                  onMouseLeave={onCardLeave}
                >
                  <div className="aspect-video bg-card flex items-center justify-center overflow-hidden relative">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <Gamepad2 size={20} className="text-muted-foreground/20" />
                    )}
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-background/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center backdrop-blur-sm">
                        <Play size={14} className="text-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground/70 transition-colors">{game.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div data-anime="section" style={{ opacity: 0 }} className="mb-10">
          <div className="glass-card-elevated rounded-xl p-8 text-center relative overflow-hidden">
            <ParticleField />
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
                {isAuthenticated ? `Welcome back, ${user?.username}` : <span className="gradient-text">Run Anything In Your Browser</span>}
              </h2>
              <p className="text-[11px] text-muted-foreground/50 mb-5 max-w-md mx-auto leading-relaxed">
                {isAuthenticated
                  ? 'You are earning compute tokens right now. Explore the mesh network or refer friends for bonus tokens.'
                  : 'No email. No password. Pick a username and your device fingerprint is your key. Start playing in seconds.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/games" className="btn-primary text-[11px] h-9 px-6 btn-press">
                  <Upload size={14} className="mr-1.5" />
                  Upload APK or EXE
                </Link>
                {!isAuthenticated && (
                  <Link href="/login" className="btn-secondary text-[11px] h-9 px-6 btn-press">
                    <UserPlus size={14} className="mr-1.5" />
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
