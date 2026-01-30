import { NextResponse } from 'next/server';
import { ISO_CONFIGS } from '@/lib/assets/iso-config';

export const runtime = 'edge';

export const dynamic = 'force-dynamic';

const AVAILABLE_HEADERS = {
  'Content-Type': 'application/octet-stream',
  'Cache-Control': 'public, max-age=86400',
};

export async function GET(req: Request, ctx: { params: { isoId: string } }) {
  try {
    const isoId = String(ctx.params.isoId || '');
    const config = ISO_CONFIGS[isoId];
    if (!config) {
      return NextResponse.json({ error: 'iso_not_found' }, { status: 404 });
    }

    const upstreamSources = [config.cdnUrl, config.githubUrl].filter(Boolean) as string[];
    for (const source of upstreamSources) {
      try {
        const upstream = await fetch(source);
        if (!upstream.ok) {
          console.warn(`[iso-proxy] upstream ${source} returned ${upstream.status}`);
          continue;
        }
        const headers = new Headers(upstream.headers);
        Object.entries(AVAILABLE_HEADERS).forEach(([key, value]) => headers.set(key, value));
        return new NextResponse(upstream.body, {
          status: upstream.status,
          headers,
        });
      } catch (error) {
        console.warn(`[iso-proxy] failed to fetch ${source}`, error);
      }
    }

    // Fallback if all upstreams fail
    console.warn(`[iso-proxy] All upstreams failed for ${isoId}. Serving Mock ISO.`);
    throw new Error("All Upstreams Failed");

  } catch (e) {
    console.error(`[iso-proxy] Critical Failure: ${e}`);
    // No mock fallback requested.
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }
}
