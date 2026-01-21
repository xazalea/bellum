'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchGames, Game, getProxiedGameUrl } from '@/lib/games-parser';

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    loadGames();
    
    // Register Service Worker for Proxying
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/nacho-proxy-sw.js')
        .then(reg => console.log('Proxy SW registered'))
        .catch(err => console.error('Proxy SW failed', err));
    }
  }, []);

  const loadGames = async () => {
    setLoading(true);
    const data = await fetchGames(page, 24);
    setGames(prev => page === 1 ? data.games : [...prev, ...data.games]);
    setLoading(false);
  };

  const handleLoadMore = () => {
    setPage(p => p + 1);
    loadGames(); // Effect dependency or manual call? Better add page dependency or manual
  };
  
  // Fix: loadGames shouldn't be in useEffect dependency if it changes.
  // Let's refactor slightly.
  useEffect(() => {
     if (page > 1) {
         fetchGames(page, 24).then(data => {
             setGames(prev => [...prev, ...data.games]);
         });
     }
  }, [page]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-7xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6 flex justify-between items-end">
          <div className="space-y-2">
            <h1 className="text-3xl font-sans font-bold text-[#8B9DB8]">Games Arcade</h1>
            <p className="font-sans text-xl text-[#64748B]">Retro gaming library.</p>
          </div>
        </header>

        {selectedGame ? (
            <div className="w-full h-[80vh] flex flex-col space-y-4">
                <Button onClick={() => setSelectedGame(null)} className="w-fit flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Library
                </Button>
                <div className="flex-grow bg-black rounded-lg overflow-hidden border border-[#2A3648] relative shadow-2xl">
                    <iframe 
                        src={getProxiedGameUrl(selectedGame.file)} 
                        className="w-full h-full border-0"
                        title={selectedGame.title}
                        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
                    />
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-sans font-semibold text-[#A0B3CC]">{selectedGame.title}</h2>
                  <span className="text-sm font-sans text-[#64748B] px-3 py-1 bg-[#1E2A3A] rounded-lg border border-[#2A3648]">HTML5</span>
                </div>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {games.map((game) => (
                    <Card 
                        key={game.id} 
                        className="aspect-[3/4] p-3 flex flex-col space-y-2 cursor-pointer group"
                        onClick={() => setSelectedGame(game)}
                    >
                      <div className="flex-grow bg-gradient-to-br from-[#0C1016] to-[#1E2A3A] rounded-lg flex items-center justify-center overflow-hidden relative border border-[#2A3648] group-hover:border-[#64748B] transition-all">
                         {game.thumb ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={game.thumb} alt={game.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                         ) : (
                             <span className="material-symbols-outlined text-4xl text-[#2A3648] group-hover:text-[#4A5A6F] transition-colors">sports_esports</span>
                         )}
                      </div>
                      <div className="px-1 space-y-1">
                        <h4 className="font-sans font-medium text-[10px] text-[#8B9DB8] truncate group-hover:text-[#A0B3CC] transition-colors">{game.title}</h4>
                        <span className="text-[9px] font-sans text-[#4A5A6F]">HTML5</span>
                      </div>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center pt-8">
                    <Button onClick={() => setPage(p => p + 1)} disabled={loading} className="min-w-[200px] flex items-center gap-3">
                        {loading && (
                          <span className="w-5 h-5 border-2 border-[#64748B] border-t-transparent rounded-full animate-spin"></span>
                        )}
                        <span>{loading ? 'Loading...' : 'Load More'}</span>
                    </Button>
                </div>
            </>
        )}
      </div>
    </main>
  );
}
