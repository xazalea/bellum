import { NextResponse } from 'next/server';

/**
 * Require authenticated user from request
 * Uses x-challenger-userid header for authentication
 */
export async function requireAuthedUser(req: Request): Promise<{ uid: string; email?: string; name?: string }> {
  // Challenger auth: username + fingerprint, passed as header. (No Firebase Auth required.)
  const headerUid = String(req.headers.get('x-challenger-userid') || '').trim();
  if (headerUid) return { uid: headerUid };
  throw new Error('unauthenticated');
}

/**
 * Get firestore database
 */
export async function adminDb() {
  const { app } = await import('@/lib/firebase');
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore(app);
}

export function jsonError(e: any, status = 400) {
  return NextResponse.json({ error: e?.message || 'request_failed' }, { status });
}