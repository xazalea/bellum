/**
 * Digital Rights Management (DRM) Support
 * Widevine and PlayReady via Encrypted Media Extensions (EME)
 */

export enum DRMSystem {
  WIDEVINE = 'com.widevine.alpha',
  PLAYREADY = 'com.microsoft.playready',
  FAIRPLAY = 'com.apple.fps',
  CLEARKEY = 'org.w3.clearkey',
}

export interface DRMConfig {
  system: DRMSystem;
  licenseServerUrl: string;
  certificate?: Uint8Array;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface DRMSession {
  id: string;
  mediaKeys: MediaKeys;
  keySession: MediaKeySession;
  status: 'pending' | 'active' | 'closed' | 'error';
}

/**
 * DRM Manager using Encrypted Media Extensions (EME)
 */
export class DRMManager {
  private sessions: Map<string, DRMSession> = new Map();
  private nextSessionId = 1;
  
  constructor() {
    console.log('[DRMManager] Initialized');
  }
  
  /**
   * Check if DRM system is supported
   */
  static async isSupported(system: DRMSystem): Promise<boolean> {
    try {
      const config = [{
        initDataTypes: ['cenc', 'webm', 'keyids'],
        videoCapabilities: [{
          contentType: 'video/mp4; codecs="avc1.42E01E"',
          robustness: 'SW_SECURE_CRYPTO',
        }],
        audioCapabilities: [{
          contentType: 'audio/mp4; codecs="mp4a.40.2"',
          robustness: 'SW_SECURE_CRYPTO',
        }],
      }];
      
      const access = await navigator.requestMediaKeySystemAccess(system, config);
      return access !== null;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Create DRM session
   */
  async createSession(
    videoElement: HTMLVideoElement,
    config: DRMConfig
  ): Promise<DRMSession> {
    try {
      console.log(`[DRMManager] Creating session for ${config.system}`);
      
      // Request Media Key System Access
      const mediaKeySystemConfigs = this.getMediaKeySystemConfigs(config);
      const access = await navigator.requestMediaKeySystemAccess(
        config.system,
        mediaKeySystemConfigs
      );
      
      // Create MediaKeys
      const mediaKeys = await access.createMediaKeys();
      
      // Set MediaKeys on video element
      await videoElement.setMediaKeys(mediaKeys);
      
      // Create key session
      const keySession = mediaKeys.createSession();
      
      // Generate session ID
      const sessionId = `drm_session_${this.nextSessionId++}`;
      
      const session: DRMSession = {
        id: sessionId,
        mediaKeys,
        keySession,
        status: 'pending',
      };
      
      this.sessions.set(sessionId, session);
      
      // Handle license requests
      this.setupLicenseRequest(session, config);
      
      console.log(`[DRMManager] Session created: ${sessionId}`);
      return session;
      
    } catch (e) {
      console.error('[DRMManager] Failed to create session:', e);
      throw e;
    }
  }
  
  /**
   * Get MediaKeySystemConfiguration
   */
  private getMediaKeySystemConfigs(config: DRMConfig): MediaKeySystemConfiguration[] {
    const baseConfig: MediaKeySystemConfiguration = {
      initDataTypes: ['cenc', 'webm', 'keyids'],
      videoCapabilities: [
        {
          contentType: 'video/mp4; codecs="avc1.42E01E"',
          robustness: 'SW_SECURE_CRYPTO',
        },
        {
          contentType: 'video/mp4; codecs="avc1.64001E"',
          robustness: 'SW_SECURE_CRYPTO',
        },
        {
          contentType: 'video/webm; codecs="vp9"',
          robustness: 'SW_SECURE_CRYPTO',
        },
      ],
      audioCapabilities: [
        {
          contentType: 'audio/mp4; codecs="mp4a.40.2"',
          robustness: 'SW_SECURE_CRYPTO',
        },
        {
          contentType: 'audio/webm; codecs="opus"',
          robustness: 'SW_SECURE_CRYPTO',
        },
      ],
      distinctiveIdentifier: 'optional',
      persistentState: 'optional',
      sessionTypes: ['temporary'],
    };
    
    return [baseConfig];
  }
  
  /**
   * Setup license request handling
   */
  private setupLicenseRequest(session: DRMSession, config: DRMConfig): void {
    session.keySession.addEventListener('message', async (event: MediaKeyMessageEvent) => {
      try {
        console.log(`[DRMManager] License request for ${session.id}`);
        
        // Send license request to server
        const license = await this.requestLicense(
          config.licenseServerUrl,
          event.message,
          config.headers,
          config.withCredentials
        );
        
        // Update key session with license
        await session.keySession.update(license);
        
        session.status = 'active';
        console.log(`[DRMManager] License acquired for ${session.id}`);
        
      } catch (e) {
        console.error('[DRMManager] License request failed:', e);
        session.status = 'error';
      }
    });
    
    session.keySession.addEventListener('keystatuseschange', () => {
      const statuses: string[] = [];
      session.keySession.keyStatuses.forEach((status, keyId) => {
        statuses.push(status);
      });
      console.log(`[DRMManager] Key statuses changed:`, statuses);
    });
  }
  
  /**
   * Request license from server
   */
  private async requestLicense(
    url: string,
    challenge: ArrayBuffer,
    headers: Record<string, string> = {},
    withCredentials: boolean = false
  ): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...headers,
      },
      body: challenge,
      credentials: withCredentials ? 'include' : 'same-origin',
    });
    
