/**
 * Xbox VM Implementation
 * Note: Web-based Xbox emulation is limited. This implementation
 * provides a foundation that can be extended with cloud streaming
 * or future web emulators.
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { puterClient } from '../../puter/client';

export class XboxVM extends BaseVM {
  private emulator: any = null;
  private gamepadHandler: ((e: GamepadEvent) => void) | null = null;
  private streamingMode: boolean = false;

  constructor(config: VMConfig) {
    super({ ...config, type: VMType.XBOX });
    // Check if cloud streaming is enabled
    this.streamingMode = config.customConfig?.streamingMode || false;
  }

  async initializeEmulator(container: HTMLElement): Promise<void> {
    await this.ensureStoragePath();

    if (!this.container) {
      throw new Error('Container not initialized');
    }

    // Xbox emulation in the browser is currently not well-supported
    // Options:
    // 1. Use cloud streaming (xemu/xqemu on server, stream to browser)
    // 2. Wait for web-based Xbox emulator
    // 3. Use Xbox 360 emulator if available

    // Set canvas size (typical Xbox resolution)
    if (this.canvas) {
      this.canvas.width = 1280;
      this.canvas.height = 720;
    }

    if (this.streamingMode) {
      // Initialize cloud streaming connection
      await this.initializeStreaming(container);
    } else {
      // Placeholder for future web emulator
      this.emit('initialized');
    }
  }

  private async initializeStreaming(container: HTMLElement): Promise<void> {
    // Cloud streaming implementation
    // This would connect to a backend service running xemu/xqemu
    // and stream the video/audio output to the browser
    
    // Placeholder for streaming setup
    // In production, you would:
    // 1. Connect to WebSocket or WebRTC stream
    // 2. Display stream in container
    // 3. Forward input to backend
    
    console.log('Cloud streaming mode enabled');
    this.emit('initialized');
  }

  private setupInputHandlers(): void {
    if (!this.container) return;

    // Gamepad support for Xbox controller
    this.gamepadHandler = (e: GamepadEvent) => {
      if (this.state.isRunning && !this.state.isPaused) {
        const gamepad = navigator.getGamepads()[e.gamepad.index];
        if (gamepad && this.emulator) {
          this.mapXboxGamepadInput(gamepad);
        }
      }
    };

    window.addEventListener('gamepadconnected', this.gamepadHandler);
    window.addEventListener('gamepaddisconnected', this.gamepadHandler);

    // Keyboard input
    if (this.container instanceof HTMLElement) {
      this.container.tabIndex = 0;
      this.container.style.outline = 'none';
    }
  }

  private mapXboxGamepadInput(gamepad: Gamepad): void {
    // Map gamepad buttons to Xbox controller
    // Xbox controllers are natively supported by Web Gamepad API
    if (!this.emulator) return;

    // Send input to emulator or streaming backend
    if (this.streamingMode) {
      // Send to streaming backend via WebSocket/WebRTC
      // this.sendInputToStream(gamepad);
    } else {
      // Send to local emulator
      // this.emulator.handleInput(gamepad);
    }
  }

  private removeInputHandlers(): void {
    if (this.gamepadHandler) {
      window.removeEventListener('gamepadconnected', this.gamepadHandler);
      window.removeEventListener('gamepaddisconnected', this.gamepadHandler);
    }
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    if (!this.container) {
      throw new Error('VM not mounted to container');
    }

    if (!this.emulator && !this.streamingMode) {
      await this.initializeEmulator(this.container);
    }

    // Get game ISO URL from Puter.js storage
    let gameUrl: string;
    try {
      const gamePath = `${this.state.storagePath}/game.iso`;
      try {
        await puterClient.getFileInfo(gamePath);
        gameUrl = await puterClient.getReadURL(gamePath);
      } catch (error) {
        throw new Error('Game ISO not found. Please upload an Xbox game file.');
      }
    } catch (error) {
      console.error('Failed to load game ISO:', error);
      throw error;
    }

    // Set up input handlers
    this.setupInputHandlers();

    if (this.streamingMode) {
      // Start streaming session
      // await this.startStreaming(gameUrl);
    } else {
      // Load and run the game locally
      // await this.emulator.loadGame(gameUrl);
    }

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
    await this.saveXboxState();

    if (this.streamingMode) {
      // Stop streaming session
      // await this.stopStreaming();
    } else {
      // Stop emulator
      if (this.emulator && typeof this.emulator.stop === 'function') {
        this.emulator.stop();
      }
    }

    this.removeInputHandlers();

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
    await this.saveXboxState();

    if (this.streamingMode) {
      // Pause streaming
      // await this.pauseStreaming();
    } else {
      if (this.emulator && typeof this.emulator.pause === 'function') {
        this.emulator.pause();
      }
    }

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
      const statePath = `${this.state.storagePath}/xbox_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArrayBuffer = await stateBlob.arrayBuffer();
      // Restore state based on emulator/streaming API
    } catch (error) {
      console.warn('Failed to restore state, continuing anyway:', error);
    }

    if (this.streamingMode) {
      // Resume streaming
      // await this.resumeStreaming();
    } else {
      if (this.emulator && typeof this.emulator.resume === 'function') {
        this.emulator.resume();
      }
    }

    this.state.isPaused = false;
    await this.saveState();
    this.emit('resumed');
  }

  async reset(): Promise<void> {
    await this.stop();
    // Reset by removing saved state and restarting
    try {
      const statePath = `${this.state.storagePath}/xbox_state.bin`;
      await puterClient.deleteFile(statePath);
    } catch (error) {
      // State file might not exist
    }
    await this.start();
    this.emit('reset');
  }

  private async saveXboxState(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    try {
      // Save state based on emulator/streaming API
      // const state = await this.getState();
      // const statePath = `${this.state.storagePath}/xbox_state.bin`;
      // await puterClient.writeFile(statePath, new Blob([state]), {
      //   createMissingParents: true,
      // });
    } catch (error) {
      console.error('Failed to save Xbox state:', error);
    }
  }

  // Override saveState to also save Xbox state
  async saveState(): Promise<void> {
    await super.saveState();
    if (this.state.isRunning) {
      await this.saveXboxState();
    }
  }
}

