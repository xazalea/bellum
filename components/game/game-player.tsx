'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getGameProxyUrl } from '@/lib/api/games';
import { addRecentlyPlayed } from '@/lib/recently-played';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface GamePlayerProps {
  gameId: string;
  title?: string;
  thumbnail?: string;
}

export function GamePlayer({ gameId, title, thumbnail }: GamePlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [muted, setMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout>>();

  // The proxy URL routes through Almostnode — never direct CDN
  const proxyUrl = getGameProxyUrl(gameId);

  // Track recently played
  useEffect(() => {
    if (title) {
      addRecentlyPlayed({ id: gameId, title, thumbnail: thumbnail || '' });
    }
  }, [gameId, title, thumbnail]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    if (iframeRef.current) iframeRef.current.src = proxyUrl;
  }, [proxyUrl]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.ctrlKey && e.key === 'r') { e.preventDefault(); reload(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen, reload]);

  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full rounded-lg overflow-hidden"
      onMouseMove={showControlsTemp}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Controls overlay */}
      <div className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between p-2 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-200 ${showControls || loading ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-white text-sm font-medium px-1 truncate max-w-[200px]">{title || 'Game'}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={reload}
            aria-label="Reload game"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Hint */}
      <div className={`absolute bottom-2 inset-x-0 z-10 text-center transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-white/40 text-xs">F = Fullscreen · Ctrl+R = Reload</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black gap-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Loading game via edge proxy...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black gap-4">
          <p className="text-white text-base font-medium">Failed to load game</p>
          <p className="text-white/50 text-sm">The game server didn't respond</p>
          <Button onClick={reload} variant="outline" className="text-white border-white/20 hover:bg-white/10">
            Try Again
          </Button>
        </div>
      )}

      {/* Game iframe — proxy through Almostnode, never direct */}
      <div className="aspect-video">
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          allowFullScreen
          allow="autoplay; fullscreen; gamepad; microphone"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-storage-access-by-user-activation"
          title={title || 'Game'}
        />
      </div>
    </div>
  );
}
