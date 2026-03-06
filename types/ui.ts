export interface ImportedApp {
  id: string;
  name: string;
  type: 'android' | 'windows';
  size: number;
  uploadedAt: Date;
  storageRef: string; // Telegram/Discord storage reference
  thumbnail?: string;
}

export interface DynamicIslandState {
  size: 'default' | 'compact' | 'large' | 'tall' | 'medium' | 'ultra' | 'massive';
  isAnimating: boolean;
  content: IslandContent;
}

export type IslandContent = 
  | { type: 'navigation'; activeRoute: string }
  | { type: 'status'; message: string; status: 'loading' | 'success' | 'error' }
  | { type: 'action'; label: string; onClick: () => void };

export interface GameImage {
  id: string;
  src: string;
  alt: string;
  title?: string;
}