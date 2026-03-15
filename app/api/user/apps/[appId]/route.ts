export const runtime = "edge";
import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';



export async function GET(req: Request, ctx: { params: { appId: string } }) {
  try {
    const { uid } = await requireAuthedUser(req);
    const { doc, getDoc } = await import('firebase/firestore');
    const { appId } = ctx.params;
    const db = await adminDb();
    const snap = await getDoc(doc(db, 'users', uid, 'apps', appId));
    if (!snap.exists()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
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
    const { doc, deleteDoc } = await import('firebase/firestore');
    const { appId } = ctx.params;
    const db = await adminDb();
    await deleteDoc(doc(db, 'users', uid, 'apps', appId));
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}
