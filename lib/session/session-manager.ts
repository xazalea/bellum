/**
 * Game Session Manager
 * Handles multiplayer sessions, invites, and spectator mode
 */

export interface GameSession {
  id: string;
  gameId: string;
  gameTitle: string;
  hostId: string;
  hostName: string;
  players: SessionPlayer[];
  spectators: SessionSpectator[];
  maxPlayers: number;
  isPublic: boolean;
  status: 'waiting' | 'playing' | 'paused' | 'ended';
  createdAt: number;
  updatedAt: number;
  inviteCode: string;
  settings: SessionSettings;
}

export interface SessionPlayer {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
  inputProfile?: string;
}

export interface SessionSpectator {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: number;
}

export interface SessionSettings {
  allowSpectators: boolean;
  maxSpectators: number;
  friendlyFire: boolean;
  gameMode?: string;
  difficulty?: string;
  customRules?: Record<string, unknown>;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'chat' | 'system' | 'event';
}

type SessionEventType = 
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'spectator_joined'
  | 'spectator_left'
  | 'game_started'
  | 'game_paused'
  | 'game_ended'
  | 'chat_message'
  | 'settings_changed';

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

type SessionCallback = (session: GameSession) => void;
type EventCallback = (event: SessionEvent) => void;
type MessageCallback = (message: SessionMessage) => void;

// Generate a short invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a unique ID
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

class SessionManager {
  private currentSession: GameSession | null = null;
  private sessionCallbacks: Set<SessionCallback> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private messageCallbacks: Set<MessageCallback> = new Set();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: number | null = null;

  /**
   * Create a new game session
   */
  async createSession(options: {
    gameId: string;
    gameTitle: string;
    hostId: string;
    hostName: string;
    maxPlayers?: number;
    isPublic?: boolean;
    settings?: Partial<SessionSettings>;
  }): Promise<GameSession> {
    const session: GameSession = {
      id: generateId(),
      gameId: options.gameId,
      gameTitle: options.gameTitle,
      hostId: options.hostId,
      hostName: options.hostName,
      players: [{
        id: options.hostId,
        name: options.hostName,
        isHost: true,
        isReady: true,
        joinedAt: Date.now(),
      }],
      spectators: [],
      maxPlayers: options.maxPlayers || 4,
      isPublic: options.isPublic ?? false,
      status: 'waiting',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inviteCode: generateInviteCode(),
      settings: {
        allowSpectators: true,
        maxSpectators: 10,
        friendlyFire: false,
        ...options.settings,
      },
    };

    this.currentSession = session;
    await this.connectToSignalingServer(session.id, options.hostId);
    
    this.emitEvent({
      type: 'player_joined',
      sessionId: session.id,
      data: { playerId: options.hostId, playerName: options.hostName },
      timestamp: Date.now(),
    });

    return session;
  }

  /**
   * Join an existing session by invite code
   */
  async joinSession(inviteCode: string, player: { id: string; name: string; avatar?: string }): Promise<GameSession> {
    // In a real implementation, this would fetch from a server
    // For now, we'll simulate it
    const response = await fetch(`/api/session/${inviteCode}`);
    if (!response.ok) {
      throw new Error('Session not found or expired');
    }

    const session: GameSession = await response.json();
    
    if (session.players.length >= session.maxPlayers) {
      throw new Error('Session is full');
    }

    if (session.status !== 'waiting') {
      throw new Error('Game already in progress');
    }

    // Add player to session
    session.players.push({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      isHost: false,
      isReady: false,
      joinedAt: Date.now(),
    });
    session.updatedAt = Date.now();

    this.currentSession = session;
    await this.connectToSignalingServer(session.id, player.id);

    this.emitEvent({
      type: 'player_joined',
      sessionId: session.id,
      data: { playerId: player.id, playerName: player.name },
      timestamp: Date.now(),
    });

    return session;
  }

  /**
   * Join as a spectator
   */
  async joinAsSpectator(inviteCode: string, spectator: { id: string; name: string; avatar?: string }): Promise<GameSession> {
    const response = await fetch(`/api/session/${inviteCode}`);
    if (!response.ok) {
      throw new Error('Session not found or expired');
    }

    const session: GameSession = await response.json();

    if (!session.settings.allowSpectators) {
      throw new Error('Spectators are not allowed in this session');
    }

    if (session.spectators.length >= session.settings.maxSpectators) {
      throw new Error('Spectator limit reached');
    }

    session.spectators.push({
      id: spectator.id,
      name: spectator.name,
      avatar: spectator.avatar,
      joinedAt: Date.now(),
    });
    session.updatedAt = Date.now();

    this.currentSession = session;
    await this.connectToSignalingServer(session.id, spectator.id);

    this.emitEvent({
      type: 'spectator_joined',
      sessionId: session.id,
      data: { spectatorId: spectator.id, spectatorName: spectator.name },
      timestamp: Date.now(),
    });

    return session;
  }

