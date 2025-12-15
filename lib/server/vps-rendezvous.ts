import 'server-only';

type Pending = {
  requestId: string;
  vpsId: string;
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
  // For long-polling
  pollWaiter?: (req: Pending | null) => void;
  pendingQueue: Pending[];
  responseWaiters: Map<string, (resp: ResponseMsg) => void>;
};

type VpsState = {
  nodes: Map<string, NodeState>;
};

const vpses = new Map<string, VpsState>(); // vpsId -> nodes

const OWNER_TTL_MS = 25_000;

function now() {
  return Date.now();
}

function getOrCreateVps(vpsId: string): VpsState {
  let v = vpses.get(vpsId);
  if (!v) {
    v = { nodes: new Map() };
    vpses.set(vpsId, v);
  }
  return v;
}

function pickOwner(vpsId: string): NodeState | null {
  const v = vpses.get(vpsId);
  if (!v) return null;
  const t = now();
  // Remove dead nodes.
  for (const [nid, n] of v.nodes) {
    if (t - n.lastSeenMs > OWNER_TTL_MS) v.nodes.delete(nid);
  }
  if (v.nodes.size === 0) return null;
  // Deterministic tie-break: lowest nodeId lexicographically.
  const ids = Array.from(v.nodes.keys()).sort();
  return v.nodes.get(ids[0]!) || null;
}

export function registerOwner(vpsId: string, nodeId: string) {
  const t = now();
  const v = getOrCreateVps(vpsId);
  let n = v.nodes.get(nodeId);
  if (!n) {
    n = { nodeId, lastSeenMs: t, pendingQueue: [], responseWaiters: new Map() };
    v.nodes.set(nodeId, n);
  }
  n.lastSeenMs = t;
}

export function enqueueRequest(vpsId: string, req: Pending): Promise<ResponseMsg> {
  const o = pickOwner(vpsId);
  if (!o) throw new Error('no_nodes_online');

  o.pendingQueue.push(req);

  // Wake poller if waiting.
  if (o.pollWaiter) {
    const w = o.pollWaiter;
    o.pollWaiter = undefined;
    const next = o.pendingQueue.shift() || null;
    w(next);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      o.responseWaiters.delete(req.requestId);
      reject(new Error('timeout'));
    }, 25_000);
    o.responseWaiters.set(req.requestId, (resp) => {
      clearTimeout(timeout);
      resolve(resp);
    });
  });
}

export async function pollNext(vpsId: string, nodeId: string): Promise<Pending | null> {
  const v = vpses.get(vpsId);
  if (!v) return null;
  const n = v.nodes.get(nodeId);
  if (!n) return null;
  n.lastSeenMs = now();

  const next = n.pendingQueue.shift();
  if (next) return next;

  return await new Promise<Pending | null>((resolve) => {
    // Replace existing waiter (best-effort)
    n.pollWaiter = resolve;
    setTimeout(() => {
      if (n.pollWaiter === resolve) n.pollWaiter = undefined;
      resolve(null);
    }, 20_000);
  });
}

export function postResponse(vpsId: string, nodeId: string, resp: ResponseMsg) {
  const v = vpses.get(vpsId);
  if (!v) return;
  const n = v.nodes.get(nodeId);
  if (!n) return;
  const w = n.responseWaiters.get(resp.requestId);
  if (!w) return;
  n.responseWaiters.delete(resp.requestId);
  w(resp);
}

