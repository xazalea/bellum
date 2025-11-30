/**
 * Windows VM Implementation using js-dos
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { puterClient } from '../../puter/client';
import { V86Loader, V86Config } from '../../emulators/v86-loader';
import { OptimizedV86 } from '../../emulators/optimized-v86';
import { RomLoader } from '../../puter/rom-loader';

export class WindowsVM extends BaseVM {
  private emulator: any = null;
  private keyboardListener: ((e: KeyboardEvent) => void) | null = null;
  private mouseListener: ((e: MouseEvent) => void) | null = null;

  constructor(config: VMConfig) {
    super({ ...config, type: VMType.WINDOWS });
  }

  async initializeEmulator(container: HTMLElement): Promise<void> {
    await this.ensureStoragePath();

    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Load v86 library
    await V86Loader.load();

    // Get disk image URL - try GitHub release first, then local storage
    let hdaConfig: { url: string; async: boolean } | undefined;

    try {
      // Try loading from GitHub releases via ISOLoader
      const { ISOLoader } = await import('../../assets/iso-loader');
      try {
        const windowsImageUrl = await ISOLoader.getISOUrl('windows98');
        hdaConfig = { url: windowsImageUrl, async: true };
      } catch (githubError) {
        console.log('GitHub ISO not available, trying local storage');
        
        // Fallback to Puter.js storage
        const requirements = RomLoader.getWindowsRequirements();
        const diskImageReq = requirements.find(r => r.id === 'windows_img');

        if (!diskImageReq) {
          throw new Error('Windows disk image requirement not defined');
        }

        const diskImagePath = diskImageReq.path;

        try {
          // Check if file exists
          const exists = await puterClient.fileExists(diskImagePath);
          if (!exists) {
            throw new Error(`Windows disk image not found at ${diskImagePath}`);
          }

          const diskImageUrl = await puterClient.getReadURL(diskImagePath);
          hdaConfig = { url: diskImageUrl, async: true };
        } catch (error) {
          console.log('No Windows disk image found');
          throw new Error(`Windows disk image (windows98.img) not found at ${diskImagePath}. Please upload it to the shared VM storage.`);
        }
      }
    } catch (error) {
      console.warn('Failed to load disk image:', error);
      throw error;
    }

    // BIOS files
    const biosUrl = '/v86/bios/seabios.bin';
    const vgaBiosUrl = '/v86/bios/vgabios.bin';

    // Configure v86 for Windows 98
    const v86Config: V86Config = {
      wasm_path: '/v86/v86.wasm',
      memory_size: (this.config.memory || 128) * 1024 * 1024, // 128MB default for Win98
      vga_memory_size: 8 * 1024 * 1024,
      screen_container: container,
      bios: { url: biosUrl },
      vga_bios: { url: vgaBiosUrl },
      hda: hdaConfig,
      autostart: false,
      boot_order: 0x80, // Boot from HDA
    };

    // Try to load saved state
    try {
      const statePath = `${this.state.storagePath}/vm_state.bin`;
      const stateBlob = await puterClient.readFile(statePath);
      const stateArrayBuffer = await stateBlob.arrayBuffer();
      v86Config.initial_state = stateArrayBuffer;
    } catch (error) {
      // No saved state, that's okay
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
        // v86 handles keyboard via screen_container focus
      }
    };

    // Mouse input
    this.mouseListener = (e: MouseEvent) => {
      if (this.state.isRunning && !this.state.isPaused) {
        // v86 handles mouse
      }
    };

    this.container.addEventListener('keydown', this.keyboardListener);
    this.container.addEventListener('keyup', this.keyboardListener);
    this.container.addEventListener('mousedown', this.mouseListener);
    this.container.addEventListener('mouseup', this.mouseListener);
    this.container.addEventListener('mousemove', this.mouseListener);

    // Make container focusable
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

    this.setupInputHandlers();

    this.state.isRunning = true;
    this.state.isPaused = false;
    await this.saveState();
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    await this.saveVMState();

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

    await this.saveVMState();

    this.state.isPaused = true;
    await this.saveState();
    this.emit('paused');
  }

  async resume(): Promise<void> {
    if (!this.state.isRunning || !this.state.isPaused) {
      return;
    }

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

  async saveState(): Promise<void> {
    await super.saveState();
    if (this.state.isRunning && this.emulator) {
      await this.saveVMState();
    }
  }
}

