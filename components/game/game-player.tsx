'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getGameProxyUrl } from '@/lib/api/games';
import { addRecentlyPlayed } from '@/lib/recently-played';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, RotateCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GamePlayerProps {
  gameId: string;
  title?: string;
  thumbnail?: string;
  className?: string;
}

export function GamePlayer({ gameId, title, thumbnail, className }: GamePlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  // ALWAYS use the proxy URL — never direct CDN
  const proxyUrl = getGameProxyUrl(gameId);

  useEffect(() => {
    if (title) {
      addRecentlyPlayed({ id: gameId, title, thumbnail: thumbnail || '' });
    }
  }, [gameId, title, thumbnail]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setRetryKey((k) => k + 1);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'r' && e.ctrlKey) { e.preventDefault(); handleRetry(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen, handleRetry]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowControls(false), 2500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setShowControls(false);
  }, []);

  useEffect(() => {
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black overflow-hidden w-full', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black">
          <div className="h-11 w-11 border-2 border-primary border-t-transparent rounded-full animate-spin mb-5" />
          <p className="text-white/80 text-sm font-medium">Loading game…</p>
          <p className="text-white/40 text-xs mt-1">Routing through edge proxy</p>
        </div>
      )}

      {/* Error overlay */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black gap-4 px-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <p className="text-white font-semibold text-lg">Failed to load game</p>
            <p className="text-white/50 text-sm mt-1 max-w-xs">
              The game could not be loaded through the proxy.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRetry}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute top-0 inset-x-0 z-20 flex items-center justify-end gap-1 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/15"
          onClick={handleRetry}
          title="Reload (Ctrl+R)"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/15"
          onClick={toggleFullscreen}
          title="Fullscreen (F)"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Hint */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 flex items-center justify-center pb-2 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-white/30 text-xs">F · Fullscreen &nbsp;·&nbsp; Ctrl+R · Reload</span>
      </div>

      {/* Game iframe — proxy only, never direct CDN */}
      <iframe
        key={retryKey}
        ref={iframeRef}
        src={proxyUrl}
        className="absolute inset-0 w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        allowFullScreen
        allow="autoplay; fullscreen; gamepad"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-storage-access-by-user-activation"
        title={title || 'Game'}
      />
    </div>
  );
}
