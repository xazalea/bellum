import 'server-only';

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { isCurrentDeviceTrusted, normalizeUsername, requireFingerprint } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

export async function requireTrustedUser(req: Request): Promise<{ username: string; fingerprint: string }> {
  const fingerprint = requireFingerprint(req);
  const usernameRaw = req.headers.get('X-Nacho-Username') || '';
  const username = normalizeUsername(usernameRaw);
  const ok = await isCurrentDeviceTrusted(username, fingerprint);
  if (!ok) throw new Error('Device not trusted for that username');
  return { username, fingerprint };
}

export function adminDb() {
  return getAdminDb();
}

export function jsonError(e: any, status = 400) {
  return NextResponse.json({ error: e?.message || 'request_failed' }, { status });
}

