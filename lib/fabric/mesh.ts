import { p2pNode, PeerMessage } from "../../src/nacho/net/p2p_node";

export type FabricWireMessage =
  | { type: "FABRIC_HELLO"; payload: { nodeId: string } }
  | { type: "FABRIC_SERVICE_AD"; payload: { nodeId: string; serviceId: string; serviceName: string } }
  | { type: "FABRIC_RPC_REQ"; payload: { id: string; serviceId: string; request: unknown } }
  | { type: "FABRIC_RPC_RES"; payload: { id: string; ok: boolean; response?: unknown; error?: string } }
  | { type: "FABRIC_PING"; payload: { id: string; sentAt: number } }
  | { type: "FABRIC_PONG"; payload: { id: string; sentAt: number; receivedAt: number } };

type RawFrameKind = "STREAM_CHUNK" | "STREAM_END";
type RawFrameHeader =
  | { kind: "STREAM_CHUNK"; streamId: string; index: number; total: number }
  | { kind: "STREAM_END"; streamId: string; total: number };

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

export interface FabricPeerStats {
  peerId: string;
  lastSeenAt: number;
  lastPingAt: number;
  lastPongAt: number;
  rttMs: number;
  avgRttMs: number;
  jitterMs: number;
  pingFailures: number;
  bytesSent: number;
  bytesReceived: number;
  throughputBps: number;
}

export class FabricMesh {
  private peers = new Map<string, FabricPeer>();
  private peerNodeIds = new Map<string, string>(); // peerId -> nodeId
  private services = new Map<string, FabricServiceAd>();
  private rpcResolvers = new Map<string, (res: { ok: boolean; response?: unknown; error?: string }) => void>();
  private rpcHandlers: ((req: { id: string; serviceId: string; request: unknown; fromPeerId: string }) => void)[] = [];
  private peerStats = new Map<string, FabricPeerStats>();
  private pingInterval: number | null = null;
  private streamReceivers = new Map<
    string,
    {
      fromPeerId: string;
      total: number;
      chunks: Array<Uint8Array | null>;
      resolve: (bytes: Uint8Array) => void;
      reject: (err: Error) => void;
      timeout: number;
    }
  >();

  constructor() {
    const node = p2pNode;
    if (!node) return;

    node.onMessage((msg: PeerMessage, from: string) => {
      this.peers.set(from, { peerId: from, lastSeenAt: Date.now() });
      this.ensurePeerStats(from);
      this.peerStats.get(from)!.lastSeenAt = Date.now();

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

      if (wire.type === "FABRIC_PING") {
        this.handlePing(from, wire.payload);
      }

      if (wire.type === "FABRIC_PONG") {
        this.handlePong(from, wire.payload);
      }
    });

    // High-throughput raw frames (binary, chunked) for "bandwidth mode".
    node.onRawMessage((buf: ArrayBuffer, from: string) => {
      try {
        const parsed = this.parseRawFrame(buf);
        if (!parsed) return;
        const { header, payload } = parsed;
        this.recordBytesReceived(from, payload.byteLength);
        this.onRawFrame(from, header, payload);
      } catch {
        // ignore malformed frames
      }
    });

    // Announce ourselves on any existing channels with identity (async, fire and forget)
    this.initializeIdentity().catch(() => {
      // ignore errors
    });

    this.startPingLoop();
  }

