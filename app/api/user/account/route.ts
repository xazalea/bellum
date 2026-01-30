import { NextResponse } from 'next/server';
import { adminDb, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit } from '@/lib/server/security';

export const runtime = 'nodejs';

type Action = 'create' | 'signin' | 'verify';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const CODE_TTL_MS = 5 * 60 * 1000;

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const { username: rawUsername, action, code } = (await req.json().catch(() => ({}))) as {
      username?: unknown;
      action?: Action;
      code?: string;
    };
    const name = normalizeUsername(rawUsername);
    if (!name) return NextResponse.json({ error: 'missing_username' }, { status: 400 });
    if (!USERNAME_REGEX.test(name)) return NextResponse.json({ error: 'invalid_username' }, { status: 400 });
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'account_route', limit: 60, windowMs: 60_000, key: `${action || 'unknown'}:${name}` });

    if (action === 'create') {
      const doc = adminDb().collection('accounts').doc(name);
      const snapshot = await doc.get();
      if (snapshot.exists) return NextResponse.json({ error: 'username_taken' }, { status: 409 });
      
      // Update account ownership and sync profile/handle
      const batch = adminDb().batch();
      batch.set(doc, { username: name, ownerUid: uid, createdAt: Date.now() });
      batch.set(adminDb().collection('users').doc(uid), { handle: name, updatedAt: Date.now() }, { merge: true });
      batch.set(adminDb().collection('handles').doc(name), { uid, updatedAt: Date.now() });
      await batch.commit();
      
      return NextResponse.json({ status: 'created' });
    }

    const acctDoc = await adminDb().collection('accounts').doc(name).get();
    if (!acctDoc.exists) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const acct = acctDoc.data() as { ownerUid: string };

    if (action === 'signin') {
      if (acct.ownerUid === uid) {
        return NextResponse.json({ status: 'ok' });
      }
      const challengeDoc = adminDb().collection('account_challenges').doc(name);
      const challengeCode = generateCode();
      await challengeDoc.set({
        username: name,
        code: challengeCode,
        newUid: uid,
        createdAt: Date.now(),
        expiresAt: Date.now() + CODE_TTL_MS,
      });
      return NextResponse.json({ status: 'challenge_created' });
    }

    if (action === 'verify') {
      if (!code) return NextResponse.json({ error: 'code_required' }, { status: 400 });
      const challengeDoc = await adminDb().collection('account_challenges').doc(name).get();
      if (!challengeDoc.exists) return NextResponse.json({ error: 'challenge_missing' }, { status: 404 });
      const challenge = challengeDoc.data() as {
        code: string;
        expiresAt: number;
        newUid: string;
      };
      if (challenge.expiresAt < Date.now()) {
        await challengeDoc.ref.delete();
        return NextResponse.json({ error: 'challenge_expired' }, { status: 410 });
      }
      if (challenge.newUid !== uid) {
        return NextResponse.json({ error: 'mismatched_device' }, { status: 403 });
      }
      if (challenge.code !== code.trim()) {
        return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
      }
      
      const batch = adminDb().batch();
      // Transfer account ownership
      batch.set(adminDb().collection('accounts').doc(name), { ownerUid: uid, lastSwitchedAt: Date.now() }, { merge: true });
      // Sync profile and handle index
      batch.set(adminDb().collection('users').doc(uid), { handle: name, updatedAt: Date.now() }, { merge: true });
      batch.set(adminDb().collection('handles').doc(name), { uid, updatedAt: Date.now() });
      // Delete challenge
      batch.delete(challengeDoc.ref);
      
      await batch.commit();

      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (e: any) {
    const msg = e?.message || 'account_error';
    const status = msg.includes('unauthenticated') ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

