// Networking shim for multiplayer support
// Proxies UDP traffic over WebSocket/WebTransport

export class NetworkTunnel {
    private socket: WebSocket | null = null;
    private endpoint: string;
    private isConnected: boolean = false;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(this.endpoint);
            this.socket.binaryType = 'arraybuffer';

            this.socket.onopen = () => {
                this.isConnected = true;
                console.log('Nacho Network Tunnel Connected');
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
        if (!this.isConnected || !this.socket) {
            console.warn('Network Tunnel not connected, dropping packet');
            return;
        }
        this.socket.send(data);
    }

    private handleMessage(data: ArrayBuffer): void {
        // Dispatch received packet to the emulator/runtime
        // This would hook into the compiled WASM's memory
        const packet = new Uint8Array(data);
        // console.log('Received packet:', packet.byteLength, 'bytes');
        
        // Event dispatch (mock)
        const event = new CustomEvent('nacho-network-packet', { detail: packet });
        window.dispatchEvent(event);
    }

    public close(): void {
        if (this.socket) {
            this.socket.close();
            this.isConnected = false;
        }
    }
}

