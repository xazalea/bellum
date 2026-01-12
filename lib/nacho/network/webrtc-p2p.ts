/**
 * WebRTC P2P Networking
 * Peer-to-peer connections for multiplayer games (Roblox, Brawl Stars)
 */

export interface PeerConfig {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
}

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  state: RTCPeerConnectionState;
  remoteAddress?: string;
}

export interface DataChannelConfig {
  ordered?: boolean;
  maxRetransmits?: number;
  maxPacketLifeTime?: number;
  protocol?: string;
}

/**
 * WebRTC Peer Manager
 */
export class WebRTCPeerManager {
  private peers: Map<string, PeerConnection> = new Map();
  private localId: string;
  private config: PeerConfig;
  private signalingCallbacks: Map<string, (data: any) => void> = new Map();
  
  // Default STUN/TURN servers
  private defaultConfig: PeerConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };
  
  constructor(localId: string, config?: PeerConfig) {
    this.localId = localId;
    this.config = config || this.defaultConfig;
    console.log(`[WebRTC] Peer manager initialized: ${localId}`);
  }
  
  /**
   * Create peer connection
   */
  async createPeerConnection(
    remoteId: string,
    isInitiator: boolean = true
  ): Promise<PeerConnection> {
    console.log(`[WebRTC] Creating peer connection to ${remoteId} (initiator: ${isInitiator})`);
    
    const rtcConfig: RTCConfiguration = {
      iceServers: this.config.iceServers,
      iceTransportPolicy: this.config.iceTransportPolicy,
      bundlePolicy: this.config.bundlePolicy,
    };
    
    const connection = new RTCPeerConnection(rtcConfig);
    
    const peer: PeerConnection = {
      id: remoteId,
      connection,
      dataChannel: null,
      state: connection.connectionState,
    };
    
    this.peers.set(remoteId, peer);
    
    // Setup connection event handlers
    this.setupConnectionHandlers(peer);
    
    // If initiator, create data channel
    if (isInitiator) {
      peer.dataChannel = connection.createDataChannel('game-data', {
        ordered: true,
      });
      this.setupDataChannelHandlers(peer);
    } else {
      // Wait for data channel from remote
      connection.ondatachannel = (event) => {
        peer.dataChannel = event.channel;
        this.setupDataChannelHandlers(peer);
      };
    }
    
    return peer;
  }
  
  /**
   * Setup connection handlers
   */
  private setupConnectionHandlers(peer: PeerConnection): void {
    const { connection } = peer;
    
    // ICE candidate handling
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] ICE candidate for ${peer.id}`);
        this.sendSignaling(peer.id, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };
    
    // Connection state changes
    connection.onconnectionstatechange = () => {
      peer.state = connection.connectionState;
      console.log(`[WebRTC] Connection state: ${peer.id} -> ${peer.state}`);
      
      if (peer.state === 'failed' || peer.state === 'closed') {
        this.closePeerConnection(peer.id);
      }
    };
    
    // ICE connection state
    connection.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state: ${peer.id} -> ${connection.iceConnectionState}`);
    };
  }
  
  /**
   * Setup data channel handlers
   */
  private setupDataChannelHandlers(peer: PeerConnection): void {
    if (!peer.dataChannel) return;
    
    const channel = peer.dataChannel;
    
    channel.onopen = () => {
      console.log(`[WebRTC] Data channel opened: ${peer.id}`);
    };
    
    channel.onclose = () => {
      console.log(`[WebRTC] Data channel closed: ${peer.id}`);
    };
    
    channel.onerror = (error) => {
      console.error(`[WebRTC] Data channel error: ${peer.id}`, error);
    };
    
    channel.onmessage = (event) => {
      this.handleIncomingData(peer.id, event.data);
    };
  }
  
  /**
   * Create and send offer
   */
  async createOffer(remoteId: string): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(remoteId);
    if (!peer) throw new Error('Peer not found');
    
    const offer = await peer.connection.createOffer();
    await peer.connection.setLocalDescription(offer);
    
    console.log(`[WebRTC] Created offer for ${remoteId}`);
    
    // Send offer via signaling
    this.sendSignaling(remoteId, {
      type: 'offer',
      sdp: offer,
    });
    
    return offer;
  }
  
  /**
   * Create and send answer
   */
  async createAnswer(remoteId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(remoteId);
    if (!peer) throw new Error('Peer not found');
    
    await peer.connection.setRemoteDescription(offer);
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);
    
    console.log(`[WebRTC] Created answer for ${remoteId}`);
    
    // Send answer via signaling
    this.sendSignaling(remoteId, {
      type: 'answer',
      sdp: answer,
    });
    
    return answer;
  }
  
  /**
   * Handle incoming offer
   */
  async handleOffer(remoteId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    let peer = this.peers.get(remoteId);
    
    if (!peer) {
      peer = await this.createPeerConnection(remoteId, false);
    }
    
    await this.createAnswer(remoteId, offer);
  }
  
  /**
   * Handle incoming answer
   */
  async handleAnswer(remoteId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(remoteId);
    if (!peer) throw new Error('Peer not found');
    
    await peer.connection.setRemoteDescription(answer);
    console.log(`[WebRTC] Set remote description for ${remoteId}`);
  }
  
  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(remoteId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(remoteId);
    if (!peer) throw new Error('Peer not found');
    
    await peer.connection.addIceCandidate(candidate);
    console.log(`[WebRTC] Added ICE candidate for ${remoteId}`);
  }
  
  /**
   * Send data to peer
   */
  send(remoteId: string, data: ArrayBuffer | string): void {
    const peer = this.peers.get(remoteId);
    if (!peer || !peer.dataChannel) {
      throw new Error('Peer or data channel not available');
    }
    
    if (peer.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }
    
    // Convert SharedArrayBuffer to regular ArrayBuffer if needed
    if (typeof data === 'string') {
      peer.dataChannel.send(data);
    } else if (data instanceof ArrayBuffer) {
      peer.dataChannel.send(new Uint8Array(data));
    } else {
      const uint8 = data as Uint8Array;
      if (uint8.buffer instanceof SharedArrayBuffer) {
        // Copy to regular ArrayBuffer
        const regularBuffer = new ArrayBuffer(uint8.byteLength);
        const regularView = new Uint8Array(regularBuffer);
        regularView.set(new Uint8Array(uint8.buffer, uint8.byteOffset, uint8.byteLength));
        peer.dataChannel.send(regularView);
      } else {
        peer.dataChannel.send(uint8);
      }
    }
  }
  
  /**
   * Broadcast data to all peers
   */
  broadcast(data: ArrayBuffer | string): void {
    for (const peer of this.peers.values()) {
      if (peer.dataChannel?.readyState === 'open') {
        // Convert SharedArrayBuffer to regular ArrayBuffer if needed
        if (typeof data === 'string') {
          peer.dataChannel.send(data);
        } else if (data instanceof ArrayBuffer) {
          peer.dataChannel.send(new Uint8Array(data));
        } else {
          const uint8 = data as Uint8Array;
          if (uint8.buffer instanceof SharedArrayBuffer) {
            // Copy to regular ArrayBuffer
            const regularBuffer = new ArrayBuffer(uint8.byteLength);
            const regularView = new Uint8Array(regularBuffer);
            regularView.set(new Uint8Array(uint8.buffer, uint8.byteOffset, uint8.byteLength));
            peer.dataChannel.send(regularView);
          } else {
            peer.dataChannel.send(uint8);
          }
        }
      }
    }
  }
  
  /**
   * Handle incoming data
   */
  private handleIncomingData(peerId: string, data: any): void {
    // Convert to Uint8Array if needed
    let buffer: Uint8Array;
    
    if (data instanceof ArrayBuffer) {
      buffer = new Uint8Array(data);
    } else if (data instanceof Blob) {
      // Handle async
      data.arrayBuffer().then((ab: ArrayBuffer) => {
        this.handleIncomingData(peerId, ab);
      });
      return;
    } else if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data);
    } else {
      buffer = new Uint8Array(data);
    }
    
    // Notify listeners
    const callback = this.signalingCallbacks.get('data');
    if (callback) {
      callback({ peerId, data: buffer });
    }
  }
  
  /**
   * Send signaling message (needs external signaling server)
   */
  private sendSignaling(remoteId: string, data: any): void {
    const callback = this.signalingCallbacks.get('signal');
    if (callback) {
      callback({ remoteId, data });
    } else {
      console.warn('[WebRTC] No signaling callback registered');
    }
  }
  
  /**
   * Register signaling callback
   */
  onSignaling(callback: (data: any) => void): void {
    this.signalingCallbacks.set('signal', callback);
  }
  
  /**
   * Register data callback
   */
  onData(callback: (data: any) => void): void {
    this.signalingCallbacks.set('data', callback);
  }
  
  /**
   * Close peer connection
   */
  closePeerConnection(remoteId: string): void {
    const peer = this.peers.get(remoteId);
    if (!peer) return;
    
    if (peer.dataChannel) {
      peer.dataChannel.close();
    }
    
    peer.connection.close();
    this.peers.delete(remoteId);
    
    console.log(`[WebRTC] Closed peer connection: ${remoteId}`);
  }
  
  /**
   * Close all connections
   */
  closeAll(): void {
    for (const peerId of this.peers.keys()) {
      this.closePeerConnection(peerId);
    }
  }
  
  /**
   * Get peer connection
   */
  getPeer(remoteId: string): PeerConnection | null {
    return this.peers.get(remoteId) || null;
  }
  
  /**
   * Get all peers
   */
  getAllPeers(): PeerConnection[] {
    return Array.from(this.peers.values());
  }
  
  /**
   * Get connection statistics
   */
  async getStats(remoteId: string): Promise<RTCStatsReport | null> {
    const peer = this.peers.get(remoteId);
    if (!peer) return null;
    
    return await peer.connection.getStats();
  }
}

