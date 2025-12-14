import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: { appId: string } }) {
  try {
    const { uid } = await requireAuthedUser(req);
    const { appId } = ctx.params;
    const db = adminDb();
    const snap = await db.collection('users').doc(uid).collection('apps').doc(appId).get();
    if (!snap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...(snap.data() as any) }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

export async function DELETE(req: Request, ctx: { params: { appId: string } }) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'user_apps_delete', limit: 60, windowMs: 60_000, key: uid });
    const { appId } = ctx.params;
    const db = adminDb();
    await db.collection('users').doc(uid).collection('apps').doc(appId).delete();
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

