import { p2pNode, PeerMessage } from "../../src/nacho/net/p2p_node";

export type FabricWireMessage =
  | { type: "FABRIC_HELLO"; payload: { nodeId: string } }
  | { type: "FABRIC_SERVICE_AD"; payload: { nodeId: string; serviceId: string; serviceName: string } }
  | { type: "FABRIC_RPC_REQ"; payload: { id: string; serviceId: string; request: unknown } }
  | { type: "FABRIC_RPC_RES"; payload: { id: string; ok: boolean; response?: unknown; error?: string } };

export interface FabricPeer {
  peerId: string;
  lastSeenAt: number;
}

export interface FabricServiceAd {
  nodeId: string;
  peerId: string;
  serviceId: string;
  serviceName: string;
  lastSeenAt: number;
}

export class FabricMesh {
  private peers = new Map<string, FabricPeer>();
  private peerNodeIds = new Map<string, string>(); // peerId -> nodeId
  private services = new Map<string, FabricServiceAd>();
  private rpcResolvers = new Map<string, (res: { ok: boolean; response?: unknown; error?: string }) => void>();
  private rpcHandlers: ((req: { id: string; serviceId: string; request: unknown; fromPeerId: string }) => void)[] = [];

  constructor() {
    const node = p2pNode;
    if (!node) return;

    node.onMessage((msg: PeerMessage, from: string) => {
      this.peers.set(from, { peerId: from, lastSeenAt: Date.now() });

      const wire = msg as unknown as FabricWireMessage;
      if (wire.type === "FABRIC_HELLO") {
        this.peerNodeIds.set(from, wire.payload.nodeId);
      }

      if (wire.type === "FABRIC_SERVICE_AD") {
        const ad = wire.payload;
        this.services.set(ad.serviceId, { ...ad, peerId: from, lastSeenAt: Date.now() });
      }

      if (wire.type === "FABRIC_RPC_REQ") {
        const { id, serviceId, request } = wire.payload;
        this.rpcHandlers.forEach((h) => h({ id, serviceId, request, fromPeerId: from }));
      }

      if (wire.type === "FABRIC_RPC_RES") {
        const { id, ok, response, error } = wire.payload;
        const r = this.rpcResolvers.get(id);
        if (r) {
          this.rpcResolvers.delete(id);
          r({ ok, response, error });
        }
      }
    });

    // Announce ourselves on any existing channels.
    try {
      node.broadcast({ type: "FABRIC_HELLO", payload: { nodeId: node.getId() } });
    } catch {
      // ignore
    }
  }

  getLocalNodeId(): string | null {
    return p2pNode?.getId() ?? null;
  }

  getPeers(): FabricPeer[] {
    return Array.from(this.peers.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }

  getServices(): FabricServiceAd[] {
    return Array.from(this.services.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }

  // Simple router: pick most recently seen service by name.
  resolveServiceByName(serviceName: string): FabricServiceAd | null {
    const candidates = this.getServices().filter((s) => s.serviceName === serviceName);
    return candidates[0] ?? null;
  }

  // For debug/UX: map a WebRTC peerId to the peer-reported fabric nodeId.
  getPeerNodeId(peerId: string): string | null {
    return this.peerNodeIds.get(peerId) ?? null;
  }

  advertiseService(serviceId: string, serviceName: string) {
    const node = p2pNode;
    if (!node) return;
    node.broadcast({
      type: "FABRIC_SERVICE_AD",
      payload: { nodeId: node.getId(), serviceId, serviceName }
    } as unknown as PeerMessage);
  }

  onRpcRequest(handler: (req: { id: string; serviceId: string; request: unknown; fromPeerId: string }) => void) {
    this.rpcHandlers.push(handler);
  }

  async rpcCall(serviceId: string, request: unknown): Promise<unknown> {
    const node = p2pNode;
    if (!node) throw new Error("P2P not available");

    const ad = this.services.get(serviceId);
    if (!ad) throw new Error(`No route for service ${serviceId}`);

    const id = crypto.randomUUID();

    const resP = new Promise<{ ok: boolean; response?: unknown; error?: string }>((resolve) => {
      this.rpcResolvers.set(id, resolve);
      // timeout safety
      setTimeout(() => {
        const r = this.rpcResolvers.get(id);
        if (r) {
          this.rpcResolvers.delete(id);
          resolve({ ok: false, error: "RPC timeout" });
        }
      }, 8000);
    });

    node.send(ad.peerId, {
      type: "FABRIC_RPC_REQ",
      payload: { id, serviceId, request }
    } as unknown as PeerMessage);

    const res = await resP;
    if (!res.ok) throw new Error(res.error || "RPC error");
    return res.response;
  }

  async rpcCallByName(serviceName: string, request: unknown): Promise<{ address: string; response: unknown }> {
    const ad = this.resolveServiceByName(serviceName);
    if (!ad) throw new Error(`No service named ${serviceName}`);
    const response = await this.rpcCall(ad.serviceId, request);
    return { address: `fabric://${ad.serviceId}`, response };
  }

  // Called by runtime to respond to a specific peer.
  respondRpc(toPeerId: string, id: string, ok: boolean, response?: unknown, error?: string) {
    const node = p2pNode;
    if (!node) return;
    node.send(toPeerId, {
      type: "FABRIC_RPC_RES",
      payload: { id, ok, response, error }
    } as unknown as PeerMessage);
  }
}

export const fabricMesh = new FabricMesh();
