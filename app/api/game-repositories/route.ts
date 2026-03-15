export const runtime = "edge";
import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';



export async function GET() {
  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const db = await adminDb();
    const snap = await getDocs(query(collection(db, 'game_repositories'), where('isPublic', '==', true)));
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return jsonError(e, 400);
  }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid, name } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'game_repos_create', limit: 60, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as any;
    const repo = body.repo as any;
    if (!repo?.name || !repo?.description) throw new Error('Invalid repo');

    const { collection, addDoc } = await import('firebase/firestore');
    const db = await adminDb();
    const ref = await addDoc(collection(db, 'game_repositories'), {
      ...repo,
      ownerUid: uid,
      ownerName: typeof name === 'string' && name ? name : null,
      createdAt: typeof repo.createdAt === 'number' ? repo.createdAt : Date.now(),
    });
    return NextResponse.json({ id: ref.id }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

