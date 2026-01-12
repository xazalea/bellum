/**
 * SSL/TLS Support
 * Secure connections using browser's Crypto API
 */

export interface TLSConfig {
  minVersion?: TLSVersion;
  maxVersion?: TLSVersion;
  cipherSuites?: string[];
  certificates?: ArrayBuffer[];
  privateKey?: CryptoKey;
}

export enum TLSVersion {
  TLS_1_0 = 0x0301,
  TLS_1_1 = 0x0302,
  TLS_1_2 = 0x0303,
  TLS_1_3 = 0x0304,
}

export interface TLSHandshake {
  clientHello: ArrayBuffer;
  serverHello: ArrayBuffer;
  certificate: ArrayBuffer;
  serverKeyExchange?: ArrayBuffer;
  clientKeyExchange: ArrayBuffer;
  finished: ArrayBuffer;
}

/**
 * TLS Context
 */
export class TLSContext {
  private config: TLSConfig;
  private masterSecret: Uint8Array | null = null;
  private clientRandom: Uint8Array;
  private serverRandom: Uint8Array;
  private sessionKeys: {
    clientWriteKey: CryptoKey | null;
    serverWriteKey: CryptoKey | null;
    clientWriteIV: Uint8Array | null;
    serverWriteIV: Uint8Array | null;
  };
  
  constructor(config?: TLSConfig) {
    this.config = config || {
      minVersion: TLSVersion.TLS_1_2,
      maxVersion: TLSVersion.TLS_1_3,
    };
    
    this.clientRandom = crypto.getRandomValues(new Uint8Array(32));
    this.serverRandom = new Uint8Array(32);
    this.sessionKeys = {
      clientWriteKey: null,
      serverWriteKey: null,
      clientWriteIV: null,
      serverWriteIV: null,
    };
    
    console.log('[TLS] Context initialized');
  }
  
  /**
   * Generate client hello
   */
  async generateClientHello(): Promise<ArrayBuffer> {
    // Simplified TLS ClientHello
    const hello = new Uint8Array([
      // Handshake Type: ClientHello (1)
      0x01,
      // Length (3 bytes) - placeholder
      0x00, 0x00, 0x00,
      // TLS Version (TLS 1.2)
      0x03, 0x03,
      // Random (32 bytes)
      ...this.clientRandom,
      // Session ID Length (0)
      0x00,
      // Cipher Suites Length (placeholder)
      0x00, 0x00,
      // Compression Methods Length (1)
      0x01,
      // Compression Method: null
      0x00,
    ]);
    
    return hello.buffer;
  }
  
  /**
   * Process server hello
   */
  async processServerHello(serverHello: ArrayBuffer): Promise<void> {
    const data = new Uint8Array(serverHello);
    
    // Extract server random (simplified)
    this.serverRandom = data.slice(6, 38);
    
    console.log('[TLS] Processed server hello');
  }
  
  /**
   * Generate pre-master secret
   */
  async generatePreMasterSecret(): Promise<Uint8Array> {
    // TLS 1.2: 48 bytes
    const preMasterSecret = crypto.getRandomValues(new Uint8Array(48));
    
    // First two bytes: TLS version
    preMasterSecret[0] = 0x03;
    preMasterSecret[1] = 0x03;
    
    return preMasterSecret;
  }
  
  /**
   * Derive master secret from pre-master secret
   */
  async deriveMasterSecret(preMasterSecret: Uint8Array): Promise<Uint8Array> {
    // PRF (Pseudo-Random Function) for TLS 1.2
    // master_secret = PRF(pre_master_secret, "master secret", ClientHello.random + ServerHello.random)[0..47]
    
    const seed = new Uint8Array([
      ...this.clientRandom,
      ...this.serverRandom,
    ]);
    
    const label = new TextEncoder().encode('master secret');
    
    // Use HMAC-SHA256 for PRF
    const masterSecret = await this.prf(preMasterSecret, label, seed, 48);
    
    this.masterSecret = masterSecret;
    console.log('[TLS] Master secret derived');
    
    return masterSecret;
  }
  
