export type ClusterPeer = {
  userId: string;
  deviceId: string;
  userAgent?: string | null;
  label?: string | null;
  load?: number | null;
  // Best-effort self-reported link metrics (for routing / scheduling decisions).
  uplinkKbps?: number | null;
  downlinkKbps?: number | null;
  // Optional capability flags, e.g. ["ingress", "storage", "gpu"].
  caps?: string[] | null;
  lastSeenUnixMs: number;
};

type Store = {
  peers: Map<string, ClusterPeer>; // key = `${userId}:${deviceId}`
};

function getStore(): Store {
  const g = globalThis as unknown as { __bellumClusterStore?: Store };
  if (!g.__bellumClusterStore) {
    g.__bellumClusterStore = { peers: new Map() };
  }
  return g.__bellumClusterStore;
}

export function upsertPeer(peer: Omit<ClusterPeer, 'lastSeenUnixMs'> & { lastSeenUnixMs?: number }) {
  const store = getStore();
  const key = `${peer.userId}:${peer.deviceId}`;
  store.peers.set(key, {
    ...peer,
    lastSeenUnixMs: typeof peer.lastSeenUnixMs === 'number' ? peer.lastSeenUnixMs : Date.now(),
  });
}

export function listActivePeersForUser(userId: string, activeWindowMs: number): ClusterPeer[] {
  const store = getStore();
  const now = Date.now();
  const out: ClusterPeer[] = [];
  for (const peer of store.peers.values()) {
    if (peer.userId !== userId) continue;
    if (now - peer.lastSeenUnixMs > activeWindowMs) continue;
    out.push(peer);
  }
  out.sort((a, b) => b.lastSeenUnixMs - a.lastSeenUnixMs);
  return out;
}

export function prunePeers(activeWindowMs: number) {
  const store = getStore();
  const now = Date.now();
  for (const [k, v] of store.peers.entries()) {
    if (now - v.lastSeenUnixMs > activeWindowMs) store.peers.delete(k);
  }
}

