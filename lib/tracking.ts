/**
 * Fingerprinting and user tracking utility
 * Uses fingerprintjs and thumbmarkjs for robust, precise browser fingerprinting
 * Enhanced with WASM-accelerated hashing for faster generation
 */
import { hashCombined, generateFingerprintId, initFingerprint } from '@/lib/wasm/fingerprint';

// Browser-only packages are aliased to `false` in next.config.js for
// server/edge builds (they reference `document` at module level).
// Static imports would crash the build — use dynamic imports with typeof-window guards.
let fpPromise: Promise<any> | null = null;

if (typeof window !== 'undefined') {
    // Assign the full import chain to fpPromise immediately so any
    // concurrent call to getFingerprint() awaits the same Promise.
    fpPromise = import('@fingerprintjs/fingerprintjs')
        .then(({ default: FingerprintJS }) => FingerprintJS?.load?.())
        .catch(() => null);
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

        if (!fpInstance) {
            // FingerprintJS unavailable — use thumbmark + fallback
            return thumbmarkId !== 'tm-failed' ? thumbmarkId : crypto.randomUUID();
        }
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
        let fallback = localStorage.getItem('challenger_device_id');
        if (!fallback) {
            fallback = crypto.randomUUID();
            localStorage.setItem('challenger_device_id', fallback);
        }
        return fallback;
    }
};

const getThumbmarkId = async (): Promise<string> => {
    try {
        const { Thumbmark } = await import('@thumbmarkjs/thumbmarkjs');
        if (!Thumbmark) return 'tm-unavailable';
        const tm = new Thumbmark();
        const data = await tm.get();
        return data.thumbmark;
    } catch (e) {
        console.warn('Thumbmark failed, falling back to empty', e);
        return 'tm-failed';
    }
}

