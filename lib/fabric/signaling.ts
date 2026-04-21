/**
 * Firebase Firestore Signaling for AetherNet P2P Mesh
 *
 * WebRTC requires a signaling mechanism to exchange SDP offers/answers
 * and ICE candidates between peers before they can communicate directly.
 * Firestore's real-time listeners provide an ideal signaling channel:
 * - No custom server needed
 * - Real-time updates via onSnapshot
 * - Automatic cleanup with TTL
 *
 * Signaling flow:
 * 1. Peer writes their presence to /mesh/peers/{nodeId}
 * 2. To connect, offerer writes offer to /mesh/signals/{offerId}
 * 3. Answerer listens for signals addressed to them, writes answer
 * 4. Both exchange ICE candidates via /mesh/candidates/{candidateId}
 * 5. Once connected, signaling docs are cleaned up
 */

import { app } from '@/lib/firebase';
// Use the full Firestore SDK (not lite) — lite doesn't support onSnapshot or Unsubscribe
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  getFirestore,
  onSnapshot,
  type Unsubscribe,
  type QuerySnapshot,
  type Timestamp,
} from 'firebase/firestore';

// ── Types ────────────────────────────────────────────────────────────────

export interface PeerPresence {
  nodeId: string;
  vpsId?: string;
  alias?: string;
  lastSeen: Timestamp | null;
  capabilities?: string[];
}

export interface SignalMessage {
  id: string;
  from: string;
  to: string;
  type: 'offer' | 'answer';
  sdp: string;
  createdAt: Timestamp | null;
}

export interface IceCandidateMessage {
  id: string;
  signalId: string;   // Links to the offer/answer this candidate belongs to
  from: string;
  to: string;
  candidate: string;  // JSON of RTCIceCandidateInit
  sdpMid: string;
  sdpMLineIndex: number;
  createdAt: Timestamp | null;
}

export interface SignalingEvents {
  onSignal?: (msg: SignalMessage) => void;
  onIceCandidate?: (msg: IceCandidateMessage) => void;
  onPeerOnline?: (presence: PeerPresence) => void;
  onPeerOffline?: (nodeId: string) => void;
}

// ── Signaling Service ────────────────────────────────────────────────────

export class MeshSignaling {
  private db: ReturnType<typeof getFirestore> | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private nodeId: string | null = null;
  private presenceInterval: ReturnType<typeof setInterval> | null = null;

  /** Initialize signaling — call once when P2P node is created */
  init(nodeId: string): void {
    if (typeof window === 'undefined') return;
    if (this.db) return; // already initialized

    this.nodeId = nodeId;
    this.db = getFirestore(app);

    console.log(`[Signaling] Initialized for node ${nodeId}`);
  }

  /** Announce our presence so other peers can find us */
  async announcePresence(presence: Omit<PeerPresence, 'lastSeen'>): Promise<void> {
    if (!this.db || !this.nodeId) return;

    try {
      await setDoc(doc(this.db, 'mesh/peers', this.nodeId), {
        ...presence,
        lastSeen: serverTimestamp(),
      }, { merge: true });

      // Refresh presence every 25 seconds (Firestore TTL can clean up stale peers)
      if (!this.presenceInterval) {
        this.presenceInterval = setInterval(() => {
          this.refreshPresence();
        }, 25_000);
      }
    } catch (e) {
      console.warn('[Signaling] Failed to announce presence:', e);
    }
  }

  /** Refresh our presence timestamp */
  private async refreshPresence(): Promise<void> {
    if (!this.db || !this.nodeId) return;
    try {
      await setDoc(doc(this.db, 'mesh/peers', this.nodeId), {
        lastSeen: serverTimestamp(),
      }, { merge: true });
    } catch {
      // ignore — non-critical
    }
  }

  /** Discover online peers */
  async discoverPeers(): Promise<PeerPresence[]> {
    if (!this.db) return [];

    try {
      // Get peers that were seen in the last 60 seconds
      const cutoff = new Date(Date.now() - 60_000);
      const q = query(
        collection(this.db, 'mesh/peers'),
        orderBy('lastSeen', 'desc'),
        limit(50),
      );
      const snap = await getDocs(q);
      const peers: PeerPresence[] = [];
      snap.forEach(d => {
        const data = d.data() as PeerPresence;
        // Filter out stale peers and ourselves
        if (data.nodeId !== this.nodeId && data.lastSeen) {
          const seenAt = data.lastSeen.toDate();
          if (seenAt > cutoff) {
            peers.push(data);
          }
        }
      });
      return peers;
    } catch (e) {
      console.warn('[Signaling] Failed to discover peers:', e);
      return [];
    }
  }

