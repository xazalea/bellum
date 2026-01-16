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
        <header className="space-y-2 border-b-2 border-[#1F2937]/30 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-pixel text-[#94A3B8]">Games Arcade</h1>
            <p className="font-retro text-xl text-[#64748B]">Retro gaming library.</p>
          </div>
        </header>

        {selectedGame ? (
            <div className="w-full h-[80vh] flex flex-col space-y-4">
                <Button onClick={() => setSelectedGame(null)} className="w-fit">Back to Library</Button>
                <div className="flex-grow bg-black rounded-xl overflow-hidden border border-[#374151] relative">
                    <iframe 
                        src={getProxiedGameUrl(selectedGame.file)} 
                        className="w-full h-full border-0"
                        title={selectedGame.title}
                        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
                    />
                </div>
                <h2 className="text-xl font-pixel text-[#E2E8F0]">{selectedGame.title}</h2>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {games.map((game) => (
                    <Card 
                        key={game.id} 
                        className="aspect-[3/4] p-2 flex flex-col space-y-2 hover:scale-105 transition-transform cursor-pointer border-[#1F2937] hover:border-[#475569] group"
                        onClick={() => setSelectedGame(game)}
                    >
                      <div className="flex-grow bg-[#030508] rounded flex items-center justify-center overflow-hidden relative">
                         {game.thumb ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={game.thumb} alt={game.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                         ) : (
                             <span className="material-symbols-outlined text-4xl text-[#1F2937]">sports_esports</span>
                         )}
                      </div>
                      <div className="px-1">
                        <h4 className="font-pixel text-[10px] text-[#94A3B8] truncate">{game.title}</h4>
                        <span className="text-[10px] font-retro text-[#475569]">HTML5</span>
                      </div>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center pt-8">
                    <Button onClick={() => setPage(p => p + 1)} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            </>
        )}
      </div>
    </main>
  );
}
