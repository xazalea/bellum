import FingerprintJS from "@fingerprintjs/fingerprintjs";

/**
 * Returns a stable device identifier (best-effort).
 * Primary: @fingerprintjs/fingerprintjs
 * Secondary: @thumbmarkjs/thumbmarkjs
 * Tertiary: localStorage UUID
 */
export async function getDeviceFingerprintId(): Promise<string> {
  // Primary: FingerprintJS
  try {
    const fp = await FingerprintJS.load();
    const res = await fp.get();
    return res.visitorId;
  } catch (primaryError) {
    console.warn('[Fingerprint] Primary provider failed, trying secondary:', primaryError);
  }

  // Secondary: ThumbmarkJS
  try {
    const { getFingerprint } = await import('@thumbmarkjs/thumbmarkjs');
    const id = await getFingerprint();
    if (id) return String(id);
  } catch (secondaryError) {
    console.warn('[Fingerprint] Secondary provider failed:', secondaryError);
  }

  // Tertiary: persistent localStorage UUID
  let fallback = localStorage.getItem('challenger_device_fallback');
  if (!fallback) {
    fallback = crypto.randomUUID();
    localStorage.setItem('challenger_device_fallback', fallback);
    console.warn('[Fingerprint] Using fallback UUID:', fallback);
  }
  return fallback;
}


