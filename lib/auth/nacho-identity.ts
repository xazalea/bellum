import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

export type NachoIdentity = {
  uid: string; // stable per-device id (fingerprint)
};

let cached: NachoIdentity | null = null;
const STORAGE_KEY = 'nacho.uid';

export async function getNachoIdentity(): Promise<NachoIdentity> {
  if (typeof window === 'undefined') return { uid: 'server' };
  if (cached) return cached;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      cached = { uid: existing };
      return cached;
    }
  } catch {
    // ignore
  }
  const uid = await getDeviceFingerprintId();
  cached = { uid };
  try {
    window.localStorage.setItem(STORAGE_KEY, uid);
  } catch {
    // ignore
  }
  return cached;
}

export async function getNachoHeaders(): Promise<Record<string, string>> {
  const id = await getNachoIdentity();
  return { 'X-Nacho-UserId': id.uid };
}

