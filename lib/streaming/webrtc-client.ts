/**
 * WebRTC Client for Cloud Game Streaming
 * Handles peer connection, media streams, and input forwarding
 */

export interface StreamingConfig {
  serverUrl: string;
  gameId: string;
  sessionId?: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onTrack?: (track: MediaStreamTrack, stream: MediaStream) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onError?: (error: Error) => void;
  onLatencyUpdate?: (latency: number) => void;
}

export interface InputEvent {
  type: 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemove' | 'wheel' | 'touchstart' | 'touchend' | 'touchmove' | 'gamepad';
  timestamp: number;
  data: Record<string, unknown>;
}

export interface StreamingStats {
  bitrate: number;
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  jitter: number;
  frameWidth: number;
  frameHeight: number;
  framesPerSecond: number;
  latency: number;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: false,
  maxRetransmits: 0,
};

export class WebRTCStreamingClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private mediaStream: MediaStream | null = null;
  private config: StreamingConfig;
  private statsInterval: number | null = null;
  private latencyInterval: number | null = null;
  private lastPingTime: number = 0;
  private isConnected: boolean = false;

  constructor(config: StreamingConfig) {
    this.config = config;
  }

  /**
   * Initialize and connect to the streaming server
   */
  async connect(): Promise<void> {
    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
      });

      // Set up event handlers
      this.setupPeerConnectionHandlers();

      // Create data channel for input
      this.dataChannel = this.peerConnection.createDataChannel('input', DATA_CHANNEL_CONFIG);
      this.setupDataChannelHandlers();

      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection.setLocalDescription(offer);

      // Send offer to signaling server
      await this.sendSignalingMessage({
        type: 'offer',
        sdp: offer.sdp,
        gameId: this.config.gameId,
        sessionId: this.config.sessionId,
      });

      // Start stats monitoring
      this.startStatsMonitoring();
      this.startLatencyMonitoring();

    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming answer from server
   */
  async handleAnswer(sdp: string): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription({
      type: 'answer',
      sdp,
    });
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Send input event to server
   */
  sendInput(event: InputEvent): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[WebRTC] Data channel not ready');
      return;
    }

    try {
      const message = JSON.stringify(event);
      this.dataChannel.send(message);
    } catch (error) {
      console.error('[WebRTC] Failed to send input:', error);
    }
  }

  /**
   * Get current media stream
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Get current streaming stats
   */
  async getStats(): Promise<StreamingStats | null> {
    if (!this.peerConnection) return null;

    const stats = await this.peerConnection.getStats();
    let result: StreamingStats = {
      bitrate: 0,
      packetsLost: 0,
      packetsReceived: 0,
      bytesReceived: 0,
      jitter: 0,
      frameWidth: 0,
      frameHeight: 0,
      framesPerSecond: 0,
      latency: 0,
    };

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        result.packetsLost = report.packetsLost || 0;
        result.packetsReceived = report.packetsReceived || 0;
        result.bytesReceived = report.bytesReceived || 0;
        result.jitter = report.jitter || 0;
        result.framesPerSecond = report.framesPerSecond || 0;
      }

      if (report.type === 'track') {
        result.frameWidth = report.frameWidth || 0;
        result.frameHeight = report.frameHeight || 0;
      }
    });

    return result;
  }

  /**
   * Request quality change
   */
  async setQuality(quality: 'low' | 'medium' | 'high' | 'auto'): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;

    this.dataChannel.send(JSON.stringify({
      type: 'quality',
      quality,
    }));
  }

  /**
   * Disconnect from streaming server
   */
  async disconnect(): Promise<void> {
    // Stop monitoring
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    if (this.latencyInterval) {
      clearInterval(this.latencyInterval);
      this.latencyInterval = null;
    }

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected && this.peerConnection?.connectionState === 'connected';
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection!.connectionState;
      console.log('[WebRTC] Connection state:', state);
      this.config.onConnectionStateChange?.(state);
      this.isConnected = state === 'connected';
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.config.onIceCandidate?.(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received track:', event.track.kind);
      
      if (!this.mediaStream) {
        this.mediaStream = new MediaStream();
      }
      
      this.mediaStream.addTrack(event.track);
      this.config.onTrack?.(event.track, this.mediaStream);
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('[WebRTC] Received data channel:', event.channel.label);
      this.config.onDataChannel?.(event.channel);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection!.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);
      
      if (state === 'failed' || state === 'disconnected') {
        this.config.onError?.(new Error(`ICE connection ${state}`));
      }
    };
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('[WebRTC] Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('[WebRTC] Data channel error:', error);
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle pong for latency measurement
        if (message.type === 'pong' && this.lastPingTime) {
          const latency = Date.now() - this.lastPingTime;
          this.config.onLatencyUpdate?.(latency);
        }
      } catch (error) {
        console.error('[WebRTC] Failed to parse data channel message:', error);
      }
    };
  }

  private startStatsMonitoring(): void {
    this.statsInterval = window.setInterval(async () => {
      const stats = await this.getStats();
      if (stats) {
        console.log('[WebRTC] Stats:', stats);
      }
    }, 5000);
  }

  private startLatencyMonitoring(): void {
    this.latencyInterval = window.setInterval(() => {
      if (this.dataChannel?.readyState === 'open') {
        this.lastPingTime = Date.now();
        this.dataChannel.send(JSON.stringify({ type: 'ping' }));
      }
    }, 1000);
  }

  private async sendSignalingMessage(message: unknown): Promise<void> {
    try {
      const response = await fetch(`${this.config.serverUrl}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Signaling failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.type === 'answer' && data.sdp) {
        await this.handleAnswer(data.sdp);
      }
    } catch (error) {
      console.error('[WebRTC] Signaling error:', error);
      throw error;
    }
  }
}

// Singleton instance for global access
let streamingClient: WebRTCStreamingClient | null = null;

export function getStreamingClient(): WebRTCStreamingClient | null {
  return streamingClient;
}

export function createStreamingClient(config: StreamingConfig): WebRTCStreamingClient {
  streamingClient = new WebRTCStreamingClient(config);
  return streamingClient;
}