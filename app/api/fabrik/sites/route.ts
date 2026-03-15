export const runtime = "edge";
import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';



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
  ownerUid: string;
  domain: string | null;
  bundleFileId: string;
  createdAt: number;
};

export async function GET(req: Request) {
  try {
    const { uid } = await requireAuthedUser(req);
    const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
    const db = await adminDb();
    const snap = await getDocs(
      query(
        collection(db, 'xfabric_sites'),
        where('ownerUid', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    );

    const sites = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SiteRecord[];
    return NextResponse.json({ sites }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'fabrik_sites_create', limit: 30, windowMs: 60_000, key: uid });
    const body = (await req.json().catch(() => ({}))) as { domain?: string; bundleFileId?: string };
    const domainRaw = String(body.domain || '').trim();
    const domain = domainRaw ? normalizeDomain(domainRaw) : null;
    const bundleFileId = String(body.bundleFileId || '');
    if (!bundleFileId) throw new Error('Missing bundleFileId');

    const { collection, doc, setDoc } = await import('firebase/firestore');
    const db = await adminDb();
    const createdAt = Date.now();
    const ref = doc(collection(db, 'xfabric_sites'));
    await setDoc(
      ref,
      {
        ownerUid: uid,
        domain,
        bundleFileId,
        createdAt,
      },
      { merge: false },
    );

    return NextResponse.json({ id: ref.id, domain, createdAt }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

