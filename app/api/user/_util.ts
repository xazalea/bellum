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
 * Get admin database - only available in nodejs runtime
 * For edge runtime routes, this will throw an error
 */
export async function adminDb() {
  // Check if we're in edge runtime
  const isEdgeRuntime = typeof process === 'undefined' || 
    (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge');
  
  if (isEdgeRuntime) {
    throw new Error('adminDb is not available in edge runtime - use nodejs runtime');
  }
  
  // Dynamic import for nodejs runtime
  const { getAdminDb } = await import('@/lib/server/firebase-admin');
  return getAdminDb();
}

export function jsonError(e: any, status = 400) {
  return NextResponse.json({ error: e?.message || 'request_failed' }, { status });
}