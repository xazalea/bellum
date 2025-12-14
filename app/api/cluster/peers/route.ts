import { NextResponse } from 'next/server';
import { listActivePeersForUser, prunePeers } from '@/lib/cluster/presence-store';
import { verifySessionCookieFromRequest } from '@/lib/server/session';

export const runtime = 'nodejs';

const ACTIVE_WINDOW_MS = 60_000;

export async function GET(req: Request) {
  let uid = '';
  try {
    uid = (await verifySessionCookieFromRequest(req)).uid;
  } catch {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  prunePeers(ACTIVE_WINDOW_MS);
  const peers = listActivePeersForUser(uid, ACTIVE_WINDOW_MS);
  return NextResponse.json(peers, { status: 200 });
}

