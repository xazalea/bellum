/**
 * Nacho Proxy Server
 * Local CORS proxy using Service Worker and Cache API
 * Similar architecture to v86 but scratch-made for Nacho
 */

export class NachoProxyServer {
  private worker: ServiceWorker | null = null;
  private isReady = false;
  private readyPromise: Promise<void>;
  private messageHandlers = new Map<string, (data: any) => void>();

  constructor() {
    this.readyPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[NachoProxy] Service Workers not supported');
      return;
    }

    try {
      // Register the proxy service worker
      const registration = await navigator.serviceWorker.register('/nacho-proxy-sw.js', {
        scope: '/',
      });

      // Wait for the service worker to be ready
      if (registration.active) {
        this.worker = registration.active;
        this.isReady = true;
      } else {
        await new Promise<void>((resolve) => {
          const checkState = () => {
            if (registration.active) {
              this.worker = registration.active;
              this.isReady = true;
              resolve();
            } else if (registration.installing || registration.waiting) {
              const sw = registration.installing || registration.waiting;
              sw?.addEventListener('statechange', () => {
                if (sw.state === 'activated') {
                  this.worker = registration.active;
                  this.isReady = true;
                  resolve();
                }
              });
            }
          };
          checkState();
        });
      }

      // Set up message listener
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, id, data } = event.data;
        const handler = this.messageHandlers.get(id);
        if (handler) {
          handler(data);
          this.messageHandlers.delete(id);
        }
      });

      console.log('[NachoProxy] Service Worker initialized');
    } catch (error) {
      console.error('[NachoProxy] Failed to initialize:', error);
    }
  }

  /**
   * Ensure the proxy is ready before use
   */
  async ready(): Promise<void> {
    await this.readyPromise;
  }

  /**
   * Proxy a URL through the local server
   */
  proxyUrl(url: string): string {
    // The service worker will intercept this and proxy it
    return url;
  }

  /**
   * Fetch a URL through the proxy with caching
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    await this.ready();
    
    // The service worker will intercept and handle CORS
    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Nacho-Proxy': 'true',
      },
    });
  }

  /**
   * Pre-cache a list of URLs
   */
  async precache(urls: string[]): Promise<void> {
    await this.ready();
    
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.messageHandlers.set(id, (data) => {
        if (data.success) {
          resolve();
        } else {
          reject(new Error(data.error));
        }
      });

      this.worker?.postMessage({
        type: 'PRECACHE',
        id,
        urls,
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        this.messageHandlers.delete(id);
        reject(new Error('Precache timeout'));
      }, 30000);
    });
  }

  /**
   * Clear the proxy cache
   */
  async clearCache(): Promise<void> {
    await this.ready();
    
    const id = crypto.randomUUID();
    return new Promise((resolve) => {
      this.messageHandlers.set(id, () => resolve());
      this.worker?.postMessage({
        type: 'CLEAR_CACHE',
        id,
      });
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; entries: number }> {
    await this.ready();
    
    const id = crypto.randomUUID();
    return new Promise((resolve) => {
      this.messageHandlers.set(id, (data) => resolve(data));
      this.worker?.postMessage({
        type: 'GET_STATS',
        id,
      });

      // Default response after timeout
      setTimeout(() => {
        this.messageHandlers.delete(id);
        resolve({ size: 0, entries: 0 });
      }, 5000);
    });
  }
}

// Singleton instance
export const nachoProxy = new NachoProxyServer();
