import { NextResponse } from 'next/server';
import { adminDb, jsonError } from '@/app/api/user/_util';
import { isCurrentDeviceTrusted, normalizeUsername, requireFingerprint } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = adminDb();
    const snap = await db.collection('game_repositories').where('isPublic', '==', true).get();
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return jsonError(e, 400);
  }
}

export async function POST(req: Request) {
  try {
    const fingerprint = requireFingerprint(req);
    const username = normalizeUsername(req.headers.get('X-Nacho-Username') || '');
    const ok = await isCurrentDeviceTrusted(username, fingerprint);
    if (!ok) throw new Error('Device not trusted for that username');

    const body = (await req.json().catch(() => ({}))) as any;
    const repo = body.repo as any;
    if (!repo?.name || !repo?.description) throw new Error('Invalid repo');

    const db = adminDb();
    const ref = await db.collection('game_repositories').add({
      ...repo,
      ownerName: username,
      ownerId: fingerprint,
      createdAt: typeof repo.createdAt === 'number' ? repo.createdAt : Date.now(),
    });
    return NextResponse.json({ id: ref.id }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

