export const runtime = "edge";
import { NextResponse } from 'next/server';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';
import { requireAuthedUser } from '@/app/api/user/_util';

// Use nodejs runtime for firebase-admin compatibility


export const dynamic = 'force-dynamic';

type P2PSignal =
  | { type: 'offer'; from: string; to: string; sdp: any }
  | { type: 'answer'; from: string; to: string; sdp: any }
  | { type: 'candidate'; from: string; to: string; candidate: any };

function requireId(input: unknown, name: string): string {
  const s = String(input || '').trim();
  if (!s) throw new Error(`Missing ${name}`);
  if (s.length > 128) throw new Error(`${name} too long`);
  return s;
}

function requireRoom(input: unknown): string {
  const s = String(input || '').trim();
  if (!s) throw new Error('Missing roomId');
  if (s.length > 64) throw new Error('roomId too long');
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) throw new Error('Invalid roomId');
  return s;
}

function requireSignal(body: any): P2PSignal {
  const s = body?.signal as any;
  const type = String(s?.type || '');
  if (type !== 'offer' && type !== 'answer' && type !== 'candidate') throw new Error('Invalid signal type');
  const from = requireId(s?.from, 'from');
  const to = requireId(s?.to, 'to');
  if (type === 'candidate') return { type, from, to, candidate: s?.candidate };
  return { type, from, to, sdp: s?.sdp };
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'lan_signal_post', limit: 2400, windowMs: 60_000, key: uid });
    const body = (await req.json().catch(() => ({}))) as any;
    const roomId = requireRoom(body?.roomId);
    const signal = requireSignal(body);

    const { adminDb } = await import('@/app/api/user/_util');
    const { collection, addDoc } = await import('firebase/firestore');
    const db = await adminDb();
    await addDoc(collection(db, 'lan_signals'), {
      uid,
      roomId,
      toPeerId: signal.to,
      fromPeerId: signal.from,
      signal,
      createdAt: Date.now(),
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    const msg = e?.message || 'signal_failed';
    const status = msg.includes('unauthenticated') ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(req: Request) {
  try {
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'lan_signal_poll', limit: 5000, windowMs: 60_000, key: uid });
    const { searchParams } = new URL(req.url);
    const peerId = requireId(searchParams.get('peerId'), 'peerId');
    const roomId = requireRoom(searchParams.get('roomId'));

    const { adminDb } = await import('@/app/api/user/_util');
    const { collection, query, where, limit, getDocs, writeBatch } = await import('firebase/firestore');
    const db = await adminDb();
    const qs = await getDocs(
      query(
        collection(db, 'lan_signals'),
        where('roomId', '==', roomId),
        where('toPeerId', '==', peerId),
        limit(50)
      )
    );

    const signals = qs.docs.map((d) => d.data().signal as P2PSignal);
    // Sort in memory to avoid needing a composite index
    // (signals may be processed out of order by WebRTC, but offer/answer order helps)
    // Actually, we'll just return them. The client handles signaling state.

    if (!qs.empty) {
      const batch = writeBatch(db);
      for (const d of qs.docs) batch.delete(d.ref);
      await batch.commit();
    }

    return NextResponse.json({ signals }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || 'poll_failed';
    const status = msg.includes('unauthenticated') ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

