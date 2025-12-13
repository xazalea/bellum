/**
 * P2P Node - Manages WebRTC connections for the AetherNet distributed mesh
 */

export interface PeerMessage {
    type: string;
    payload: any;
}

export type P2PSignal =
    | { type: 'offer', from: string, to: string, sdp: RTCSessionDescriptionInit }
    | { type: 'answer', from: string, to: string, sdp: RTCSessionDescriptionInit }
    | { type: 'candidate', from: string, to: string, candidate: RTCIceCandidateInit };

export class P2PNode {
    private id: string;
    private peers: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private onMessageCallbacks: ((msg: PeerMessage, from: string) => void)[] = [];
    private onSignalCallbacks: ((signal: P2PSignal) => void)[] = [];

    constructor() {
        this.id = crypto.randomUUID();
        console.log(`[AetherNet] Node initialized with ID: ${this.id}`);
    }

    public getId(): string {
        return this.id;
    }

    /**
     * Connect to a peer (Signaling is mocked/assumed external for now)
     * In a real app, this would exchange SDP via a signaling server (socket.io, firebase, etc.)
     */
    public async connect(remoteId: string, offer?: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | void> {
        console.log(`[AetherNet] Connecting to ${remoteId}...`);
        
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        this.peers.set(remoteId, pc);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.onSignalCallbacks.forEach(cb => cb({
                    type: 'candidate',
                    from: this.id,
                    to: remoteId,
                    candidate: event.candidate.toJSON()
                }));
            }
        };

        if (offer) {
            // We are the answerer
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
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

        channel.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data) as PeerMessage;
                this.handleMessage(msg, remoteId);
            } catch (e) {
                console.error("Failed to parse P2P message", e);
            }
        };
    }

    private handleMessage(msg: PeerMessage, from: string) {
        this.onMessageCallbacks.forEach(cb => cb(msg, from));
    }

    public onMessage(callback: (msg: PeerMessage, from: string) => void) {
        this.onMessageCallbacks.push(callback);
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
}

export const p2pNode: P2PNode | null = typeof window !== 'undefined' ? new P2PNode() : null;
