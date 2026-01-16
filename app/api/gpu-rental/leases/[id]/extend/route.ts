import { NextResponse } from 'next/server';
import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/security';
import { extendLease, getLease } from '@/lib/gpu-rental/store';
import type { ExtendLeaseRequest } from '@/lib/gpu-rental/types';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: ExtendLeaseRequest | null = null;
  try {
    body = (await req.json()) as ExtendLeaseRequest;
  } catch {
    body = null;
  }
  if (!body) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const { uid } = await verifySessionCookieFromRequest(req);
    rateLimit(req, { scope: 'gpu_rental_extend', limit: 30, windowMs: 60_000, key: uid });
    const lease = getLease(params.id);
    if (!lease || lease.userId !== uid) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const updated = extendLease(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'cannot_extend' }, { status: 409 });
    }
    return NextResponse.json({ lease: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
}
