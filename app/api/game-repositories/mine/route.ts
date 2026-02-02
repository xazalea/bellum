import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { uid } = await requireAuthedUser(req);

    const db = await adminDb();
    const snap = await db.collection('game_repositories').where('ownerUid', '==', uid).get();
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

