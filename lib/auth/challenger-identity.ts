import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

export type ChallengerIdentity = {
  uid: string; // stable per-device id (fingerprint)
  username?: string | null;
};

let cached: ChallengerIdentity | null = null;
let profileChecked = false;
const STORAGE_KEY = 'challenger.uid';

export async function getChallengerIdentity(): Promise<ChallengerIdentity> {
  if (typeof window === 'undefined') return { uid: 'server' };
  if (cached) return cached;

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

  // Attempt to fetch profile once per session to see if a username is linked
  let username: string | null = null;
  if (!profileChecked) {
    profileChecked = true;
    try {
      const res = await fetch('/api/user/profile', { cache: 'no-store', headers: { 'X-Challenger-UserId': uid } });
      if (res.ok) {
        const j = await res.json();
        username = j.handle || null;
      }
    } catch {
      // Server not configured — skip silently
    }
  }

  cached = { uid, username };
  return cached;
}

/** Bust the cached identity so the next call re-fetches the profile. */
export function invalidateChallengerIdentity(): void {
  cached = null;
  profileChecked = false;
}

export async function getChallengerHeaders(): Promise<Record<string, string>> {
  const id = await getChallengerIdentity();
  return { 'X-Challenger-UserId': id.uid };
}

// Backward compatibility aliases
export type { ChallengerIdentity as ChallengerIdentity };
export { getChallengerIdentity as getChallengerIdentity, invalidateChallengerIdentity as invalidateChallengerIdentity, getChallengerHeaders as getChallengerHeaders };