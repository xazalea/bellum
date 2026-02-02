import { NextResponse } from 'next/server';
import { adminDb, requireAuthedUser } from '@/app/api/user/_util';

export const runtime = 'edge';

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
  const accountSnap = await (await adminDb()).collection('accounts').doc(username).get();
  if (!accountSnap.exists) return NextResponse.json({ error: 'account_not_found' }, { status: 404 });
  const account = accountSnap.data() as { ownerUid: string };
  if (account.ownerUid !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const challengeSnap = await (await adminDb()).collection('account_challenges').doc(username).get();
  if (!challengeSnap.exists) return NextResponse.json({ code: null });
  const challenge = challengeSnap.data() as { code: string; expiresAt: number };
  if (challenge.expiresAt < Date.now()) {
    await challengeSnap.ref.delete();
    return NextResponse.json({ code: null });
  }
  return NextResponse.json({ code: challenge.code, expiresAt: challenge.expiresAt });
}

