/**
 * Fingerprinting and user tracking utility
 * Uses fingerprintjs and thumbmarkjs for robust, precise browser fingerprinting
 */
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Thumbmark } from '@thumbmarkjs/thumbmarkjs';

let fpPromise: Promise<any> | null = null;

if (typeof window !== 'undefined') {
    fpPromise = FingerprintJS.load();
}

export const getFingerprint = async (): Promise<string> => {
    if (typeof window === 'undefined') return 'server-side-rendering';
    
    try {
        // Parallel execution for speed
        const [fpInstance, thumbmarkId] = await Promise.all([
            fpPromise,
            getThumbmarkId()
        ]);

        const fpResult = await fpInstance.get();
        const fingerprintId = fpResult.visitorId;

        // Combine both IDs for maximum precision and collision resistance
        // We hash them together to create a single unique "Super ID"
        const combined = `${fingerprintId}|${thumbmarkId}`;
        const buffer = new TextEncoder().encode(combined);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const superId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return superId;
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
        const data = await tm.getFingerprintData();
        return data.hash;
    } catch (e) {
        console.warn('Thumbmark failed, falling back to empty', e);
        return 'tm-failed';
    }
}

