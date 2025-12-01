// Networking shim for multiplayer support
// Proxies UDP traffic over WebTransport (High Performance) or WebSocket (Fallback)

export class NetworkTunnel {
    private transport: WebTransport | null = null;
    private socket: WebSocket | null = null;
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private endpoint: string;
    private isConnected: boolean = false;
    private useWebTransport: boolean = true;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    public async connect(): Promise<void> {
        if (this.useWebTransport && 'WebTransport' in window) {
            try {
                await this.connectWebTransport();
                return;
            } catch (err) {
                console.warn('WebTransport connection failed, falling back to WebSocket', err);
            }
        }
        
        await this.connectWebSocket();
    }

    private async connectWebTransport() {
        this.transport = new WebTransport(this.endpoint);
        await this.transport.ready;
        
        const datagrams = this.transport.datagrams;
        this.writer = datagrams.writable.getWriter();
        
        this.isConnected = true;
        console.log('Nacho Network Tunnel Connected (WebTransport)');
        
        this.readDatagrams(datagrams.readable);
    }

    private async readDatagrams(readable: ReadableStream<Uint8Array>) {
        const reader = readable.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                this.handleMessage(value);
            }
        } catch (err) {
            console.error('WebTransport read error:', err);
        }
    }

    private async connectWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Replace 'https' with 'wss' for WebSocket
            const wsEndpoint = this.endpoint.replace(/^https?/, 'wss').replace(/^http?/, 'ws');
            this.socket = new WebSocket(wsEndpoint);
            this.socket.binaryType = 'arraybuffer';

            this.socket.onopen = () => {
                this.isConnected = true;
                console.log('Nacho Network Tunnel Connected (WebSocket)');
                resolve();
            };

            this.socket.onerror = (err) => {
                console.error('Network Tunnel Error:', err);
                reject(err);
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(event.data);
            };
        });
    }

    public sendPacket(data: Uint8Array): void {
        if (!this.isConnected) {
            // console.warn('Network Tunnel not connected, dropping packet');
            return;
        }

        if (this.transport && this.writer) {
            this.writer.write(data).catch(err => console.error('Write error:', err));
        } else if (this.socket) {
            this.socket.send(data);
        }
    }

    private handleMessage(data: ArrayBuffer | Uint8Array): void {
        // Dispatch received packet to the emulator/runtime
        const packet = data instanceof Uint8Array ? data : new Uint8Array(data);
        
        // Event dispatch (mock)
        const event = new CustomEvent('nacho-network-packet', { detail: packet });
        window.dispatchEvent(event);
    }

    public close(): void {
        if (this.transport) {
            this.transport.close();
        }
        if (this.socket) {
            this.socket.close();
        }
        this.isConnected = false;
    }
}
