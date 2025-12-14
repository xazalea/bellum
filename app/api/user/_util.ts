import 'server-only';

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { verifySessionCookieFromRequest } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function requireAuthedUser(req: Request): Promise<{ uid: string; email?: string; name?: string }> {
  const u = await verifySessionCookieFromRequest(req);
  return { uid: u.uid, email: u.email, name: u.name };
}

export function adminDb() {
  return getAdminDb();
}

export function jsonError(e: any, status = 400) {
  return NextResponse.json({ error: e?.message || 'request_failed' }, { status });
}

