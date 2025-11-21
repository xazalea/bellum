/**
 * js-dos Emulator Loader
 * Handles dynamic loading and initialization of js-dos emulator
 */

import { DosBox } from '@js-dos/browser';

export interface JSDOSConfig {
  wdosboxUrl?: string;
  onprogress?: (stage: string, total: number, loaded: number) => void;
}

export class JSDOSLoader {
  private static dosbox: typeof DosBox | null = null;
  private static loadingPromise: Promise<void> | null = null;

  static async load(): Promise<void> {
    if (this.dosbox) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        // js-dos is imported as a module
        const dosboxModule = await import('@js-dos/browser');
        this.dosbox = dosboxModule.DosBox;
      } catch (error) {
        console.error('Failed to load js-dos:', error);
        throw new Error('Failed to load js-dos emulator');
      }
    })();

    return this.loadingPromise;
  }

  static async create(
    container: HTMLElement,
    config?: JSDOSConfig
  ): Promise<any> {
    await this.load();

    if (!this.dosbox) {
      throw new Error('js-dos not loaded. Call JSDOSLoader.load() first.');
    }

    return this.dosbox(container, config);
  }

  static async run(emulator: any, bundleUrl: string): Promise<void> {
    if (!emulator || typeof emulator.run !== 'function') {
      throw new Error('Invalid emulator instance');
    }

    return emulator.run(bundleUrl);
  }

  static async saveState(emulator: any): Promise<Uint8Array> {
    if (!emulator || typeof emulator.save !== 'function') {
      throw new Error('Invalid emulator instance or save not supported');
    }

    return emulator.save();
  }

  static async restoreState(emulator: any, state: Uint8Array): Promise<void> {
    if (!emulator || typeof emulator.restore !== 'function') {
      throw new Error('Invalid emulator instance or restore not supported');
    }

    return emulator.restore(state);
  }

  static stop(emulator: any): void {
    if (emulator && typeof emulator.stop === 'function') {
      emulator.stop();
    }
  }
}

