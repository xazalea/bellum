import { NextResponse } from 'next/server';
import { prunePeers, upsertPeer } from '@/lib/cluster/presence-store';
import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/security';

export const runtime = 'nodejs';

type Body = {
  deviceId?: string;
  userAgent?: string | null;
  label?: string | null;
  load?: number | null;
  uplinkKbps?: number | null;
  downlinkKbps?: number | null;
  caps?: string[] | null;
};

const ACTIVE_WINDOW_MS = 60_000;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-nacho-userid, x-nacho-deviceid',
    Vary: 'Origin',
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  let uid = '';
  try {
    uid = (await verifySessionCookieFromRequest(req)).uid;
  } catch {
    // Allow header-based identity for cross-origin cluster usage.
    uid = String(req.headers.get('x-nacho-userid') || '').trim();
    if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: corsHeaders(req) });
  }
  rateLimit(req, { scope: 'cluster_heartbeat', limit: 600, windowMs: 60_000, key: uid });

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const deviceId = typeof body.deviceId === 'string' ? body.deviceId : '';
  if (!deviceId) return NextResponse.json({ error: 'missing_device' }, { status: 400, headers: corsHeaders(req) });

  upsertPeer({
    userId: uid,
    deviceId,
    userAgent: typeof body.userAgent === 'string' ? body.userAgent : null,
    label: typeof body.label === 'string' ? body.label : null,
    load: typeof body.load === 'number' ? body.load : null,
    uplinkKbps: typeof body.uplinkKbps === 'number' ? body.uplinkKbps : null,
    downlinkKbps: typeof body.downlinkKbps === 'number' ? body.downlinkKbps : null,
    caps: Array.isArray(body.caps) ? body.caps.map((x) => String(x)).slice(0, 32) : null,
  });
  prunePeers(ACTIVE_WINDOW_MS);

  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