/**
 * Simple Signaling Server Client (WebSocket-based)
 */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, (data: any) => void> = new Map();
  private peerId: string;
  
  constructor(peerId: string) {
    this.peerId = peerId;
  }
  
  /**
   * Connect to signaling server
   */
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('[Signaling] Connected to server');
        // Register peer ID
        this.send({ type: 'register', peerId: this.peerId });
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('[Signaling] Error:', error);
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
      
      this.ws.onclose = () => {
        console.log('[Signaling] Disconnected from server');
      };
    });
  }
  
  /**
   * Send signaling message
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to signaling server');
    }
    
    this.ws.send(JSON.stringify(data));
  }
  
  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    const callback = this.callbacks.get(message.type);
    if (callback) {
      callback(message);
    }
  }
  
  /**
   * Register message handler
   */
  on(type: string, callback: (data: any) => void): void {
    this.callbacks.set(type, callback);
  }
  
  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * P2P Game Session Manager
 */
export class P2PGameSession {
  private peerManager: WebRTCPeerManager;
  private signalingClient: SignalingClient;
  private sessionId: string;
  private isHost: boolean;
  
  constructor(localPlayerId: string, sessionId: string, isHost: boolean = false) {
    this.sessionId = sessionId;
    this.isHost = isHost;
    this.peerManager = new WebRTCPeerManager(localPlayerId);
    this.signalingClient = new SignalingClient(localPlayerId);
    
    this.setupSignaling();
  }
  
