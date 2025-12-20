import type { PeerMessage } from '@/src/nacho/net/p2p_node';
import { p2pNode } from '@/src/nacho/net/p2p_node';
import { getNachoIdentity } from '@/lib/auth/nacho-identity';

export type VirtualIpv6Proto = 'fabric' | 'http' | 'tcp' | 'tunnel';

export type VirtualIpv6Route = {
  ipv6: string;
  port: number;
  proto: VirtualIpv6Proto;
  serviceName?: string;
  serviceId?: string;
  tunnelUrl?: string;
  nodeId?: string;
  peerId?: string;
  lastSeenAt: number;
  origin: 'local' | 'peer';
};

type Ipv6Ad = {
  type: 'NACHO_IPV6_AD';
  payload: {
    nodeId: string;
    ipv6: string;
    routes: Array<{
      port: number;
      proto: VirtualIpv6Proto;
      serviceName?: string;
      serviceId?: string;
      tunnelUrl?: string;
    }>;
  };
};

function nowMs() {
  return Date.now();
}

function normalizeIpv6(ip: string): string {
  return ip.trim().toLowerCase();
}

function routeKey(r: { ipv6: string; port: number; proto: VirtualIpv6Proto; serviceId?: string; serviceName?: string }) {
  return `${normalizeIpv6(r.ipv6)}|${r.port}|${r.proto}|${r.serviceId ?? ''}|${r.serviceName ?? ''}`;
}

function bytesToIpv6Ula(bytes16: Uint8Array): string {
  // ULA: fd00::/8
  const b = new Uint8Array(16);
  b.set(bytes16.subarray(0, 16));
  b[0] = 0xfd;
  const parts: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    const v = (b[i] << 8) | b[i + 1];
    parts.push(v.toString(16).padStart(4, '0'));
  }
  return parts.join(':');
}

async function sha256Bytes(text: string): Promise<Uint8Array> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return new Uint8Array(buf);
}

async function deriveStableUlaFromIdentity(): Promise<string> {
  const id = await getNachoIdentity();
  // Use uid as stable seed.
  const seed = `nacho-ipv6:v1:${id.uid}`;
  const hash = await sha256Bytes(seed);
  return bytesToIpv6Ula(hash.subarray(0, 16));
}

