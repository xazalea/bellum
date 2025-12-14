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

export async function POST(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const body = (await req.json().catch(() => ({}))) as { domain?: string; bundleFileId?: string };
    const domain = normalizeDomain(String(body.domain || ''));
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

