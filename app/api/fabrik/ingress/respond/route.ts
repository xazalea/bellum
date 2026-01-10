import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/server/security';
import { postIngressResponse } from '@/lib/server/fabrik-ingress-rendezvous';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const siteId = String(body?.siteId || '').trim();
    const nodeId = String(body?.nodeId || '').trim();
    const requestId = String(body?.requestId || '').trim();
    if (!siteId) return NextResponse.json({ error: 'missing_siteId' }, { status: 400 });
    if (!nodeId) return NextResponse.json({ error: 'missing_nodeId' }, { status: 400 });
    if (!requestId) return NextResponse.json({ error: 'missing_requestId' }, { status: 400 });
    rateLimit(req, { scope: 'fabrik_ingress_respond', limit: 5000, windowMs: 60_000, key: nodeId });

    postIngressResponse(siteId, nodeId, {
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












