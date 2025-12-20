import { createFrameScheduler } from '@/lib/vps/runtime/scheduler';
import { getLatestCheckpoint, putCheckpoint, type VpsCheckpoint } from '@/lib/vps/runtime/idb';
import { assertUrlAllowed, getGlobalAllowlist } from '@/lib/security/allowlist';

export type VpsProcess = {
  pid: string;
  serviceId: string;
  createdAt: number;
  state: any;
};

export type VpsRuntimeState = {
  vpsId: string;
  seq: number;
  processes: Record<string, VpsProcess>;
  // Cache for “supercomputer-fast” feel: response memoization.
  httpCache: Record<string, { status: number; headers: Record<string, string>; bodyBase64: string; cachedAt: number }>;
};

function toBase64(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

export class VirtualVpsRuntime {
  private state: VpsRuntimeState;
  private scheduler = createFrameScheduler({ frameBudgetMs: 8 });
  private checkpointTimer: number | null = null;

  private constructor(state: VpsRuntimeState) {
    this.state = state;
  }

  static async boot(vpsId: string): Promise<VirtualVpsRuntime> {
    const cp = await getLatestCheckpoint(vpsId);
    const base: VpsRuntimeState = cp?.state
      ? (cp.state as VpsRuntimeState)
      : { vpsId, seq: 0, processes: {}, httpCache: {} };
    // Ensure identity matches.
    base.vpsId = vpsId;
    const rt = new VirtualVpsRuntime(base);
    rt.scheduler.start();
    rt.startCheckpointLoop();
    return rt;
  }

  private startCheckpointLoop() {
    if (this.checkpointTimer) return;
    this.checkpointTimer = window.setInterval(() => {
      this.scheduler.schedule('background', async () => {
        await this.checkpoint();
      });
    }, 5000);
  }

  stop() {
    this.scheduler.stop();
    if (this.checkpointTimer) window.clearInterval(this.checkpointTimer);
    this.checkpointTimer = null;
  }

  getState(): VpsRuntimeState {
    return this.state;
  }

  upsertProcess(serviceId: string, initialState: any = {}): string {
    // One process per serviceId for now (MVP).
    const existing = Object.values(this.state.processes).find((p) => p.serviceId === serviceId);
    if (existing) return existing.pid;
    const pid = crypto.randomUUID();
    this.state.processes[pid] = { pid, serviceId, createdAt: Date.now(), state: initialState };
    return pid;
  }

  private bump() {
    this.state.seq += 1;
  }

  async checkpoint(): Promise<void> {
    const cp: VpsCheckpoint = { vpsId: this.state.vpsId, seq: this.state.seq, createdAt: Date.now(), state: this.state };
    await putCheckpoint(cp);
  }

  // “Web server” service: proxy + memoize.
  async handleHttpGetProxy(args: { siteId: string | null; path: string }): Promise<{ status: number; headers: Record<string, string>; body: Uint8Array }> {
    this.bump();

    const cacheKey = `${args.siteId || 'none'}:${args.path}`;
    const cached = this.state.httpCache[cacheKey];
    const now = Date.now();
    if (cached && now - cached.cachedAt < 5000) {
      const bytes = Uint8Array.from(atob(cached.bodyBase64), (c) => c.charCodeAt(0));
      return { status: cached.status, headers: cached.headers, body: bytes };
    }

    if (!args.siteId) {
      const bytes = new TextEncoder().encode('VPS online (no site configured)');
      return { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: bytes };
    }

    const target = `${window.location.origin}/host/${encodeURIComponent(args.siteId)}${args.path}`;
    assertUrlAllowed(target, getGlobalAllowlist());
    const upstream = await fetch(target, { method: 'GET', cache: 'no-store' });
    const buf = await upstream.arrayBuffer();
    const headers: Record<string, string> = {};
    upstream.headers.forEach((v, k) => (headers[k] = v));

    // Memoize small responses for instant repeat loads.
    if (buf.byteLength <= 512 * 1024) {
      this.state.httpCache[cacheKey] = {
        status: upstream.status,
        headers,
        bodyBase64: toBase64(buf),
        cachedAt: now,
      };
    }

    return { status: upstream.status, headers, body: new Uint8Array(buf) };
  }
}

