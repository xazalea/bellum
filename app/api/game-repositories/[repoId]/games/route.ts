import { NextResponse } from 'next/server';
import { adminDb, jsonError } from '@/app/api/user/_util';
import { isCurrentDeviceTrusted, normalizeUsername, requireFingerprint } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: { repoId: string } }) {
  try {
    const fingerprint = requireFingerprint(req);
    const username = normalizeUsername(req.headers.get('X-Nacho-Username') || '');
    const ok = await isCurrentDeviceTrusted(username, fingerprint);
    if (!ok) throw new Error('Device not trusted for that username');

    const body = (await req.json().catch(() => ({}))) as any;
    const game = body.game as any;
    if (!game?.id || !game?.name) throw new Error('Invalid game');

    const db = adminDb();
    const repoRef = db.collection('game_repositories').doc(ctx.params.repoId);
    const snap = await repoRef.get();
    if (!snap.exists) throw new Error('Repository not found');
    const repo = snap.data() as any;
    if (repo?.ownerName !== username && repo?.ownerId !== fingerprint) throw new Error('You do not own this repository');

    const games = Array.isArray(repo?.games) ? repo.games : [];
    games.push(game);
    await repoRef.set({ games }, { merge: true });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

