/**
 * Simple fingerprinting and user tracking utility
 * Simulates functionalities of fingerprintjs and supercookie
 */

export const getFingerprint = async (): Promise<string> => {
    // Try to use persistent storage
    let fp = localStorage.getItem('nacho_fingerprint');
    
    if (!fp) {
        // Generate a new one using available browser signals (simulated high-entropy)
        const signals = [
            navigator.userAgent,
            navigator.language,
            (navigator as any).deviceMemory,
            navigator.hardwareConcurrency,
            new Date().getTimezoneOffset(),
            window.screen.width + 'x' + window.screen.height,
            // Canvas fingerprint simulation
            getCanvasFingerprint()
        ];

        const raw = signals.join('|');
        const buffer = new TextEncoder().encode(raw);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        fp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        localStorage.setItem('nacho_fingerprint', fp);
    }

    return fp;
};

const getCanvasFingerprint = () => {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no_canvas';
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('NachoEngine', 2, 15);
        return canvas.toDataURL();
    } catch (e) {
        return 'error';
    }
};

