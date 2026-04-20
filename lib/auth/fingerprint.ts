/**
 * Returns a stable device identifier (best-effort).
 * Primary: @fingerprintjs/fingerprintjs
 * Secondary: @thumbmarkjs/thumbmarkjs
 * Tertiary: localStorage UUID
 *
 * Browser-only packages are aliased to `false` in next.config.js for
 * server/edge builds (they reference `document` at module level).
 * Dynamic imports with typeof-window guards prevent crashes.
 */
export async function getDeviceFingerprintId(): Promise<string> {
  // SSR / edge guard — fingerprinting requires a browser DOM
  if (typeof window === 'undefined') return 'server-side';

  // Primary: FingerprintJS
  try {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
    if (FingerprintJS?.load) {
      const fp = await FingerprintJS.load();
      const res = await fp.get();
      return res.visitorId;
    }
  } catch (primaryError) {
    console.warn('[Fingerprint] Primary provider failed, trying secondary:', primaryError);
  }

  // Secondary: ThumbmarkJS
  try {
    const { getFingerprint } = await import('@thumbmarkjs/thumbmarkjs');
    if (getFingerprint) {
      const id = await getFingerprint();
      if (id) return String(id);
    }
  } catch (secondaryError) {
    console.warn('[Fingerprint] Secondary provider failed:', secondaryError);
  }

  // Tertiary: persistent localStorage UUID
  try {
    let fallback = localStorage.getItem('challenger_device_fallback');
    if (!fallback) {
      fallback = crypto.randomUUID();
      localStorage.setItem('challenger_device_fallback', fallback);
      console.warn('[Fingerprint] Using fallback UUID:', fallback);
    }
    return fallback;
  } catch {
    return crypto.randomUUID();
  }
}


