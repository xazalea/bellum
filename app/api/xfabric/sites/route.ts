import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireTrustedUser } from '@/app/api/user/_util';

export const runtime = 'nodejs';

function normalizeDomain(input: string): string {
  const d = input.trim().toLowerCase();
  // Minimal hostname validation (no scheme/path).
  if (!/^[a-z0-9.-]{3,253}$/.test(d) || d.includes('..') || d.startsWith('-') || d.endsWith('-')) {
    throw new Error('Invalid domain');
  }
  if (!d.includes('.')) throw new Error('Domain must include a dot');
  return d;
}

type SiteRecord = {
  id: string;
  ownerUsername: string;
  domain: string | null;
  bundleFileId: string;
  createdAt: number;
};

export async function GET(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const db = adminDb();
    const snap = await db
      .collection('xfabric_sites')
      .where('ownerUsername', '==', username)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const sites = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SiteRecord[];
    return NextResponse.json({ sites }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

export async function POST(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const body = (await req.json().catch(() => ({}))) as { domain?: string; bundleFileId?: string };
    const domainRaw = String(body.domain || '').trim();
    const domain = domainRaw ? normalizeDomain(domainRaw) : null;
    const bundleFileId = String(body.bundleFileId || '');
    if (!bundleFileId) throw new Error('Missing bundleFileId');

    const db = adminDb();
    const createdAt = Date.now();
    const ref = db.collection('xfabric_sites').doc();
    await ref.set(
      {
        ownerUsername: username,
        domain,
        bundleFileId,
        createdAt,
      },
      { merge: false },
    );

    return NextResponse.json({ id: ref.id, domain, createdAt }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

