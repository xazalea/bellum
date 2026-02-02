import { NextResponse } from 'next/server';
import { listActivePeersForUser, prunePeers } from '@/lib/cluster/presence-store';
import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { adminDb } from '@/app/api/user/_util';

export const runtime = 'edge';

const ACTIVE_WINDOW_MS = 60_000;

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

export async function GET(req: Request) {
  let uid = '';
  try {
    uid = (await verifySessionCookieFromRequest(req)).uid;
  } catch {
    uid = String(req.headers.get('x-nacho-userid') || '').trim();
    if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: corsHeaders(req) });
  }

  let effectiveUserId = uid;
  try {
     const userSnap = await (await adminDb()).collection('users').doc(uid).get();
     const handle = userSnap.exists ? (userSnap.data() as any)?.handle : null;
     if (handle) effectiveUserId = handle;
  } catch {
     // ignore
  }

  prunePeers(ACTIVE_WINDOW_MS);
  const peers = listActivePeersForUser(effectiveUserId, ACTIVE_WINDOW_MS);
  return NextResponse.json(peers, { status: 200, headers: corsHeaders(req) });
}

