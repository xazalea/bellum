import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { getFingerprint } from '@/lib/tracking';
import { clusterService } from './distributed-compute';

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
        const user = clusterService.getCurrentUser();
        const fingerprint = await getFingerprint();

        if (!user || !fingerprint) {
            return { success: false, message: 'Must be logged in to create a repository' };
        }

        // Verify identity match (User must own the device fingerprint)
        if (!user.devices.includes(fingerprint)) {
            return { success: false, message: 'Device authorization failed' };
        }

        try {
            const repoData: GameRepository = {
                name,
                description,
                ownerId: fingerprint, // Owner is identified by their primary fingerprint
                ownerName: user.username,
                games: [],
                isPublic,
                createdAt: Date.now()
            };

            const docRef = await addDoc(collection(db, 'game_repositories'), repoData);
            return { success: true, id: docRef.id, message: 'Repository created' };
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
            // Check ownership
            const repoRef = doc(db, 'game_repositories', repoId);
            const repoSnap = await getDoc(repoRef);

            if (!repoSnap.exists()) {
                return { success: false, message: 'Repository not found' };
            }

            const repoData = repoSnap.data() as GameRepository;
            
            // Allow owner to add
            // In a real app, we might check if user.devices includes repoData.ownerId for cross-device ownership
            // For now, simple direct check or username check
            const user = clusterService.getCurrentUser();
            if (repoData.ownerId !== fingerprint && repoData.ownerName !== user?.username) {
                return { success: false, message: 'You do not own this repository' };
            }

            await updateDoc(repoRef, {
                games: arrayUnion(game)
            });

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
            const q = query(collection(db, 'game_repositories'), where('isPublic', '==', true));
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GameRepository));
        } catch (e) {
            console.error('Error fetching repos:', e);
            return [];
        }
    }

    /**
     * Get my repositories
     */
    public async getMyRepositories(): Promise<GameRepository[]> {
        const user = clusterService.getCurrentUser();
        if (!user) return [];

        try {
            // Fetch by username to allow multi-device access
            const q = query(collection(db, 'game_repositories'), where('ownerName', '==', user.username));
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GameRepository));
        } catch (e) {
            console.error('Error fetching my repos:', e);
            return [];
        }
    }
}

export const gameRepoService = GameRepositoryService.getInstance();
