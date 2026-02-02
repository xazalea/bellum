import { NextResponse } from 'next/server';
import { createSessionCookieFromIdToken, makeSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/server/session';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

// 14 days
export const runtime = 'edge';

const MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    rateLimit(req, { scope: 'auth_session_create', limit: 30, windowMs: 60_000 });
    const body = (await req.json().catch(() => ({}))) as { idToken?: string };
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    if (!idToken) return NextResponse.json({ error: 'missing_id_token' }, { status: 400 });

    const session = await createSessionCookieFromIdToken(idToken, MAX_AGE_SECONDS);
    const res = NextResponse.json({ ok: true }, { status: 200 });

    const opts = makeSessionCookieOptions({ maxAgeSeconds: MAX_AGE_SECONDS });
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session,
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      maxAge: opts.maxAgeSeconds,
      path: opts.path,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'session_create_failed' }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  requireSameOrigin(req);
  rateLimit(req, { scope: 'auth_session_delete', limit: 60, windowMs: 60_000 });
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}

