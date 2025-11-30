/**
 * Emulator WebWorker - Runs emulator logic in a separate thread
 * This prevents blocking the main UI thread
 */

export interface EmulatorWorkerMessage {
  type: 'init' | 'start' | 'stop' | 'pause' | 'resume' | 'frame' | 'input' | 'state';
  data?: any;
}

export interface EmulatorWorkerResponse {
  type: 'ready' | 'frame' | 'state' | 'error' | 'metrics';
  data?: any;
}

/**
 * Emulator Worker - Handles emulator execution in a WebWorker
 * This is a template that can be extended for specific emulators
 */
class EmulatorWorker {
  private isRunning = false;
  private isPaused = false;
  private frameId: number | null = null;
  private lastFrameTime = 0;
  private targetFPS = 60;
  private frameTime = 1000 / this.targetFPS;

  constructor() {
    self.addEventListener('message', this.handleMessage.bind(this));
    this.postMessage({ type: 'ready' });
  }

  private handleMessage(event: MessageEvent<EmulatorWorkerMessage>): void {
    const { type, data } = event.data;

    switch (type) {
      case 'init':
        this.init(data);
        break;
      case 'start':
        this.start();
        break;
      case 'stop':
        this.stop();
        break;
      case 'pause':
        this.pause();
        break;
      case 'resume':
        this.resume();
        break;
      case 'input':
        this.handleInput(data);
        break;
      case 'state':
        this.saveState();
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  private init(config: any): void {
    // Initialize emulator with config
    // This will be overridden by specific emulator implementations
    console.log('Emulator worker initialized:', config);
    this.postMessage({ type: 'ready' });
  }

  private start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.runFrame();
  }

  private stop(): void {
    this.isRunning = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private pause(): void {
    this.isPaused = true;
  }

  private resume(): void {
    this.isPaused = false;
    if (this.isRunning) {
      this.lastFrameTime = performance.now();
      this.runFrame();
    }
  }

  private runFrame(): void {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;

    if (delta >= this.frameTime) {
      // Execute emulator cycle
      this.executeFrame(delta);

      this.lastFrameTime = now;
    }

    this.frameId = requestAnimationFrame(() => this.runFrame());
  }

  private executeFrame(delta: number): void {
    // This will be implemented by specific emulator workers
    // For now, just send a frame event
    this.postMessage({
      type: 'frame',
      data: {
        delta,
        timestamp: performance.now(),
      },
    });
  }

  private handleInput(input: any): void {
    // Handle input events (keyboard, mouse, gamepad)
    // This will be implemented by specific emulator workers
  }

  private saveState(): void {
    // Save emulator state
    // This will be implemented by specific emulator workers
    this.postMessage({
      type: 'state',
      data: {},
    });
  }

  private postMessage(message: EmulatorWorkerResponse): void {
    self.postMessage(message);
  }
}

// Initialize worker
new EmulatorWorker();

