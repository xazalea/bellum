/**
 * Linux VM Implementation using v86
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { puterClient } from '../../puter/client';
import { V86Loader, V86Config } from '../../emulators/v86-loader';
import { OptimizedV86 } from '../../emulators/optimized-v86';

export class LinuxVM extends BaseVM {
  private emulator: any = null;
  private keyboardListener: ((e: KeyboardEvent) => void) | null = null;
  private mouseListener: ((e: MouseEvent) => void) | null = null;

  constructor(config: VMConfig) {
    super({ ...config, type: VMType.LINUX });
  }

  async initializeEmulator(container: HTMLElement): Promise<void> {
    await this.ensureStoragePath();

    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Load v86 library
    await V86Loader.load();

    // Get disk image URL from Puter.js storage
    let diskImageUrl: string | undefined;
    let hdaConfig: { url: string; async: boolean } | undefined;

    try {
      // Check if we have a disk image stored
      const diskImagePath = `${this.state.storagePath}/disk.img`;
      try {
        await puterClient.getFileInfo(diskImagePath);
        diskImageUrl = await puterClient.getReadURL(diskImagePath);
        hdaConfig = { url: diskImageUrl, async: true };
      } catch (error) {
        console.log('No disk image found, will use CD-ROM mode');
      }
    } catch (error) {
      console.warn('Failed to load disk image:', error);
    }

    // Get CD-ROM image if available (for installation)
    let cdromConfig: { url: string } | undefined;
    try {
      const cdromPath = `${this.state.storagePath}/linux.iso`;
      try {
        await puterClient.getFileInfo(cdromPath);
        const cdromUrl = await puterClient.getReadURL(cdromPath);
        cdromConfig = { url: cdromUrl };
      } catch (error) {
        // No CD-ROM image
      }
    } catch (error) {
      console.warn('Failed to load CD-ROM image:', error);
    }

    // BIOS files - using CDN for now, can be moved to public directory
    const biosUrl = '/v86/bios/seabios.bin';
    const vgaBiosUrl = '/v86/bios/vgabios.bin';

    // Configure v86
    const v86Config: V86Config = {
      wasm_path: '/v86/v86.wasm',
      memory_size: (this.config.memory || 512) * 1024 * 1024,
      vga_memory_size: 8 * 1024 * 1024,
      screen_container: container,
      bios: { url: biosUrl },
      vga_bios: { url: vgaBiosUrl },
      autostart: false,
      boot_order: hdaConfig ? 0x80 : 0x1, // Boot from HDA if available, else CD-ROM
    };

    if (hdaConfig) {
      v86Config.hda = hdaConfig;
    } else if (cdromConfig) {
      v86Config.cdrom = cdromConfig;
    }

    // Try to load saved state
    try {
      const statePath = `${this.state.storagePath}/vm_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArrayBuffer = await stateBlob.arrayBuffer();
      v86Config.initial_state = stateArrayBuffer;
    } catch (error) {
      // No saved state, that's okay
      console.log('No saved state found, starting fresh');
    }

    // Create optimized v86 emulator instance
    try {
      const optimized = await OptimizedV86.create(v86Config);
      optimized.setConfig(v86Config);
      this.emulator = optimized.getEmulator();
    } catch (error) {
      // Fallback to standard v86 if optimization fails
      console.warn('Failed to create optimized v86, using standard:', error);
      this.emulator = V86Loader.create(v86Config);
    }

    // Set up event handlers
    this.emulator.add_listener('emulator-ready', () => {
      this.emit('ready');
    });

    this.emulator.add_listener('emulator-stopped', () => {
      this.state.isRunning = false;
      this.emit('stopped');
    });

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 600;

    this.emit('initialized');
  }

  private setupInputHandlers(): void {
    if (!this.container || !this.emulator) return;

    // Keyboard input
    this.keyboardListener = (e: KeyboardEvent) => {
      if (this.state.isRunning && !this.state.isPaused) {
        // Forward keyboard events to v86
        // v86 handles keyboard via screen_container focus
        // We just need to ensure the container can receive input
      }
    };

    // Mouse input
    this.mouseListener = (e: MouseEvent) => {
      if (this.state.isRunning && !this.state.isPaused) {
        // Mouse is handled automatically by v86
      }
    };

    this.container.addEventListener('keydown', this.keyboardListener);
    this.container.addEventListener('keyup', this.keyboardListener);
    this.container.addEventListener('mousedown', this.mouseListener);
    this.container.addEventListener('mouseup', this.mouseListener);
    this.container.addEventListener('mousemove', this.mouseListener);

    // Make container focusable for keyboard input
    if (this.container instanceof HTMLElement) {
      this.container.tabIndex = 0;
      this.container.style.outline = 'none';
    }
  }

  private removeInputHandlers(): void {
    if (!this.container) return;

    if (this.keyboardListener) {
      this.container.removeEventListener('keydown', this.keyboardListener);
      this.container.removeEventListener('keyup', this.keyboardListener);
    }

    if (this.mouseListener) {
      this.container.removeEventListener('mousedown', this.mouseListener);
      this.container.removeEventListener('mouseup', this.mouseListener);
      this.container.removeEventListener('mousemove', this.mouseListener);
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

    // Start the emulator
    if (this.emulator && typeof this.emulator.boot === 'function') {
      // If we have a saved state, it will auto-start
      // Otherwise, we need to boot
      if (!this.emulator.is_running()) {
        // v86 doesn't have a direct boot method, it auto-starts
        // We just need to ensure it's running
      }
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
    await this.saveVMState();

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

    // v86 doesn't have native pause, but we can save state
    await this.saveVMState();

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
      const statePath = `${this.state.storagePath}/vm_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArrayBuffer = await stateBlob.arrayBuffer();
      await V86Loader.restoreState(this.emulator, stateArrayBuffer);
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
      const statePath = `${this.state.storagePath}/vm_state.bin`;
      await puterClient.deleteFile(statePath);
    } catch (error) {
      // State file might not exist
    }
    await this.start();
    this.emit('reset');
  }

  private async saveVMState(): Promise<void> {
    if (!this.emulator || !this.state.isRunning) {
      return;
    }

    try {
      const state = await V86Loader.saveState(this.emulator);
      const statePath = `${this.state.storagePath}/vm_state.bin`;
      await puterClient.writeFile(statePath, new Blob([state as any]), {
        createMissingParents: true,
      });
    } catch (error) {
      console.error('Failed to save VM state:', error);
    }
  }

  // Override saveState to also save VM state
  async saveState(): Promise<void> {
    await super.saveState();
    if (this.state.isRunning && this.emulator) {
      await this.saveVMState();
    }
  }
}

