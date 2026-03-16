import type { Game, GamesResponse } from '@/lib/types/games';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';
const GAME_CDN = 'https://html5.gamedistribution.com';
const GAME_PATH_PREFIX = 'rvvASMiM';

export const getGameUrl = (gameId: string): string => {
  return `${GAME_CDN}/${GAME_PATH_PREFIX}/${gameId}/`;
};

export const getGameProxyUrl = (gameId: string): string => {
  return `${API_BASE}/proxy/game?url=${encodeURIComponent(getGameUrl(gameId))}`;
};

interface RawGame {
  id: string;
  title: string;
  description: string;
  thumb: string;
  file: string;
  platform?: string;
  width?: string;
  height?: string;
}

function transformGame(raw: RawGame): Game {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    thumbnail: raw.thumb || '',
    category: raw.platform || 'html5',
    type: (raw.platform as Game['type']) || 'html5',
    url: raw.file,
    width: raw.width ? parseInt(raw.width, 10) : 800,
    height: raw.height ? parseInt(raw.height, 10) : 600,
  };
}

export const gamesAPI = {
  getGames: async (page = 1, limit = 50): Promise<GamesResponse> => {
    const res = await fetch(
      `${API_BASE}/games?page=${page}&limit=${limit}&randomize=true`
    );
    if (!res.ok) throw new Error('Failed to fetch games');
    const data = await res.json();
    return {
      games: (data.games || []).map(transformGame),
      total: data.total || 0,
      page: data.page || page,
      totalPages: data.totalPages || 1,
    };
  },
};
