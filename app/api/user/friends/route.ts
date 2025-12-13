import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireTrustedUser } from '@/app/api/user/_util';
import { normalizeUsername } from '@/lib/server/nacho-auth';

export const runtime = 'nodejs';

type FriendRequestStatus = 'pending' | 'accepted' | 'declined';
type FriendRequest = {
  id: string;
  from: string;
  to: string;
  status: FriendRequestStatus;
  createdAt: number;
  resolvedAt?: number;
};

type Friendship = {
  id: string;
  users: [string, string];
  createdAt: number;
};

function requestId(from: string, to: string) {
  return `${from}__${to}`;
}

function friendshipId(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `${x}__${y}`;
}

export async function GET(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const db = adminDb();

    const reqSnap = await db
      .collection('friend_requests')
      .where('to', '==', username)
      .where('status', '==', 'pending')
      .get();

    const incoming = reqSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }) as FriendRequest)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const fSnap = await db.collection('friendships').where('users', 'array-contains', username).get();
    const friends = fSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }) as Friendship)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ incoming, friends }, { status: 200 });
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

export async function POST(req: Request) {
  try {
    const { username } = await requireTrustedUser(req);
    const body = (await req.json().catch(() => ({}))) as
      | { action: 'send'; to: string }
      | { action: 'accept'; requestId: string }
      | { action: 'decline'; requestId: string };

    const db = adminDb();
    const now = Date.now();

    if (body.action === 'send') {
      const to = normalizeUsername(body.to);
      const from = username;
      if (from === to) throw new Error("You can't friend yourself.");
      const id = requestId(from, to);
      await db.collection('friend_requests').doc(id).set(
        {
          from,
          to,
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
      const rRef = db.collection('friend_requests').doc(id);
      const snap = await rRef.get();
      if (!snap.exists) throw new Error('Request not found');
      const r = snap.data() as any;
      if (r?.to !== username) throw new Error('Not allowed');
      const from = normalizeUsername(String(r?.from || ''));
      const to = normalizeUsername(String(r?.to || ''));
      const fId = friendshipId(from, to);
      await db.collection('friendships').doc(fId).set(
        {
          users: [from, to].sort() as [string, string],
          createdAt: now,
        },
        { merge: true },
      );
      await rRef.set({ status: 'accepted', resolvedAt: now }, { merge: true });
      return new NextResponse(null, { status: 204 });
    }

    if (body.action === 'decline') {
      const id = String((body as any).requestId || '');
      if (!id) throw new Error('Missing requestId');
      const rRef = db.collection('friend_requests').doc(id);
      const snap = await rRef.get();
      if (!snap.exists) throw new Error('Request not found');
      const r = snap.data() as any;
      if (r?.to !== username) throw new Error('Not allowed');
      await rRef.set({ status: 'declined', resolvedAt: now }, { merge: true });
      return new NextResponse(null, { status: 204 });
    }

    throw new Error('Invalid action');
  } catch (e: any) {
    return jsonError(e, e?.message?.includes('trusted') ? 403 : 400);
  }
}

