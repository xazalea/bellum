/**
 * TCP/IP Stack Implementation
 * Socket API with TCP, UDP, DNS support
 * Note: Browser limitations require WebSocket/WebRTC for actual networking
 */

export enum SocketType {
  STREAM = 1, // TCP
  DGRAM = 2,  // UDP
  RAW = 3,    // Raw IP
}

export enum SocketState {
  CLOSED = 'closed',
  LISTEN = 'listen',
  SYN_SENT = 'syn_sent',
  SYN_RECEIVED = 'syn_received',
  ESTABLISHED = 'established',
  FIN_WAIT_1 = 'fin_wait_1',
  FIN_WAIT_2 = 'fin_wait_2',
  CLOSE_WAIT = 'close_wait',
  CLOSING = 'closing',
  LAST_ACK = 'last_ack',
  TIME_WAIT = 'time_wait',
}

export interface SocketAddress {
  host: string;
  port: number;
}

export interface TCPSegment {
  sourcePort: number;
  destPort: number;
  sequenceNumber: number;
  acknowledgmentNumber: number;
  dataOffset: number;
  flags: {
    URG: boolean;
    ACK: boolean;
    PSH: boolean;
    RST: boolean;
    SYN: boolean;
    FIN: boolean;
  };
  windowSize: number;
  checksum: number;
  urgentPointer: number;
  data: Uint8Array;
}

export interface UDPDatagram {
  sourcePort: number;
  destPort: number;
  length: number;
  checksum: number;
  data: Uint8Array;
}

/**
 * TCP Socket
 */
export class TCPSocket {
  private fd: number;
  private state: SocketState = SocketState.CLOSED;
  private localAddr: SocketAddress | null = null;
  private remoteAddr: SocketAddress | null = null;
  
  // TCP state
  private sequenceNumber: number = Math.floor(Math.random() * 0xFFFFFFFF);
  private acknowledgmentNumber: number = 0;
  private sendBuffer: Uint8Array[] = [];
  private recvBuffer: Uint8Array[] = [];
  
  // WebSocket proxy (for actual networking)
  private webSocket: WebSocket | null = null;
  private onDataCallback: ((data: Uint8Array) => void) | null = null;
  
  constructor(fd: number) {
    this.fd = fd;
  }
  
  /**
   * Bind socket to address
   */
  bind(address: SocketAddress): void {
    if (this.state !== SocketState.CLOSED) {
      throw new Error('Socket already bound');
    }
    
    this.localAddr = address;
    console.log(`[TCP] Socket ${this.fd} bound to ${address.host}:${address.port}`);
  }
  
  /**
   * Listen for connections
   */
  listen(backlog: number = 5): void {
    if (!this.localAddr) {
      throw new Error('Socket not bound');
    }
    
    this.state = SocketState.LISTEN;
    console.log(`[TCP] Socket ${this.fd} listening (backlog: ${backlog})`);
  }
  
  /**
   * Accept incoming connection
   */
  async accept(): Promise<TCPSocket> {
    if (this.state !== SocketState.LISTEN) {
      throw new Error('Socket not listening');
    }
    
    // In real implementation, would wait for SYN packet
    // For now, create mock connection
    const clientSocket = new TCPSocket(this.fd + 1000);
    clientSocket.state = SocketState.ESTABLISHED;
    clientSocket.localAddr = this.localAddr;
    
    return clientSocket;
  }
  
