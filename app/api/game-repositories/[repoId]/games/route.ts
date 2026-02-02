import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

export const runtime = 'edge';

export async function POST(req: Request, ctx: { params: { repoId: string } }) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'game_repos_add_game', limit: 300, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as any;
    const game = body.game as any;
    if (!game?.id || !game?.name) throw new Error('Invalid game');

    const db = await adminDb();
    const repoRef = db.collection('game_repositories').doc(ctx.params.repoId);
    const snap = await repoRef.get();
    if (!snap.exists) throw new Error('Repository not found');
    const repo = snap.data() as any;
    if (repo?.ownerUid !== uid) throw new Error('You do not own this repository');

    const games = Array.isArray(repo?.games) ? repo.games : [];
    games.push(game);
    await repoRef.set({ games }, { merge: true });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

