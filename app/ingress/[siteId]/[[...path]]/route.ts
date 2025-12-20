import { NextResponse } from 'next/server';
import { enqueueIngressRequest } from '@/lib/server/fabrik-ingress-rendezvous';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toBase64(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function handle(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  const siteId = String(ctx.params.siteId || '').trim();
  if (!siteId) return NextResponse.json({ error: 'missing_siteId' }, { status: 400 });
  const path = '/' + (ctx.params.path && ctx.params.path.length ? ctx.params.path.join('/') : 'index.html');

  const requestId = crypto.randomUUID();
  const method = req.method.toUpperCase();

  // Read body (only if needed).
  const bodyBuf = method === 'GET' || method === 'HEAD' ? null : await req.arrayBuffer().catch(() => null);
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'host') return;
    headers[k] = v;
  });

  try {
    const resp = await enqueueIngressRequest(siteId, {
      requestId,
      siteId,
      method,
      path,
      headers,
      bodyBase64: bodyBuf ? toBase64(bodyBuf) : null,
    });
    const body = fromBase64(resp.bodyBase64 || '');
    return new Response(method === 'HEAD' ? null : (body as BodyInit), { status: resp.status, headers: resp.headers });
  } catch (e: any) {
    const msg = e?.message || 'no_nodes_online';
    // Fallback: serve directly from canonical /host path (still works if no nodes are available yet).
    if (msg === 'no_nodes_online' || msg === 'timeout') {
      const target = new URL(`/host/${encodeURIComponent(siteId)}${path}`, new URL(req.url).origin);
      const init: RequestInit = { method, headers };
      if (bodyBuf && method !== 'GET' && method !== 'HEAD') init.body = bodyBuf;
      const upstream = await fetch(target, init);
      return new Response(method === 'HEAD' ? null : await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: upstream.headers,
      });
    }
    const code = msg === 'timeout' ? 504 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function GET(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  return handle(req, ctx);
}
export async function HEAD(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  return handle(req, ctx);
}
export async function POST(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  return handle(req, ctx);
}
export async function PUT(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  return handle(req, ctx);
}
export async function PATCH(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  return handle(req, ctx);
}
export async function DELETE(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  return handle(req, ctx);
}




