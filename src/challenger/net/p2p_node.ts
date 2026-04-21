/**
 * P2P Node - Manages WebRTC connections for the AetherNet distributed mesh
 *
 * Integrates with Firebase Firestore signaling for peer discovery and
 * SDP/ICE exchange. Connection flow:
 *
 * 1. Node creates itself with a unique ID
 * 2. Announces presence via signaling service
 * 3. Discovers peers via signaling
 * 4. Initiates WebRTC connection by sending offer through signaling
 * 5. Answerer responds with answer through signaling
 * 6. ICE candidates exchanged through signaling
 * 7. Once DataChannel opens, direct P2P communication begins
 */

export interface PeerMessage {
    type: string;
    payload: any;
}

export type P2PSignal =
    | { type: 'offer', from: string, to: string, sdp: RTCSessionDescriptionInit }
    | { type: 'answer', from: string, to: string, sdp: RTCSessionDescriptionInit }
    | { type: 'candidate', from: string, to: string, candidate: RTCIceCandidateInit };

export interface PeerConnectionInfo {
    peerId: string;
    connectionState: RTCPeerConnectionState;
    iceConnectionState: RTCIceConnectionState;
    dataChannelState: RTCDataChannelState;
    connectedAt: number | null;
}

export class P2PNode {
    private id: string;
    private peers: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private onMessageCallbacks: ((msg: PeerMessage, from: string) => void)[] = [];
    private onRawCallbacks: ((data: ArrayBuffer, from: string) => void)[] = [];
    private onSignalCallbacks: ((signal: P2PSignal) => void)[] = [];
    private onPeerConnectCallbacks: ((peerId: string) => void)[] = [];
    private onPeerDisconnectCallbacks: ((peerId: string) => void)[] = [];
    private connectedAtMap: Map<string, number> = new Map();

