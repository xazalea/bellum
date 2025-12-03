/**
 * App Runner - High-level interface for running apps
 * Wraps the RuntimeManager
 */

import { AppInstance } from '../app-manager/types';
import { RuntimeManager } from './runtime-manager';
import { BinaryAnalyzer, FileType } from './analyzers/binary-analyzer';
import { puterClient } from '../storage/hiberfile';

export class AppRunner {
  private runtime: RuntimeManager;
  public loader: any = null; // Expose internal loader for UI stats

  constructor() {
    this.runtime = RuntimeManager.getInstance();
  }

  async run(app: AppInstance, container: HTMLElement) {
    // 1. Determine File Type
    const file = await puterClient.readFile(app.filePath);
    const buffer = await file.arrayBuffer();
    const type = await BinaryAnalyzer.detectType(buffer, app.filePath);

    // 2. Launch
    await this.runtime.launch(container, type, app.filePath, {
        memory: 256,
        vfsMounts: [],
        env: {}
    });

    // Expose loader for stats
    // @ts-ignore
    this.loader = this.runtime.activeLoader;
  }

  stop() {
    this.runtime.stop();
  }
}

