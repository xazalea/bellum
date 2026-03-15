export const runtime = "edge";
import { NextResponse } from 'next/server';
import { adminDb, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit } from '@/lib/server/security';



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

    const { doc, getDoc, writeBatch, collection } = await import('firebase/firestore');
    const { adminDb } = await import('@/app/api/user/_util');
    const db = await adminDb();
    rateLimit(req, { scope: 'account_route', limit: 60, windowMs: 60_000, key: `${action || 'unknown'}:${name}` });

    if (action === 'create') {
      const accountRef = doc(db, 'accounts', name);
      const snapshot = await getDoc(accountRef);
      if (snapshot.exists()) return NextResponse.json({ error: 'username_taken' }, { status: 409 });

      const batch = writeBatch(db);
      batch.set(accountRef, { username: name, ownerUid: uid, createdAt: Date.now() });
      batch.set(doc(db, 'users', uid), { handle: name, updatedAt: Date.now() }, { merge: true });
      batch.set(doc(db, 'handles', name), { uid, updatedAt: Date.now() });
      await batch.commit();

      return NextResponse.json({ status: 'created' });
    }

    const acctRef = doc(db, 'accounts', name);
    const acctDoc = await getDoc(acctRef);
    if (!acctDoc.exists()) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const acct = acctDoc.data() as { ownerUid: string };

    if (action === 'signin') {
      if (acct.ownerUid === uid) {
        return NextResponse.json({ status: 'ok' });
      }
      const challengeDocRef = doc(db, 'account_challenges', name);
      const challengeCode = generateCode();
      await import('firebase/firestore').then(({ setDoc }) => setDoc(challengeDocRef, {
        username: name,
        code: challengeCode,
        newUid: uid,
        createdAt: Date.now(),
        expiresAt: Date.now() + CODE_TTL_MS,
      }));
      return NextResponse.json({ status: 'challenge_created' });
    }

    if (action === 'verify') {
      if (!code) return NextResponse.json({ error: 'code_required' }, { status: 400 });
      const challengeDocRef = doc(db, 'account_challenges', name);
      const challengeDoc = await getDoc(challengeDocRef);
      if (!challengeDoc.exists()) return NextResponse.json({ error: 'challenge_missing' }, { status: 404 });
      const challenge = challengeDoc.data() as {
        code: string;
        expiresAt: number;
        newUid: string;
      };
      if (challenge.expiresAt < Date.now()) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(challengeDocRef);
        return NextResponse.json({ error: 'challenge_expired' }, { status: 410 });
      }
      if (challenge.newUid !== uid) {
        return NextResponse.json({ error: 'mismatched_device' }, { status: 403 });
      }
      if (challenge.code !== code.trim()) {
        return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
      }

      const batch = writeBatch(db);
      // Transfer account ownership
      batch.set(doc(db, 'accounts', name), { ownerUid: uid, lastSwitchedAt: Date.now() }, { merge: true });
      // Sync profile and handle index
      batch.set(doc(db, 'users', uid), { handle: name, updatedAt: Date.now() }, { merge: true });
      batch.set(doc(db, 'handles', name), { uid, updatedAt: Date.now() });
      // Delete challenge
      batch.delete(challengeDocRef);

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

