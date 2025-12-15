import 'server-only';

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

export async function requireAuthedUser(req: Request): Promise<{ uid: string; email?: string; name?: string }> {
  // Nacho auth: username + fingerprint, passed as header. (No Firebase Auth required.)
  const headerUid = String(req.headers.get('x-nacho-userid') || '').trim();
  if (headerUid) return { uid: headerUid };
  throw new Error('unauthenticated');
}

export function adminDb() {
  return getAdminDb();
}

export function jsonError(e: any, status = 400) {
  return NextResponse.json({ error: e?.message || 'request_failed' }, { status });
}

