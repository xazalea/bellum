const STORAGE_KEY = 'challenger-recently-played';
const MAX_RECENT = 20;

export interface RecentGame {
  id: string;
  title: string;
  thumbnail: string;
  playedAt: number;
}

export function getRecentlyPlayed(): RecentGame[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecentGame[];
  } catch {
    return [];
  }
}

export function addRecentlyPlayed(game: Omit<RecentGame, 'playedAt'>): void {
  if (typeof window === 'undefined') return;
  const recent = getRecentlyPlayed().filter(g => g.id !== game.id);
  recent.unshift({ ...game, playedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function clearRecentlyPlayed(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
