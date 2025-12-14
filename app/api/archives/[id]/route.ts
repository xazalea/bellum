import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

export const runtime = 'nodejs';

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'archives_delete', limit: 60, windowMs: 60_000, key: uid });

    const db = adminDb();
    const ref = db.collection('archives').doc(ctx.params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const data = snap.data() as any;
    if (data?.publisherUid && data.publisherUid !== uid) throw new Error('Not allowed');
    await ref.delete();
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

