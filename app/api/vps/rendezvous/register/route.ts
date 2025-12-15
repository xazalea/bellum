import { NextResponse } from 'next/server';
import { registerOwner } from '@/lib/server/vps-rendezvous';
import { rateLimit } from '@/lib/server/security';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const vpsId = String(body?.vpsId || '').trim();
    const nodeId = String(body?.nodeId || '').trim();
    if (!vpsId) return NextResponse.json({ error: 'missing_vpsId' }, { status: 400 });
    if (!nodeId) return NextResponse.json({ error: 'missing_nodeId' }, { status: 400 });
    rateLimit(req, { scope: 'vps_rendezvous_register', limit: 600, windowMs: 60_000, key: nodeId });
    registerOwner(vpsId, nodeId);
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'register_failed' }, { status: 400 });
  }
}