    if (!response.ok) {
      throw new Error(`License request failed: ${response.status}`);
    }
    
    return await response.arrayBuffer();
  }
  
  /**
   * Generate key request (for initialization)
   */
  async generateKeyRequest(
    sessionId: string,
    initDataType: string,
    initData: ArrayBuffer
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    await session.keySession.generateRequest(initDataType, initData);
  }
  
  /**
   * Close session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    await session.keySession.close();
    session.status = 'closed';
    this.sessions.delete(sessionId);
    
    console.log(`[DRMManager] Session closed: ${sessionId}`);
  }
  
  /**
   * Get session
   */
  getSession(sessionId: string): DRMSession | null {
    return this.sessions.get(sessionId) || null;
  }
  
  /**
   * Get all sessions
   */
  getAllSessions(): DRMSession[] {
    return Array.from(this.sessions.values());
  }
}

/**
 * Widevine DRM Helper
 */
export class WidevineDRM {
  private drmManager: DRMManager;
  
  constructor() {
    this.drmManager = new DRMManager();
  }
  
  /**
   * Setup Widevine DRM for video element
   */
  async setup(
    videoElement: HTMLVideoElement,
    licenseServerUrl: string,
    options: {
      headers?: Record<string, string>;
      withCredentials?: boolean;
    } = {}
  ): Promise<DRMSession> {
    // Check support
    const supported = await DRMManager.isSupported(DRMSystem.WIDEVINE);
    if (!supported) {
      throw new Error('Widevine not supported');
    }
    
    // Create DRM session
    return await this.drmManager.createSession(videoElement, {
      system: DRMSystem.WIDEVINE,
      licenseServerUrl,
      headers: options.headers,
      withCredentials: options.withCredentials,
    });
  }
  
  /**
   * Handle encrypted media event
   */
  async handleEncrypted(
    event: MediaEncryptedEvent,
    sessionId: string
  ): Promise<void> {
    if (!event.initData) return;
    
    await this.drmManager.generateKeyRequest(
      sessionId,
      event.initDataType || 'cenc',
      event.initData
    );
  }
}

/**
 * PlayReady DRM Helper
 */
export class PlayReadyDRM {
  private drmManager: DRMManager;
  
  constructor() {
    this.drmManager = new DRMManager();
  }
  
  /**
   * Setup PlayReady DRM for video element
   */
  async setup(
    videoElement: HTMLVideoElement,
    licenseServerUrl: string,
    options: {
      headers?: Record<string, string>;
      withCredentials?: boolean;
    } = {}
  ): Promise<DRMSession> {
    // Check support
    const supported = await DRMManager.isSupported(DRMSystem.PLAYREADY);
    if (!supported) {
      throw new Error('PlayReady not supported');
    }
    
    // Create DRM session
    return await this.drmManager.createSession(videoElement, {
      system: DRMSystem.PLAYREADY,
      licenseServerUrl,
      headers: options.headers,
      withCredentials: options.withCredentials,
    });
  }
  
  /**
   * Handle encrypted media event
   */
  async handleEncrypted(
    event: MediaEncryptedEvent,
    sessionId: string
  ): Promise<void> {
    if (!event.initData) return;
    
    // PlayReady uses different init data format
    const initData = this.extractPlayReadyInitData(event.initData);
    
    await this.drmManager.generateKeyRequest(
      sessionId,
      event.initDataType || 'cenc',
      initData
    );
  }
  
  /**
   * Extract PlayReady init data
   */
  private extractPlayReadyInitData(initData: ArrayBuffer): ArrayBuffer {
    // PlayReady-specific initialization data extraction
    // In real implementation, would parse PlayReady object
    return initData;
  }
}

/**
 * ClearKey DRM Helper (for testing)
 */
export class ClearKeyDRM {
  private drmManager: DRMManager;
  
  constructor() {
    this.drmManager = new DRMManager();
  }
  
  /**
   * Setup ClearKey DRM for video element
   */
  async setup(
    videoElement: HTMLVideoElement,
    keys: { keyId: string; key: string }[]
  ): Promise<DRMSession> {
    // Create mock license server URL
    const licenseServerUrl = 'data:application/json;base64,' + 
      btoa(JSON.stringify({ keys: this.formatKeys(keys) }));
    
    // Create DRM session
    return await this.drmManager.createSession(videoElement, {
      system: DRMSystem.CLEARKEY,
      licenseServerUrl,
    });
  }
  
  /**
   * Format keys for ClearKey
   */
  private formatKeys(keys: { keyId: string; key: string }[]): any[] {
    return keys.map(k => ({
      kty: 'oct',
      kid: k.keyId,
      k: k.key,
    }));
  }
}
