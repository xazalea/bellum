'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchGames, Game, getProxiedGameUrl } from '@/lib/games-parser';
import { discordDB, InstalledApp } from '@/lib/persistence/discord-db';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async (pageToLoad = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGames(pageToLoad, 24);
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
  }, []);

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
    <main className="mx-auto w-full max-w-7xl px-5 py-10">
      <div className="space-y-8">
        <header className="flex justify-between items-end border-b border-nacho-border pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-nacho-primary tracking-tight">Games Arcade</h1>
            <p className="text-nacho-secondary text-lg">Retro & HTML5 gaming library.</p>
          </div>
          <div className="flex gap-2">
             <Button className="bg-nacho-surface hover:bg-nacho-card-hover text-nacho-primary border-nacho-border">
                <span className="material-symbols-outlined mr-2">search</span>
                Search
             </Button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-nacho flex items-center gap-3 text-red-400">
            <span className="material-symbols-outlined">error</span>
            <p className="flex-1">{error}</p>
            <Button
              onClick={() => loadGames(1, false)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
            >
              Retry
            </Button>
          </div>
        )}

        {selectedGame ? (
          <div className="w-full h-[85vh] flex flex-col space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <Button onClick={() => setSelectedGame(null)} className="bg-nacho-surface hover:bg-nacho-card-hover text-nacho-primary border-nacho-border">
                  <span className="material-symbols-outlined mr-2">arrow_back</span>
                  Back to Library
                </Button>
                <Button 
                    onClick={(e) => handleInstall(e, selectedGame)}
                    disabled={!!installing}
                    className="bg-nacho-accent hover:bg-blue-600 text-white border-none"
                >
                    {installing === selectedGame.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    ) : (
                        <span className="material-symbols-outlined mr-2">download</span>
                    )}
                    {installing === selectedGame.id ? 'Saving...' : 'Install to Library'}
                </Button>
            </div>
            
            <div className="flex-grow bg-black rounded-nacho overflow-hidden border border-nacho-border shadow-2xl relative">
                    <iframe 
                        src={getProxiedGameUrl(selectedGame.file)} 
                        className="w-full h-full border-0"
                        title={selectedGame.title}
                sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
                allowFullScreen
                    />
                </div>
            
            <div className="flex items-center justify-between bg-nacho-surface p-4 rounded-nacho border border-nacho-border">
              <div>
                  <h2 className="text-xl font-bold text-nacho-primary">{selectedGame.title}</h2>
                  <p className="text-sm text-nacho-muted mt-1">{selectedGame.description || 'No description available.'}</p>
              </div>
              <span className="text-xs font-mono text-nacho-accent px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">HTML5</span>
                </div>
            </div>
        ) : (
            <>
            {/* Featured Hero (Placeholder for first game) */}
            {games.length > 0 && (
                <div className="relative h-64 rounded-nacho overflow-hidden group cursor-pointer border border-nacho-border shadow-nacho" onClick={() => setSelectedGame(games[0])}>
                    <div className="absolute inset-0 bg-gradient-to-t from-nacho-bg via-transparent to-transparent z-10"></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={games[0].thumb} alt={games[0].title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 p-8 z-20 space-y-2">
                        <span className="px-2 py-1 bg-nacho-accent text-white text-xs font-bold rounded uppercase tracking-wider">Featured</span>
                        <h2 className="text-3xl font-bold text-white">{games[0].title}</h2>
                        <p className="text-gray-300 max-w-xl truncate">{games[0].description}</p>
                    </div>
                </div>
            )}

            {!loading && games.length === 0 && !error && (
              <div className="text-center py-20 bg-nacho-surface rounded-nacho border border-nacho-border">
                <span className="material-symbols-outlined text-6xl text-nacho-muted mb-4">sports_esports</span>
                <h3 className="text-xl font-bold text-nacho-primary">No Games Loaded</h3>
                <p className="text-nacho-secondary">Try reloading the catalog.</p>
                <Button
                  onClick={() => loadGames(1, false)}
                  className="mt-6 bg-nacho-accent text-white border-none"
                >
                  Reload Games
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {games.map((game) => (
                    <Card 
                        key={game.id} 
                  className="group aspect-[3/4] p-0 overflow-hidden bg-nacho-surface border-nacho-border hover:border-nacho-accent transition-all duration-300 hover:-translate-y-1 cursor-pointer relative"
                        onClick={() => setSelectedGame(game)}
                    >
                  <div className="w-full h-full relative">
                         {game.thumb ? (
                             // eslint-disable-next-line @next/next/no-img-element
                        <img src={game.thumb} alt={game.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-300" />
                         ) : (
                        <div className="w-full h-full flex items-center justify-center bg-nacho-surface">
                            <span className="material-symbols-outlined text-4xl text-nacho-muted">sports_esports</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-100 transition-opacity"></div>
                    
                    <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h4 className="font-bold text-sm text-white truncate mb-1">{game.title}</h4>
                        <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            <span className="text-[10px] text-gray-400">Arcade</span>
                            <button 
                                onClick={(e) => handleInstall(e, game)}
                                className="p-1.5 bg-nacho-accent rounded-full text-white hover:bg-blue-400 transition-colors"
                                title="Install to Library"
                            >
                                <span className="material-symbols-outlined text-[14px]">download</span>
                            </button>
                        </div>
                      </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
            <div className="flex justify-center pt-12 pb-20">
              <Button 
                onClick={() => setPage(p => p + 1)} 
                disabled={loading} 
                className="min-w-[200px] bg-nacho-surface hover:bg-nacho-card-hover text-nacho-primary border-nacho-border"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-nacho-secondary border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Load More Games</span>
                    <span className="material-symbols-outlined ml-2">expand_more</span>
                  </>
                )}
                    </Button>
                </div>
            </>
        )}
      </div>
    </main>
  );
}
