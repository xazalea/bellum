/**
 * Recently Played Games Manager
 * Tracks and persists recently played games to localStorage
 */

import { Game } from '@/lib/games-parser';

const STORAGE_KEY = 'challenger_recently_played';
const MAX_RECENT = 20;

export interface RecentlyPlayedGame extends Game {
  playedAt: number; // timestamp
  playCount: number;
}

/**
 * Get recently played games from localStorage
 */
export function getRecentlyPlayed(): RecentlyPlayedGame[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const games = JSON.parse(stored) as RecentlyPlayedGame[];
    return games.sort((a, b) => b.playedAt - a.playedAt);
  } catch {
    return [];
  }
}

/**
 * Add or update a game in recently played
 */
export function addToRecentlyPlayed(game: Game): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentlyPlayed();
    const existingIndex = recent.findIndex(g => g.id === game.id);
    
    if (existingIndex >= 0) {
      // Update existing entry
      recent[existingIndex].playedAt = Date.now();
      recent[existingIndex].playCount++;
    } else {
      // Add new entry
      recent.unshift({
        ...game,
        playedAt: Date.now(),
        playCount: 1,
      });
    }
    
    // Sort by most recent and limit
    const sorted = recent
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, MAX_RECENT);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.error('[RecentlyPlayed] Failed to save:', e);
  }
}

/**
 * Remove a game from recently played
 */
export function removeFromRecentlyPlayed(gameId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentlyPlayed();
    const filtered = recent.filter(g => g.id !== gameId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('[RecentlyPlayed] Failed to remove:', e);
  }
}

/**
 * Clear all recently played games
 */
export function clearRecentlyPlayed(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[RecentlyPlayed] Failed to clear:', e);
  }
}

/**
 * Get total play count across all games
 */
export function getTotalPlayCount(): number {
  const recent = getRecentlyPlayed();
  return recent.reduce((sum, game) => sum + game.playCount, 0);
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}