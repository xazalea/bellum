import { NextResponse } from 'next/server';
import { prunePeers, upsertPeer } from '@/lib/cluster/presence-store';

export const runtime = 'nodejs';

type Body = {
  deviceId?: string;
  userAgent?: string | null;
  label?: string | null;
  load?: number | null;
};

const ACTIVE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const userId = req.headers.get('X-Nacho-UserId') || '';
  if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 401 });

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const deviceId = typeof body.deviceId === 'string' ? body.deviceId : '';
  if (!deviceId) return NextResponse.json({ error: 'missing_device' }, { status: 400 });

  upsertPeer({
    userId,
    deviceId,
    userAgent: typeof body.userAgent === 'string' ? body.userAgent : null,
    label: typeof body.label === 'string' ? body.label : null,
    load: typeof body.load === 'number' ? body.load : null,
  });
  prunePeers(ACTIVE_WINDOW_MS);

  return new NextResponse(null, { status: 204 });
}

