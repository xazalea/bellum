import { FileType } from '../analyzers/binary-analyzer';
import { V86Turbo } from '@/lib/emulators/v86-turbo';
import { UltraRenderer } from '@/lib/rendering/ultra-renderer';
import { BaremetalRunner } from './baremetal-runner';
import { preflightAssetsCached, resolveMicroVmAssets } from '@/lib/emulators/microvm-assets';

export class V86TurboLoader {
  public onStatusUpdate: ((status: string, detail?: string) => void) | null = null;
  private vm: V86Turbo | null = null;
  private renderer: UltraRenderer | null = null;
  private screenHost: HTMLDivElement | null = null;
  private baremetal: BaremetalRunner | null = null;
  private microSurface: HTMLDivElement | null = null;
  private baremetalSurface: HTMLDivElement | null = null;
  private activated: 'microvm' | 'baremetal' | null = null;

  private update(status: string, detail?: string) {
    try {
      this.onStatusUpdate?.(status, detail);
    } catch {}
  }

  async load(container: HTMLElement, filePath: string, type: FileType) {
    this.update('MicroVM Boot', 'Launching parallel runtimes...');
    container.innerHTML = '';

    const microSurface = document.createElement('div');
    microSurface.style.cssText = 'position: relative; width: 100%; height: 100%;';
    const baremetalSurface = document.createElement('div');
    baremetalSurface.style.cssText = 'position: relative; width: 100%; height: 100%; display: none;';
    container.appendChild(microSurface);
    container.appendChild(baremetalSurface);
    this.microSurface = microSurface;
    this.baremetalSurface = baremetalSurface;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.style.width = '100%';
    outputCanvas.style.height = '100%';
    outputCanvas.style.display = 'block';

    const screenHost = document.createElement('div');
    screenHost.style.cssText = 'position:absolute; width:1px; height:1px; overflow:hidden; opacity:0; pointer-events:none;';
    microSurface.appendChild(outputCanvas);
    microSurface.appendChild(screenHost);
    this.screenHost = screenHost;

    const appType = type === FileType.APK ? 'android' : 'windows';
    const activate = (mode: 'microvm' | 'baremetal') => {
      if (this.activated) return;
      this.activated = mode;
      if (mode === 'microvm') {
        if (this.baremetal) {
          this.baremetal.stop();
        }
        if (this.baremetalSurface) this.baremetalSurface.style.display = 'none';
        if (this.microSurface) this.microSurface.style.display = 'block';
      } else {
        if (this.renderer) {
          this.renderer.stop();
          this.renderer = null;
        }
        if (this.vm) {
          void this.vm.saveBootSnapshot();
          this.vm.stop();
          this.vm = null;
        }
        if (this.microSurface) this.microSurface.style.display = 'none';
        if (this.baremetalSurface) this.baremetalSurface.style.display = 'block';
      }
    };

    const microVmTask = (async () => {
      const assets = resolveMicroVmAssets();
      const assetsReady = await preflightAssetsCached(assets);
      if (!assetsReady) {
        this.update('MicroVM Skipped', 'Kernel/initrd missing - using baremetal');
        throw new Error('microvm_assets_missing');
      }
      this.vm = new V86Turbo({
        appType,
        appPath: filePath,
        screenContainer: screenHost,
        bootSnapshotKey: `microvm-${appType}`,
        kernelUrl: assets.kernelUrl,
        initrdUrl: assets.initrdUrl,
      });

      await this.vm.boot();
      this.update('MicroVM Ready', 'Kernel + initrd online');
      await this.vm.runApp();

      const vmCanvas = this.vm.getScreenCanvas();
      if (!vmCanvas) {
        throw new Error('vm_screen_missing');
      }

      this.renderer = new UltraRenderer(vmCanvas, outputCanvas, { targetFps: 144 });
      this.renderer.start();
      this.update('MicroVM Running', 'Ultra-renderer online');
      activate('microvm');
      return 'microvm' as const;
    })();

    const baremetalTask = (async () => {
      this.baremetal = new BaremetalRunner();
      this.baremetal.onStatusUpdate = (status: string, detail?: string) => this.update(status, detail);
      await this.baremetal.load(baremetalSurface, filePath, type);
      activate('baremetal');
      return 'baremetal' as const;
    })();

    try {
      await Promise.race([microVmTask, baremetalTask, this.runtimeTimeout(20000)]);
      this.update('Running', 'Fastest runtime selected');
    } catch (error) {
      const fallback = await Promise.allSettled([microVmTask, baremetalTask]);
      const success = fallback.find((result) => result.status === 'fulfilled');
      if (!success) {
        this.update('Startup Error', 'All runtimes failed');
        throw error;
      }
    }
  }

  async stop() {
    if (this.renderer) {
      this.renderer.stop();
      this.renderer = null;
    }
    if (this.vm) {
      await this.vm.saveBootSnapshot();
      this.vm.stop();
      this.vm = null;
    }
    if (this.screenHost) {
      this.screenHost.remove();
      this.screenHost = null;
    }
    if (this.baremetal) {
      this.baremetal.stop();
      this.baremetal = null;
    }
    if (this.microSurface) {
      this.microSurface.remove();
      this.microSurface = null;
    }
    if (this.baremetalSurface) {
      this.baremetalSurface.remove();
      this.baremetalSurface = null;
    }
    this.activated = null;
  }

  private runtimeTimeout(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('runtime_timeout')), timeoutMs);
    });
  }
}
