import { NextResponse } from 'next/server';
import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/security';


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = 'nodejs';

function pickClientIp(req: Request): string | null {
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) {
    // First is original client, then proxies.
    const ip = xff.split(',')[0]?.trim();
    if (ip) return ip;
  }
  const candidates = [
    h.get('x-real-ip'),
    h.get('x-client-ip'),
    h.get('cf-connecting-ip'),
    h.get('true-client-ip'),
  ].filter(Boolean) as string[];
  return candidates[0] || null;
}

export async function GET(req: Request) {
  try {
    const uid = (await verifySessionCookieFromRequest(req)).uid;
    rateLimit(req, { scope: 'ip_debug', limit: 60, windowMs: 60_000, key: uid });
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const ip = pickClientIp(req);
  return NextResponse.json(
    {
      ip,
      // Helpful for debugging across providers (inspired by ip-api patterns).
      headers: {
        'x-forwarded-for': req.headers.get('x-forwarded-for'),
        'x-real-ip': req.headers.get('x-real-ip'),
        'x-client-ip': req.headers.get('x-client-ip'),
        'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
      },
    },
    { status: 200 },
  );
}

