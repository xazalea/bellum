/**
 * v86 Emulator Loader
 * Handles dynamic loading and initialization of v86 emulator
 */

declare global {
  interface Window {
    V86Starter?: any;
    V86?: any;
  }
}

export interface V86Config {
  wasm_path: string;
  memory_size: number;
  vga_memory_size: number;
  screen_container: HTMLElement;
  bios?: { url: string };
  vga_bios?: { url: string };
  cdrom?: { url: string };
  hda?: { url: string; async?: boolean };
  autostart?: boolean;
  boot_order?: number;
  network_relay_url?: string;
  filesystem?: any;
  initial_state?: ArrayBuffer;
}

export class V86Loader {
  private static loaded: boolean = false;
  private static loadingPromise: Promise<void> | null = null;

  static async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('v86 can only be loaded in browser environment'));
        return;
      }

      // Check if already loaded
      if (window.V86Starter) {
        this.loaded = true;
        resolve();
        return;
      }

      // Load v86 script
      const script = document.createElement('script');
      // Self-hosted (no external CDNs). Provide this file via your cluster/server.
      script.src = '/v86/libv86.js';
      script.async = true;
      script.onload = () => {
        // Wait for V86Starter to be available
        const checkV86 = setInterval(() => {
          if (window.V86Starter) {
            this.loaded = true;
            clearInterval(checkV86);
            resolve();
          }
        }, 50);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkV86);
          if (!this.loaded) {
            reject(new Error('v86 failed to load'));
          }
        }, 10000);
      };
      script.onerror = () => {
        reject(new Error('Failed to load v86 script'));
      };
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  static create(config: V86Config): any {
    if (!this.loaded || !window.V86Starter) {
      throw new Error('v86 not loaded. Call V86Loader.load() first.');
    }

    return new window.V86Starter(config);
  }

  static async saveState(emulator: any): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      if (!emulator || typeof emulator.save_state !== 'function') {
        reject(new Error('Invalid emulator instance'));
        return;
      }

      emulator.save_state((error: Error | null, state: ArrayBuffer) => {
        if (error) {
          reject(error);
        } else {
          resolve(state);
        }
      });
    });
  }

  static async restoreState(emulator: any, state: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!emulator || typeof emulator.restore_state !== 'function') {
        reject(new Error('Invalid emulator instance'));
        return;
      }

      emulator.restore_state(state, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

