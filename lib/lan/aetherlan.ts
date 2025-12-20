import { p2pNode, type P2PSignal } from '@/src/nacho/net/p2p_node';
import { getNachoHeaders } from '@/lib/auth/nacho-identity';
import { computeVirtualDhcpTable, type VirtualDhcpTable } from '@/lib/lan/dhcp';

export type LanPeer = { peerId: string; lastSeenAt: number };

export class AetherLanRoom {
  private roomId: string;
  private stopped = false;
  private pollTimer: number | null = null;
  private peers = new Map<string, LanPeer>();
  private lastDhcp: VirtualDhcpTable | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  getRoomId() {
    return this.roomId;
  }

  getLocalPeerId(): string | null {
    return p2pNode?.getId() ?? null;
  }

  listPeers(): LanPeer[] {
    return Array.from(this.peers.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }

  /**
   * Virtual DHCP table (deterministic, no leader required).
   * All nodes compute the same leases from the same membership view.
   */
  getDhcpTable(activeWindowMs = 20_000): VirtualDhcpTable {
    const local = this.getLocalPeerId();
    const now = Date.now();
    const activePeerIds = Array.from(this.peers.values())
      .filter((p) => now - p.lastSeenAt <= activeWindowMs)
      .map((p) => p.peerId);
    if (local) activePeerIds.push(local);
    const t = computeVirtualDhcpTable({ roomId: this.roomId, peerIds: activePeerIds });
    this.lastDhcp = t;
    return t;
  }

  async start(): Promise<void> {
    const node = p2pNode;
    if (!node) throw new Error('P2P not available');

    // Wire signaling channel.
    node.onSignal((s: P2PSignal) => {
      void this.postSignal(s);
    });

    // Basic HELLO for presence.
    node.onMessage((msg: any, from: string) => {
      if (msg?.type === 'LAN_HELLO') {
        this.peers.set(from, { peerId: from, lastSeenAt: Date.now() });
        // Keep DHCP view warm for UI (cheap).
        try { this.getDhcpTable(); } catch { /* ignore */ }
      }
    });

    // Start polling for inbound signals for our peerId.
    const peerId = node.getId();
    const poll = async () => {
      if (this.stopped) return;
      try {
        const headers = await getNachoHeaders();
        const res = await fetch(
          `/api/lan/signal?roomId=${encodeURIComponent(this.roomId)}&peerId=${encodeURIComponent(peerId)}`,
          { cache: 'no-store', headers },
        );
        if (!res.ok) return;
        const j = (await res.json().catch(() => null)) as { signals?: P2PSignal[] } | null;
        const signals = Array.isArray(j?.signals) ? j!.signals! : [];
        for (const s of signals) {
          if (s.type === 'offer') {
            await node.connect(s.from, s.sdp);
          } else if (s.type === 'answer') {
            await node.acceptAnswer(s.from, s.sdp);
          } else if (s.type === 'candidate') {
            await node.addIceCandidate(s.from, s.candidate);
          }
        }
      } catch {
        // ignore
      }
    };

    await poll();
    this.pollTimer = window.setInterval(() => void poll(), 800);

    // Broadcast HELLO on any existing channels.
    try {
      node.broadcast({ type: 'LAN_HELLO', payload: { roomId: this.roomId, peerId } });
    } catch {
      // ignore
    }
  }

  stop() {
    this.stopped = true;
    if (this.pollTimer) window.clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  async connectToPeer(remotePeerId: string): Promise<void> {
    const node = p2pNode;
    if (!node) throw new Error('P2P not available');
    await node.connect(remotePeerId);
    // Make presence visible immediately.
    this.peers.set(remotePeerId, { peerId: remotePeerId, lastSeenAt: Date.now() });
  }

  private async postSignal(signal: P2PSignal): Promise<void> {
    try {
      const headers = await getNachoHeaders();
      await fetch('/api/lan/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ roomId: this.roomId, signal }),
      });
    } catch {
      // ignore
    }
  }
}

export function randomRoomId(): string {
  // Short, URL-safe.
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}


