/**
 * Base VM Implementation
 */

import { VMConfig, VMState, VMInstance } from './types';
import { puterClient } from '../puter/client';
import { backendClient } from '../backend/client';

export abstract class BaseVM implements VMInstance {
  public id: string;
  public config: VMConfig;
  public state: VMState;
  protected canvas: HTMLCanvasElement | null = null;
  protected container: HTMLElement | null = null;
  protected eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(config: VMConfig) {
    this.id = config.id;
    this.config = config;
    this.state = {
      id: config.id,
      config,
      isRunning: false,
      isPaused: false,
      storagePath: `bellum/vms/${config.id}`,
    };
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract pause(): Promise<void>;
  abstract resume(): Promise<void>;
  abstract reset(): Promise<void>;
  abstract initializeEmulator(container: HTMLElement): Promise<void>;

  async saveState(): Promise<void> {
    try {
      const stateData = {
        id: this.state.id,
        config: this.config,
        isRunning: this.state.isRunning,
        isPaused: this.state.isPaused,
        lastSaved: new Date().toISOString(),
        storagePath: this.state.storagePath,
      };

      const statePath = `${this.state.storagePath}/state.json`;
      await puterClient.writeFile(statePath, JSON.stringify(stateData, null, 2), {
        compress: true,
      });

      this.state.lastSaved = new Date();
    } catch (error) {
      console.error(`Failed to save state for VM ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Optimize state using backend service and compiled optimizers
   */
  protected async optimizeStateWithBackend(stateData: ArrayBuffer): Promise<ArrayBuffer> {
    // Only optimize on client-side to avoid fengari SSR issues
    if (typeof window === 'undefined') {
      // Server-side: just use backend
      try {
        const backendAvailable = await backendClient.checkHealth();
        if (backendAvailable) {
          return await backendClient.optimizeState({
            stateData,
            compressionLevel: 6,
          });
        }
      } catch (error) {
        console.warn('Backend not available:', error);
      }
      return stateData;
    }

    try {
      // First try Rust optimizer (fastest) - client-side only
      const { stateOptimizer } = await import('../performance/optimizers');
      const rustOptimized = await stateOptimizer.optimizeStateRust(stateData);
      
      if (rustOptimized.success && rustOptimized.optimized) {
        // Further optimize with backend if available
        try {
          const backendAvailable = await backendClient.checkHealth();
          if (backendAvailable) {
            return await backendClient.optimizeState({
              stateData: rustOptimized.optimized,
              compressionLevel: 6,
            });
          }
        } catch (error) {
          console.warn('Backend not available, using Rust-optimized state:', error);
        }
        
        return rustOptimized.optimized;
      }
    } catch (error) {
      console.warn('Rust optimizer not available, trying backend:', error);
    }

    // Fallback to backend only
    try {
      const backendAvailable = await backendClient.checkHealth();
      if (backendAvailable) {
        return await backendClient.optimizeState({
          stateData,
          compressionLevel: 6,
        });
      }
    } catch (error) {
      console.warn('Backend not available, using local state saving:', error);
    }
    
    // Final fallback to raw state
    return stateData;
  }

  async loadState(): Promise<void> {
    try {
      const statePath = `${this.state.storagePath}/state.json`;
      const stateJson = await puterClient.readFileAsText(statePath);
      const savedState = JSON.parse(stateJson);

      this.state = {
        ...this.state,
        ...savedState,
        lastSaved: savedState.lastSaved ? new Date(savedState.lastSaved) : undefined,
      };
    } catch (error) {
      console.warn(`Failed to load state for VM ${this.id}, using defaults:`, error);
      // State file doesn't exist yet, that's okay
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    container.innerHTML = ''; // Clear container
    
    // Create canvas for VM display
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    // Initialize the emulator
    await this.initializeEmulator(container);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  protected emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  protected async ensureStoragePath(): Promise<void> {
    if (this.state.storagePath) {
      try {
        await puterClient.createDirectory(this.state.storagePath);
      } catch (error) {
        // Directory might already exist, that's fine
        console.log(`Storage path ${this.state.storagePath} already exists or error:`, error);
      }
    }
  }
}

