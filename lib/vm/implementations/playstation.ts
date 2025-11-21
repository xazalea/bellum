/**
 * PlayStation VM Implementation using RetroArch Web or PPSSPP Web
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { puterClient } from '../../puter/client';

export class PlayStationVM extends BaseVM {
  private emulator: any = null;
  private gamepadHandler: ((e: GamepadEvent) => void) | null = null;

  constructor(config: VMConfig) {
    super({ ...config, type: VMType.PLAYSTATION });
  }

  async initializeEmulator(container: HTMLElement): Promise<void> {
    await this.ensureStoragePath();

    if (!this.container) {
      throw new Error('Container not initialized');
    }

    // For now, we'll use a placeholder that can be extended
    // RetroArch Web or PPSSPP Web can be integrated here
    // RetroArch: https://www.retroarch.com/
    // PPSSPP Web: https://www.ppsspp.org/

    // Set canvas size (typical PS1/PSP resolution)
    if (this.canvas) {
      this.canvas.width = 640;
      this.canvas.height = 480;
    }

    // Placeholder implementation
    // In production, you would:
    // 1. Load RetroArch Web or PPSSPP Web
    // 2. Initialize the emulator with the container
    // 3. Load ROM/ISO from Puter.js storage
    // 4. Set up gamepad support

    this.emit('initialized');
  }

  private setupInputHandlers(): void {
    if (!this.container) return;

    // Gamepad support
    this.gamepadHandler = (e: GamepadEvent) => {
      if (this.state.isRunning && !this.state.isPaused) {
        const gamepad = navigator.getGamepads()[e.gamepad.index];
        if (gamepad && this.emulator) {
          // Map gamepad buttons to PlayStation buttons
          // This is a placeholder - actual implementation depends on emulator
          this.mapGamepadInput(gamepad);
        }
      }
    };

    window.addEventListener('gamepadconnected', this.gamepadHandler);
    window.addEventListener('gamepaddisconnected', this.gamepadHandler);

    // Keyboard input for basic controls
    if (this.container instanceof HTMLElement) {
      this.container.tabIndex = 0;
      this.container.style.outline = 'none';
    }
  }

  private mapGamepadInput(gamepad: Gamepad): void {
    // Map gamepad buttons to PlayStation controller
    // This is a placeholder - actual mapping depends on emulator API
    if (!this.emulator) return;

    // Example mapping (would need to be adjusted based on emulator):
    // gamepad.buttons[0] -> PlayStation X
    // gamepad.buttons[1] -> PlayStation Circle
    // gamepad.buttons[2] -> PlayStation Square
    // gamepad.buttons[3] -> PlayStation Triangle
    // etc.
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

    if (!this.emulator) {
      await this.initializeEmulator(this.container);
    }

    // Get ROM/ISO URL from Puter.js storage
    let romUrl: string;
    try {
      // Try to find a ROM/ISO file
      const romPath = `${this.state.storagePath}/game.iso`;
      try {
        await puterClient.getFileInfo(romPath);
        romUrl = await puterClient.getReadURL(romPath);
      } catch (error) {
        throw new Error('Game ROM/ISO not found. Please upload a PlayStation game file.');
      }
    } catch (error) {
      console.error('Failed to load game ROM/ISO:', error);
      throw error;
    }

    // Set up input handlers
    this.setupInputHandlers();

    // Load and run the game
    // This is a placeholder - actual implementation depends on emulator
    // Example for RetroArch:
    // await this.emulator.loadGame(romUrl);

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
    await this.savePlayStationState();

    // Stop emulator
    if (this.emulator && typeof this.emulator.stop === 'function') {
      this.emulator.stop();
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
    await this.savePlayStationState();

    if (this.emulator && typeof this.emulator.pause === 'function') {
      this.emulator.pause();
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
      const statePath = `${this.state.storagePath}/ps_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArrayBuffer = await stateBlob.arrayBuffer();
      // Restore state based on emulator API
      // await this.emulator.restoreState(stateArrayBuffer);
    } catch (error) {
      console.warn('Failed to restore state, continuing anyway:', error);
    }

    if (this.emulator && typeof this.emulator.resume === 'function') {
      this.emulator.resume();
    }

    this.state.isPaused = false;
    await this.saveState();
    this.emit('resumed');
  }

  async reset(): Promise<void> {
    await this.stop();
    // Reset by removing saved state and restarting
    try {
      const statePath = `${this.state.storagePath}/ps_state.bin`;
      await puterClient.deleteFile(statePath);
    } catch (error) {
      // State file might not exist
    }
    await this.start();
    this.emit('reset');
  }

  private async savePlayStationState(): Promise<void> {
    if (!this.emulator || !this.state.isRunning) {
      return;
    }

    try {
      // Save state based on emulator API
      // const state = await this.emulator.saveState();
      // const statePath = `${this.state.storagePath}/ps_state.bin`;
      // await puterClient.writeFile(statePath, new Blob([state]), {
      //   createMissingParents: true,
      // });
    } catch (error) {
      console.error('Failed to save PlayStation state:', error);
    }
  }

  // Override saveState to also save PlayStation state
  async saveState(): Promise<void> {
    await super.saveState();
    if (this.state.isRunning && this.emulator) {
      await this.savePlayStationState();
    }
  }
}

