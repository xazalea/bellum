import { NextResponse } from 'next/server';
import { listActivePeersForUser, prunePeers } from '@/lib/cluster/presence-store';

export const runtime = 'nodejs';

const ACTIVE_WINDOW_MS = 60_000;

export async function GET(req: Request) {
  const userId = req.headers.get('X-Nacho-UserId') || '';
  if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 401 });

  prunePeers(ACTIVE_WINDOW_MS);
  const peers = listActivePeersForUser(userId, ACTIVE_WINDOW_MS);
  return NextResponse.json(peers, { status: 200 });
}

