import { FileType } from '../analyzers/binary-analyzer';
import { NachoLoader } from './nacho-loader';
import { APKLoader } from './apk-loader';
import { X86Loader } from './x86-loader';

export class BaremetalRunner {
  public onStatusUpdate: ((status: string, detail?: string) => void) | null = null;
  private loader: any = null;

  private update(status: string, detail?: string) {
    try {
      this.onStatusUpdate?.(status, detail);
    } catch {}
  }

  async load(container: HTMLElement, filePath: string, type: FileType) {
    this.update('Baremetal Boot', 'Starting lightweight runtime...');
    switch (type) {
      case FileType.PE_EXE:
        this.loader = new NachoLoader();
        this.loader.onStatusUpdate = (status: string, detail?: string) => this.update(status, detail);
        await this.loader.load(container, filePath, type);
        break;
      case FileType.APK:
        this.loader = new APKLoader();
        this.loader.onStatusUpdate = (status: string, detail?: string) => this.update(status, detail);
        await this.loader.load(container, filePath);
        break;
      default:
        this.loader = new X86Loader();
        await this.loader.load(container, filePath, 512);
        break;
    }
    this.update('Baremetal Ready', 'Runtime active');
  }

  stop() {
    if (this.loader?.stop) {
      this.loader.stop();
    }
    this.loader = null;
  }
}
