import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireTrustedUser } from '@/app/api/user/_util';

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: { appId: string } }) {
  try {
    const { username } = await requireTrustedUser(req);
    const { appId } = ctx.params;
    const db = adminDb();
    const snap = await db.collection('users').doc(username).collection('apps').doc(appId).get();
    if (!snap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...(snap.data() as any) }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

export async function DELETE(req: Request, ctx: { params: { appId: string } }) {
  try {
    const { username } = await requireTrustedUser(req);
    const { appId } = ctx.params;
    const db = adminDb();
    await db.collection('users').doc(username).collection('apps').doc(appId).delete();
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

