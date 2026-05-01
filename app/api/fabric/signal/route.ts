import { NextResponse } from 'next/server';

import { verifySessionCookieFromRequest } from '@/lib/server/session';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';



export const dynamic = 'force-dynamic';

type P2PSignal =
  | { type: 'offer'; from: string; to: string; sdp: any }
  | { type: 'answer'; from: string; to: string; sdp: any }
  | { type: 'candidate'; from: string; to: string; candidate: any };

function requirePeerId(input: unknown, name: string): string {
  const s = String(input || '').trim();
  if (!s) throw new Error(`Missing ${name}`);
  if (s.length > 128) throw new Error(`${name} too long`);
  return s;
}

function requireSignal(body: any): P2PSignal {
  const s = body?.signal as any;
  const type = String(s?.type || '');
  if (type !== 'offer' && type !== 'answer' && type !== 'candidate') throw new Error('Invalid signal type');
  const from = requirePeerId(s?.from, 'from');
  const to = requirePeerId(s?.to, 'to');
  if (type === 'candidate') return { type, from, to, candidate: s?.candidate };
  return { type, from, to, sdp: s?.sdp };
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const uid = (await verifySessionCookieFromRequest(req)).uid;
    rateLimit(req, { scope: 'fabric_signal_post', limit: 600, windowMs: 60_000, key: uid });
    const body = (await req.json().catch(() => ({}))) as any;
    const signal = requireSignal(body);

    const { adminDb } = await import('@/app/api/user/_util');
    const { collection, addDoc } = await import('firebase/firestore');
    const db = await adminDb();
    await addDoc(collection(db, 'fabric_signals'), {
      uid,
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
    const uid = (await verifySessionCookieFromRequest(req)).uid;
    rateLimit(req, { scope: 'fabric_signal_poll', limit: 1200, windowMs: 60_000, key: uid });
    const { searchParams } = new URL(req.url);
    const peerId = requirePeerId(searchParams.get('peerId'), 'peerId');

    const { adminDb } = await import('@/app/api/user/_util');
    const { collection, query, where, orderBy, limit, getDocs, writeBatch } = await import('firebase/firestore');
    const db = await adminDb();
    const qs = await getDocs(
      query(
        collection(db, 'fabric_signals'),
        where('uid', '==', uid),
        where('toPeerId', '==', peerId),
        orderBy('createdAt', 'asc'),
        limit(50)
      )
    );

    const signals = qs.docs.map((d) => d.data().signal as P2PSignal);
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

