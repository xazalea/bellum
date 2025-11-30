/**
 * Code Execution VM - WebVM for running code in multiple languages
 */

import { VMConfig, VMType } from '../types';
import { BaseVM } from '../base';
import { webVM, CodeExecutionResult } from '../../code-execution/webvm';

export class CodeExecutionVM extends BaseVM {
  private codePlaygroundContainer: HTMLElement | null = null;

  constructor(config: VMConfig) {
    super({ ...config, type: VMType.CODE, executionMode: 'code' });
  }

  async initializeEmulator(container: HTMLElement): Promise<void> {
    await this.ensureStoragePath();
    this.container = container;

    // Initialize WebVM if not already done
    if (webVM) {
      await webVM.initialize(container);
    }

    this.emit('initialized');
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    if (!this.container) {
      throw new Error('VM not mounted to container');
    }

    if (!webVM) {
      throw new Error('WebVM not available');
    }

    await webVM.start();

    this.state.isRunning = true;
    this.state.isPaused = false;
    await this.saveState();
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    if (webVM) {
      await webVM.stop();
    }

    this.state.isRunning = false;
    this.state.isPaused = false;
    await this.saveState();
    this.emit('stopped');
  }

  async pause(): Promise<void> {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    await this.saveState();
    this.emit('paused');
  }

  async resume(): Promise<void> {
    if (!this.state.isRunning || !this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    await this.saveState();
    this.emit('resumed');
  }

  async reset(): Promise<void> {
    await this.stop();
    await this.start();
    this.emit('reset');
  }

  /**
   * Execute code in a specific language
   */
  async executeCode(
    language: string,
    code: string,
    input?: string
  ): Promise<CodeExecutionResult> {
    if (!webVM) {
      throw new Error('WebVM not available');
    }

    return await webVM.executeCode(language, code, input);
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): string[] {
    if (!webVM) {
      return [];
    }
    return webVM.getAvailableLanguages();
  }

  getCanvas(): HTMLCanvasElement | null {
    // Code execution doesn't use a canvas
    return null;
  }
}

