import { NextResponse } from 'next/server';
import { adminDb, jsonError } from '@/app/api/user/_util';
import { isCurrentDeviceTrusted, normalizeUsername, requireFingerprint } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const fingerprint = requireFingerprint(req);
    const usernameRaw = req.headers.get('X-Nacho-Username') || '';
    const username = normalizeUsername(usernameRaw);
    const ok = await isCurrentDeviceTrusted(username, fingerprint);
    if (!ok) throw new Error('Device not trusted for that username');

    const db = adminDb();
    const ref = db.collection('archives').doc(ctx.params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const data = snap.data() as any;
    if (data?.publisherUid && data.publisherUid !== username) throw new Error('Not allowed');
    await ref.delete();
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

