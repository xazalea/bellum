import 'server-only';

import { getAdminAuth } from '@/lib/server/firebase-admin';

export const SESSION_COOKIE_NAME = 'bellum_session';

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

export async function verifySessionCookieFromRequest(req: Request): Promise<SessionUser> {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookieHeader(cookieHeader);
  const session = cookies[SESSION_COOKIE_NAME];
  if (!session) throw new Error('unauthenticated');

  const decoded = await getAdminAuth().verifySessionCookie(session, true);
  return {
    uid: decoded.uid,
    email: typeof decoded.email === 'string' ? decoded.email : undefined,
    name: typeof (decoded as any).name === 'string' ? (decoded as any).name : undefined,
    picture: typeof (decoded as any).picture === 'string' ? (decoded as any).picture : undefined,
  };
}

export async function createSessionCookieFromIdToken(idToken: string, maxAgeSeconds: number): Promise<string> {
  if (!idToken) throw new Error('missing_id_token');
  return await getAdminAuth().createSessionCookie(idToken, { expiresIn: maxAgeSeconds * 1000 });
}

