import { NextResponse } from 'next/server';
import { adminDb, jsonError, requireAuthedUser } from '@/app/api/user/_util';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';

export const runtime = 'nodejs';

type SiteRules = {
  redirects?: Array<{ from: string; to: string; status?: number }>;
  headers?: Array<{ name: string; value: string }>;
};

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
  const { uid } = await requireAuthedUser(req);
  const db = adminDb();
  const ref = db.collection('xfabric_sites').doc(siteId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('not_found');
  const site = snap.data() as any;
  if (String(site?.ownerUid || '') !== uid) throw new Error('forbidden');
  return { uid, ref, site };
}

function normalizeRules(raw: any): SiteRules {
  const out: SiteRules = {};

  const redirectsIn = Array.isArray(raw?.redirects) ? raw.redirects : [];
  out.redirects = redirectsIn
    .slice(0, 100)
    .map((r: any) => ({
      from: String(r?.from || '').trim(),
      to: String(r?.to || '').trim(),
      status: Number(r?.status || 302),
    }))
    .filter((r) => r.from && r.to)
    .map((r) => ({
      from: r.from.startsWith('/') ? r.from : `/${r.from}`,
      to: r.to,
      status: r.status === 301 || r.status === 302 || r.status === 307 || r.status === 308 ? r.status : 302,
    }));

  const headersIn = Array.isArray(raw?.headers) ? raw.headers : [];
  out.headers = headersIn
    .slice(0, 50)
    .map((h: any) => ({ name: String(h?.name || '').trim(), value: String(h?.value || '').trim() }))
    .filter((h) => h.name && h.value)
    .map((h) => ({ name: h.name.slice(0, 128), value: h.value.slice(0, 2048) }));

  return out;
}

export async function PATCH(req: Request, ctx: { params: { siteId: string } }) {
  try {
    requireSameOrigin(req);
    const siteId = String(ctx.params.siteId || '');
    if (!siteId) throw new Error('missing_siteId');
    const { uid, ref, site } = await requireOwnedSite(req, siteId);
    rateLimit(req, { scope: 'fabrik_sites_patch', limit: 120, windowMs: 60_000, key: uid });

    const body = (await req.json().catch(() => ({}))) as { domain?: string | null; rules?: SiteRules };
    const patch: any = { updatedAt: Date.now() };

    if ('domain' in body) {
      const domainRaw = body.domain === null ? '' : String(body.domain || '').trim();
      patch.domain = domainRaw ? normalizeDomain(domainRaw) : null;
    }

    if ('rules' in body) {
      patch.rules = normalizeRules((body as any).rules);
    }

    await ref.set(patch, { merge: true });
    return NextResponse.json({ id: ref.id, ...(site as any), ...patch }, { status: 200 });
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
    rateLimit(req, { scope: 'fabrik_sites_delete', limit: 30, windowMs: 60_000, key: uid });
    await ref.delete();
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    const status = e?.message === 'not_found' ? 404 : e?.message === 'forbidden' ? 403 : e?.message?.includes('unauthenticated') ? 401 : 400;
    return jsonError(e, status);
  }
}

