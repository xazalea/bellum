// Edge runtime compatible session handling
// This file does NOT import firebase-admin - it uses header-based auth for edge runtime

export const SESSION_COOKIE_NAME = 'challenger_session';

type CookieOptions = {
  maxAgeSeconds: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
};

export function makeSessionCookieOptions(opts: { maxAgeSeconds: number }): CookieOptions {
  return {
    maxAgeSeconds: opts.maxAgeSeconds,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  };
}

export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    const k = p.slice(0, i).trim();
    const v = p.slice(i + 1).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export type SessionUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

/**
 * Verify session from request - edge runtime compatible
 * In edge runtime, only header-based auth is supported (x-challenger-userid)
 * For routes that need Firebase session cookie verification, use nodejs runtime
 */
export async function verifySessionCookieFromRequest(req: Request): Promise<SessionUser> {
  const headerUid = req.headers.get('x-challenger-userid');
  if (headerUid) {
    return { uid: headerUid };
  }
  
  // In edge runtime, we can't verify Firebase session cookies
  // Routes that need this should use nodejs runtime
  throw new Error('unauthenticated: edge runtime requires x-challenger-userid header');
}

/**
 * Create session cookie - not available in edge runtime
 * Use nodejs runtime for routes that need this functionality
 */
export async function createSessionCookieFromIdToken(idToken: string, maxAgeSeconds: number): Promise<string> {
  throw new Error('session cookies not available in edge runtime - use nodejs runtime');
}