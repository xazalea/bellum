import 'server-only';

import { NextResponse } from 'next/server';
// Dynamic import for firebase-admin to avoid Edge Runtime issues
// import { getAdminDb } from '@/lib/server/firebase-admin';

// Note: This file is used by Edge Runtime routes, so we can't use nodejs runtime
// export const runtime = 'nodejs';

export async function requireAuthedUser(req: Request): Promise<{ uid: string; email?: string; name?: string }> {
  // Nacho auth: username + fingerprint, passed as header. (No Firebase Auth required.)
  const headerUid = String(req.headers.get('x-nacho-userid') || '').trim();
  if (headerUid) return { uid: headerUid };
  throw new Error('unauthenticated');
}

export async function adminDb() {
  // Dynamic import for Edge Runtime compatibility
  const { getAdminDb } = await import('@/lib/server/firebase-admin');
  return getAdminDb();
}

export function jsonError(e: any, status = 400) {
  return NextResponse.json({ error: e?.message || 'request_failed' }, { status });
}

