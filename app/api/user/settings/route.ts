import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

export const runtime = 'nodejs';

type NachoUserSettings = {
  clusterParticipation: boolean;
};

const DEFAULTS: NachoUserSettings = { clusterParticipation: true };

export async function GET(req: Request) {
  try {
    const { uid } = await requireAuthedUser(req);
    const db = adminDb();
    const ref = db.collection('users').doc(uid).collection('settings').doc('main');
    const snap = await ref.get();
    const data = (snap.exists ? (snap.data() as any) : {}) || {};
    const out: NachoUserSettings = {
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
    const body = (await req.json().catch(() => ({}))) as Partial<NachoUserSettings>;
    const patch: Partial<NachoUserSettings> = {};
    if (typeof body.clusterParticipation === 'boolean') patch.clusterParticipation = body.clusterParticipation;
    const db = adminDb();
    await db.collection('users').doc(uid).collection('settings').doc('main').set(patch, { merge: true });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

