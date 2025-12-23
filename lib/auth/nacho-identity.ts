import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

export type NachoIdentity = {
  uid: string; // stable per-device id (fingerprint)
  username?: string | null;
};

let cached: NachoIdentity | null = null;
const STORAGE_KEY = 'nacho.uid';

export async function getNachoIdentity(): Promise<NachoIdentity> {
  if (typeof window === 'undefined') return { uid: 'server' };
  if (cached && cached.username) return cached;

  let uid: string | null = null;
  try {
    uid = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  if (!uid) {
    uid = await getDeviceFingerprintId();
    try {
      window.localStorage.setItem(STORAGE_KEY, uid);
    } catch {
      // ignore
    }
  }

  // Attempt to fetch profile to see if a username is linked
  let username: string | null = null;
  try {
    const res = await fetch('/api/user/profile', { cache: 'no-store', headers: { 'X-Nacho-UserId': uid } });
    if (res.ok) {
      const j = await res.json();
      username = j.handle || null;
    }
  } catch (e) {
    console.warn('[Identity] Failed to fetch linked username', e);
  }

  cached = { uid, username };
  return cached;
}

export async function getNachoHeaders(): Promise<Record<string, string>> {
  const id = await getNachoIdentity();
  return { 'X-Nacho-UserId': id.uid };
}
