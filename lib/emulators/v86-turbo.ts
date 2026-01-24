import { V86Loader, V86Config } from './v86-loader';
import { loadBootSnapshot, saveBootSnapshot } from './boot-snapshots';
import { V86TurboJIT } from './jit-compiler';
import { GPUInstructionAccelerator } from './gpu-accelerator';
import { PredictiveExecutor } from './predictive-executor';
import { getAndroidMicroImageUrl } from '@/lib/os/android-micro';
import { getWindowsMicroImageUrl } from '@/lib/os/windows-micro';
import { getLinuxMicroKernelUrl, getLinuxMicroInitrdUrl } from '@/lib/os/linux-micro';

export type MicroVMAppType = 'windows' | 'android';

export interface V86TurboOptions {
  appType: MicroVMAppType;
  appPath: string;
  screenContainer: HTMLElement;
  memoryMB?: number;
  vgaMemoryMB?: number;
  osImageUrl?: string;
  kernelUrl?: string;
  initrdUrl?: string;
  bootSnapshotKey?: string;
  autostart?: boolean;
  skipKernelBoot?: boolean;
}

export class V86Turbo {
  private instance: any = null;
  private jit = new V86TurboJIT();
  private gpu = new GPUInstructionAccelerator();
  private predictor = new PredictiveExecutor();
  private options: V86TurboOptions;
  private readyPromise: Promise<void> | null = null;

  constructor(options: V86TurboOptions) {
    this.options = options;
  }

  async boot(): Promise<void> {
    await V86Loader.load();

    const osImageUrl = this.options.osImageUrl || this.getDefaultOsImage();
    const bootSnapshot = this.options.bootSnapshotKey
      ? await loadBootSnapshot({ key: this.options.bootSnapshotKey, version: 1 })
      : null;

    const useKernelBoot = Boolean(
      !this.options.skipKernelBoot && (this.options.kernelUrl || this.options.initrdUrl)
    );
    const config: V86Config = {
      wasm_path: '/v86/v86.wasm',
      memory_size: (this.options.memoryMB ?? 2048) * 1024 * 1024,
      vga_memory_size: (this.options.vgaMemoryMB ?? 128) * 1024 * 1024,
      screen_container: this.options.screenContainer,
      bios: { url: '/v86/bios/seabios.bin' },
      vga_bios: { url: '/v86/bios/vgabios.bin' },
      hda: useKernelBoot ? undefined : { url: osImageUrl, async: true },
      bzimage: useKernelBoot ? { url: this.options.kernelUrl || getLinuxMicroKernelUrl() } : undefined,
      initrd: useKernelBoot ? { url: this.options.initrdUrl || getLinuxMicroInitrdUrl() } : undefined,
      autostart: this.options.autostart ?? true,
      boot_order: useKernelBoot ? 0x1 : 0x123,
      initial_state: bootSnapshot || undefined,
    };

    this.instance = V86Loader.create(config);
    this.readyPromise = this.waitForReady(15000);
    await this.readyPromise;
    this.warmAccelerators();
  }

  getInstance(): any {
    return this.instance;
  }

  getScreenCanvas(): HTMLCanvasElement | null {
    const container = this.options.screenContainer;
    const canvas = container.querySelector('canvas');
    return canvas instanceof HTMLCanvasElement ? canvas : null;
  }

  async runApp(): Promise<void> {
    if (!this.instance) return;
    if (this.readyPromise) {
      await this.readyPromise;
    }
    const command = this.options.appType === 'android' ? this.getAndroidCommand() : this.getWindowsCommand();
    if (typeof this.instance.serial0_send === 'function') {
      this.instance.serial0_send(command);
    }
  }

  async saveBootSnapshot(): Promise<void> {
    if (!this.instance || !this.options.bootSnapshotKey) return;
    try {
      const state = await V86Loader.saveState(this.instance);
      await saveBootSnapshot({ key: this.options.bootSnapshotKey, version: 1 }, state);
    } catch (error) {
      console.warn('[V86Turbo] Failed to save snapshot', error);
    }
  }

  stop(): void {
    if (this.instance?.stop) {
      this.instance.stop();
    }
    this.instance = null;
  }

  private getDefaultOsImage(): string {
    return this.options.appType === 'android'
      ? getAndroidMicroImageUrl()
      : getWindowsMicroImageUrl();
  }

  private getWindowsCommand(): string {
    const safePath = this.options.appPath.replace(/\\/g, '/');
    return `C:\\\\bellum\\\\run.exe ${safePath}\n`;
  }

  private getAndroidCommand(): string {
    const safePath = this.options.appPath.replace(/\\/g, '/');
    return `am start -a android.intent.action.VIEW -d file://${safePath}\n`;
  }

  private warmAccelerators(): void {
    this.jit.warm();
    this.gpu.initialize();
    this.predictor.prime();
  }

  private waitForReady(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.instance?.add_listener) {
        resolve();
        return;
      }
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('microvm_ready_timeout'));
        }
      }, timeoutMs);
      this.instance.add_listener('emulator-ready', () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
