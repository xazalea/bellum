'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchGames, Game, getProxiedGameUrl } from '@/lib/games-parser';
import { discordDB, InstalledApp } from '@/lib/persistence/discord-db';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

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

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b-2 border-ocean-border pb-6">
          <div className="space-y-2">
            <h1 className="font-pixel text-lg text-ocean-accent retro-glow">🎮 GAMES</h1>
            <p className="font-mono text-sm text-ocean-secondary">
              {totalGames > 0 ? `${totalGames.toLocaleString()} HTML5 games available` : 'Retro & HTML5 gaming library'}
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ocean-input pl-9 w-64"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ocean-muted text-[16px]">search</span>
          </div>
        </header>

        {error && (
          <div className="p-4 border border-red-500/20 rounded-md flex items-center gap-3 text-sm text-red-400">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <p className="flex-1">{error}</p>
            <Button onClick={() => loadGames(1, false)} className="text-xs">Retry</Button>
          </div>
        )}

        {selectedGame ? (
          /* Game Player */
          <div className="fixed inset-0 z-40 bg-ocean-bg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-ocean-border bg-ocean-bg/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Button onClick={() => {
                  setSelectedGame(null);
                  setGameLoading(true);
                }} variant="ghost" className="text-sm">
                  <span className="material-symbols-outlined mr-1.5 text-[16px]">arrow_back</span>
                  Back
                </Button>
                <div className="hidden sm:block">
                  <h2 className="text-sm font-semibold text-ocean-primary truncate max-w-[200px] md:max-w-md">{selectedGame.title}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => handleInstall(e, selectedGame)}
                  disabled={!!installing}
                  variant="outline"
                  className="text-xs"
                >
                  <span className="material-symbols-outlined mr-1 text-[14px]">download</span>
                  {installing === selectedGame.id ? 'Saving...' : 'Install'}
                </Button>
                <Button
                  onClick={() => {
                    const iframe = document.querySelector('iframe[title="' + selectedGame.title + '"]') as HTMLIFrameElement;
                    if (iframe) {
                      if (iframe.requestFullscreen) {
                        iframe.requestFullscreen();
                      } else if ((iframe as any).webkitRequestFullscreen) {
                        (iframe as any).webkitRequestFullscreen();
                      }
                    }
                  }}
                  variant="primary"
                  className="text-xs"
                >
                  <span className="material-symbols-outlined mr-1 text-[14px]">fullscreen</span>
                  Fullscreen
                </Button>
              </div>
            </div>
            
            {/* Game Container */}
            <div className="flex-grow relative bg-black">
              {gameLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-ocean-bg z-10 gap-4">
                  <div className="w-12 h-12 border-2 border-ocean-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-ocean-secondary">Loading game...</p>
                  <p className="text-xs text-ocean-muted max-w-xs text-center">
                    If the game doesn't load, it may have iframe restrictions. Try another game.
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
            
            {/* Footer Info */}
            <div className="px-4 py-2 border-t border-ocean-border bg-ocean-bg/50 flex items-center justify-between text-xs">
              <span className="text-ocean-muted">HTML5 Game</span>
              <span className="text-ocean-accent font-mono">{selectedGame.id.substring(0, 8)}</span>
            </div>
          </div>
        ) : (
          <>
            {/* Featured */}
            {games.length > 0 && (
              <div
                className="relative h-56 rounded-md overflow-hidden cursor-pointer border border-ocean-border"
                onClick={() => setSelectedGame(games[0])}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-ocean-bg via-ocean-bg/40 to-transparent z-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={games[0].thumb}
                  alt={games[0].title}
                  width={1280}
                  height={720}
                  loading="lazy"
                  className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute bottom-0 left-0 p-6 z-20 space-y-1">
                  <span className="text-[10px] text-ocean-accent uppercase tracking-wider font-medium">Featured</span>
                  <h2 className="text-xl font-semibold text-white">{games[0].title}</h2>
                </div>
              </div>
            )}

            {!loading && games.length === 0 && !error && (
              <div className="text-center py-20">
                <h3 className="text-base font-semibold text-ocean-primary mb-1">No Games Loaded</h3>
                <p className="text-sm text-ocean-secondary mb-4">Try reloading the catalog.</p>
                <Button onClick={() => loadGames(1, false)}>Reload</Button>
              </div>
            )}

            {/* Virtualized Grid */}
            <div ref={gridRef} className="relative w-full">
              {(() => {
                const gap = 16;
                const minCardWidth = 160;
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
                        className="absolute rounded-md overflow-hidden border border-ocean-border bg-ocean-card hover:border-ocean-border-hover transition-colors duration-150 cursor-pointer"
                        style={{ width: cardWidth, height: cardHeight, transform: `translate(${left}px, ${top}px)`, willChange: 'transform' }}
                        onClick={() => {
                          setSelectedGame(game);
                          setGameLoading(true);
                        }}
                      >
                        <div className="w-full h-full relative">
                          {game.thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={game.thumb}
                              alt={game.title}
                              width={600}
                              height={800}
                              loading="lazy"
                              className="w-full h-full object-cover opacity-70"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-ocean-surface">
                              <span className="material-symbols-outlined text-2xl text-ocean-muted">sports_esports</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 w-full p-2.5">
                            <h4 className="font-medium text-xs text-white truncate">{game.title}</h4>
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

            {games.length < totalGames && (
              <div ref={loadMoreTriggerRef} className="flex flex-col items-center gap-3 pt-8 pb-16">
                <p className="text-ocean-muted text-xs">
                  {games.length.toLocaleString()} of {totalGames.toLocaleString()}
                </p>
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-ocean-secondary text-xs">
                    <span className="w-4 h-4 border-2 border-ocean-accent border-t-transparent rounded-full animate-spin" />
                    Loading more...
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
