import { getNachoIdentity } from '@/lib/auth/nacho-identity';
import { deriveStableUlaFromString, virtualIpv6Overlay } from '@/lib/nacho/networking/virtual-ipv6';
import { assertUrlAllowed, getGlobalAllowlist } from '@/lib/security/allowlist';

type PendingRequest = {
  requestId: string;
  siteId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  bodyBase64?: string | null;
};

function toBase64(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export type FabrikIngressHostConfig = {
  siteId: string;
};

export function startFabrikIngressHost(cfg: FabrikIngressHostConfig): () => void {
  let stopped = false;
  let pollAbort: AbortController | null = null;
  let heartbeatTimer: number | null = null;

  // Small in-memory cache for GETs (future feel: instant repeats).
  const cache = new Map<string, { status: number; headers: Record<string, string>; body: Uint8Array; cachedAt: number }>();
  const CACHE_TTL_MS = 4_000;
  const CACHE_MAX_ITEMS = 48;

  const pruneCache = () => {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.cachedAt > CACHE_TTL_MS) cache.delete(k);
    while (cache.size > CACHE_MAX_ITEMS) {
      const first = cache.keys().next().value as string | undefined;
      if (!first) break;
      cache.delete(first);
    }
  };

  const loop = async () => {
    const id = await getNachoIdentity();

    // Register overlay identity for the site (datacenter map).
    try {
      const v6 = await deriveStableUlaFromString(`fabrik-site:${cfg.siteId}`);
      virtualIpv6Overlay?.registerLocalRoute({
        ipv6: v6,
        port: 443,
        proto: 'http',
        serviceName: `fabrik:${cfg.siteId}`,
      });
    } catch {
      // ignore
    }

    const heartbeat = async () => {
      try {
        await fetch('/api/fabrik/ingress/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: cfg.siteId, nodeId: id.uid }),
        });
      } catch {
        // ignore
      }
    };
    void heartbeat();
    heartbeatTimer = window.setInterval(() => void heartbeat(), 10_000);

    while (!stopped) {
      pollAbort?.abort();
      pollAbort = new AbortController();
      try {
        const res = await fetch(
          `/api/fabrik/ingress/poll?siteId=${encodeURIComponent(cfg.siteId)}&nodeId=${encodeURIComponent(id.uid)}`,
          { cache: 'no-store', signal: pollAbort.signal },
        );
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        const req = (await res.json().catch(() => null)) as PendingRequest | null;
        if (!req) continue;

        const urlPath = req.path.startsWith('/') ? req.path : `/${req.path}`;
        const method = String(req.method || 'GET').toUpperCase();

        pruneCache();
        let outStatus = 503;
        let outHeaders: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8' };
        let outBody: ArrayBuffer = new TextEncoder().encode('ingress_offline').buffer;

        // GET path is optimized: memoize short-lived responses for micro-latency.
        if (method === 'GET') {
          const cacheKey = urlPath;
          const cached = cache.get(cacheKey);
          const now = Date.now();
          if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
            outStatus = cached.status;
            outHeaders = cached.headers;
            outBody = cached.body.buffer;
          } else {
            const target = `${window.location.origin}/host/${encodeURIComponent(cfg.siteId)}${urlPath}`;
            assertUrlAllowed(target, getGlobalAllowlist());
            const upstream = await fetch(target, { method: 'GET', cache: 'no-store' });
            outStatus = upstream.status;
            outHeaders = {};
            upstream.headers.forEach((v, k) => (outHeaders[k] = v));
            const buf = await upstream.arrayBuffer();
            const body = new Uint8Array(buf);
            outBody = body.buffer;
            if (buf.byteLength <= 512 * 1024) {
              cache.set(cacheKey, { status: outStatus, headers: outHeaders, body, cachedAt: now });
            }
          }
        } else {
          // Pass-through for non-GET.
          const init: RequestInit = { method, headers: req.headers };
          if (req.bodyBase64 && method !== 'GET' && method !== 'HEAD') init.body = fromBase64(req.bodyBase64);
          const target = `${window.location.origin}/host/${encodeURIComponent(cfg.siteId)}${urlPath}`;
          assertUrlAllowed(target, getGlobalAllowlist());
          const upstream = await fetch(target, init);
          outStatus = upstream.status;
          outHeaders = {};
          upstream.headers.forEach((v, k) => (outHeaders[k] = v));
          outBody = await upstream.arrayBuffer();
        }

        await fetch('/api/fabrik/ingress/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteId: cfg.siteId,
            nodeId: id.uid,
            requestId: req.requestId,
            status: outStatus,
            headers: outHeaders,
            bodyBase64: toBase64(outBody),
          }),
        });
      } catch {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  };

  void loop();

  return () => {
    stopped = true;
    pollAbort?.abort();
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };
}


