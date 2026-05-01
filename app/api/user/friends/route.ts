import { NextResponse } from 'next/server';
import { jsonError, requireAuthedUser } from '@/app/api/user/_util';

import { rateLimit, requireSameOrigin } from '@/lib/server/security';



type FriendRequestStatus = 'pending' | 'accepted' | 'declined';
type FriendRequest = {
  id: string;
  fromUid: string;
  toUid: string;
  fromHandle?: string;
  toHandle?: string;
  status: FriendRequestStatus;
  createdAt: number;
  resolvedAt?: number;
};

type Friendship = {
  id: string;
  users: [string, string]; // [uid, uid]
  handles?: [string, string];
  createdAt: number;
};

function requestId(fromUid: string, toUid: string) {
  return `${fromUid}__${toUid}`;
}

function friendshipId(aUid: string, bUid: string) {
  const [x, y] = [aUid, bUid].sort();
  return `${x}__${y}`;
}

function normalizeHandle(input: string): string {
  const h = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(h)) throw new Error('Handle must be 3–20 chars: a-z, 0-9, underscore.');
  return h;
}

async function getHandleForUid(db: any, uid: string): Promise<string | null> {
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  const h = typeof d?.handle === 'string' ? d.handle : null;
  return h ? normalizeHandle(h) : null;
}

async function resolveUidByHandle(db: any, handleInput: string): Promise<string> {
  const { doc, getDoc } = await import('firebase/firestore');
  const handle = normalizeHandle(handleInput);
  const snap = await getDoc(doc(db, 'handles', handle));
  if (!snap.exists()) throw new Error('User not found');
  const uid = String((snap.data() as any)?.uid || '');
  if (!uid) throw new Error('User not found');
  return uid;
}

export async function GET(req: Request) {
  try {
    const { uid } = await requireAuthedUser(req);
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    // Dynamic import for Edge Runtime compatibility
    const { adminDb } = await import('@/app/api/user/_util');
    const db = await adminDb();

    const reqSnap = await getDocs(
      query(
        collection(db, 'friend_requests'),
        where('toUid', '==', uid),
        where('status', '==', 'pending')
      )
    );

    const incoming = reqSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }) as FriendRequest)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const fSnap = await getDocs(
      query(
        collection(db, 'friendships'),
        where('users', 'array-contains', uid)
      )
    );
    const friends = fSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }) as Friendship)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ incoming, friends }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'friends_mutate', limit: 120, windowMs: 60_000, key: uid });
    const body = (await req.json().catch(() => ({}))) as
      | { action: 'send'; to: string } // handle
      | { action: 'accept'; requestId: string }
      | { action: 'decline'; requestId: string };

    const { adminDb } = await import('@/app/api/user/_util');
    const { doc, getDoc, setDoc } = await import('firebase/firestore');
    const db = await adminDb();
    const now = Date.now();

    if (body.action === 'send') {
      const toHandle = normalizeHandle(body.to);
      const toUid = await resolveUidByHandle(db, toHandle);
      const fromUid = uid;
      if (fromUid === toUid) throw new Error("You can't friend yourself.");
      const id = requestId(fromUid, toUid);
      const fromHandle = await getHandleForUid(db, fromUid);
      await setDoc(doc(db, 'friend_requests', id),
        {
          fromUid,
          toUid,
          fromHandle,
          toHandle,
          status: 'pending',
          createdAt: now,
        },
        { merge: false },
      );
      return new NextResponse(null, { status: 204 });
    }

    if (body.action === 'accept') {
      const id = String(body.requestId || '');
      if (!id) throw new Error('Missing requestId');
      const rRef = doc(db, 'friend_requests', id);
      const snap = await getDoc(rRef);
      if (!snap.exists()) throw new Error('Request not found');
      const r = snap.data() as any;
      if (r?.toUid !== uid) throw new Error('Not allowed');
      const fromUid = String(r?.fromUid || '');
      const toUid = String(r?.toUid || '');
      if (!fromUid || !toUid) throw new Error('Invalid request');
      const fromHandle = typeof r?.fromHandle === 'string' ? r.fromHandle : null;
      const toHandle = typeof r?.toHandle === 'string' ? r.toHandle : null;
      const fId = friendshipId(fromUid, toUid);
      await setDoc(doc(db, 'friendships', fId),
        {
          users: [fromUid, toUid].sort() as [string, string],
          handles: [fromHandle || '', toHandle || ''].sort() as any,
          createdAt: now,
        },
        { merge: true },
      );
      await setDoc(rRef, { status: 'accepted', resolvedAt: now }, { merge: true });
      return new NextResponse(null, { status: 204 });
    }

    if (body.action === 'decline') {
      const id = String((body as any).requestId || '');
      if (!id) throw new Error('Missing requestId');
      const rRef = doc(db, 'friend_requests', id);
      const snap = await getDoc(rRef);
      if (!snap.exists()) throw new Error('Request not found');
      const r = snap.data() as any;
      if (r?.toUid !== uid) throw new Error('Not allowed');
      await setDoc(rRef, { status: 'declined', resolvedAt: now }, { merge: true });
      return new NextResponse(null, { status: 204 });
    }

    throw new Error('Invalid action');
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('unauthenticated') ? 401 : 400);
  }
}

