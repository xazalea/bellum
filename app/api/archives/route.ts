import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

export const runtime = 'edge';

export async function GET() {
  try {
    const db = await adminDb();
    const snap = await db.collection('archives').orderBy('publishedAt', 'desc').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    return jsonError(e, 400);
  }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'archives_publish', limit: 60, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as any;
    const entry = body.entry as any;
    if (!entry?.fileId || !entry?.name) throw new Error('Invalid entry');

    const db = await adminDb();
    const now = Date.now();
    const ref = await db.collection('archives').add({
      ...entry,
      publisherUid: uid,
      publishedAt: now,
    });
    return NextResponse.json({ id: ref.id }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

