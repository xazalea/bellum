import FingerprintJS from "@fingerprintjs/fingerprintjs";

/**
 * Returns a stable device identifier (best-effort).
 * This is used for Challenger username+fingerprint auth (no passwords).
 */
export async function getDeviceFingerprintId(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();
    const res = await fp.get();
    return res.visitorId;
  } catch (error) {
    console.error('[Fingerprint] Failed to generate fingerprint:', error);
    // Fallback to localStorage UUID if fingerprinting fails
    let fallback = localStorage.getItem('challenger_device_fallback');
    if (!fallback) {
      fallback = crypto.randomUUID();
      localStorage.setItem('challenger_device_fallback', fallback);
      console.warn('[Fingerprint] Using fallback UUID:', fallback);
    }
    return fallback;
  }
}


