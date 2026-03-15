export const runtime = "edge";
import { NextResponse } from 'next/server';
import { adminDb, requireAuthedUser } from '@/app/api/user/_util';



function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = normalizeUsername(searchParams.get('username'));
  if (!username) return NextResponse.json({ error: 'username_required' }, { status: 400 });
  const { uid } = await requireAuthedUser(req);
  const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
  const db = await adminDb();
  const accountSnap = await getDoc(doc(db, 'accounts', username));
  if (!accountSnap.exists()) return NextResponse.json({ error: 'account_not_found' }, { status: 404 });
  const account = accountSnap.data() as { ownerUid: string };
  if (account.ownerUid !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const challengeDocRef = doc(db, 'account_challenges', username);
  const challengeSnap = await getDoc(challengeDocRef);
  if (!challengeSnap.exists()) return NextResponse.json({ code: null });
  const challenge = challengeSnap.data() as { code: string; expiresAt: number };
  if (challenge.expiresAt < Date.now()) {
    await deleteDoc(challengeDocRef);
    return NextResponse.json({ code: null });
  }
  return NextResponse.json({ code: challenge.code, expiresAt: challenge.expiresAt });
}

