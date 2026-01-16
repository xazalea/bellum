import { NextResponse } from 'next/server';
import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/security';
import { createLease, listLeasesForUser } from '@/lib/gpu-rental/store';
import type { CreateLeaseRequest } from '@/lib/gpu-rental/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { uid } = await verifySessionCookieFromRequest(req);
    rateLimit(req, { scope: 'gpu_rental_list', limit: 60, windowMs: 60_000, key: uid });
    const leases = listLeasesForUser(uid);
    return NextResponse.json({ leases }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  let body: CreateLeaseRequest | null = null;
  try {
    body = (await req.json()) as CreateLeaseRequest;
  } catch {
    body = null;
  }
  if (!body) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const { uid } = await verifySessionCookieFromRequest(req);
    rateLimit(req, { scope: 'gpu_rental_create', limit: 20, windowMs: 60_000, key: uid });
    const lease = createLease(uid, body);
    return NextResponse.json({ lease }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
}
