import FingerprintJS from "@fingerprintjs/fingerprintjs";

/**
 * Returns a stable device identifier (best-effort).
 * This is used for Nacho username+fingerprint auth (no passwords).
 */
export async function getDeviceFingerprintId(): Promise<string> {
  const fp = await FingerprintJS.load();
  const res = await fp.get();
  return res.visitorId;
}

