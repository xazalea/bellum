export const runtime = "edge";
import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';



function normalizeDomain(input: string): string {
  const d = input.trim().toLowerCase();
  // Minimal hostname validation (no scheme/path).
  if (!/^[a-z0-9.-]{3,253}$/.test(d) || d.includes('..') || d.startsWith('-') || d.endsWith('-')) {
    throw new Error('Invalid domain');
  }
  if (!d.includes('.')) throw new Error('Domain must include a dot');
  return d;
}

async function requireOwnedSite(req: Request, siteId: string) {
  const { doc, getDoc } = await import('firebase/firestore');
  const { uid } = await requireAuthedUser(req);
  const db = await adminDb();
  const ref = doc(db, 'xfabric_sites', siteId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('not_found');
  const site = snap.data() as any;
  if (String(site?.ownerUid || '') !== uid) throw new Error('forbidden');
  return { uid, db, ref, site };
}

export async function PATCH(req: Request, ctx: { params: { siteId: string } }) {
  try {
    requireSameOrigin(req);
    const siteId = String(ctx.params.siteId || '');
    if (!siteId) throw new Error('missing_siteId');
    const { uid, ref, site } = await requireOwnedSite(req, siteId);
    rateLimit(req, { scope: 'xfabric_sites_patch', limit: 120, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as { domain?: string | null };
    const domainRaw = body.domain === null ? '' : String(body.domain || '').trim();
    const domain = domainRaw ? normalizeDomain(domainRaw) : null;

    const { setDoc } = await import('firebase/firestore');
    await setDoc(ref, { domain, updatedAt: Date.now() }, { merge: true });
    return NextResponse.json({ id: ref.id, ...(site as any), domain }, { status: 200 });
  } catch (e: any) {
    const status = e?.message === 'not_found' ? 404 : e?.message === 'forbidden' ? 403 : e?.message?.includes('unauthenticated') ? 401 : 400;
    return jsonError(e, status);
  }
}

export async function DELETE(req: Request, ctx: { params: { siteId: string } }) {
  try {
    requireSameOrigin(req);
    const siteId = String(ctx.params.siteId || '');
    if (!siteId) throw new Error('missing_siteId');
    const { uid, ref } = await requireOwnedSite(req, siteId);
    rateLimit(req, { scope: 'xfabric_sites_delete', limit: 30, windowMs: 60_000, key: uid });
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(ref);
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    const status = e?.message === 'not_found' ? 404 : e?.message === 'forbidden' ? 403 : e?.message?.includes('unauthenticated') ? 401 : 400;
    return jsonError(e, status);
  }
}

