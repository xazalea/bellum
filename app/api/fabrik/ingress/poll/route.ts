import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/server/security';
import { pollNextIngress } from '@/lib/server/fabrik-ingress-rendezvous';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteId = String(searchParams.get('siteId') || '').trim();
  const nodeId = String(searchParams.get('nodeId') || '').trim();
  if (!siteId) return NextResponse.json({ error: 'missing_siteId' }, { status: 400 });
  if (!nodeId) return NextResponse.json({ error: 'missing_nodeId' }, { status: 400 });
  rateLimit(req, { scope: 'fabrik_ingress_poll', limit: 5000, windowMs: 60_000, key: nodeId });
  const next = await pollNextIngress(siteId, nodeId);
  return NextResponse.json(next, { status: 200 });
}







