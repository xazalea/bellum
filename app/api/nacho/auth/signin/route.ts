import { NextResponse } from 'next/server';
import { requireFingerprint, signinUsername } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const fingerprint = requireFingerprint(req);
    const body = (await req.json().catch(() => ({}))) as { username?: string };
    const username = String(body.username || '');
    const res = await signinUsername(username, fingerprint);
    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'signin_failed' }, { status: 400 });
  }
}
