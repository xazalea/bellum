/**
 * Infinite Storage - Memory-Mapped Virtual Filesystem
 * The public API for the "Near Unlimited Storage" system.
 */

import { casManager } from './cas-manager';

export class InfiniteStorage {
    private static instance: InfiniteStorage;

    static getInstance(): InfiniteStorage {
        if (!InfiniteStorage.instance) {
            InfiniteStorage.instance = new InfiniteStorage();
        }
        return InfiniteStorage.instance;
    }

    async initialize() {
        await casManager.loadIndex();
        console.log('InfiniteStorage: VFS Online. "Unlimited" capacity active.');
    }

    /**
     * Write file to Infinite Storage
     * Automatically handles Chunking, Dedup, and Compression.
     */
    async writeFile(path: string, data: Uint8Array | Blob | string): Promise<void> {
        let bytes: Uint8Array;
        
        if (data instanceof Blob) {
            bytes = new Uint8Array(await data.arrayBuffer());
        } else if (typeof data === 'string') {
            bytes = new TextEncoder().encode(data);
        } else {
            bytes = data;
        }

        await casManager.storeFile(path, bytes);
    }

    /**
     * Read file from Infinite Storage
     * Transparently reassembles and decompresses chunks.
     */
    async readFile(path: string): Promise<Blob> {
        const bytes = await casManager.readFile(path);
        if (!bytes) throw new Error(`File not found: ${path}`);
        // @ts-ignore - ArrayBufferLike Strictness
        return new Blob([bytes]);
    }

    /**
     * Virtual Snapshots
     * Archive current state of a directory
     */
    async snapshot(path: string) {
        // TODO: Implement directory traversal and manifest cloning
    }
}

export const infiniteStorage = InfiniteStorage.getInstance();

