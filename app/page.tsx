'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecentlyPlayed, type RecentGame } from '@/lib/recently-played';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';
import { useCompute } from '@/components/providers/compute-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { FeaturedBanner } from '@/components/ui/featured-banner';
import { Gamepad2, UserPlus, Upload } from 'lucide-react';

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
    animate(e.currentTarget, { translateY: -2, ease: spring({ bounce: 0.2 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  return (
    <div ref={root} className="min-h-screen">
      {/* Hero */}
      <FeaturedBanner
        items={featuredItems}
        onPlay={() => router.push('/games')}
        className="h-[360px] md:h-[420px]"
      />

      <div className="cd-container">
        {/* Quick Launch */}
        <div data-anime="section" style={{ opacity: 0 }} className="-mt-6 relative z-20 mb-10">
          <div
            ref={dropZoneRef}
            className={`relative glass-card rounded-xl p-4 flex items-center gap-4 ${dragOver ? 'border-primary/30' : ''} cursor-pointer group`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".apk,.exe" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Quick Launch</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Drop APK or EXE to run instantly</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="tag">.apk</span>
              <span className="tag">.exe</span>
              <Link href="/run" className="btn-primary text-[10px] h-7 px-3" onClick={(e) => e.stopPropagation()}>Run</Link>
            </div>
          </div>
        </div>

        {/* Token Stats (authenticated only) */}
        {isAuthenticated && isInitialized && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-10">
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-4 gap-3">
                <Link href="/referral" className="text-center p-2 rounded-lg border border-border/30 hover:border-primary/20 transition-colors">
                  <p className="text-lg font-bold tracking-tighter text-foreground">{Math.round(balance.tokens).toLocaleString()}</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Tokens</p>
                  <p className="text-[7px]" style={{ color: tier.color }}>{tier.name}</p>
                </Link>
                <div className="text-center p-2 rounded-lg border border-border/30">
                  <p className="text-lg font-bold tracking-tighter text-foreground">{earningRate.tokensPerMinute.toFixed(1)}</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">T/min</p>
                  <p className="text-[7px] text-primary/40">{earningRate.source}</p>
                </div>
                <div className="text-center p-2 rounded-lg border border-border/30">
                  <p className="text-lg font-bold tracking-tighter text-foreground">{streak.currentStreak}d</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Streak</p>
                  <p className="text-[7px] text-primary/40">{streak.currentStreak >= 3 ? `${streak.currentStreak >= 30 ? '3.0' : streak.currentStreak >= 14 ? '2.0' : streak.currentStreak >= 7 ? '1.5' : '1.2'}x` : '—'}</p>
                </div>
                <Link href="/mesh" className="text-center p-2 rounded-lg border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <p className="text-lg font-bold tracking-tighter text-primary">{tier.maxMeshNodes}</p>
                  <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider">Nodes</p>
                  <p className="text-[7px] text-primary/50">Mesh →</p>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentGames.length > 0 && (
          <div data-anime="section" style={{ opacity: 0 }} className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Recent Sessions</h2>
              <Link href="/games" className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">Library →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  data-anime="recent-item"
                  style={{ opacity: 0 }}
                  className="glass-card rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => openRecent(game.id)}
                  onMouseEnter={onCardEnter}
                  onMouseLeave={onCardLeave}
                >
                  <div className="aspect-video bg-card flex items-center justify-center overflow-hidden">
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <Gamepad2 size={20} className="text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground/70 transition-colors">{game.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div data-anime="section" style={{ opacity: 0 }} className="mb-10">
          <div className="glass-card rounded-xl p-6 text-center">
            <h2 className="text-base font-semibold text-foreground tracking-tight mb-1">
              {isAuthenticated ? `Welcome back, ${user?.username}` : 'Start Playing Now'}
            </h2>
            <p className="text-[11px] text-muted-foreground/50 mb-4 max-w-sm mx-auto">
              {isAuthenticated
                ? 'You are earning compute tokens right now. Explore the mesh network or refer friends for bonus tokens.'
                : 'No email. No password. Pick a username and your device fingerprint is your key.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/games" className="btn-primary text-[11px] h-8 px-5">
                <Upload size={14} className="mr-1.5" />
                Upload APK or EXE
              </Link>
              {!isAuthenticated && (
                <Link href="/login" className="btn-secondary text-[11px] h-8 px-5">
                  <UserPlus size={14} className="mr-1.5" />
                  Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}