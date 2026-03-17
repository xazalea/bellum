'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getGameProxyUrl } from '@/lib/api/games';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface GamePlayerProps {
  gameId: string;
  title?: string;
}

export function GamePlayer({ gameId, title }: GamePlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  const proxyUrl = getGameProxyUrl(gameId);

  const handleLoad = useCallback(() => setIsLoading(false), []);
  const handleError = useCallback(() => { setIsLoading(false); setHasError(true); }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const reload = useCallback(() => {
    if (iframeRef.current) {
      setIsLoading(true);
      setHasError(false);
      iframeRef.current.src = proxyUrl;
    }
  }, [proxyUrl]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'r' && e.ctrlKey) { e.preventDefault(); reload(); }
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    };
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [toggleFullscreen, reload, isFullscreen]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className={`absolute top-0 inset-x-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${
        showControls || isLoading ? 'opacity-100' : 'opacity-0'
      }`}>
        <span className="text-white text-sm font-medium truncate px-2">
          {title || 'Game'}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={reload}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`absolute bottom-0 inset-x-0 z-10 p-2 text-center transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <span className="text-white/40 text-xs">F = Fullscreen · Ctrl+R = Reload</span>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70 text-sm font-medium">Loading game...</p>
            <p className="text-white/40 text-xs mt-1">Routing through edge proxy</p>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="text-center">
            <p className="text-white text-lg font-medium mb-2">Failed to load game</p>
            <p className="text-white/60 text-sm mb-4">The game could not be loaded through the proxy</p>
            <Button onClick={reload} variant="outline" className="text-white border-white/30">
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="aspect-video">
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          allowFullScreen
          allow="autoplay; fullscreen; gamepad; microphone"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-storage-access-by-user-activation"
          title={title || 'Game'}
        />
      </div>
    </div>
  );
}
