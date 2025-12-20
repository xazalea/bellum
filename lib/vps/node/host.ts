import { getNachoIdentity } from '@/lib/auth/nacho-identity';
import { VirtualVpsRuntime } from '@/lib/vps/runtime/runtime';
import { generateChat } from '@/lib/vps/llm/local-llm';
import { assertUrlAllowed, getGlobalAllowlist } from '@/lib/security/allowlist';

type PendingRequest = {
  requestId: string;
  vpsId: string;
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

export type VpsHostConfig = {
  vpsId: string;
  // Serve by proxying to an existing Fabrik hosted site (siteId).
  siteId?: string | null;
};

export function startVpsHost(cfg: VpsHostConfig): () => void {
  let stopped = false;
  let pollAbort: AbortController | null = null;
  let runtime: VirtualVpsRuntime | null = null;
  let heartbeatTimer: number | null = null;

  const loop = async () => {
    const id = await getNachoIdentity();
    runtime = await VirtualVpsRuntime.boot(cfg.vpsId);
    runtime.upsertProcess('web', { siteId: cfg.siteId || null });
    // Heartbeat for rendezvous (keeps node eligible + enables failover).
    const heartbeat = async () => {
      try {
        await fetch('/api/vps/rendezvous/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vpsId: cfg.vpsId, nodeId: id.uid }),
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
          `/api/vps/rendezvous/poll?vpsId=${encodeURIComponent(cfg.vpsId)}&nodeId=${encodeURIComponent(id.uid)}`,
          { cache: 'no-store', signal: pollAbort.signal },
        );
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        const req = (await res.json()) as PendingRequest | null;
        if (!req) continue;

        const urlPath = req.path.startsWith('/') ? req.path : `/${req.path}`;
        const rt = runtime;
        let outStatus = 503;
        let outHeaders: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8' };
        let outBody: ArrayBuffer = new TextEncoder().encode('runtime_offline').buffer;

        // LLM endpoint (local inference).
        if (urlPath.startsWith('/api/llm/chat') && req.method.toUpperCase() === 'POST') {
          try {
            const bytes = req.bodyBase64 ? fromBase64(req.bodyBase64) : new Uint8Array();
            const bodyText = new TextDecoder().decode(bytes);
            const j = JSON.parse(bodyText) as any;
            const messages = Array.isArray(j?.messages) ? j.messages : [{ role: 'user', content: String(j?.prompt || '') }];
            const maxNewTokens = Number(j?.maxNewTokens || 64);
            const result = await generateChat({ messages, maxNewTokens });
            outStatus = 200;
            outHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
            outBody = new TextEncoder().encode(JSON.stringify({ text: result.text })).buffer;
          } catch (e: any) {
            outStatus = 400;
            outHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
            outBody = new TextEncoder().encode(JSON.stringify({ error: e?.message || 'llm_failed' })).buffer;
          }
        } else if (rt && req.method.toUpperCase() === 'GET') {
          const result = await rt.handleHttpGetProxy({ siteId: cfg.siteId || null, path: urlPath });
          outStatus = result.status;
          outHeaders = result.headers;
          outBody = result.body.buffer;
        } else if (cfg.siteId) {
          // Pass-through for non-GET until we fully virtualize request handlers.
          const init: RequestInit = { method: req.method, headers: req.headers };
          if (req.bodyBase64 && req.method !== 'GET' && req.method !== 'HEAD') {
            init.body = fromBase64(req.bodyBase64);
          }
          const target = `${window.location.origin}/host/${encodeURIComponent(cfg.siteId)}${urlPath}`;
          assertUrlAllowed(target, getGlobalAllowlist());
          const upstream = await fetch(target, init);
          outStatus = upstream.status;
          outHeaders = {};
          upstream.headers.forEach((v, k) => (outHeaders[k] = v));
          outBody = await upstream.arrayBuffer();
        }

        await fetch('/api/vps/rendezvous/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vpsId: cfg.vpsId,
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
    runtime?.stop();
    runtime = null;
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };
}

