import { NextResponse } from 'next/server';
import { isCurrentDeviceTrusted, requireFingerprint } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const fingerprint = requireFingerprint(req);
    const body = (await req.json().catch(() => ({}))) as { username?: string };
    const username = String(body.username || '');
    const trusted = await isCurrentDeviceTrusted(username, fingerprint);
    return NextResponse.json({ trusted }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'trusted_failed' }, { status: 400 });
  }
}