  /**
   * Connect to remote address
   */
  async connect(address: SocketAddress): Promise<void> {
    this.remoteAddr = address;
    this.state = SocketState.SYN_SENT;
    
    try {
      // Use WebSocket as proxy for actual networking
      const wsUrl = `ws://${address.host}:${address.port}`;
      this.webSocket = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        this.webSocket!.onopen = () => {
          this.state = SocketState.ESTABLISHED;
          this.sequenceNumber++;
          console.log(`[TCP] Socket ${this.fd} connected to ${address.host}:${address.port}`);
          resolve();
        };
        
        this.webSocket!.onerror = (error) => {
          this.state = SocketState.CLOSED;
          reject(error);
        };
        
        this.webSocket!.onmessage = (event) => {
          this.handleIncomingData(event.data);
        };
        
        this.webSocket!.onclose = () => {
          this.state = SocketState.CLOSED;
        };
      });
    } catch (e) {
      console.warn(`[TCP] WebSocket connection failed, using mock mode:`, e);
      // Fallback to mock connection for local testing
      this.state = SocketState.ESTABLISHED;
    }
  }
  
  /**
   * Send data
   */
  async send(data: Uint8Array): Promise<number> {
    if (this.state !== SocketState.ESTABLISHED) {
      throw new Error('Socket not connected');
    }
    
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      // Send via WebSocket
      this.webSocket.send(data);
    } else {
      // Buffer data
      this.sendBuffer.push(data);
    }
    
    this.sequenceNumber += data.length;
    return data.length;
  }
  
  /**
   * Receive data
   */
  async recv(maxLength: number): Promise<Uint8Array> {
    if (this.state !== SocketState.ESTABLISHED) {
      throw new Error('Socket not connected');
    }
    
    // Wait for data in receive buffer
    while (this.recvBuffer.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const data = this.recvBuffer.shift()!;
    return data.slice(0, maxLength);
  }
  
  /**
   * Handle incoming data
   */
  private handleIncomingData(data: any): void {
    let buffer: Uint8Array;
    
    if (data instanceof ArrayBuffer) {
      buffer = new Uint8Array(data);
    } else if (data instanceof Blob) {
      // Handle Blob asynchronously
      data.arrayBuffer().then((ab: ArrayBuffer) => {
        this.recvBuffer.push(new Uint8Array(ab));
      });
      return;
    } else if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data);
    } else {
      buffer = new Uint8Array(data);
    }
    
    this.recvBuffer.push(buffer);
    this.acknowledgmentNumber += buffer.length;
    
    if (this.onDataCallback) {
      this.onDataCallback(buffer);
    }
  }
  
  /**
   * Set data callback
   */
  onData(callback: (data: Uint8Array) => void): void {
    this.onDataCallback = callback;
  }
  
  /**
   * Close socket
   */
  close(): void {
    if (this.state === SocketState.CLOSED) return;
    
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    
    this.state = SocketState.CLOSED;
    console.log(`[TCP] Socket ${this.fd} closed`);
  }
  
  /**
   * Get socket state
   */
  getState(): SocketState {
    return this.state;
  }
  
  /**
   * Get local address
   */
  getLocalAddress(): SocketAddress | null {
    return this.localAddr;
  }
  
  /**
   * Get remote address
   */
  getRemoteAddress(): SocketAddress | null {
    return this.remoteAddr;
  }
}

/**
 * UDP Socket
 */
export class UDPSocket {
  private fd: number;
  private localAddr: SocketAddress | null = null;
  private recvBuffer: { data: Uint8Array; from: SocketAddress }[] = [];
  
  // WebRTC DataChannel proxy (for actual networking)
  private dataChannel: RTCDataChannel | null = null;
  
  constructor(fd: number) {
    this.fd = fd;
  }
  
  /**
   * Bind socket to address
   */
  bind(address: SocketAddress): void {
    this.localAddr = address;
    console.log(`[UDP] Socket ${this.fd} bound to ${address.host}:${address.port}`);
  }
  
  /**
   * Send datagram to address
   */
  async sendto(data: Uint8Array, address: SocketAddress): Promise<number> {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      // Send via WebRTC DataChannel
      // Convert SharedArrayBuffer-backed Uint8Array to regular ArrayBuffer
      const buffer = data.buffer instanceof SharedArrayBuffer 
        ? new Uint8Array(data).buffer 
        : data.buffer;
      this.dataChannel.send(new Uint8Array(buffer, data.byteOffset, data.byteLength));
    } else {
      // Mock send
      console.log(`[UDP] Sent ${data.length} bytes to ${address.host}:${address.port}`);
    }
    
    return data.length;
  }
  
  /**
   * Receive datagram
   */
  async recvfrom(maxLength: number): Promise<{ data: Uint8Array; from: SocketAddress }> {
    // Wait for data in receive buffer
    while (this.recvBuffer.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const { data, from } = this.recvBuffer.shift()!;
    return { data: data.slice(0, maxLength), from };
  }
  
  /**
   * Close socket
   */
  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    console.log(`[UDP] Socket ${this.fd} closed`);
  }
}

/**
 * DNS Resolver
 */
export class DNSResolver {
  private cache: Map<string, string> = new Map();
  
  // Mock DNS records
  private mockRecords: Map<string, string> = new Map([
    ['localhost', '127.0.0.1'],
    ['google.com', '142.250.185.46'],
    ['github.com', '140.82.114.3'],
    ['api.spotify.com', '35.186.224.47'],
  ]);
  
  constructor() {
    console.log('[DNS] Resolver initialized');
  }
  
  /**
   * Resolve hostname to IP address
   */
  async resolve(hostname: string): Promise<string> {
    // Check cache
    if (this.cache.has(hostname)) {
      return this.cache.get(hostname)!;
    }
    
    // Check mock records
    if (this.mockRecords.has(hostname)) {
      const ip = this.mockRecords.get(hostname)!;
      this.cache.set(hostname, ip);
      return ip;
    }
    
    // In browser, cannot do real DNS lookup
    // Would need proxy server
    console.warn(`[DNS] Cannot resolve ${hostname}, using mock IP`);
    const mockIp = '127.0.0.1';
    this.cache.set(hostname, mockIp);
    return mockIp;
  }
  
