import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/server/security';
import { registerIngressNode } from '@/lib/server/fabrik-ingress-rendezvous';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const siteId = String(body?.siteId || '').trim();
    const nodeId = String(body?.nodeId || '').trim();
    if (!siteId) return NextResponse.json({ error: 'missing_siteId' }, { status: 400 });
    if (!nodeId) return NextResponse.json({ error: 'missing_nodeId' }, { status: 400 });
    rateLimit(req, { scope: 'fabrik_ingress_register', limit: 2400, windowMs: 60_000, key: nodeId });
    registerIngressNode(siteId, nodeId);
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'register_failed' }, { status: 400 });
  }
}