  /**
   * Leave the current session
   */
  async leaveSession(): Promise<void> {
    if (!this.currentSession) return;

    const sessionId = this.currentSession.id;
    
    this.emitEvent({
      type: 'player_left',
      sessionId,
      data: {},
      timestamp: Date.now(),
    });

    this.disconnect();
    this.currentSession = null;
  }

  /**
   * Set player ready status
   */
  setReady(ready: boolean): void {
    if (!this.currentSession) return;

    const player = this.currentSession.players.find(p => p.id === this.getCurrentPlayerId());
    if (player && !player.isHost) {
      player.isReady = ready;
      this.currentSession.updatedAt = Date.now();
      this.notifySessionUpdate();
      
      this.emitEvent({
        type: 'player_ready',
        sessionId: this.currentSession.id,
        data: { playerId: player.id, ready },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Start the game (host only)
   */
  async startGame(): Promise<void> {
    if (!this.currentSession) return;

    const player = this.currentSession.players.find(p => p.id === this.getCurrentPlayerId());
    if (!player?.isHost) {
      throw new Error('Only the host can start the game');
    }

    // Check if all players are ready
    const allReady = this.currentSession.players.every(p => p.isReady);
    if (!allReady) {
      throw new Error('Not all players are ready');
    }

    this.currentSession.status = 'playing';
    this.currentSession.updatedAt = Date.now();
    this.notifySessionUpdate();

    this.emitEvent({
      type: 'game_started',
      sessionId: this.currentSession.id,
      data: {},
      timestamp: Date.now(),
    });
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string): void {
    if (!this.currentSession) return;

    const playerId = this.getCurrentPlayerId();
    const player = this.currentSession.players.find(p => p.id === playerId);
    
    const message: SessionMessage = {
      id: generateId(),
      sessionId: this.currentSession.id,
      senderId: playerId,
      senderName: player?.name || 'Unknown',
      content,
      timestamp: Date.now(),
      type: 'chat',
    };

    this.messageCallbacks.forEach(cb => cb(message));
    
    // Send via WebSocket if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        wsType: 'chat',
      }));
    }
  }

  /**
   * Get the current session
   */
  getCurrentSession(): GameSession | null {
    return this.currentSession;
  }

  /**
   * Subscribe to session updates
   */
  onSessionUpdate(callback: SessionCallback): () => void {
    this.sessionCallbacks.add(callback);
    return () => this.sessionCallbacks.delete(callback);
  }

  /**
   * Subscribe to session events
   */
  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Subscribe to chat messages
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Get invite link
   */
  getInviteLink(): string | null {
    if (!this.currentSession) return null;
    return `${window.location.origin}/join/${this.currentSession.inviteCode}`;
  }

  /**
   * Update session settings (host only)
   */
  updateSettings(settings: Partial<SessionSettings>): void {
    if (!this.currentSession) return;

    const player = this.currentSession.players.find(p => p.id === this.getCurrentPlayerId());
    if (!player?.isHost) {
      throw new Error('Only the host can update settings');
    }

    this.currentSession.settings = {
      ...this.currentSession.settings,
      ...settings,
    };
    this.currentSession.updatedAt = Date.now();
    this.notifySessionUpdate();

    this.emitEvent({
      type: 'settings_changed',
      sessionId: this.currentSession.id,
      data: { settings },
      timestamp: Date.now(),
    });
  }

  // Private methods

  private getCurrentPlayerId(): string {
    // In a real implementation, this would come from auth context
    return 'current-player';
  }

  private async connectToSignalingServer(sessionId: string, playerId: string): Promise<void> {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'wss://localhost:8080'}/session/${sessionId}?playerId=${playerId}`;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[SessionManager] Connected to signaling server');
          this.reconnectAttempts = 0;
          this.startPing();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
          } catch (error) {
            console.error('[SessionManager] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[SessionManager] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[SessionManager] Disconnected from signaling server');
          this.stopPing();
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'session_update':
        if (this.currentSession) {
          Object.assign(this.currentSession, data.session);
          this.notifySessionUpdate();
        }
        break;

      case 'event':
        this.emitEvent(data.event);
        break;

      case 'chat':
        this.messageCallbacks.forEach(cb => cb(data));
        break;

      case 'pong':
        // Latency measurement
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SessionManager] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[SessionManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.currentSession) {
        this.connectToSignalingServer(
          this.currentSession.id,
          this.getCurrentPlayerId()
        ).catch(console.error);
      }
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private notifySessionUpdate(): void {
    if (this.currentSession) {
      this.sessionCallbacks.forEach(cb => cb(this.currentSession!));
    }
  }

  private emitEvent(event: SessionEvent): void {
    this.eventCallbacks.forEach(cb => cb(event));
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

// Hook for React components
export function useSession() {
  return sessionManager;
}