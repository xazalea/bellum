import { NextResponse } from 'next/server';
import { enqueueRequest } from '@/lib/server/vps-rendezvous';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function handle(req: Request, ctx: { params: { vpsId: string; path?: string[] } }) {
  const vpsId = String(ctx.params.vpsId || '').trim();
  if (!vpsId) return NextResponse.json({ error: 'missing_vpsId' }, { status: 400 });
  const path = '/' + (ctx.params.path && ctx.params.path.length ? ctx.params.path.join('/') : '');

  const requestId = crypto.randomUUID();
  try {
    const bodyBuf = req.method === 'GET' || req.method === 'HEAD' ? null : await req.arrayBuffer().catch(() => null);
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      // Drop hop-by-hop headers.
      if (k.toLowerCase() === 'host') return;
      headers[k] = v;
    });
    const resp = await enqueueRequest(vpsId, {
      requestId,
      vpsId,
      method: req.method,
      path,
      headers,
      bodyBase64: bodyBuf ? btoa(String.fromCharCode(...new Uint8Array(bodyBuf))) : null,
    });
    const body = fromBase64(resp.bodyBase64 || '');
    return new Response(req.method === 'HEAD' ? null : (body as BodyInit), { status: resp.status, headers: resp.headers });
  } catch (e: any) {
    const msg = e?.message || 'no_nodes_online';
    const code = msg === 'no_nodes_online' ? 503 : msg === 'timeout' ? 504 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function GET(req: Request, ctx: { params: { vpsId: string; path?: string[] } }) {
  return await handle(req, ctx);
}
export async function HEAD(req: Request, ctx: { params: { vpsId: string; path?: string[] } }) {
  return await handle(req, ctx);
}
export async function POST(req: Request, ctx: { params: { vpsId: string; path?: string[] } }) {
  return await handle(req, ctx);
}
export async function PUT(req: Request, ctx: { params: { vpsId: string; path?: string[] } }) {
  return await handle(req, ctx);
}
export async function PATCH(req: Request, ctx: { params: { vpsId: string; path?: string[] } }) {
  return await handle(req, ctx);
}
export async function DELETE(req: Request, ctx: { params: { vpsId: string; path?: string[] } }) {
  return await handle(req, ctx);
}

