export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  type: 'html5' | 'apk' | 'exe';
  url?: string;
  width?: number;
  height?: number;
}

export interface GameFilters {
  search?: string;
  category?: string;
  type?: 'html5' | 'apk' | 'exe';
}

export interface GamesResponse {
  games: Game[];
  total: number;
  page: number;
  totalPages: number;
}
