import 'server-only';

import { randomInt } from 'crypto';
import { getAdminDb } from '@/lib/server/firebase-admin';

export type NachoAuthOk = { status: 'ok'; username: string };
export type NachoAuthChallenge = {
  status: 'challenge';
  username: string;
  challengeId: string;
  code: string;
  expiresAt: number;
};
export type NachoAuthResult = NachoAuthOk | NachoAuthChallenge;

export function normalizeUsername(input: string): string {
  const u = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) throw new Error('Username must be 3–20 chars: a-z, 0-9, underscore.');
  return u;
}

export function requireFingerprint(req: Request): string {
  const fp = req.headers.get('X-Nacho-Fingerprint') || '';
  if (!fp) throw new Error('Missing fingerprint');
  return fp;
}

function randCode(): string {
  return String(randomInt(100000, 1000000));
}

export async function signupUsername(usernameInput: string, fingerprint: string): Promise<NachoAuthResult> {
  const username = normalizeUsername(usernameInput);
  const db = getAdminDb();

  const ref = db.collection('accounts').doc(username);
  const snap = await ref.get();
  if (snap.exists) throw new Error('Username already taken.');

  const now = Date.now();
  await ref.set({
    username,
    primaryUid: username, // legacy field; we treat username as principal id
    trustedUids: [username],
    trustedFingerprints: [fingerprint],
    createdAt: now,
    lastLogin: now,
  });

  return { status: 'ok', username };
}

export async function signinUsername(usernameInput: string, fingerprint: string): Promise<NachoAuthResult> {
  const username = normalizeUsername(usernameInput);
  const db = getAdminDb();

  const ref = db.collection('accounts').doc(username);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('User not found.');

  const acc = snap.data() as any;
  const trusted = Array.isArray(acc?.trustedFingerprints) && acc.trustedFingerprints.includes(fingerprint);

  const now = Date.now();
  if (trusted) {
    await ref.set({ lastLogin: now }, { merge: true });
    return { status: 'ok', username };
  }

  const code = randCode();
  const expiresAt = now + 5 * 60 * 1000;
  const chRef = await ref.collection('challenges').add({
    code,
    status: 'pending',
    requesterFingerprint: fingerprint,
    createdAt: now,
    expiresAt,
  });

  return { status: 'challenge', username, challengeId: chRef.id, code, expiresAt };
}

export async function approveLoginCode(usernameInput: string, fingerprint: string, code: string): Promise<void> {
  const username = normalizeUsername(usernameInput);
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) throw new Error('Enter a 6-digit code.');

  const db = getAdminDb();
  const ref = db.collection('accounts').doc(username);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Account not found');

  const acc = snap.data() as any;
  const isTrusted = Array.isArray(acc?.trustedFingerprints) && acc.trustedFingerprints.includes(fingerprint);
  if (!isTrusted) throw new Error('This device is not trusted for that username.');

  const qs = await ref
    .collection('challenges')
    .where('status', '==', 'pending')
    .where('code', '==', normalizedCode)
    .limit(1)
    .get();

  if (qs.empty) throw new Error('Code not found or already used.');

  const chSnap = qs.docs[0];
  const ch = chSnap.data() as any;
  const exp = typeof ch?.expiresAt === 'number' ? ch.expiresAt : 0;
  if (Date.now() > exp) {
    await chSnap.ref.set({ status: 'expired', resolvedAt: Date.now() }, { merge: true });
    throw new Error('Code expired.');
  }

  const requesterFingerprint = String(ch?.requesterFingerprint || '');
  if (!requesterFingerprint) throw new Error('Invalid challenge.');

  // Add fingerprint to trusted list (idempotent)
  const next = new Set<string>(Array.isArray(acc?.trustedFingerprints) ? acc.trustedFingerprints : []);
  next.add(requesterFingerprint);
  await ref.set({ trustedFingerprints: Array.from(next), lastLogin: Date.now() }, { merge: true });

  await chSnap.ref.set(
    {
      status: 'approved',
      approvedByFingerprint: fingerprint,
      approvedAt: Date.now(),
      resolvedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function isCurrentDeviceTrusted(usernameInput: string, fingerprint: string): Promise<boolean> {
  const username = normalizeUsername(usernameInput);
  const db = getAdminDb();
  const snap = await db.collection('accounts').doc(username).get();
  if (!snap.exists) return false;
  const acc = snap.data() as any;
  return Array.isArray(acc?.trustedFingerprints) && acc.trustedFingerprints.includes(fingerprint);
}
