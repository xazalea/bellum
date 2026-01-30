import { NextResponse } from 'next/server';
import { postResponse } from '@/lib/server/vps-rendezvous';
import { rateLimit } from '@/lib/server/security';


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const vpsId = String(body?.vpsId || '').trim();
    const nodeId = String(body?.nodeId || '').trim();
    const requestId = String(body?.requestId || '').trim();
    if (!vpsId) return NextResponse.json({ error: 'missing_vpsId' }, { status: 400 });
    if (!nodeId) return NextResponse.json({ error: 'missing_nodeId' }, { status: 400 });
    if (!requestId) return NextResponse.json({ error: 'missing_requestId' }, { status: 400 });
    rateLimit(req, { scope: 'vps_rendezvous_respond', limit: 1200, windowMs: 60_000, key: nodeId });

    postResponse(vpsId, nodeId, {
      requestId,
      status: Number(body?.status || 200),
      headers: (body?.headers && typeof body.headers === 'object' ? body.headers : {}) as Record<string, string>,
      bodyBase64: String(body?.bodyBase64 || ''),
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'respond_failed' }, { status: 400 });
  }
}

