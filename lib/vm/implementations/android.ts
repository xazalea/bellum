/**
 * Android VM Implementation using Android-x86 via v86
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { puterClient } from '../../puter/client';
import { V86Loader, V86Config } from '../../emulators/v86-loader';

export class AndroidVM extends BaseVM {
  private emulator: any = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isTouchMode: boolean = true;

  constructor(config: VMConfig) {
    super({ ...config, type: VMType.ANDROID });
  }

  async initializeEmulator(container: HTMLElement): Promise<void> {
    await this.ensureStoragePath();

    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Load v86 library
    await V86Loader.load();

    // Get Android-x86 ISO URL from Puter.js storage
    let androidImageUrl: string | undefined;
    let hdaConfig: { url: string; async: boolean } | undefined;

    try {
      // Check for Android-x86 disk image
      const diskImagePath = `${this.state.storagePath}/android.img`;
      try {
        await puterClient.getFileInfo(diskImagePath);
        androidImageUrl = await puterClient.getReadURL(diskImagePath);
        hdaConfig = { url: androidImageUrl, async: true };
      } catch (error) {
        // Try ISO instead
        const isoPath = `${this.state.storagePath}/android-x86.iso`;
        try {
          await puterClient.getFileInfo(isoPath);
          androidImageUrl = await puterClient.getReadURL(isoPath);
        } catch (isoError) {
          console.log('No Android image found');
        }
      }
    } catch (error) {
      console.warn('Failed to load Android image:', error);
    }

    // BIOS files
    const biosUrl = '/v86/bios/seabios.bin';
    const vgaBiosUrl = '/v86/bios/vgabios.bin';

    // Configure v86 for Android
    const v86Config: V86Config = {
      wasm_path: '/v86/v86.wasm',
      memory_size: (this.config.memory || 1024) * 1024 * 1024, // Android needs more memory
      vga_memory_size: 16 * 1024 * 1024,
      screen_container: container,
      bios: { url: biosUrl },
      vga_bios: { url: vgaBiosUrl },
      autostart: false,
      boot_order: hdaConfig ? 0x80 : 0x1,
    };

    if (hdaConfig) {
      v86Config.hda = hdaConfig;
    } else if (androidImageUrl) {
      v86Config.cdrom = { url: androidImageUrl };
    }

    // Try to load saved state
    try {
      const statePath = `${this.state.storagePath}/android_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArrayBuffer = await stateBlob.arrayBuffer();
      v86Config.initial_state = stateArrayBuffer;
    } catch (error) {
      console.log('No saved state found, starting fresh');
    }

    // Create v86 emulator instance
    this.emulator = V86Loader.create(v86Config);

    // Set up event handlers
    this.emulator.add_listener('emulator-ready', () => {
      this.emit('ready');
    });

    // Set canvas size (typical Android screen - can be adjusted)
    this.canvas.width = 1080;
    this.canvas.height = 1920;

    this.emit('initialized');
  }

  private setupInputHandlers(): void {
    if (!this.container) return;

    // Touch input simulation (mouse to touch)
    this.container.addEventListener('mousedown', (e: MouseEvent) => {
      if (this.isTouchMode && this.state.isRunning) {
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        // Simulate touch start
        this.simulateTouch('touchstart', e.clientX, e.clientY);
      }
    });

    this.container.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.isTouchMode && this.state.isRunning) {
        this.simulateTouch('touchend', e.clientX, e.clientY);
      }
    });

    this.container.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isTouchMode && this.state.isRunning && e.buttons === 1) {
        this.simulateTouch('touchmove', e.clientX, e.clientY);
      }
    });

    // Make container focusable
    if (this.container instanceof HTMLElement) {
      this.container.tabIndex = 0;
      this.container.style.outline = 'none';
    }
  }

  private simulateTouch(type: string, x: number, y: number): void {
    // Convert screen coordinates to Android coordinates
    // This is a simplified version - in production, you'd need proper coordinate mapping
    if (this.emulator && this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      const androidX = Math.floor((x - rect.left) * (this.canvas.width / rect.width));
      const androidY = Math.floor((y - rect.top) * (this.canvas.height / rect.height));
      
      // Send mouse events to v86 (which Android-x86 will interpret as touch)
      // v86 handles this automatically through the screen container
    }
  }

  private removeInputHandlers(): void {
    // Event listeners are automatically cleaned up when container is removed
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
      // v86 auto-starts if we have a saved state
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
    await this.saveAndroidState();

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
    await this.saveAndroidState();

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
      const statePath = `${this.state.storagePath}/android_state.bin`;
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
      const statePath = `${this.state.storagePath}/android_state.bin`;
      await puterClient.deleteFile(statePath);
    } catch (error) {
      // State file might not exist
    }
    await this.start();
    this.emit('reset');
  }

  private async saveAndroidState(): Promise<void> {
    if (!this.emulator || !this.state.isRunning) {
      return;
    }

    try {
      const state = await V86Loader.saveState(this.emulator);
      const statePath = `${this.state.storagePath}/android_state.bin`;
      await puterClient.writeFile(statePath, new Blob([state]), {
        createMissingParents: true,
      });
    } catch (error) {
      console.error('Failed to save Android state:', error);
    }
  }

  // Override saveState to also save Android state
  async saveState(): Promise<void> {
    await super.saveState();
    if (this.state.isRunning && this.emulator) {
      await this.saveAndroidState();
    }
  }

  // Android-specific methods
  async installAPK(apkPath: string): Promise<void> {
    // This would require ADB integration or file system mounting
    // For now, this is a placeholder
    console.log('APK installation not yet implemented');
  }
}

