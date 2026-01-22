import { NextResponse } from 'next/server';
import { getClusterBaseCandidates } from '@/lib/cluster/cluster-base';
import { verifySessionCookieFromRequest } from '@/lib/server/session';

export const runtime = 'nodejs';

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

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/server/security';
import { getClusterBaseCandidates } from '@/lib/cluster/cluster-base';

export const runtime = 'nodejs';

async function forwardPeers(base: string, uid: string) {
  const url = `${base}/api/cluster/peers`;
  return await fetch(url, {
    method: 'GET',
    headers: {
      'X-Nacho-UserId': uid,
    },
    cache: 'no-store',
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = String(searchParams.get('userId') || '').trim();
  if (!uid) return NextResponse.json({ error: 'missing_userId' }, { status: 400 });
  rateLimit(req, { scope: 'cluster_proxy_peers', limit: 1200, windowMs: 60_000, key: uid });

  const bases = getClusterBaseCandidates();
  let lastStatus = 502;
  let lastText = '';
  for (const b of bases) {
    try {
      const res = await forwardPeers(b, uid);
      const text = await res.text().catch(() => '');
      if (res.ok) {
        // Preserve JSON as-is.
        return new NextResponse(text, {
          status: 200,
          headers: { 'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8' },
        });
      }
      lastStatus = res.status;
      lastText = text;
    } catch (e: any) {
      lastStatus = 502;
      lastText = e?.message || 'fetch_failed';
    }
  }
  return NextResponse.json({ error: 'cluster_unreachable', detail: lastText }, { status: lastStatus || 502 });
}

