/**
 * Backend API Client
 * Communicates with ASP.NET Core backend for enhanced emulation features
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface DiskImageRequest {
  url: string;
  format: string;
  targetFormat?: string;
}

export interface DiskImageResult {
  processed: boolean;
  originalSize: number;
  processedSize: number;
  format: string;
  data: string;
}

export interface StateOptimizationRequest {
  stateData: ArrayBuffer;
  compressionLevel?: number;
}

export interface AppExtractionRequest {
  url: string;
  appType: string;
}

export interface CompatibilityPatchRequest {
  url: string;
  platform: string;
  patches: string[];
}

export class BackendClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  async processDiskImage(request: DiskImageRequest): Promise<DiskImageResult> {
    const response = await fetch(`${this.baseUrl}/api/emulator/process-disk-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to process disk image: ${response.statusText}`);
    }

    return await response.json();
  }

  async optimizeState(request: StateOptimizationRequest): Promise<ArrayBuffer> {
    const stateBase64 = btoa(
      String.fromCharCode(...new Uint8Array(request.stateData))
    );

    const response = await fetch(`${this.baseUrl}/api/emulator/optimize-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stateData: Array.from(new Uint8Array(request.stateData)),
        compressionLevel: request.compressionLevel || 6,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to optimize state: ${response.statusText}`);
    }

    const result = await response.json();
    const optimizedBase64 = result.optimizedState;
    const optimizedBytes = Uint8Array.from(atob(optimizedBase64), c => c.charCodeAt(0));
    return optimizedBytes.buffer;
  }

  async extractApp(request: AppExtractionRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/emulator/extract-app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to extract app: ${response.statusText}`);
    }

    return await response.json();
  }

  async patchCompatibility(request: CompatibilityPatchRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/emulator/patch-compatibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to patch compatibility: ${response.statusText}`);
    }

    const result = await response.json();
    return result.patchedUrl;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/emulator/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async startStream(vmId: string, config?: Record<string, any>): Promise<{ streamId: string; wsUrl: string }> {
    const response = await fetch(`${this.baseUrl}/api/streaming/start-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vmId, config }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start stream: ${response.statusText}`);
    }

    return await response.json();
  }

  async stopStream(streamId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/streaming/stop-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ streamId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to stop stream: ${response.statusText}`);
    }
  }

  getWebSocketUrl(vmId: string): string {
    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsBaseUrl = this.baseUrl.replace(/^https?/, wsProtocol);
    return `${wsBaseUrl}/api/streaming/stream/${vmId}`;
  }
}

// Singleton instance
export const backendClient = new BackendClient();