    // Signaling integration
    private signaling: import('@/lib/fabric/signaling').MeshSignaling | null = null;
    private discoveryInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.id = crypto.randomUUID();
        console.log(`[AetherNet] Node initialized with ID: ${this.id}`);
    }

    public getId(): string {
        return this.id;
    }

    /**
     * Initialize signaling — connects to Firebase Firestore for
     * peer discovery and SDP/ICE exchange.
     */
    public async initSignaling(): Promise<void> {
        if (this.signaling) return; // already initialized

        try {
            const { meshSignaling } = await import('@/lib/fabric/signaling');
            // Defensive check: meshSignaling is `null as unknown as MeshSignaling` on SSR
            if (!meshSignaling || typeof meshSignaling.init !== 'function') return;

            this.signaling = meshSignaling;
            this.signaling.init(this.id);

            // Load identity for presence announcement
            try {
                const { loadVpsIdentity, createVpsIdentity } = await import('@/lib/vps/identity');
                let identity = loadVpsIdentity();
                if (!identity) identity = await createVpsIdentity();

                await this.signaling.announcePresence({
                    nodeId: this.id,
                    vpsId: identity.vpsId,
                    alias: identity.alias,
                    capabilities: ['compute-v1', 'mesh-capabilities'],
                });
            } catch {
                // Identity creation failed — announce without identity
                await this.signaling.announcePresence({
                    nodeId: this.id,
                    capabilities: ['compute-v1'],
                });
            }

            // Listen for incoming signals (offers, answers, ICE candidates)
            this.signaling.listen({
                onSignal: async (msg) => {
                    try {
                        if (msg.type === 'offer') {
                            // Incoming offer — we are the answerer
                            const offer: RTCSessionDescriptionInit = JSON.parse(msg.sdp);
                            const answer = await this.connect(msg.from, offer);
                            if (answer) {
                                await this.signaling?.sendSignal({
                                    from: this.id,
                                    to: msg.from,
                                    type: 'answer',
                                    sdp: JSON.stringify(answer),
                                });
                            }
                        } else if (msg.type === 'answer') {
                            // Incoming answer — we are the offerer, apply it
                            const answer: RTCSessionDescriptionInit = JSON.parse(msg.sdp);
                            await this.acceptAnswer(msg.from, answer);
                        }
                    } catch (e) {
                        console.warn(`[AetherNet] Failed to process signal from ${msg.from}:`, e);
                    }
                },
                onIceCandidate: async (msg) => {
                    try {
                        const candidate: RTCIceCandidateInit = JSON.parse(msg.candidate);
                        await this.addIceCandidate(msg.from, candidate);
                    } catch (e) {
                        console.warn(`[AetherNet] Failed to add ICE candidate from ${msg.from}:`, e);
                    }
                },
                onPeerOnline: (presence) => {
                    console.log(`[AetherNet] Peer discovered: ${presence.nodeId} (${presence.alias || 'unknown'})`);
                    // Auto-connect to newly discovered peers
                    this.initiateConnection(presence.nodeId);
                },
                onPeerOffline: (nodeId) => {
                    console.log(`[AetherNet] Peer went offline: ${nodeId}`);
                    this.onPeerDisconnectCallbacks.forEach(cb => cb(nodeId));
                },
            });

            // Periodically discover new peers
            this.discoveryInterval = setInterval(() => {
                this.discoverAndConnect();
            }, 15_000);

            // Initial discovery
            this.discoverAndConnect();

            console.log('[AetherNet] Signaling initialized');
        } catch (e) {
            console.warn('[AetherNet] Signaling initialization failed:', e);
        }
    }

    /**
     * Discover peers via signaling and connect to any new ones
     */
    private async discoverAndConnect(): Promise<void> {
        if (!this.signaling) return;
        try {
            const peers = await this.signaling.discoverPeers();
            for (const peer of peers) {
                if (!this.peers.has(peer.nodeId) && !this.dataChannels.has(peer.nodeId)) {
                    // Connect to peers we haven't connected to yet
                    this.initiateConnection(peer.nodeId);
                }
            }
        } catch {
            // ignore discovery failures
        }
    }

    /**
     * Initiate a connection to a peer by sending an offer
     */
    private async initiateConnection(remoteId: string): Promise<void> {
        if (this.peers.has(remoteId)) return; // already connected or connecting

        try {
            const offer = await this.connect(remoteId);
            if (offer && this.signaling) {
                await this.signaling.sendSignal({
                    from: this.id,
                    to: remoteId,
                    type: 'offer',
                    sdp: JSON.stringify(offer),
                });
            }
        } catch (e) {
            console.warn(`[AetherNet] Failed to initiate connection to ${remoteId}:`, e);
        }
    }

    /**
     * Get info about all peer connections
     */
    getPeerConnections(): PeerConnectionInfo[] {
        const result: PeerConnectionInfo[] = [];
        for (const [peerId, pc] of this.peers) {
            const channel = this.dataChannels.get(peerId);
            result.push({
                peerId,
                connectionState: pc.connectionState,
                iceConnectionState: pc.iceConnectionState,
                dataChannelState: channel?.readyState ?? 'closed',
                connectedAt: this.connectedAtMap.get(peerId) ?? null,
            });
        }
        return result;
    }

    /** Get number of fully connected peers (DataChannel open) */
    getConnectedPeerCount(): number {
        let count = 0;
        for (const [, channel] of this.dataChannels) {
            if (channel.readyState === 'open') count++;
        }
        return count;
    }

    /** Register callback for peer connect events */
    onPeerConnect(callback: (peerId: string) => void): void {
        this.onPeerConnectCallbacks.push(callback);
    }

    /** Register callback for peer disconnect events */
    onPeerDisconnect(callback: (peerId: string) => void): void {
        this.onPeerDisconnectCallbacks.push(callback);
    }

    /**
     * Connect to a peer — creates RTCPeerConnection and sets up ICE handling.
     * If offer is provided, acts as answerer; otherwise acts as offerer.
     */
    public async connect(remoteId: string, offer?: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | void> {
        console.log(`[AetherNet] Connecting to ${remoteId}...`);

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        });

        this.peers.set(remoteId, pc);

        pc.onicecandidate = (event) => {
            const cand = event.candidate;
            if (!cand) return;

            // Send ICE candidate via signaling instead of local callbacks
            const candidateJson = JSON.stringify(cand.toJSON());
            this.signaling?.sendIceCandidate({
                signalId: `${this.id}_${remoteId}`,
                from: this.id,
                to: remoteId,
                candidate: candidateJson,
                sdpMid: cand.sdpMid ?? '',
                sdpMLineIndex: cand.sdpMLineIndex ?? 0,
            }).catch(() => {});

            // Also notify local signal callbacks for compatibility
            this.onSignalCallbacks.forEach(cb => cb({
                type: 'candidate',
                from: this.id,
                to: remoteId,
                candidate: cand.toJSON()
            }));
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                this.connectedAtMap.set(remoteId, Date.now());
                this.onPeerConnectCallbacks.forEach(cb => cb(remoteId));
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                this.onPeerDisconnectCallbacks.forEach(cb => cb(remoteId));
                this.peers.delete(remoteId);
                this.dataChannels.delete(remoteId);
                this.connectedAtMap.delete(remoteId);
            }
        };

        if (offer) {
            // We are the answerer
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.onSignalCallbacks.forEach(cb => cb({ type: 'answer', from: this.id, to: remoteId, sdp: answer }));

            pc.ondatachannel = (event) => {
                this.setupDataChannel(remoteId, event.channel);
            };

            return answer;
        } else {
            // We are the offerer
            const channel = pc.createDataChannel("aether-mesh");
            this.setupDataChannel(remoteId, channel);

            const newOffer = await pc.createOffer();
            await pc.setLocalDescription(newOffer);
            this.onSignalCallbacks.forEach(cb => cb({ type: 'offer', from: this.id, to: remoteId, sdp: newOffer }));
            return newOffer;
        }
    }

    /**
     * Finalize an offerer connection by applying the remote answer.
     */
    public async acceptAnswer(remoteId: string, answer: RTCSessionDescriptionInit): Promise<void> {
        const pc = this.peers.get(remoteId);
        if (!pc) throw new Error(`No peer connection for ${remoteId}`);
        await pc.setRemoteDescription(answer);
    }

    public async addIceCandidate(remoteId: string, candidate: RTCIceCandidateInit): Promise<void> {
        const pc = this.peers.get(remoteId);
        if (!pc) throw new Error(`No peer connection for ${remoteId}`);
        try {
            await pc.addIceCandidate(candidate);
        } catch (e) {
            console.warn(`[AetherNet] Failed to add ICE candidate for ${remoteId}`, e);
        }
    }

    private setupDataChannel(remoteId: string, channel: RTCDataChannel) {
        this.dataChannels.set(remoteId, channel);
        
        channel.onopen = () => {
            console.log(`[AetherNet] Channel open with ${remoteId}`);
            this.broadcast({ type: 'HELLO', payload: { from: this.id } });
        };

        channel.onmessage = async (event) => {
            // DataChannels can deliver string, Blob, ArrayBuffer.
            const d: any = (event as any).data;

            if (typeof d === 'string') {
                try {
                    const msg = JSON.parse(d) as PeerMessage;
                    this.handleMessage(msg, remoteId);
                } catch (e) {
                    console.error("Failed to parse P2P message", e);
                }
                return;
            }

            try {
                let buf: ArrayBuffer;
                if (d instanceof ArrayBuffer) {
                    buf = d;
                } else if (d && typeof d.arrayBuffer === 'function') {
                    buf = await d.arrayBuffer();
                } else {
                    // Unknown payload type; ignore.
                    return;
                }
                this.onRawCallbacks.forEach(cb => cb(buf, remoteId));
            } catch (e) {
                console.warn("[AetherNet] Failed to handle raw message", e);
            }
        };
    }

    private handleMessage(msg: PeerMessage, from: string) {
        this.onMessageCallbacks.forEach(cb => cb(msg, from));
    }

    public onMessage(callback: (msg: PeerMessage, from: string) => void) {
        this.onMessageCallbacks.push(callback);
    }

    public onRawMessage(callback: (data: ArrayBuffer, from: string) => void) {
        this.onRawCallbacks.push(callback);
    }

    public onSignal(callback: (signal: P2PSignal) => void) {
        this.onSignalCallbacks.push(callback);
    }

    public broadcast(msg: PeerMessage) {
        const data = JSON.stringify(msg);
        this.dataChannels.forEach((channel, peerId) => {
            if (channel.readyState === 'open') {
                channel.send(data);
            }
        });
    }

    public send(peerId: string, msg: PeerMessage) {
        const channel = this.dataChannels.get(peerId);
        if (channel && channel.readyState === 'open') {
            channel.send(JSON.stringify(msg));
        }
    }

    public sendRaw(peerId: string, data: ArrayBuffer) {
        const channel = this.dataChannels.get(peerId);
        if (channel && channel.readyState === 'open') {
            channel.send(data);
        }
    }
}

export const p2pNode: P2PNode | null = typeof window !== 'undefined' ? new P2PNode() : null;

// Auto-initialize signaling when the node is created in the browser
if (typeof window !== 'undefined' && p2pNode) {
    // Defer signaling init to after module loading completes
    // to avoid circular dependency issues
    setTimeout(() => {
        p2pNode.initSignaling().catch((e) => {
            console.warn('[AetherNet] Auto-signaling init failed:', e);
        });
    }, 100);
}