  /**
   * Derive session keys from master secret
   */
  async deriveSessionKeys(): Promise<void> {
    if (!this.masterSecret) {
      throw new Error('Master secret not available');
    }
    
    // key_block = PRF(SecurityParameters.master_secret,
    //                 "key expansion",
    //                 SecurityParameters.server_random + SecurityParameters.client_random);
    
    const seed = new Uint8Array([
      ...this.serverRandom,
      ...this.clientRandom,
    ]);
    
    const label = new TextEncoder().encode('key expansion');
    
    // Generate key material (simplified: 128 bits for keys, 128 bits for IVs)
    const keyMaterial = await this.prf(this.masterSecret, label, seed, 64);
    
    // Split key material
    const clientWriteKeyBytes = keyMaterial.slice(0, 16);
    const serverWriteKeyBytes = keyMaterial.slice(16, 32);
    const clientWriteIVBytes = keyMaterial.slice(32, 48);
    const serverWriteIVBytes = keyMaterial.slice(48, 64);
    
    // Import keys for AES-128-GCM
    this.sessionKeys.clientWriteKey = await crypto.subtle.importKey(
      'raw',
      clientWriteKeyBytes,
      { name: 'AES-GCM', length: 128 },
      false,
      ['encrypt', 'decrypt']
    );
    
    this.sessionKeys.serverWriteKey = await crypto.subtle.importKey(
      'raw',
      serverWriteKeyBytes,
      { name: 'AES-GCM', length: 128 },
      false,
      ['encrypt', 'decrypt']
    );
    
    this.sessionKeys.clientWriteIV = clientWriteIVBytes;
    this.sessionKeys.serverWriteIV = serverWriteIVBytes;
    
    console.log('[TLS] Session keys derived');
  }
  
  /**
   * Encrypt application data
   */
  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    if (!this.sessionKeys.clientWriteKey || !this.sessionKeys.clientWriteIV) {
      throw new Error('Session keys not available');
    }
    
    // Use AES-128-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Convert SharedArrayBuffer to regular ArrayBuffer if needed
    const plaintextBuffer = plaintext.buffer instanceof SharedArrayBuffer
      ? new Uint8Array(plaintext).buffer
      : plaintext.buffer;
    const plaintextData = new Uint8Array(plaintextBuffer, plaintext.byteOffset, plaintext.byteLength);
    
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,
      },
      this.sessionKeys.clientWriteKey,
      plaintextData
    );
    
    // Prepend IV to ciphertext
    const result = new Uint8Array(iv.length + ciphertext.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(ciphertext), iv.length);
    
    return result;
  }
  
  /**
   * Decrypt application data
   */
  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    if (!this.sessionKeys.serverWriteKey) {
      throw new Error('Session keys not available');
    }
    
    // Extract IV and ciphertext
    const iv = ciphertext.slice(0, 12);
    const encrypted = ciphertext.slice(12);
    
    // Convert SharedArrayBuffer to regular ArrayBuffer if needed
    const encryptedBuffer = encrypted.buffer instanceof SharedArrayBuffer
      ? new Uint8Array(encrypted).buffer
      : encrypted.buffer;
    const encryptedData = new Uint8Array(encryptedBuffer, encrypted.byteOffset, encrypted.byteLength);
    
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,
      },
      this.sessionKeys.serverWriteKey,
      encryptedData
    );
    
    return new Uint8Array(plaintext);
  }
  
  /**
   * Pseudo-Random Function (PRF) for TLS 1.2
   */
  private async prf(
    secret: Uint8Array,
    label: Uint8Array,
    seed: Uint8Array,
    length: number
  ): Promise<Uint8Array> {
    // P_hash(secret, seed) = HMAC_hash(secret, A(1) + seed) +
    //                        HMAC_hash(secret, A(2) + seed) +
    //                        HMAC_hash(secret, A(3) + seed) + ...
    // where A(0) = seed
    //       A(i) = HMAC_hash(secret, A(i-1))
    
    const fullSeed = new Uint8Array([...label, ...seed]);
    
    const key = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const result = new Uint8Array(length);
    let offset = 0;
    let a = fullSeed;
    
    while (offset < length) {
      // A(i) = HMAC(secret, A(i-1))
      a = new Uint8Array(await crypto.subtle.sign('HMAC', key, a));
      
      // HMAC(secret, A(i) + seed)
      const input = new Uint8Array([...a, ...fullSeed]);
      const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, input));
      
      const toCopy = Math.min(hash.length, length - offset);
      result.set(hash.slice(0, toCopy), offset);
      offset += toCopy;
    }
    
    return result;
  }
  
  /**
   * Verify certificate chain
   */
  async verifyCertificate(certificate: ArrayBuffer): Promise<boolean> {
    // Simplified certificate verification
    // In real implementation, would:
    // 1. Parse X.509 certificate
    // 2. Verify signature chain
    // 3. Check validity dates
    // 4. Verify against trusted CAs
    
    console.log('[TLS] Certificate verification (simplified)');
    return true;
  }
  
  /**
   * Generate certificate verify message
   */
  async generateCertificateVerify(handshakeMessages: ArrayBuffer[]): Promise<ArrayBuffer> {
    // Hash all handshake messages
    const combined = new Uint8Array(
      handshakeMessages.reduce((acc, msg) => acc + msg.byteLength, 0)
    );
    
    let offset = 0;
    for (const msg of handshakeMessages) {
      combined.set(new Uint8Array(msg), offset);
      offset += msg.byteLength;
    }
    
    const hash = await crypto.subtle.digest('SHA-256', combined);
    
    // In real implementation, would sign with client's private key
    return hash;
  }
}

