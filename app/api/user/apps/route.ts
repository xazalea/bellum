import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireTrustedUser } from '@/app/api/user/_util';

export const runtime = 'nodejs';

type InstalledApp = {
  name: string;
  originalName: string;
  type: 'android' | 'windows' | 'unknown';
  scope?: 'user' | 'public';
  originalBytes: number;
  storedBytes: number;
  fileId: string;
  installedAt: number;
  compression: 'none' | 'gzip-chunked';
};

export async function GET(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const db = adminDb();

    const snap = await db
      .collection('users')
      .doc(username)
      .collection('apps')
      .orderBy('installedAt', 'desc')
      .get();

    const apps = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json(apps, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

export async function POST(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const body = (await req.json().catch(() => ({}))) as { app?: InstalledApp };
    const app = body.app as InstalledApp | undefined;
    if (!app) throw new Error('Missing app');
    if (!app.fileId || !app.name) throw new Error('Invalid app');

    const db = adminDb();
    const ref = db.collection('users').doc(username).collection('apps').doc();
    await ref.set(app, { merge: true });
    return NextResponse.json({ id: ref.id }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

