"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { nachoProxy } from '@/lib/nacho/proxy/proxy-server';

type GameEntry = {
  id: string;
  url: string;
  imageUrl: string;
  lastmod?: string;
};

const CHUNK_SIZE = 50; // Load 50 games at a time

export function GamesBrowser({ onPlayGame }: { onPlayGame?: (gameUrl: string) => void }) {
  const [games, setGames] = useState<GameEntry[]>([]);
  const [displayedGames, setDisplayedGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Parse XML and extract game entries
  const parseGamesXML = useCallback((xmlText: string): GameEntry[] => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const urls = xmlDoc.getElementsByTagName('url');
      
      const gamesList: GameEntry[] = [];
      for (let i = 0; i < urls.length; i++) {
        const urlNode = urls[i];
        const locNode = urlNode.getElementsByTagName('loc')[0];
        const imageNode = urlNode.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1', 'loc')[0];
        const lastmodNode = urlNode.getElementsByTagName('lastmod')[0];
        
        if (locNode && imageNode) {
          const gameUrl = locNode.textContent || '';
          const imageUrl = imageNode.textContent || '';
          const lastmod = lastmodNode?.textContent || undefined;
          
          // Extract game ID from URL
          const urlParts = gameUrl.split('/').filter(Boolean);
          const gameId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || `game-${i}`;
          
          gamesList.push({
            id: gameId,
            url: gameUrl,
            imageUrl: imageUrl,
            lastmod,
          });
        }
      }
      
      return gamesList;
    } catch (e) {
      console.error('Failed to parse XML:', e);
      return [];
    }
  }, []);

  // Load games.xml on mount
  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize the nacho proxy
        await nachoProxy.ready();
        
        // Fetch games.xml through the proxy
        const response = await fetch('/games.xml');
        if (!response.ok) throw new Error('Failed to load games.xml');
        
        const xmlText = await response.text();
        const parsedGames = parseGamesXML(xmlText);
        
        if (parsedGames.length === 0) {
          throw new Error('No games found in games.xml');
        }
        
        setGames(parsedGames);
        setDisplayedGames(parsedGames.slice(0, CHUNK_SIZE));
        setCurrentPage(1);
      } catch (e: any) {
        setError(e?.message || 'Failed to load games');
        console.error('Load games error:', e);
      } finally {
        setLoading(false);
      }
    };

    void loadGames();
  }, [parseGamesXML]);

  // Load more games when scrolling
  const loadMore = useCallback(() => {
    if (loadingMore || displayedGames.length >= games.length) return;
    
    setLoadingMore(true);
    
    // Use requestIdleCallback for better performance
    const ric = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
    const loadNextChunk = () => {
      const startIdx = currentPage * CHUNK_SIZE;
      const endIdx = Math.min(startIdx + CHUNK_SIZE, games.length);
      const nextChunk = games.slice(startIdx, endIdx);
      
      setDisplayedGames(prev => [...prev, ...nextChunk]);
      setCurrentPage(prev => prev + 1);
      setLoadingMore(false);
    };
    
    if (ric) {
      ric(loadNextChunk);
    } else {
      setTimeout(loadNextChunk, 100);
    }
  }, [currentPage, displayedGames.length, games, loadingMore]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading || !sentinelRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' } // Start loading before reaching the bottom
    );
    
    observerRef.current.observe(sentinelRef.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadMore]);

  // Proxy URLs through nacho proxy
  const proxyUrl = (url: string): string => {
    // All URLs go through the nacho proxy service worker
    return nachoProxy.proxyUrl(url);
  };

  const proxyImageUrl = (url: string): string => {
    // Images also go through the nacho proxy
    return nachoProxy.proxyUrl(url);
  };

  const handlePlayGame = (game: GameEntry) => {
    const proxiedUrl = proxyUrl(game.url);
    onPlayGame?.(proxiedUrl);
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-8 pt-24 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="text-white/60 text-lg">Loading 20,865+ games...</p>
          <p className="text-white/40 text-sm">This might take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-8 pt-24 min-h-screen">
        <div className="bellum-card p-6 border-2 border-red-400/30 bg-red-500/10 text-red-200">
          <h3 className="font-bold text-lg mb-2">Error Loading Games</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-baseline gap-4">
          <h2 className="text-3xl font-bold">Web Games</h2>
          <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
            <span className="text-blue-300 font-bold text-lg">
              {games.length.toLocaleString()}
            </span>
            <span className="text-blue-300/60 text-sm ml-1">games</span>
          </div>
        </div>
        <p className="text-white/40 mt-2">
          Showing {displayedGames.length.toLocaleString()} of {games.length.toLocaleString()} • Scroll for more
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {displayedGames.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.01, 0.5) }}
            className="bellum-card p-0 overflow-hidden group cursor-pointer hover:scale-105 transition-transform"
            onClick={() => handlePlayGame(game)}
          >
            {/* Game Thumbnail */}
            <div className="relative w-full aspect-[4/3] bg-white/5">
              <img
                src={proxyImageUrl(game.imageUrl)}
                alt={game.id}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Fallback to original URL if proxy fails
                  e.currentTarget.src = game.imageUrl;
                }}
              />
              
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <Play size={24} className="text-black ml-1" />
                </div>
              </div>
            </div>

            {/* Game Info */}
            <div className="p-3">
              <h3 className="font-bold text-sm truncate text-white group-hover:text-blue-300 transition-colors">
                {game.id.replace(/[-_]/g, ' ')}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )}

      {/* Sentinel for Infinite Scroll */}
      <div ref={sentinelRef} className="h-4" />

      {/* End of List */}
      {displayedGames.length >= games.length && (
        <div className="text-center py-8">
          <div className="inline-block px-6 py-4 rounded-2xl bg-green-500/10 border-2 border-green-400/30">
            <p className="text-green-300 font-bold text-lg">
              🎉 All {games.length.toLocaleString()} games loaded!
            </p>
            <p className="text-green-300/60 text-sm mt-1">
              You've reached the end of the collection
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
