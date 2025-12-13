import { getCachedUsername } from '@/lib/auth/nacho-auth';
import { getFingerprint } from '@/lib/tracking';

export interface GameRepository {
    id?: string;
    name: string;
    description: string;
    ownerId: string; // Fingerprint ID
    ownerName: string; // Username
    games: GameEntry[];
    isPublic: boolean;
    createdAt: number;
}

export interface GameEntry {
    id: string;
    name: string;
    type: string; // 'apk', 'exe', 'iso', 'code'
    size: number;
    downloadUrl: string; // URL to CloudDatabase (or simulated HiberFile)
    addedAt: number;
}

export class GameRepositoryService {
    private static instance: GameRepositoryService;
    
    private constructor() {}

    public static getInstance(): GameRepositoryService {
        if (!GameRepositoryService.instance) {
            GameRepositoryService.instance = new GameRepositoryService();
        }
        return GameRepositoryService.instance;
    }

    /**
     * Create a new Game Repository
     * Requires User to be logged in via Distributed Compute Service (Cluster)
     */
    public async createRepository(name: string, description: string, isPublic: boolean = true): Promise<{ success: boolean; id?: string; message: string }> {
        const fingerprint = await getFingerprint();
        const username = getCachedUsername();

        if (!username || !fingerprint) {
            return { success: false, message: 'Must be logged in to create a repository' };
        }

        try {
            const repoData: GameRepository = {
                name,
                description,
                ownerId: fingerprint, // Owner is identified by their primary fingerprint
                ownerName: username,
                games: [],
                isPublic,
                createdAt: Date.now()
            };
            const res = await fetch('/api/game-repositories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Nacho-Username': username,
                    'X-Nacho-Fingerprint': fingerprint,
                },
                body: JSON.stringify({ repo: repoData }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => null) as any;
                return { success: false, message: j?.error || 'Failed to create repository' };
            }
            const j = await res.json() as { id: string };
            return { success: true, id: j.id, message: 'Repository created' };
        } catch (e) {
            console.error('Error creating repo:', e);
            return { success: false, message: 'Failed to create repository' };
        }
    }

    /**
     * Add a game to a repository
     */
    public async addGameToRepo(repoId: string, game: GameEntry): Promise<{ success: boolean; message: string }> {
        const fingerprint = await getFingerprint();
        if (!fingerprint) return { success: false, message: 'Authentication failed' };

        try {
            const username = getCachedUsername();
            if (!username) return { success: false, message: 'Login required' };
            const res = await fetch(`/api/game-repositories/${encodeURIComponent(repoId)}/games`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Nacho-Username': username,
                    'X-Nacho-Fingerprint': fingerprint,
                },
                body: JSON.stringify({ game }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => null) as any;
                return { success: false, message: j?.error || 'Failed to add game' };
            }
            return { success: true, message: 'Game added to repository' };
        } catch (e) {
            console.error('Error adding game:', e);
            return { success: false, message: 'Failed to add game' };
        }
    }

    /**
     * Get all public repositories
     * Anyone can view this (no auth required)
     */
    public async getPublicRepositories(): Promise<GameRepository[]> {
        try {
            const res = await fetch('/api/game-repositories');
            if (!res.ok) return [];
            const items = await res.json().catch(() => []) as GameRepository[];
            return Array.isArray(items) ? items : [];
        } catch (e) {
            console.error('Error fetching repos:', e);
            return [];
        }
    }

    /**
     * Get my repositories
     */
    public async getMyRepositories(): Promise<GameRepository[]> {
        const username = getCachedUsername();
        const fingerprint = await getFingerprint();
        if (!username || !fingerprint) return [];

        try {
            const res = await fetch('/api/game-repositories/mine', {
                headers: {
                    'X-Nacho-Username': username,
                    'X-Nacho-Fingerprint': fingerprint,
                }
            });
            if (!res.ok) return [];
            const items = await res.json().catch(() => []) as GameRepository[];
            return Array.isArray(items) ? items : [];
        } catch (e) {
            console.error('Error fetching my repos:', e);
            return [];
        }
    }
}

export const gameRepoService = GameRepositoryService.getInstance();