  /** Send a WebRTC offer or answer to a specific peer via Firestore */
  async sendSignal(msg: Omit<SignalMessage, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) return '';

    try {
      const id = `${msg.from}_${msg.to}_${Date.now()}`;
      await setDoc(doc(this.db, 'mesh/signals', id), {
        ...msg,
        id,
        createdAt: serverTimestamp(),
      });
      return id;
    } catch (e) {
      console.warn('[Signaling] Failed to send signal:', e);
      return '';
    }
  }

  /** Send an ICE candidate to a peer */
  async sendIceCandidate(candidate: Omit<IceCandidateMessage, 'id' | 'createdAt'>): Promise<void> {
    if (!this.db) return;

    try {
      const id = `ice_${candidate.from}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(this.db, 'mesh/candidates', id), {
        ...candidate,
        id,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[Signaling] Failed to send ICE candidate:', e);
    }
  }

  /** Listen for incoming signals and ICE candidates addressed to us */
  listen(events: SignalingEvents): void {
    if (!this.db || !this.nodeId) return;

    // Listen for signals addressed to us (offers and answers)
    const signalsQ = query(
      collection(this.db, 'mesh/signals'),
      where('to', '==', this.nodeId),
    );

    const unsubSignals = onSnapshot(signalsQ, (snap: QuerySnapshot) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data() as SignalMessage;
          events.onSignal?.(data);
          // Auto-delete after processing to keep signaling clean
          deleteDoc(change.doc.ref).catch(() => {});
        }
      });
    }, (err) => {
      console.warn('[Signaling] Signal listener error:', err);
    });

    this.unsubscribers.push(unsubSignals);

    // Listen for ICE candidates addressed to us
    const candidatesQ = query(
      collection(this.db, 'mesh/candidates'),
      where('to', '==', this.nodeId),
    );

    const unsubCandidates = onSnapshot(candidatesQ, (snap: QuerySnapshot) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data() as IceCandidateMessage;
          events.onIceCandidate?.(data);
          // Auto-delete after processing
          deleteDoc(change.doc.ref).catch(() => {});
        }
      });
    }, (err) => {
      console.warn('[Signaling] Candidate listener error:', err);
    });

    this.unsubscribers.push(unsubCandidates);

    // Listen for peers coming online/offline
    const peersQ = query(collection(this.db, 'mesh/peers'));
    const unsubPeers = onSnapshot(peersQ, (snap: QuerySnapshot) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data() as PeerPresence;
          if (data.nodeId !== this.nodeId) {
            // Check if the peer is still alive (< 60s since last seen)
            if (data.lastSeen) {
              const seenAt = data.lastSeen.toDate();
              const age = Date.now() - seenAt.getTime();
              if (age < 60_000) {
                events.onPeerOnline?.(data);
              }
            }
          }
        } else if (change.type === 'removed') {
          const data = change.doc.data() as PeerPresence;
          events.onPeerOffline?.(data.nodeId);
        }
      });
    }, (err) => {
      console.warn('[Signaling] Peer listener error:', err);
    });

    this.unsubscribers.push(unsubPeers);
  }

  /** Clean up a signal exchange after connection is established */
  async cleanupSignal(signalId: string): Promise<void> {
    if (!this.db) return;
    try {
      await deleteDoc(doc(this.db, 'mesh/signals', signalId));
      // Also clean up related ICE candidates
      const q = query(
        collection(this.db, 'mesh/candidates'),
        where('signalId', '==', signalId),
      );
      const snap = await getDocs(q);
      const batch = writeBatch(this.db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch {
      // ignore
    }
  }

  /** Clean up our presence and all listeners on shutdown */
  async shutdown(): Promise<void> {
    // Stop presence heartbeat
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }

    // Unsubscribe all listeners
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Remove our presence document
    if (this.db && this.nodeId) {
      try {
        await deleteDoc(doc(this.db, 'mesh/peers', this.nodeId));
      } catch {
        // ignore
      }
    }

    this.db = null;
    this.nodeId = null;
    console.log('[Signaling] Shutdown complete');
  }
}

// Singleton — lazy, only created in browser
export const meshSignaling: MeshSignaling =
  typeof window !== 'undefined' ? new MeshSignaling() : (null as unknown as MeshSignaling);