  /**
   * Initialize identity asynchronously
   */
  private async initializeIdentity(): Promise<void> {
    const node = p2pNode;
    if (!node) return;

    try {
      const { loadVpsIdentity, createVpsIdentity } = await import('../vps/identity');
      let identity = loadVpsIdentity();
      if (!identity) {
        identity = await createVpsIdentity();
      }
      
      node.broadcast({
        type: "FABRIC_HELLO",
        payload: {
          nodeId: node.getId(),
          vpsId: identity.vpsId,
          nodePassport: identity.nodePassport, // Include signed passport
          alias: identity.alias,
        }
      });
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

  getPeerStats(peerId: string): FabricPeerStats | null {
    return this.peerStats.get(peerId) ?? null;
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

  /**
   * Adaptive high-throughput transfer: picks chunk size + pacing from peer RTT.
   */
  async sendBytesAdaptive(
    toPeerId: string,
    bytes: Uint8Array,
    opts?: { minChunkBytes?: number; maxChunkBytes?: number; timeoutMs?: number; windowChunks?: number }
  ): Promise<void> {
    const stats = this.peerStats.get(toPeerId);
    const rtt = stats?.avgRttMs || stats?.rttMs || 50;
    const minChunk = opts?.minChunkBytes ?? 16 * 1024;
    const maxChunk = opts?.maxChunkBytes ?? 512 * 1024;

    // Larger chunks for low-latency peers, smaller for high-latency peers.
    const adaptiveChunk = rtt < 30 ? 256 * 1024 : rtt < 80 ? 128 * 1024 : 64 * 1024;
    const chunkBytes = Math.max(minChunk, Math.min(adaptiveChunk, maxChunk));
    const windowChunks = opts?.windowChunks ?? (rtt < 50 ? 8 : 4);

    const node = p2pNode;
    if (!node) throw new Error("P2P not available");

    const streamId = crypto.randomUUID();
    const total = Math.max(1, Math.ceil(bytes.byteLength / chunkBytes));

    for (let i = 0; i < total; i++) {
      const start = i * chunkBytes;
      const end = Math.min(bytes.byteLength, start + chunkBytes);
      const payload = bytes.subarray(start, end);
      const frame = this.buildRawFrame({ kind: "STREAM_CHUNK", streamId, index: i, total }, payload);
      node.sendRaw(toPeerId, frame);
      this.recordBytesSent(toPeerId, payload.byteLength);

      if ((i + 1) % windowChunks === 0) {
        // Yield to avoid saturating the channel.
        await new Promise(resolve => setTimeout(resolve, Math.min(10, rtt / 8)));
      }
    }

    node.sendRaw(toPeerId, this.buildRawFrame({ kind: "STREAM_END", streamId, total }, new Uint8Array()));
  }

  /**
   * Ultra-high throughput transfer primitive: send bytes in fixed-size chunks
   * using binary DataChannel frames (no base64).
   */
  async sendBytes(toPeerId: string, bytes: Uint8Array, opts?: { chunkBytes?: number; timeoutMs?: number }): Promise<void> {
    const node = p2pNode;
    if (!node) throw new Error("P2P not available");
    const chunkBytes = Math.max(16 * 1024, Math.min(opts?.chunkBytes ?? 64 * 1024, 512 * 1024));

    const streamId = crypto.randomUUID();
    const total = Math.max(1, Math.ceil(bytes.byteLength / chunkBytes));

    for (let i = 0; i < total; i++) {
      const start = i * chunkBytes;
      const end = Math.min(bytes.byteLength, start + chunkBytes);
      const payload = bytes.subarray(start, end);
      const frame = this.buildRawFrame({ kind: "STREAM_CHUNK", streamId, index: i, total }, payload);
      node.sendRaw(toPeerId, frame);
      this.recordBytesSent(toPeerId, payload.byteLength);
    }

    // End marker lets receiver know it can finalize even if last chunk is tiny.
    node.sendRaw(toPeerId, this.buildRawFrame({ kind: "STREAM_END", streamId, total }, new Uint8Array()));
  }

  /**
   * Receive a single byte-stream from a peer. Returns when all chunks arrive.
   * This is the core building block for "low-end device → high bandwidth" aggregation
   * because we can parallelize and avoid JSON overhead.
   */
  receiveBytes(streamId: string, fromPeerId: string, total: number, timeoutMs = 12_000): Promise<Uint8Array> {
    const existing = this.streamReceivers.get(streamId);
    if (existing) return new Promise((resolve, reject) => existing.reject(new Error("Stream already exists")));

    return new Promise<Uint8Array>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.streamReceivers.delete(streamId);
        reject(new Error("Stream timeout"));
      }, timeoutMs);

      this.streamReceivers.set(streamId, {
        fromPeerId,
        total,
        chunks: new Array(total).fill(null),
        resolve,
        reject,
        timeout
      });
    });
  }

  private startPingLoop(): void {
    if (this.pingInterval !== null) return;
    this.pingInterval = window.setInterval(() => {
      for (const peer of this.peers.keys()) {
        this.sendPing(peer);
      }
    }, 4000);
  }

  private sendPing(toPeerId: string): void {
    const node = p2pNode;
    if (!node) return;
    const id = crypto.randomUUID();
    const sentAt = performance.now();
    this.ensurePeerStats(toPeerId);
    this.peerStats.get(toPeerId)!.lastPingAt = sentAt;
    node.send(toPeerId, {
      type: "FABRIC_PING",
      payload: { id, sentAt }
    } as unknown as PeerMessage);
  }

  private handlePing(fromPeerId: string, payload: { id: string; sentAt: number }): void {
    const node = p2pNode;
    if (!node) return;
    node.send(fromPeerId, {
      type: "FABRIC_PONG",
      payload: { id: payload.id, sentAt: payload.sentAt, receivedAt: performance.now() }
    } as unknown as PeerMessage);
  }

  private handlePong(fromPeerId: string, payload: { id: string; sentAt: number; receivedAt: number }): void {
    this.ensurePeerStats(fromPeerId);
    const stats = this.peerStats.get(fromPeerId)!;
    const now = performance.now();
    const rtt = now - payload.sentAt;
    stats.lastPongAt = now;
    stats.rttMs = rtt;
    stats.avgRttMs = stats.avgRttMs === 0 ? rtt : stats.avgRttMs * 0.8 + rtt * 0.2;
    const jitter = Math.abs(rtt - stats.avgRttMs);
    stats.jitterMs = stats.jitterMs === 0 ? jitter : stats.jitterMs * 0.7 + jitter * 0.3;
  }

  private ensurePeerStats(peerId: string): void {
    if (this.peerStats.has(peerId)) return;
    this.peerStats.set(peerId, {
      peerId,
      lastSeenAt: Date.now(),
      lastPingAt: 0,
      lastPongAt: 0,
      rttMs: 0,
      avgRttMs: 0,
      jitterMs: 0,
      pingFailures: 0,
      bytesSent: 0,
      bytesReceived: 0,
      throughputBps: 0
    });
  }

  private recordBytesSent(peerId: string, bytes: number): void {
    this.ensurePeerStats(peerId);
    const stats = this.peerStats.get(peerId)!;
    stats.bytesSent += bytes;
    this.updateThroughput(stats);
  }

  private recordBytesReceived(peerId: string, bytes: number): void {
    this.ensurePeerStats(peerId);
    const stats = this.peerStats.get(peerId)!;
    stats.bytesReceived += bytes;
    this.updateThroughput(stats);
  }

  private updateThroughput(stats: FabricPeerStats): void {
    const now = performance.now();
    const deltaMs = Math.max(1, now - stats.lastSeenAt);
    const totalBytes = stats.bytesSent + stats.bytesReceived;
    stats.throughputBps = (totalBytes * 1000) / deltaMs;
  }

  private onRawFrame(fromPeerId: string, header: RawFrameHeader, payload: Uint8Array) {
    if (header.kind === "STREAM_CHUNK") {
      const rec = this.streamReceivers.get(header.streamId);
      if (!rec || rec.fromPeerId !== fromPeerId) return;
      if (header.total !== rec.total) return;
      if (header.index < 0 || header.index >= rec.total) return;
      if (rec.chunks[header.index]) return; // dedupe
      rec.chunks[header.index] = payload;
      return;
    }

    if (header.kind === "STREAM_END") {
      const rec = this.streamReceivers.get(header.streamId);
      if (!rec || rec.fromPeerId !== fromPeerId) return;
      if (header.total !== rec.total) return;
      // Only finalize once all chunks are present.
      for (let i = 0; i < rec.total; i++) if (!rec.chunks[i]) return;

      window.clearTimeout(rec.timeout);
      this.streamReceivers.delete(header.streamId);

      let totalBytes = 0;
      for (const c of rec.chunks) totalBytes += (c as Uint8Array).byteLength;
      const out = new Uint8Array(totalBytes);
      let off = 0;
      for (const c of rec.chunks) {
        const u = c as Uint8Array;
        out.set(u, off);
        off += u.byteLength;
      }
      rec.resolve(out);
    }
  }

  // Binary frame format:
  // [4 bytes magic 'FBIN'][1 byte version][4 bytes headerLen][header JSON utf8][payload bytes]
  private buildRawFrame(header: RawFrameHeader, payload: Uint8Array): ArrayBuffer {
    const magic = 0x4642494e; // 'FBIN'
    const version = 1;
    const headerBytes = new TextEncoder().encode(JSON.stringify(header));
    const headerLen = headerBytes.byteLength;

    const total = 4 + 1 + 4 + headerLen + payload.byteLength;
    const buf = new ArrayBuffer(total);
    const dv = new DataView(buf);
    dv.setUint32(0, magic);
    dv.setUint8(4, version);
    dv.setUint32(5, headerLen);
    new Uint8Array(buf, 9, headerLen).set(headerBytes);
    new Uint8Array(buf, 9 + headerLen, payload.byteLength).set(payload);
    return buf;
  }

  private parseRawFrame(buf: ArrayBuffer): { header: RawFrameHeader; payload: Uint8Array } | null {
    if (buf.byteLength < 9) return null;
    const dv = new DataView(buf);
    const magic = dv.getUint32(0);
    if (magic !== 0x4642494e) return null;
    const version = dv.getUint8(4);
    if (version !== 1) return null;
    const headerLen = dv.getUint32(5);
    if (headerLen < 2 || 9 + headerLen > buf.byteLength) return null;
    const headerText = new TextDecoder().decode(new Uint8Array(buf, 9, headerLen));
    const header = JSON.parse(headerText) as RawFrameHeader;
    const payload = new Uint8Array(buf, 9 + headerLen);
    if (!header || typeof (header as any).kind !== "string" || typeof (header as any).streamId !== "string") return null;
    return { header, payload };
  }
}

export const fabricMesh = new FabricMesh();
