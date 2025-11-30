/**
 * DOS VM Implementation using js-dos
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { puterClient } from '../../puter/client';
import { JSDOSLoader } from '../../emulators/jsdos-loader';

export class DOSVM extends BaseVM {
  private emulator: any = null;
  private keyboardListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: VMConfig) {
    super({ ...config, type: VMType.DOS });
  }

  async initializeEmulator(container: HTMLElement): Promise<void> {
    await this.ensureStoragePath();

    if (!this.container) {
      throw new Error('Container not initialized');
    }

    // Load js-dos library
    await JSDOSLoader.load();

    // Create js-dos instance
    this.emulator = await JSDOSLoader.create(this.container, {
      onprogress: (stage: string, total: number, loaded: number) => {
        const progress = total > 0 ? (loaded / total) * 100 : 0;
        this.emit('progress', { stage, progress });
      },
    });

    // Set canvas size (typical DOS resolution)
    if (this.canvas) {
      this.canvas.width = 640;
      this.canvas.height = 400;
    }

    this.emit('initialized');
  }

  private setupInputHandlers(): void {
    if (!this.container) return;

    // js-dos handles input automatically through the container
    // We just need to ensure the container can receive focus
    if (this.container instanceof HTMLElement) {
      this.container.tabIndex = 0;
      this.container.style.outline = 'none';
    }
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    if (!this.container) {
      throw new Error('VM not mounted to container');
    }

    if (!this.emulator) {
      await this.initializeEmulator(this.container);
    }

    // Set up input handlers
    this.setupInputHandlers();

    // Get DOS bundle URL from Puter.js storage
    let bundleUrl: string;
    try {
      const bundlePath = `${this.state.storagePath}/dos_bundle.jsdos`;
      try {
        await puterClient.getFileInfo(bundlePath);
        bundleUrl = await puterClient.getReadURL(bundlePath);
      } catch (error) {
        // Try to load from a default location or create empty bundle
        throw new Error('DOS bundle not found. Please upload a DOS bundle file.');
      }
    } catch (error) {
      console.error('Failed to load DOS bundle:', error);
      throw error;
    }

    // Try to restore saved state if available
    try {
      const statePath = `${this.state.storagePath}/dos_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArray = new Uint8Array(await stateBlob.arrayBuffer());
      await JSDOSLoader.restoreState(this.emulator, stateArray);
    } catch (error) {
      // No saved state, start fresh
      console.log('No saved state found, starting fresh');
    }

    // Run the DOS bundle
    await JSDOSLoader.run(this.emulator, bundleUrl);

    this.state.isRunning = true;
    this.state.isPaused = false;
    await this.saveState();
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    // Save state before stopping
    await this.saveDOSState();

    // Stop emulator
    JSDOSLoader.stop(this.emulator);

    this.state.isRunning = false;
    this.state.isPaused = false;
    await this.saveState();
    this.emit('stopped');
  }

  async pause(): Promise<void> {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }

    // Save state for pause
    await this.saveDOSState();

    this.state.isPaused = true;
    await this.saveState();
    this.emit('paused');
  }

  async resume(): Promise<void> {
    if (!this.state.isRunning || !this.state.isPaused) {
      return;
    }

    // Restore state to resume
    try {
      const statePath = `${this.state.storagePath}/dos_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArray = new Uint8Array(await stateBlob.arrayBuffer());
      await JSDOSLoader.restoreState(this.emulator, stateArray);
    } catch (error) {
      console.warn('Failed to restore state, continuing anyway:', error);
    }

    this.state.isPaused = false;
    await this.saveState();
    this.emit('resumed');
  }

  async reset(): Promise<void> {
    await this.stop();
    // Reset by removing saved state and restarting
    try {
      const statePath = `${this.state.storagePath}/dos_state.bin`;
      await puterClient.deleteFile(statePath);
    } catch (error) {
      // State file might not exist
    }
    await this.start();
    this.emit('reset');
  }

  private async saveDOSState(): Promise<void> {
    if (!this.emulator || !this.state.isRunning) {
      return;
    }

    try {
      const state = await JSDOSLoader.saveState(this.emulator);
      const statePath = `${this.state.storagePath}/dos_state.bin`;
      await puterClient.writeFile(statePath, new Blob([state as any]), {
        createMissingParents: true,
      });
    } catch (error) {
      console.error('Failed to save DOS state:', error);
    }
  }

  // Override saveState to also save DOS state
  async saveState(): Promise<void> {
    await super.saveState();
    if (this.state.isRunning && this.emulator) {
      await this.saveDOSState();
    }
  }
}

