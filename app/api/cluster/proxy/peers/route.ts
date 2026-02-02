import { NextResponse } from 'next/server';
import { getClusterBaseCandidates } from '@/lib/cluster/cluster-base';
import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/security';

export const runtime = 'edge';

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-nacho-userid',
    Vary: 'Origin',
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

async function resolveUid(req: Request): Promise<string> {
  try {
    return (await verifySessionCookieFromRequest(req)).uid;
  } catch {
    const headerUid = String(req.headers.get('x-nacho-userid') || '').trim();
    if (!headerUid) throw new Error('unauthenticated');
    return headerUid;
  }
}

export async function GET(req: Request) {
  let uid = '';
  try {
    uid = await resolveUid(req);
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: corsHeaders(req) });
  }

  rateLimit(req, { scope: 'cluster_proxy_peers', limit: 1200, windowMs: 60_000, key: uid });

  const bases = getClusterBaseCandidates();
  let lastStatus = 502;
  let lastText = '';

  for (const base of bases) {
    try {
      const url = `${base}/api/cluster/peers`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'X-Nacho-UserId': uid },
        cache: 'no-store',
      });
      if (res.ok) {
        const body = await res.text();
        return new NextResponse(body, {
          status: 200,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      lastStatus = res.status;
      lastText = await res.text().catch(() => '');
    } catch (e: any) {
      lastStatus = 502;
      lastText = e?.message || 'fetch_failed';
    }
  }

  return NextResponse.json({ error: 'cluster_unreachable', detail: lastText }, { status: lastStatus || 502, headers: corsHeaders(req) });
}
