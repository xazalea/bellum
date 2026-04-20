'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { addRecentlyPlayed, getRecentlyPlayed } from '@/lib/recently-played';
import { getGameProxyUrl } from '@/lib/api/games';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAnimeScope, animate, spring, ease, dur } from '@/lib/hooks/use-anime';

interface GameDetail { id: string; title: string; thumbnail: string; url: string; type: string; width: number; height: number; }
type PlayState = 'idle' | 'loading' | 'playing' | 'error';

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [fps, setFps] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fpsFrameCount = useRef(0);
  const fpsLastTime = useRef(0);
  const rafId = useRef<number>(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);
  const { root, run } = useAnimeScope();
  const prevPlayState = useRef<PlayState>('idle');
  const prevFps = useRef(0);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const recent = getRecentlyPlayed();
    const found = recent.find(g => g.id === gameId);
    if (found) {
      setGame({ id: found.id, title: found.title, thumbnail: found.thumbnail, url: getGameProxyUrl(found.id), type: 'html5', width: 800, height: 600 });
    } else {
      fetch(`/api/games?page=1&limit=500`).then(res => res.ok ? res.json() : null).then(data => {
        if (cancelled) return;
        if (!data?.games) { setNotFound(true); return; }
        const match: Record<string, unknown> | undefined = data.games.find((g: Record<string, unknown>) => String(g.id ?? g.game_id ?? '') === gameId || String(g.slug ?? '') === gameId);
        if (match) {
          setGame({ id: String(match.id ?? match.game_id ?? gameId), title: String(match.title ?? match.name ?? 'Untitled'), thumbnail: String(match.thumbnail ?? match.image ?? ''), url: String(match.url ?? match.game_url ?? getGameProxyUrl(gameId)), type: String(match.platform ?? 'html5'), width: match.width ? parseInt(String(match.width), 10) : 800, height: match.height ? parseInt(String(match.height), 10) : 600 });
        } else { setNotFound(true); }
      }).catch(() => { if (!cancelled) setNotFound(true); });
    }
    return () => { cancelled = true; };
  }, [gameId]);

  useEffect(() => {
    if (!game) return;
    run(s => {
      s.add(self => {
        if (!self) return;
        animate('[data-anime="thumb"]', { scale: [1.05, 1], opacity: [0, 1], ease: ease.out, duration: dur.slow });
        animate('[data-anime="title"]', { translateY: [8, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: 150 });
        animate('[data-anime="meta"]', { translateY: [6, 0], opacity: [0, 1], ease: ease.out, duration: dur.base, delay: 250 });
        animate('[data-anime="play-btn"]', { scale: [0.85, 1], opacity: [0, 1], ease: spring({ bounce: 0.4, stiffness: 250, damping: 12 }), duration: dur.base, delay: 350 });
        self.add('pulsePlayBtn', () => {
          animate('[data-anime="play-btn"]', { scale: [1, 1.05, 1], ease: 'inOut(2)', duration: 2000, loop: true });
        });
        self.methods.pulsePlayBtn();
      });
    });
  }, [game, run]);

  useEffect(() => {
    if (prevPlayState.current === playState) return;
    if (playState === 'loading') {
      animate('[data-anime="idle-screen"]', { opacity: [1, 0], scale: [1, 0.98], ease: ease.out, duration: dur.base });
    } else if (playState === 'playing') {
      animate('[data-anime="iframe-wrap"]', { opacity: [0, 1], ease: ease.out, duration: dur.slow });
    } else if (playState === 'error') {
      animate('[data-anime="error-screen"]', { opacity: [0, 1], scale: [0.95, 1], ease: spring({ bounce: 0.2 }), duration: dur.base });
      animate('[data-anime="error-screen"]', { translateX: [0, -4, 4, -2, 2, 0], ease: ease.out, duration: 400 });
    }
    prevPlayState.current = playState;
  }, [playState]);

  useEffect(() => {
    if (prevFps.current !== fps && fps > 0) {
      const fpsEl = document.querySelector('[data-anime="fps-value"]');
      if (fpsEl) animate(fpsEl, { scale: [1, 1.15, 1], ease: spring({ bounce: 0.5, stiffness: 400, damping: 12 }), duration: 200 });
      prevFps.current = fps;
    }
  }, [fps]);

  useEffect(() => {
    const el = document.querySelector('[data-anime="controls"]');
    if (el) animate(el, { opacity: showControls ? 1 : 0, translateY: showControls ? [0, 0] : [0, -4], ease: ease.out, duration: dur.base });
  }, [showControls]);

  const tickFps = useCallback(() => {
    if (!mountedRef.current) return;
    fpsFrameCount.current++;
    const now = performance.now();
    const elapsed = now - fpsLastTime.current;
    if (elapsed >= 1000) { setFps(Math.round((fpsFrameCount.current * 1000) / elapsed)); fpsFrameCount.current = 0; fpsLastTime.current = now; }
    rafId.current = requestAnimationFrame(tickFps);
  }, []);

  useEffect(() => {
    if (playState === 'playing') { fpsFrameCount.current = 0; fpsLastTime.current = performance.now(); rafId.current = requestAnimationFrame(tickFps); }
    return () => cancelAnimationFrame(rafId.current);
  }, [playState, tickFps]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; cancelAnimationFrame(rafId.current); if (controlsTimer.current) clearTimeout(controlsTimer.current); }; }, []);

  const resetControlsTimer = useCallback(() => { setShowControls(true); if (controlsTimer.current) clearTimeout(controlsTimer.current); controlsTimer.current = setTimeout(() => setShowControls(false), 3000); }, []);

  const startPlaying = useCallback(() => {
    if (!game) return;
    const btn = document.querySelector('[data-anime="play-btn"]');
    if (btn) animate(btn, { scale: [1, 0.92, 1], ease: spring({ bounce: 0.4 }), duration: 300 });
    setPlayState('loading');
    addRecentlyPlayed({ id: game.id, title: game.title, thumbnail: game.thumbnail });
  }, [game]);

  const handleIframeLoad = useCallback(() => { if (playState === 'loading') setPlayState('playing'); }, [playState]);
  const handleIframeError = useCallback(() => { setPlayState('error'); }, []);
  const goBack = useCallback(() => { router.push('/games'); }, [router]);

  const onPlayBtnEnter = useCallback(() => {
    const btn = document.querySelector('[data-anime="play-btn"]');
    if (btn) animate(btn, { scale: 1.1, ease: spring({ bounce: 0.3, stiffness: 300, damping: 12 }), duration: dur.fast });
  }, []);
  const onPlayBtnLeave = useCallback(() => {
    const btn = document.querySelector('[data-anime="play-btn"]');
    if (btn) animate(btn, { scale: 1, ease: ease.out, duration: dur.fast });
  }, []);

  const fpsColor = fps >= 40 ? 'text-green-400' : fps >= 20 ? 'text-yellow-400' : 'text-red-400';

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-muted-foreground/30 mx-auto mb-3"><circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
          <p className="text-xs text-muted-foreground mb-3">Game not found</p>
          <button onClick={goBack} className="btn-secondary text-[10px]">Back to Library</button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><div className="spinner mx-auto mb-4" /><p className="text-xs text-muted-foreground">Loading game...</p></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div ref={root} className="min-h-screen flex flex-col bg-background relative" onMouseMove={resetControlsTimer}>
        <div data-anime="controls" className={`absolute top-0 left-0 right-0 z-30 ${showControls ? '' : 'pointer-events-none'}`} style={{ opacity: showControls ? 1 : 0 }}>
          <div className="flex items-center justify-between px-4 h-10 bg-background/80 backdrop-blur-xl border-b border-border">
            <button onClick={goBack} className="btn-ghost text-[10px] h-7 px-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Library
            </button>
            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">{game.title}</span>
            <div className="flex items-center gap-3">
              {playState === 'playing' && <span data-anime="fps-value" className={`text-[10px] font-mono ${fpsColor}`}>{fps} FPS</span>}
              {game.type && <span className="tag">{game.type}</span>}
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          {playState === 'idle' && (
            <div data-anime="idle-screen" className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div data-anime="thumb" className="relative w-64 h-40 mx-auto mb-6 rounded-lg overflow-hidden border border-border" style={{ opacity: 0 }}>
                  {game.thumbnail ? <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-card flex items-center justify-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground/20"><path d="M8 5v14l11-7z" /></svg></div>}
                  <div className="absolute inset-0 bg-background/30 flex items-center justify-center">
                    <button data-anime="play-btn" onClick={startPlaying} onMouseEnter={onPlayBtnEnter} onMouseLeave={onPlayBtnLeave} className="w-14 h-14 rounded-full bg-foreground/90 flex items-center justify-center hover:bg-foreground" style={{ opacity: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-background ml-1"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  </div>
                </div>
                <h1 data-anime="title" className="text-sm font-semibold text-foreground mb-1" style={{ opacity: 0 }}>{game.title}</h1>
                <p data-anime="meta" className="text-[11px] text-muted-foreground mb-5" style={{ opacity: 0 }}>{game.width}×{game.height} · {game.type.toUpperCase()}</p>
                <button onClick={startPlaying} className="btn-primary">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="mr-2"><path d="M8 5v14l11-7z" /></svg>
                  Play Now
                </button>
              </div>
            </div>
          )}

          {playState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center"><div className="spinner mx-auto mb-3" /><p className="text-xs text-muted-foreground">Loading {game.title}...</p></div>
            </div>
          )}

          {(playState === 'playing' || playState === 'loading') && game.url && (
            <div data-anime="iframe-wrap" style={{ opacity: 0 }}>
              <iframe ref={iframeRef} src={game.url} className="absolute inset-0 w-full h-full border-0" allow="autoplay; fullscreen; gamepad; clipboard-write" sandbox="allow-scripts allow-same-origin allow-popups allow-pointer-lock allow-storage-access-by-user-activation" onLoad={handleIframeLoad} onError={handleIframeError} />
            </div>
          )}

          {playState === 'error' && (
            <div data-anime="error-screen" className="absolute inset-0 flex items-center justify-center bg-card" style={{ opacity: 0 }}>
              <div className="text-center max-w-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-destructive/60 mx-auto mb-3"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
                <p className="text-xs text-muted-foreground mb-4">Failed to load game. The game server may be unavailable.</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={startPlaying} className="btn-secondary text-[10px]">Retry</button>
                  <button onClick={goBack} className="btn-ghost text-[10px]">Back to Library</button>
                </div>
              </div>
            </div>
          )}

          {!game.url && playState !== 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-muted-foreground/30 mx-auto mb-3"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" className="text-muted-foreground/20" /></svg>
                <p className="text-xs text-muted-foreground">No URL available for this game</p>
              </div>
            </div>
          )}
        </div>

        {playState === 'playing' && (
          <div className="perf-overlay"><span className={fpsColor}>{fps} FPS</span></div>
        )}
      </div>
    </ErrorBoundary>
  );
}
