import { NextResponse } from 'next/server';
import { adminDb, jsonError } from '@/app/api/user/_util';
import { isCurrentDeviceTrusted, normalizeUsername, requireFingerprint } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = adminDb();
    const snap = await db.collection('archives').orderBy('publishedAt', 'desc').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    return jsonError(e, 400);
  }
}

export async function POST(req: Request) {
  try {
    const fingerprint = requireFingerprint(req);
    const usernameRaw = req.headers.get('X-Nacho-Username') || '';
    const username = normalizeUsername(usernameRaw);
    const ok = await isCurrentDeviceTrusted(username, fingerprint);
    if (!ok) throw new Error('Device not trusted for that username');

    const body = (await req.json().catch(() => ({}))) as any;
    const entry = body.entry as any;
    if (!entry?.fileId || !entry?.name) throw new Error('Invalid entry');

    const db = adminDb();
    const now = Date.now();
    const ref = await db.collection('archives').add({
      ...entry,
      publisherUid: username,
      publishedAt: now,
    });
    return NextResponse.json({ id: ref.id }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

