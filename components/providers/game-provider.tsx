'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getRecentlyPlayed, addRecentlyPlayed as addRecent, clearRecentlyPlayed, RecentGame } from '@/lib/recently-played';

interface GameContextType {
  recentlyPlayed: RecentGame[];
  addGame: (game: Omit<RecentGame, 'playedAt'>) => void;
  clearHistory: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentGame[]>([]);

  useEffect(() => {
    setRecentlyPlayed(getRecentlyPlayed());
  }, []);

  const addGame = useCallback((game: Omit<RecentGame, 'playedAt'>) => {
    addRecent(game);
    setRecentlyPlayed(getRecentlyPlayed());
  }, []);

  const clearHistory = useCallback(() => {
    clearRecentlyPlayed();
    setRecentlyPlayed([]);
  }, []);

  return (
    <GameContext.Provider value={{ recentlyPlayed, addGame, clearHistory }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGames() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGames must be used within GameProvider');
  return ctx;
}
