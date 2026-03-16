'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { gamesAPI } from '@/lib/api/games';
import type { Game, GamesResponse } from '@/lib/types/games';

interface GameContextType {
  games: Game[];
  isLoading: boolean;
  total: number;
  hasMore: boolean;
  hasLoaded: boolean;
  fetchGames: (page?: number, limit?: number) => Promise<Game[]>;
  loadMore: () => Promise<Game[]>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchGames = useCallback(async (pageNum = 1, limit = 50): Promise<Game[]> => {
    setIsLoading(true);
    try {
      const result: GamesResponse = await gamesAPI.getGames(pageNum, limit);
      if (pageNum === 1) {
        setGames(result.games);
      } else {
        setGames(prev => [...prev, ...result.games]);
      }
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPage(pageNum);
      setHasLoaded(true);
      return result.games;
    } catch (error) {
      console.error('Failed to fetch games:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (): Promise<Game[]> => {
    if (page < totalPages && !isLoading) {
      return fetchGames(page + 1);
    }
    return [];
  }, [page, totalPages, isLoading, fetchGames]);

  return (
    <GameContext.Provider
      value={{
        games,
        isLoading,
        total,
        hasMore: page < totalPages,
        hasLoaded,
        fetchGames,
        loadMore,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
