/**
 * Distributed WASM Cache
 * Caches compiled WASM modules locally and shares them over the P2P network
 */

import { p2pNode } from '../net/p2p_node';

export class WasmCache {
    private localCache: Map<string, ArrayBuffer> = new Map();

    constructor() {
        this.initializeListeners();
    }

    private initializeListeners() {
        const node = p2pNode;
        if (!node) return;

        node.onMessage((msg, from) => {
            if (msg.type === 'WASM_REQUEST') {
                const hash = msg.payload.hash;
                if (this.localCache.has(hash)) {
                    console.log(`[WasmCache] Serving WASM ${hash} to ${from}`);
                    node.send(from, {
                        type: 'WASM_RESPONSE',
                        payload: { hash, data: this.localCache.get(hash) } // Note: JSON stringify of ArrayBuffer needs handling
                    });
                }
            } else if (msg.type === 'WASM_RESPONSE') {
                // Handle incoming WASM
                // In a real app we'd resolve a pending promise
                console.log(`[WasmCache] Received WASM ${msg.payload.hash} from ${from}`);
            }
        });
    }

    /**
     * Get WASM binary by hash
     */
    async getModule(hash: string): Promise<ArrayBuffer | null> {
        // 1. Check Memory Cache
        if (this.localCache.has(hash)) {
            return this.localCache.get(hash)!;
        }

        // 2. Check IndexedDB (TODO)
        
        // 3. Ask Network
        console.log(`[WasmCache] Requesting WASM ${hash} from network...`);
        if (p2pNode) {
            p2pNode.broadcast({
                type: 'WASM_REQUEST',
                payload: { hash }
            });
        }

        // For now, return null immediately as network is async and we don't have a promise map yet
        return null;
    }

    /**
     * Store compiled module
     */
    async storeModule(hash: string, data: ArrayBuffer): Promise<void> {
        this.localCache.set(hash, data);
        // TODO: Persist to IndexedDB
    }

    /**
     * Compute hash of source code/bytecode
     */
    async computeHash(data: ArrayBuffer): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

export const wasmCache = new WasmCache();
