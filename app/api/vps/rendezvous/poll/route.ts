import { NextResponse } from 'next/server';
import { pollNext } from '@/lib/server/vps-rendezvous';
import { rateLimit } from '@/lib/server/security';

export const runtime = 'edge';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vpsId = String(searchParams.get('vpsId') || '').trim();
  const nodeId = String(searchParams.get('nodeId') || '').trim();
  if (!vpsId) return NextResponse.json({ error: 'missing_vpsId' }, { status: 400 });
  if (!nodeId) return NextResponse.json({ error: 'missing_nodeId' }, { status: 400 });
  rateLimit(req, { scope: 'vps_rendezvous_poll', limit: 1200, windowMs: 60_000, key: nodeId });
  const next = await pollNext(vpsId, nodeId);
  return NextResponse.json(next, { status: 200 });
}

