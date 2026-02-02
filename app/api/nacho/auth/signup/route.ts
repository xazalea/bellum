import { NextResponse } from 'next/server';
import { requireFingerprint, signupUsername } from '@/lib/server/nacho-auth';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const fingerprint = requireFingerprint(req);
    const body = (await req.json().catch(() => ({}))) as { username?: string };
    const username = String(body.username || '');
    const res = await signupUsername(username, fingerprint);
    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'signup_failed' }, { status: 400 });
  }
}