  /**
   * Setup signaling integration
   */
  private setupSignaling(): void {
    // Handle outgoing signaling
    this.peerManager.onSignaling((msg) => {
      this.signalingClient.send({
        type: 'webrtc-signal',
        sessionId: this.sessionId,
        remoteId: msg.remoteId,
        data: msg.data,
      });
    });
    
    // Handle incoming signaling
    this.signalingClient.on('webrtc-signal', async (msg) => {
      const { remoteId, data } = msg;
      
      switch (data.type) {
        case 'offer':
          await this.peerManager.handleOffer(remoteId, data.sdp);
          break;
        case 'answer':
          await this.peerManager.handleAnswer(remoteId, data.sdp);
          break;
        case 'ice-candidate':
          await this.peerManager.handleIceCandidate(remoteId, data.candidate);
          break;
      }
    });
  }
  
  /**
   * Join game session
   */
  async join(signalingServerUrl: string): Promise<void> {
    await this.signalingClient.connect(signalingServerUrl);
    
    // Join session
    this.signalingClient.send({
      type: 'join-session',
      sessionId: this.sessionId,
    });
    
    console.log(`[P2P] Joined session: ${this.sessionId}`);
  }
  
  /**
   * Connect to peer
   */
  async connectToPeer(remotePlayerId: string): Promise<void> {
    const peer = await this.peerManager.createPeerConnection(remotePlayerId, true);
    await this.peerManager.createOffer(remotePlayerId);
  }
  
  /**
   * Send game data to peer
   */
  sendToPeer(remotePlayerId: string, data: Uint8Array): void {
    this.peerManager.send(remotePlayerId, data);
  }
  
  /**
   * Broadcast game data to all peers
   */
  broadcastGameData(data: Uint8Array): void {
    this.peerManager.broadcast(data);
  }
  
  /**
   * Register game data handler
   */
  onGameData(callback: (data: { peerId: string; data: Uint8Array }) => void): void {
    this.peerManager.onData(callback);
  }
  
  /**
   * Leave session
   */
  leave(): void {
    this.peerManager.closeAll();
    this.signalingClient.disconnect();
    console.log(`[P2P] Left session: ${this.sessionId}`);
  }
}