/**
 * TLS Client
 */
export class TLSClient {
  private context: TLSContext;
  private underlying: any; // Underlying transport (TCP socket, WebSocket, etc.)
  private handshakeComplete: boolean = false;
  
  constructor(config?: TLSConfig) {
    this.context = new TLSContext(config);
  }
  
  /**
   * Connect and perform TLS handshake
   */
  async connect(underlying: any): Promise<void> {
    this.underlying = underlying;
    
    console.log('[TLS] Starting handshake...');
    
    try {
      // 1. Send ClientHello
      const clientHello = await this.context.generateClientHello();
      await this.underlying.send(clientHello);
      
      // 2. Receive ServerHello
      const serverHello = await this.underlying.recv();
      await this.context.processServerHello(serverHello);
      
      // 3. Receive Certificate
      const certificate = await this.underlying.recv();
      const certValid = await this.context.verifyCertificate(certificate);
      if (!certValid) {
        throw new Error('Certificate verification failed');
      }
      
      // 4. Generate keys
      const preMasterSecret = await this.context.generatePreMasterSecret();
      await this.context.deriveMasterSecret(preMasterSecret);
      await this.context.deriveSessionKeys();
      
      // 5. Send ClientKeyExchange (simplified)
      // In real implementation, would encrypt pre-master secret with server's public key
      
      // 6. Send ChangeCipherSpec
      await this.underlying.send(new Uint8Array([0x14, 0x03, 0x03, 0x00, 0x01, 0x01]));
      
      // 7. Send Finished
      // In real implementation, would compute and send finished message
      
      this.handshakeComplete = true;
      console.log('[TLS] Handshake complete');
      
    } catch (e) {
      console.error('[TLS] Handshake failed:', e);
      throw e;
    }
  }
  
  /**
   * Send encrypted data
   */
  async send(data: Uint8Array): Promise<void> {
    if (!this.handshakeComplete) {
      throw new Error('TLS handshake not complete');
    }
    
    const encrypted = await this.context.encrypt(data);
    await this.underlying.send(encrypted);
  }
  
  /**
   * Receive and decrypt data
   */
  async recv(): Promise<Uint8Array> {
    if (!this.handshakeComplete) {
      throw new Error('TLS handshake not complete');
    }
    
    const encrypted = await this.underlying.recv();
    return await this.context.decrypt(encrypted);
  }
  
  /**
   * Close TLS connection
   */
  close(): void {
    // Send close_notify alert
    if (this.handshakeComplete && this.underlying) {
      this.underlying.send(new Uint8Array([0x15, 0x03, 0x03, 0x00, 0x02, 0x01, 0x00]));
    }
    
    this.handshakeComplete = false;
  }
}

/**
 * HTTPS Client (TLS over TCP)
 */
export class HTTPSClient {
  private tlsClient: TLSClient;
  
  constructor() {
    this.tlsClient = new TLSClient();
  }
  
  /**
   * Make HTTPS request
   */
  async request(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: Uint8Array;
    } = {}
  ): Promise<{ status: number; headers: Record<string, string>; body: Uint8Array }> {
    // Parse URL
    const urlObj = new URL(url);
    
    // In browser environment, use fetch API for actual HTTPS
    // This is a fallback for native-like HTTPS support
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
      });
      
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      const body = new Uint8Array(await response.arrayBuffer());
      
      return {
        status: response.status,
        headers,
        body,
      };
    } catch (e) {
      console.error('[HTTPS] Request failed:', e);
      throw e;
    }
  }
  
  /**
   * Make GET request
   */
  async get(url: string, headers?: Record<string, string>): Promise<Uint8Array> {
    const response = await this.request(url, { method: 'GET', headers });
    return response.body;
  }
  
  /**
   * Make POST request
   */
  async post(url: string, body: Uint8Array, headers?: Record<string, string>): Promise<Uint8Array> {
    const response = await this.request(url, { method: 'POST', body, headers });
    return response.body;
  }
}
