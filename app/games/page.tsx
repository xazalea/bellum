'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fetchGames, Game, getProxiedGameUrl } from '@/lib/games-parser';
import { discordDB, InstalledApp } from '@/lib/persistence/discord-db';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function GamepadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollState, setScrollState] = useState({ scrollTop: 0, viewportHeight: 0, containerTop: 0 });
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sessionSeed = useRef<string>(`seed-${Date.now()}-${Math.random()}`).current;

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return games;
    return games.filter(game =>
      game.id.toLowerCase().includes(query) ||
      game.title.toLowerCase().includes(query)
    );
  }, [games, searchQuery]);

  useLayoutEffect(() => {
    if (!gridRef.current) return;
    const element = gridRef.current;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateScroll = () => {
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const containerTop = gridRef.current
        ? gridRef.current.getBoundingClientRect().top + window.scrollY
        : 0;
      setScrollState({ scrollTop, viewportHeight, containerTop });
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, []);

  const loadGames = useCallback(async (pageToLoad = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGames(pageToLoad, 24, true, sessionSeed);
      setTotalGames(data.total);
      if (append) {
        setGames(prev => [...prev, ...data.games]);
      } else {
        setGames(data.games);
      }
    } catch (err) {
      console.error('Failed to load games', err);
      setError('Failed to load games. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionSeed]);

  useEffect(() => {
    loadGames(1, false);
    getDeviceFingerprintId().then(fp => discordDB.init(fp));
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/nacho-proxy-sw.js')
        .catch(err => console.error('Proxy SW failed', err));
    }
  }, [loadGames]);

  useEffect(() => {
    if (page > 1) {
      loadGames(page, true);
    }
  }, [page, loadGames]);

  useEffect(() => {
    if (!loadMoreTriggerRef.current || selectedGame || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore && games.length < totalGames) {
          setIsLoadingMore(true);
          setPage((p) => p + 1);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(loadMoreTriggerRef.current);
    return () => {
      if (loadMoreTriggerRef.current) {
        observer.unobserve(loadMoreTriggerRef.current);
      }
    };
  }, [games.length, totalGames, isLoadingMore, selectedGame, loading]);

  useEffect(() => {
    if (games.length > 0) setIsLoadingMore(false);
  }, [games.length]);

  const handleInstall = async (e: React.MouseEvent, game: Game) => {
    e.stopPropagation();
    setInstalling(game.id);
    try {
      const app: InstalledApp = {
        id: game.id,
        title: game.title,
        thumb: game.thumb,
        type: 'game',
        installedAt: Date.now()
      };
      await discordDB.addApp(app);
      alert(`Installed ${game.title} to your Library!`);
    } catch (err) {
      console.error('Install failed', err);
      alert('Failed to save to Discord account');
    } finally {
      setInstalling(null);
    }
  };

  const handleFullscreen = () => {
    const iframe = document.querySelector(`iframe[title="${selectedGame?.title}"]`) as HTMLIFrameElement;
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if ((iframe as any).webkitRequestFullscreen) {
        (iframe as any).webkitRequestFullscreen();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GamepadIcon className="w-7 h-7 text-cyan-400" />
            Game Library
          </h1>
          <p className="text-slate-400 mt-1">
            {totalGames > 0 ? `${totalGames.toLocaleString()} HTML5 games available` : 'Loading games...'}
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-[#0a1628] border border-cyan-500/20 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <ErrorIcon className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1 text-sm">{error}</p>
          <button 
            onClick={() => loadGames(1, false)}
            className="px-4 py-2 text-sm font-medium bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Game Player Modal */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 bg-[#01040a] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10 bg-[#0a1628]/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setSelectedGame(null);
                  setGameLoading(true);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <BackIcon className="w-4 h-4" />
                Back
              </button>
              <div className="hidden sm:block h-4 w-px bg-cyan-500/20" />
              <h2 className="hidden sm:block text-sm font-medium text-white truncate max-w-xs">
                {selectedGame.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleInstall(e, selectedGame)}
                disabled={!!installing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                <DownloadIcon className="w-4 h-4" />
                {installing === selectedGame.id ? 'Saving...' : 'Install'}
              </button>
              <button
                onClick={handleFullscreen}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition-all"
              >
                <FullscreenIcon className="w-4 h-4" />
                Fullscreen
              </button>
            </div>
          </div>
          
          {/* Game Container */}
          <div className="flex-1 relative bg-black">
            {gameLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#01040a] z-10 gap-4">
                <div className="w-12 h-12 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                <p className="text-slate-400">Loading game...</p>
                <p className="text-xs text-slate-500 max-w-xs text-center">
                  If the game doesn't load, it may have iframe restrictions.
                </p>
              </div>
            )}
            <iframe
              src={getProxiedGameUrl(selectedGame.file)}
              className="w-full h-full border-0"
              title={selectedGame.title}
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups"
              allow="fullscreen; autoplay; clipboard-write"
              allowFullScreen
              onLoad={() => setGameLoading(false)}
              onError={() => {
                setGameLoading(false);
                setError('Failed to load game. The game may have iframe restrictions.');
              }}
            />
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t border-cyan-500/10 bg-[#0a1628]/50 flex items-center justify-between text-xs">
            <span className="text-slate-500">HTML5 Game</span>
            <span className="text-cyan-400 font-mono">{selectedGame.id.substring(0, 8)}</span>
          </div>
        </div>
      )}

      {/* Featured Game */}
      {!selectedGame && games.length > 0 && !searchQuery && (
        <div 
          className="relative h-64 sm:h-80 rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => {
            setSelectedGame(games[0]);
            setGameLoading(true);
          }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#01040a] via-[#01040a]/50 to-transparent z-10" />
          <img
            src={games[0].thumb}
            alt={games[0].title}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
          />
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium mb-3">
              <GamepadIcon className="w-3 h-3" />
              Featured Game
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{games[0].title}</h2>
            <p className="text-slate-400 mb-4 max-w-lg">Click to play this featured game instantly in your browser.</p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-cyan-500 transition-all">
              <GamepadIcon className="w-5 h-5" />
              Play Now
            </button>
          </div>
        </div>
      )}

      {/* Games Grid */}
      {!selectedGame && (
        <>
          {loading && games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
              <p className="text-slate-400">Loading games...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-20">
              <GamepadIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No games found' : 'No games loaded'}
              </h3>
              <p className="text-slate-400 mb-4">
                {searchQuery ? 'Try a different search term' : 'Try reloading the catalog'}
              </p>
              <button 
                onClick={() => searchQuery ? setSearchQuery('') : loadGames(1, false)}
                className="px-6 py-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all"
              >
                {searchQuery ? 'Clear Search' : 'Reload'}
              </button>
            </div>
          ) : (
            <>
              {/* Virtualized Grid */}
              <div ref={gridRef} className="relative w-full">
                {(() => {
                  const gap = 16;
                  const minCardWidth = 180;
                  const columns = Math.max(2, Math.floor((containerWidth + gap) / (minCardWidth + gap)) || 2);
                  const cardWidth = Math.max(1, Math.floor((containerWidth - gap * (columns - 1)) / columns));
                  const cardHeight = Math.floor((cardWidth * 4) / 3);
                  const rowHeight = cardHeight + gap;
                  const totalRows = Math.ceil(filteredGames.length / columns);
                  const totalHeight = totalRows * rowHeight;
                  const { scrollTop, viewportHeight, containerTop } = scrollState;
                  const relativeScrollTop = Math.max(0, scrollTop - containerTop);
                  const overscan = 4;
                  const startRow = Math.max(0, Math.floor(relativeScrollTop / rowHeight) - overscan);
                  const endRow = Math.min(totalRows, Math.ceil((relativeScrollTop + viewportHeight) / rowHeight) + overscan);
                  const items: JSX.Element[] = [];

                  for (let row = startRow; row < endRow; row++) {
                    for (let col = 0; col < columns; col++) {
                      const index = row * columns + col;
                      const game = filteredGames[index];
                      if (!game) continue;
                      const top = row * rowHeight;
                      const left = col * (cardWidth + gap);
                      items.push(
                        <div
                          key={game.id}
                          className="absolute rounded-xl overflow-hidden border border-cyan-500/10 bg-[#0a1628] hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group"
                          style={{ 
                            width: cardWidth, 
                            height: cardHeight, 
                            transform: `translate(${left}px, ${top}px)`, 
                            willChange: 'transform' 
                          }}
                          onClick={() => {
                            setSelectedGame(game);
                            setGameLoading(true);
                          }}
                        >
                          <div className="w-full h-full relative">
                            {game.thumb ? (
                              <img
                                src={game.thumb}
                                alt={game.title}
                                loading="lazy"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#0a1628]">
                                <GamepadIcon className="w-12 h-12 text-slate-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#01040a] via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <h4 className="font-medium text-sm text-white truncate">{game.title}</h4>
                            </div>
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                <GamepadIcon className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  }

                  return (
                    <div style={{ position: 'relative', height: totalHeight }}>
                      {items}
                    </div>
                  );
                })()}
              </div>

              {/* Load More */}
              {games.length < totalGames && (
                <div ref={loadMoreTriggerRef} className="flex flex-col items-center gap-3 pt-8 pb-16">
                  <p className="text-slate-500 text-sm">
                    Showing {games.length.toLocaleString()} of {totalGames.toLocaleString()} games
                  </p>
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                      Loading more...
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