export async function deriveStableUlaFromString(seed: string): Promise<string> {
  const hash = await sha256Bytes(`nacho-ipv6:v1:${seed}`);
  return bytesToIpv6Ula(hash.subarray(0, 16));
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export class VirtualIpv6Overlay {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private localNodeId: string | null = null;
  private localIpv6: string | null = null;

  // Local services we advertise.
  private localRoutes = new Map<string, VirtualIpv6Route>();
  // Peer-discovered routes (TTL’d).
  private discoveredRoutes = new Map<string, VirtualIpv6Route>();

  private advertiseTimer: number | null = null;
  private pruneTimer: number | null = null;

  // Tunables (keep conservative defaults).
  private advertiseEveryMs = 4_000;
  private routeTtlMs = 12_000;

  async ensureInitialized(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const node = p2pNode;
      this.localNodeId = node?.getId() ?? null;
      this.localIpv6 = await deriveStableUlaFromIdentity();

      // Restore best-effort previously known peer routes (helps UX on reload).
      const persisted = readJson<Array<VirtualIpv6Route>>('bellum.ipv6.routes.v1');
      if (Array.isArray(persisted)) {
        const cutoff = nowMs() - this.routeTtlMs;
        for (const r of persisted) {
          if (!r || typeof (r as any).ipv6 !== 'string') continue;
          if ((r.lastSeenAt ?? 0) < cutoff) continue;
          const k = routeKey(r);
          this.discoveredRoutes.set(k, { ...r, origin: 'peer' });
        }
      }

      if (node) {
        node.onMessage((msg: PeerMessage, fromPeerId: string) => {
          const any = msg as unknown as Partial<Ipv6Ad>;
          if (any?.type !== 'NACHO_IPV6_AD') return;
          const payload = (any as Ipv6Ad).payload;
          if (!payload?.ipv6 || !payload?.nodeId) return;
          if (!Array.isArray(payload.routes)) return;
          const ts = nowMs();
          for (const rr of payload.routes) {
            if (!rr || typeof rr.port !== 'number' || typeof rr.proto !== 'string') continue;
            const route: VirtualIpv6Route = {
              ipv6: normalizeIpv6(payload.ipv6),
              port: rr.port,
              proto: rr.proto as VirtualIpv6Proto,
              serviceName: rr.serviceName,
              serviceId: rr.serviceId,
              tunnelUrl: rr.tunnelUrl,
              nodeId: payload.nodeId,
              peerId: fromPeerId,
              lastSeenAt: ts,
              origin: 'peer',
            };
            this.discoveredRoutes.set(routeKey(route), route);
          }
          this.persistDiscoveredRoutes();
        });
      }

      // Periodically advertise local routes.
      this.advertiseTimer = window.setInterval(() => this.broadcastAd(), this.advertiseEveryMs);
      // Periodically prune discovered routes.
      this.pruneTimer = window.setInterval(() => this.prune(), 2_500);

      // Send a first ad quickly.
      this.broadcastAd();

      this.initialized = true;
    })();

    return this.initPromise;
  }

  getLocalIpv6(): string | null {
    return this.localIpv6;
  }

  registerLocalRoute(args: Omit<VirtualIpv6Route, 'ipv6' | 'nodeId' | 'peerId' | 'lastSeenAt' | 'origin'> & { ipv6?: string }) {
    const ipv6 = normalizeIpv6(args.ipv6 ?? this.localIpv6 ?? '');
    if (!ipv6) return;
    const route: VirtualIpv6Route = {
      ipv6,
      port: args.port,
      proto: args.proto,
      serviceName: args.serviceName,
      serviceId: args.serviceId,
      tunnelUrl: args.tunnelUrl,
      nodeId: this.localNodeId ?? undefined,
      peerId: undefined,
      lastSeenAt: nowMs(),
      origin: 'local',
    };
    this.localRoutes.set(routeKey(route), route);
    // Opportunistically broadcast; keep it light (JSON only).
    this.broadcastAd();
  }

  listRoutes(): VirtualIpv6Route[] {
    const all = [...this.localRoutes.values(), ...this.discoveredRoutes.values()];
    all.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return all;
  }

  resolve(ipv6: string, port: number, proto: VirtualIpv6Proto): VirtualIpv6Route | null {
    const ip = normalizeIpv6(ipv6);
    // Prefer local.
    for (const r of this.localRoutes.values()) {
      if (r.ipv6 === ip && r.port === port && r.proto === proto) return r;
    }
    // Otherwise most recent peer match.
    let best: VirtualIpv6Route | null = null;
    for (const r of this.discoveredRoutes.values()) {
      if (r.ipv6 !== ip || r.port !== port || r.proto !== proto) continue;
      if (!best || r.lastSeenAt > best.lastSeenAt) best = r;
    }
    return best;
  }

  private broadcastAd() {
    const node = p2pNode;
    if (!node || !this.localIpv6) return;
    const routes = Array.from(this.localRoutes.values()).map((r) => ({
      port: r.port,
      proto: r.proto,
      serviceName: r.serviceName,
      serviceId: r.serviceId,
      tunnelUrl: r.tunnelUrl,
    }));
    const msg: Ipv6Ad = {
      type: 'NACHO_IPV6_AD',
      payload: { nodeId: node.getId(), ipv6: this.localIpv6, routes },
    };
    try {
      node.broadcast(msg as unknown as PeerMessage);
    } catch {
      // ignore
    }
  }

  private prune() {
    const cutoff = nowMs() - this.routeTtlMs;
    let changed = false;
    for (const [k, v] of this.discoveredRoutes.entries()) {
      if (v.lastSeenAt < cutoff) {
        this.discoveredRoutes.delete(k);
        changed = true;
      }
    }
    if (changed) this.persistDiscoveredRoutes();
  }

  private persistDiscoveredRoutes() {
    // Keep persistence tiny; only persist peer routes.
    const slim = Array.from(this.discoveredRoutes.values()).slice(0, 256);
    writeJson('bellum.ipv6.routes.v1', slim);
  }
}

export const virtualIpv6Overlay = typeof window !== 'undefined' ? new VirtualIpv6Overlay() : null;


