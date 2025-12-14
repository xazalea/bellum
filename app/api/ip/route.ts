import { NextResponse } from 'next/server';

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

