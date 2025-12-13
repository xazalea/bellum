import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireTrustedUser } from '@/app/api/user/_util';

export const runtime = 'nodejs';

type NachoUserSettings = {
  clusterParticipation: boolean;
};

const DEFAULTS: NachoUserSettings = { clusterParticipation: true };

export async function GET(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const db = adminDb();
    const ref = db.collection('users').doc(username).collection('settings').doc('main');
    const snap = await ref.get();
    const data = (snap.exists ? (snap.data() as any) : {}) || {};
    const out: NachoUserSettings = {
      clusterParticipation: typeof data.clusterParticipation === 'boolean' ? data.clusterParticipation : true,
    };
    if (!snap.exists) await ref.set(DEFAULTS, { merge: true });
    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

export async function POST(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const body = (await req.json().catch(() => ({}))) as Partial<NachoUserSettings>;
    const patch: Partial<NachoUserSettings> = {};
    if (typeof body.clusterParticipation === 'boolean') patch.clusterParticipation = body.clusterParticipation;
    const db = adminDb();
    await db.collection('users').doc(username).collection('settings').doc('main').set(patch, { merge: true });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

