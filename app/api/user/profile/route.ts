import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

export const runtime = 'edge';

function normalizeHandle(input: string): string {
  const h = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(h)) throw new Error('Handle must be 3–20 chars: a-z, 0-9, underscore.');
  return h;
}

export async function GET(req: Request) {
  try {
    const { uid, email, name } = await requireAuthedUser(req);
    const db = await adminDb();
    const snap = await db.collection('users').doc(uid).get();
    const d = snap.exists ? (snap.data() as any) : {};
    const handle = typeof d?.handle === 'string' ? d.handle : null;
    return NextResponse.json({ uid, email: email ?? null, name: name ?? null, handle }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'user_profile_update', limit: 60, windowMs: 60_000, key: uid });
    const body = (await req.json().catch(() => ({}))) as { handle?: string | null };
    const handleRaw = body.handle;
    const nextHandle = handleRaw === null ? null : normalizeHandle(String(handleRaw || ''));
    const db = await adminDb();

    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(uid);
      const userSnap = await tx.get(userRef);
      const prev = userSnap.exists ? (userSnap.data() as any) : {};
      const prevHandle = typeof prev?.handle === 'string' ? normalizeHandle(prev.handle) : null;

      // No change
      if (prevHandle === nextHandle) return;

      // Release old handle mapping
      if (prevHandle) {
        const prevRef = db.collection('handles').doc(prevHandle);
        const prevMap = await tx.get(prevRef);
        if (prevMap.exists && String((prevMap.data() as any)?.uid || '') === uid) {
          tx.delete(prevRef);
        }
      }

      if (nextHandle) {
        const hRef = db.collection('handles').doc(nextHandle);
        const hSnap = await tx.get(hRef);
        if (hSnap.exists) {
          const owner = String((hSnap.data() as any)?.uid || '');
          if (owner && owner !== uid) throw new Error('Handle already taken');
        }
        tx.set(hRef, { uid, createdAt: Date.now() }, { merge: true });
        tx.set(userRef, { handle: nextHandle, updatedAt: Date.now(), createdAt: prev?.createdAt ?? Date.now() }, { merge: true });
        return;
      }

      // Clearing handle
      tx.set(userRef, { handle: null, updatedAt: Date.now(), createdAt: prev?.createdAt ?? Date.now() }, { merge: true });
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

