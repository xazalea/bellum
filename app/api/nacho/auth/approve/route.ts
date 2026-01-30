import { NextResponse } from 'next/server';
import { approveLoginCode, requireFingerprint } from '@/lib/server/nacho-auth';


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const fingerprint = requireFingerprint(req);
    const body = (await req.json().catch(() => ({}))) as { username?: string; code?: string };
    const username = String(body.username || '');
    const code = String(body.code || '');
    await approveLoginCode(username, fingerprint, code);
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'approve_failed' }, { status: 400 });
  }
}
