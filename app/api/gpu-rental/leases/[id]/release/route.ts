import { NextResponse } from 'next/server';
import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/security';
import { getLease, releaseLease } from '@/lib/gpu-rental/store';

export const runtime = 'edge';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { uid } = await verifySessionCookieFromRequest(req);
    rateLimit(req, { scope: 'gpu_rental_release', limit: 30, windowMs: 60_000, key: uid });
    const lease = getLease(params.id);
    if (!lease || lease.userId !== uid) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const updated = releaseLease(params.id);
    if (!updated) {
      return NextResponse.json({ error: 'cannot_release' }, { status: 409 });
    }
    return NextResponse.json({ lease: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
}
