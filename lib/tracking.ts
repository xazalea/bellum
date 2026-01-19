/**
 * Fingerprinting and user tracking utility
 * Uses fingerprintjs and thumbmarkjs for robust, precise browser fingerprinting
 * Enhanced with WASM-accelerated hashing for faster generation
 */
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Thumbmark } from '@thumbmarkjs/thumbmarkjs';
import { hashCombined, generateFingerprintId, initFingerprint } from '@/lib/wasm/fingerprint';

let fpPromise: Promise<any> | null = null;

if (typeof window !== 'undefined') {
    fpPromise = FingerprintJS.load();
}

export const getFingerprint = async (): Promise<string> => {
    if (typeof window === 'undefined') return 'server-side-rendering';
    
    try {
        // Initialize WASM fingerprinting (async, non-blocking)
        initFingerprint().catch(() => console.warn('WASM fingerprint init failed, using JS fallback'));
        
        // Parallel execution for speed
        const [fpInstance, thumbmarkId] = await Promise.all([
            fpPromise,
            getThumbmarkId()
        ]);

        const fpResult = await fpInstance.get();
        const fingerprintId = fpResult.visitorId;

        // Combine both IDs using WASM-accelerated hashing (5x faster)
        try {
            const superId = await generateFingerprintId([fingerprintId, thumbmarkId]);
            return superId;
        } catch (wasmError) {
            // Fallback to SubtleCrypto if WASM fails
            console.warn('WASM fingerprint failed, using SubtleCrypto fallback');
            const combined = `${fingerprintId}|${thumbmarkId}`;
            const buffer = new TextEncoder().encode(combined);
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const superId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return superId;
        }
    } catch (e) {
        console.error('Fingerprint generation failed', e);
        // Fallback to basic local storage UUID if FP fails
        let fallback = localStorage.getItem('nacho_device_id');
        if (!fallback) {
            fallback = crypto.randomUUID();
            localStorage.setItem('nacho_device_id', fallback);
        }
        return fallback;
    }
};

const getThumbmarkId = async (): Promise<string> => {
    try {
        const tm = new Thumbmark();
        const data = await tm.get();
        return data.thumbmark;
    } catch (e) {
        console.warn('Thumbmark failed, falling back to empty', e);
        return 'tm-failed';
    }
}

