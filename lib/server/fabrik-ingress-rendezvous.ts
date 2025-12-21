import 'server-only';

type Pending = {
  requestId: string;
  siteId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  bodyBase64?: string | null;
};

type ResponseMsg = {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  bodyBase64: string;
};

type NodeState = {
  nodeId: string;
  lastSeenMs: number;
  pollWaiter?: (req: Pending | null) => void;
  pendingQueue: Pending[];
  responseWaiters: Map<string, (resp: ResponseMsg) => void>;
};

type SiteState = {
  nodes: Map<string, NodeState>;
};

const sites = new Map<string, SiteState>(); // siteId -> nodes

// Nodes are browser tabs; keep TTL modest.
const NODE_TTL_MS = 25_000;

function now() {
  return Date.now();
}

function getOrCreateSite(siteId: string): SiteState {
  let s = sites.get(siteId);
  if (!s) {
    s = { nodes: new Map() };
    sites.set(siteId, s);
  }
  return s;
}

function pruneDeadNodes(siteId: string) {
  const s = sites.get(siteId);
  if (!s) return;
  const t = now();
  for (const [nid, n] of s.nodes) {
    if (t - n.lastSeenMs > NODE_TTL_MS) s.nodes.delete(nid);
  }
  if (s.nodes.size === 0) sites.delete(siteId);
}

function hashStrToUint32(s: string): number {
  // Fast, deterministic FNV-1a.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickNode(siteId: string, requestId: string): NodeState | null {
  pruneDeadNodes(siteId);
  const s = sites.get(siteId);
  if (!s || s.nodes.size === 0) return null;
  const ids = Array.from(s.nodes.keys()).sort();
  const idx = ids.length <= 1 ? 0 : hashStrToUint32(requestId) % ids.length;
  const nid = ids[idx]!;
  return s.nodes.get(nid) || null;
}

export function registerIngressNode(siteId: string, nodeId: string) {
  const t = now();
  const s = getOrCreateSite(siteId);
  let n = s.nodes.get(nodeId);
  if (!n) {
    n = { nodeId, lastSeenMs: t, pendingQueue: [], responseWaiters: new Map() };
    s.nodes.set(nodeId, n);
  }
  n.lastSeenMs = t;
}

export function enqueueIngressRequest(siteId: string, req: Pending): Promise<ResponseMsg> {
  const n = pickNode(siteId, req.requestId);
  if (!n) throw new Error('no_nodes_online');

  n.pendingQueue.push(req);

  if (n.pollWaiter) {
    const w = n.pollWaiter;
    n.pollWaiter = undefined;
    const next = n.pendingQueue.shift() || null;
    w(next);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      n.responseWaiters.delete(req.requestId);
      reject(new Error('timeout'));
    }, 25_000);
    n.responseWaiters.set(req.requestId, (resp) => {
      clearTimeout(timeout);
      resolve(resp);
    });
  });
}

export async function pollNextIngress(siteId: string, nodeId: string): Promise<Pending | null> {
  pruneDeadNodes(siteId);
  const s = sites.get(siteId);
  if (!s) return null;
  const n = s.nodes.get(nodeId);
  if (!n) return null;
  n.lastSeenMs = now();

  const next = n.pendingQueue.shift();
  if (next) return next;

  return await new Promise<Pending | null>((resolve) => {
    n.pollWaiter = resolve;
    setTimeout(() => {
      if (n.pollWaiter === resolve) n.pollWaiter = undefined;
      resolve(null);
    }, 20_000);
  });
}

export function postIngressResponse(siteId: string, nodeId: string, resp: ResponseMsg) {
  pruneDeadNodes(siteId);
  const s = sites.get(siteId);
  if (!s) return;
  const n = s.nodes.get(nodeId);
  if (!n) return;
  const w = n.responseWaiters.get(resp.requestId);
  if (!w) return;
  n.responseWaiters.delete(resp.requestId);
  w(resp);
}