  /**
   * Reverse lookup (IP to hostname)
   */
  async reverse(ip: string): Promise<string> {
    for (const [hostname, cachedIp] of this.cache) {
      if (cachedIp === ip) return hostname;
    }
    
    for (const [hostname, recordIp] of this.mockRecords) {
      if (recordIp === ip) return hostname;
    }
    
    return ip; // Return IP if no hostname found
  }
  
  /**
   * Clear DNS cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Socket Manager
 */
export class SocketManager {
  private sockets: Map<number, TCPSocket | UDPSocket> = new Map();
  private nextFd = 3; // Start after stdin/stdout/stderr
  private dns: DNSResolver;
  
  constructor() {
    this.dns = new DNSResolver();
    console.log('[SocketManager] Initialized');
  }
  
  /**
   * Create socket
   */
  socket(type: SocketType): number {
    const fd = this.nextFd++;
    
    let socket: TCPSocket | UDPSocket;
    if (type === SocketType.STREAM) {
      socket = new TCPSocket(fd);
    } else if (type === SocketType.DGRAM) {
      socket = new UDPSocket(fd);
    } else {
      throw new Error('Unsupported socket type');
    }
    
    this.sockets.set(fd, socket);
    console.log(`[SocketManager] Created socket fd=${fd} type=${type}`);
    
    return fd;
  }
  
  /**
   * Bind socket
   */
  bind(fd: number, address: SocketAddress): void {
    const socket = this.sockets.get(fd);
    if (!socket) throw new Error('Invalid socket fd');
    
    socket.bind(address);
  }
  
  /**
   * Listen on socket
   */
  listen(fd: number, backlog: number = 5): void {
    const socket = this.sockets.get(fd);
    if (!socket || !(socket instanceof TCPSocket)) {
      throw new Error('Invalid TCP socket fd');
    }
    
    socket.listen(backlog);
  }
  
  /**
   * Accept connection
   */
  async accept(fd: number): Promise<number> {
    const socket = this.sockets.get(fd);
    if (!socket || !(socket instanceof TCPSocket)) {
      throw new Error('Invalid TCP socket fd');
    }
    
    const clientSocket = await socket.accept();
    const clientFd = this.nextFd++;
    this.sockets.set(clientFd, clientSocket);
    
    return clientFd;
  }
  
  /**
   * Connect socket
   */
  async connect(fd: number, address: SocketAddress): Promise<void> {
    const socket = this.sockets.get(fd);
    if (!socket || !(socket instanceof TCPSocket)) {
      throw new Error('Invalid TCP socket fd');
    }
    
    // Resolve hostname if needed
    if (!address.host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      address.host = await this.dns.resolve(address.host);
    }
    
    await socket.connect(address);
  }
  
  /**
   * Send data
   */
  async send(fd: number, data: Uint8Array): Promise<number> {
    const socket = this.sockets.get(fd);
    if (!socket || !(socket instanceof TCPSocket)) {
      throw new Error('Invalid TCP socket fd');
    }
    
    return await socket.send(data);
  }
  
  /**
   * Receive data
   */
  async recv(fd: number, maxLength: number): Promise<Uint8Array> {
    const socket = this.sockets.get(fd);
    if (!socket || !(socket instanceof TCPSocket)) {
      throw new Error('Invalid TCP socket fd');
    }
    
    return await socket.recv(maxLength);
  }
  
  /**
   * Send UDP datagram
   */
  async sendto(fd: number, data: Uint8Array, address: SocketAddress): Promise<number> {
    const socket = this.sockets.get(fd);
    if (!socket || !(socket instanceof UDPSocket)) {
      throw new Error('Invalid UDP socket fd');
    }
    
    // Resolve hostname if needed
    if (!address.host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      address.host = await this.dns.resolve(address.host);
    }
    
    return await socket.sendto(data, address);
  }
  
  /**
   * Receive UDP datagram
   */
  async recvfrom(fd: number, maxLength: number): Promise<{ data: Uint8Array; from: SocketAddress }> {
    const socket = this.sockets.get(fd);
    if (!socket || !(socket instanceof UDPSocket)) {
      throw new Error('Invalid UDP socket fd');
    }
    
    return await socket.recvfrom(maxLength);
  }
  
  /**
   * Close socket
   */
  close(fd: number): void {
    const socket = this.sockets.get(fd);
    if (!socket) return;
    
    socket.close();
    this.sockets.delete(fd);
  }
  
  /**
   * Get DNS resolver
   */
  getDNS(): DNSResolver {
    return this.dns;
  }
}
