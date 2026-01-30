import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/server/security';
import { getClusterBaseCandidates } from '@/lib/cluster/cluster-base';


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = 'nodejs';

type Body = {
  userId?: string;
  deviceId?: string;
  userAgent?: string | null;
  label?: string | null;
  load?: number | null;
  uplinkKbps?: number | null;
  downlinkKbps?: number | null;
  caps?: string[] | null;
};

async function forwardHeartbeat(base: string, uid: string, body: Body) {
  const url = `${base}/api/cluster/heartbeat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nacho-UserId': uid,
    },
    body: JSON.stringify({
      deviceId: body.deviceId,
      userAgent: body.userAgent ?? null,
      label: body.label ?? null,
      load: body.load ?? null,
      uplinkKbps: body.uplinkKbps ?? null,
      downlinkKbps: body.downlinkKbps ?? null,
      caps: Array.isArray(body.caps) ? body.caps.map((x) => String(x)).slice(0, 32) : null,
    }),
    cache: 'no-store',
  });
  return res;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const uid = String(body.userId || '').trim();
    const deviceId = String(body.deviceId || '').trim();
    if (!uid) return NextResponse.json({ error: 'missing_userId' }, { status: 400 });
    if (!deviceId) return NextResponse.json({ error: 'missing_deviceId' }, { status: 400 });

    rateLimit(req, { scope: 'cluster_proxy_heartbeat', limit: 1200, windowMs: 60_000, key: uid });

    const bases = getClusterBaseCandidates();
    let lastStatus = 502;
    let lastText = '';
    for (const b of bases) {
      try {
        const res = await forwardHeartbeat(b, uid, body);
        if (res.ok) return new NextResponse(null, { status: 204 });
        lastStatus = res.status;
        lastText = await res.text().catch(() => '');
      } catch (e: any) {
        lastStatus = 502;
        lastText = e?.message || 'fetch_failed';
      }
    }
    return NextResponse.json({ error: 'cluster_unreachable', detail: lastText }, { status: lastStatus || 502 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'proxy_failed' }, { status: 400 });
  }
}

