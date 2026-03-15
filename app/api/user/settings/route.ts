export const runtime = "edge";
import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';



type ChallengerUserSettings = {
  clusterParticipation: boolean;
};

const DEFAULTS: ChallengerUserSettings = { clusterParticipation: true };

export async function GET(req: Request) {
  try {
    const { uid } = await requireAuthedUser(req);
    const db = await adminDb();
    const ref = db.collection('users').doc(uid).collection('settings').doc('main');
    const snap = await ref.get();
    const data = (snap.exists ? (snap.data() as any) : {}) || {};
    const out: ChallengerUserSettings = {
      clusterParticipation: typeof data.clusterParticipation === 'boolean' ? data.clusterParticipation : true,
    };
    if (!snap.exists) await ref.set(DEFAULTS, { merge: true });
    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'user_settings', limit: 120, windowMs: 60_000, key: uid });
    const body = (await req.json().catch(() => ({}))) as Partial<ChallengerUserSettings>;
    const patch: Partial<ChallengerUserSettings> = {};
    if (typeof body.clusterParticipation === 'boolean') patch.clusterParticipation = body.clusterParticipation;
    const db = await adminDb();
    await db.collection('users').doc(uid).collection('settings').doc('main').set(patch, { merge: true });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

