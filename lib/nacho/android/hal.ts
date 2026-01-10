/**
 * Android Hardware Abstraction Layer (HAL)
 * Emulates hardware interfaces for graphics, audio, camera, sensors, and input
 */

export interface HWComposerLayer {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  buffer: ImageData | null;
  zOrder: number;
  visible: boolean;
  alpha: number;
}

/**
 * Graphics HAL - Hardware Composer
 */
export class HWComposer {
  private layers: Map<number, HWComposerLayer> = new Map();
  private nextLayerId = 1;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    
    console.log('[HWComposer] Initialized');
  }
  
  /**
   * Create layer
   */
  createLayer(width: number, height: number): number {
    const id = this.nextLayerId++;
    const layer: HWComposerLayer = {
      id,
      x: 0,
      y: 0,
      width,
      height,
      buffer: this.ctx.createImageData(width, height),
      zOrder: id,
      visible: true,
      alpha: 1.0,
    };
    
    this.layers.set(id, layer);
    return id;
  }
  
  /**
   * Set layer position
   */
  setLayerPosition(layerId: number, x: number, y: number): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.x = x;
      layer.y = y;
    }
  }
  
  /**
   * Set layer buffer
   */
  setLayerBuffer(layerId: number, buffer: ImageData): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.buffer = buffer;
    }
  }
  
  /**
   * Composite and present layers
   */
  present(): void {
    // Sort layers by z-order
    const sortedLayers = Array.from(this.layers.values())
      .filter(l => l.visible)
      .sort((a, b) => a.zOrder - b.zOrder);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Composite layers
    for (const layer of sortedLayers) {
      if (layer.buffer) {
        this.ctx.globalAlpha = layer.alpha;
        this.ctx.putImageData(layer.buffer, layer.x, layer.y);
      }
    }
    
    this.ctx.globalAlpha = 1.0;
  }
  
  /**
   * Destroy layer
   */
  destroyLayer(layerId: number): void {
    this.layers.delete(layerId);
  }
}

/**
 * Gralloc - Graphics Memory Allocator
 */
export class Gralloc {
  private allocations: Map<number, {
    width: number;
    height: number;
    format: number;
    usage: number;
    buffer: ImageData;
  }> = new Map();
  
  private nextHandle = 1;
  
  /**
   * Allocate graphics buffer
   */
  alloc(width: number, height: number, format: number, usage: number): number {
    const handle = this.nextHandle++;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    
    const buffer = ctx.createImageData(width, height);
    
    this.allocations.set(handle, {
      width,
      height,
      format,
      usage,
      buffer,
    });
    
    return handle;
  }
  
  /**
   * Get buffer
   */
  getBuffer(handle: number): ImageData | null {
    return this.allocations.get(handle)?.buffer || null;
  }
  
  /**
   * Free buffer
   */
  free(handle: number): void {
    this.allocations.delete(handle);
  }
}

/**
 * Audio HAL
 */
export class AudioHAL {
  private audioContext: AudioContext;
  private outputNode: GainNode;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  
  constructor() {
    this.audioContext = new AudioContext();
    this.outputNode = this.audioContext.createGain();
    this.outputNode.connect(this.audioContext.destination);
    
    console.log('[AudioHAL] Initialized');
  }
  
  /**
   * Open audio output stream
   */
  openOutputStream(
    sampleRate: number,
    channels: number,
    format: number
  ): AudioOutputStream {
    return new AudioOutputStream(this.audioContext, this.outputNode, sampleRate, channels);
  }
  
  /**
   * Open audio input stream (microphone)
   */
  async openInputStream(
    sampleRate: number,
    channels: number
  ): Promise<AudioInputStream> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new AudioInputStream(this.audioContext, stream, sampleRate, channels);
  }
  
  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    this.outputNode.gain.value = Math.max(0, Math.min(1, volume));
  }
}

/**
 * Audio Output Stream
 */
export class AudioOutputStream {
  private scriptNode: ScriptProcessorNode;
  
  constructor(
    private audioContext: AudioContext,
    private outputNode: GainNode,
    private sampleRate: number,
    private channels: number
  ) {
    this.scriptNode = audioContext.createScriptProcessor(4096, 0, channels);
    this.scriptNode.connect(outputNode);
  }
  
  /**
   * Write audio samples
   */
  write(samples: Float32Array): void {
    // In real implementation, would buffer and play samples
    // For now, use ScriptProcessorNode or AudioWorklet
  }
  
  /**
   * Close stream
   */
  close(): void {
    this.scriptNode.disconnect();
  }
}

/**
 * Audio Input Stream
 */
export class AudioInputStream {
  private mediaStream: MediaStream;
  private source: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;
  
  constructor(
    private audioContext: AudioContext,
    stream: MediaStream,
    private sampleRate: number,
    private channels: number
  ) {
    this.mediaStream = stream;
    this.source = audioContext.createMediaStreamSource(stream);
    this.processor = audioContext.createScriptProcessor(4096, channels, 0);
    this.source.connect(this.processor);
  }
  
  /**
   * Set callback for audio data
   */
  onAudioData(callback: (data: Float32Array) => void): void {
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      callback(inputData);
    };
  }
  
  /**
   * Close stream
   */
  close(): void {
    this.mediaStream.getTracks().forEach(track => track.stop());
    this.processor.disconnect();
    this.source.disconnect();
  }
}

/**
 * Camera HAL
 */
export class CameraHAL {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    this.ctx = ctx;
    
    console.log('[CameraHAL] Initialized');
  }
  
  /**
   * Open camera
   */
  async openCamera(
    width: number,
    height: number,
    facingMode: 'user' | 'environment' = 'environment'
  ): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
      });
      
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      
      this.canvas.width = width;
      this.canvas.height = height;
      
      console.log('[CameraHAL] Camera opened');
    } catch (e) {
      console.error('[CameraHAL] Failed to open camera:', e);
      throw e;
    }
  }
  
  /**
   * Capture frame
   */
  captureFrame(): ImageData | null {
    if (!this.videoElement) return null;
    
    this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Close camera
   */
  closeCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}

/**
 * Sensor HAL
 */
export class SensorHAL {
  private accelerometer: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private gyroscope: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private magnetometer: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private orientation: { alpha: number; beta: number; gamma: number } = { alpha: 0, beta: 0, gamma: 0 };
  
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  
  constructor() {
    console.log('[SensorHAL] Initialized');
    this.initSensors();
  }
  
  /**
   * Initialize device sensors
   */
  private initSensors(): void {
    // Device motion (accelerometer + gyroscope)
    window.addEventListener('devicemotion', (event) => {
      if (event.accelerationIncludingGravity) {
        this.accelerometer = {
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0,
        };
        this.notifyListeners('accelerometer', this.accelerometer);
      }
      
      if (event.rotationRate) {
        this.gyroscope = {
          x: event.rotationRate.alpha || 0,
          y: event.rotationRate.beta || 0,
          z: event.rotationRate.gamma || 0,
        };
        this.notifyListeners('gyroscope', this.gyroscope);
      }
    });
    
    // Device orientation
    window.addEventListener('deviceorientation', (event) => {
      this.orientation = {
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0,
      };
      this.notifyListeners('orientation', this.orientation);
    });
  }
  
  /**
   * Register sensor listener
   */
  registerListener(sensorType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(sensorType)) {
      this.listeners.set(sensorType, new Set());
    }
    this.listeners.get(sensorType)!.add(callback);
  }
  
  /**
   * Unregister sensor listener
   */
  unregisterListener(sensorType: string, callback: (data: any) => void): void {
    this.listeners.get(sensorType)?.delete(callback);
  }
  
  /**
   * Notify listeners
   */
  private notifyListeners(sensorType: string, data: any): void {
    const listeners = this.listeners.get(sensorType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
  
  /**
   * Get current accelerometer data
   */
  getAccelerometer(): { x: number; y: number; z: number } {
    return { ...this.accelerometer };
  }
  
  /**
   * Get current gyroscope data
   */
  getGyroscope(): { x: number; y: number; z: number } {
    return { ...this.gyroscope };
  }
  
  /**
   * Get current orientation
   */
  getOrientation(): { alpha: number; beta: number; gamma: number } {
    return { ...this.orientation };
  }
}

/**
 * Input HAL
 */
export class InputHAL {
  private touchListeners: Set<(event: TouchEvent) => void> = new Set();
  private keyListeners: Set<(event: KeyboardEvent) => void> = new Set();
  
  constructor(private canvas: HTMLCanvasElement) {
    console.log('[InputHAL] Initialized');
    this.initInputEvents();
  }
  
  /**
   * Initialize input event listeners
   */
  private initInputEvents(): void {
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      this.touchListeners.forEach(listener => listener(e));
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      this.touchListeners.forEach(listener => listener(e));
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      this.touchListeners.forEach(listener => listener(e));
    });
    
    // Mouse events (emulate touch)
    this.canvas.addEventListener('mousedown', (e) => {
      const touch = this.mouseToTouch(e);
      this.touchListeners.forEach(listener => listener(touch as any));
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons > 0) {
        const touch = this.mouseToTouch(e);
        this.touchListeners.forEach(listener => listener(touch as any));
      }
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      const touch = this.mouseToTouch(e);
      this.touchListeners.forEach(listener => listener(touch as any));
    });
    
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keyListeners.forEach(listener => listener(e));
    });
    
    window.addEventListener('keyup', (e) => {
      this.keyListeners.forEach(listener => listener(e));
    });
  }
  
  /**
   * Convert mouse event to touch event
   */
  private mouseToTouch(e: MouseEvent): Partial<TouchEvent> {
    const rect = this.canvas.getBoundingClientRect();
    return {
      type: e.type.replace('mouse', 'touch'),
      touches: [{
        identifier: 0,
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        screenX: e.screenX,
        screenY: e.screenY,
        target: e.target,
      }] as any,
    };
  }
  
  /**
   * Register touch listener
   */
  registerTouchListener(callback: (event: TouchEvent) => void): void {
    this.touchListeners.add(callback);
  }
  
  /**
   * Unregister touch listener
   */
  unregisterTouchListener(callback: (event: TouchEvent) => void): void {
    this.touchListeners.delete(callback);
  }
  
  /**
   * Register key listener
   */
  registerKeyListener(callback: (event: KeyboardEvent) => void): void {
    this.keyListeners.add(callback);
  }
  
  /**
   * Unregister key listener
   */
  unregisterKeyListener(callback: (event: KeyboardEvent) => void): void {
    this.keyListeners.delete(callback);
  }
}

/**
 * Complete Android HAL
 */
export class AndroidHAL {
  public graphics: HWComposer;
  public gralloc: Gralloc;
  public audio: AudioHAL;
  public camera: CameraHAL;
  public sensors: SensorHAL;
  public input: InputHAL;
  
  constructor(canvas: HTMLCanvasElement) {
    this.graphics = new HWComposer(canvas);
    this.gralloc = new Gralloc();
    this.audio = new AudioHAL();
    this.camera = new CameraHAL();
    this.sensors = new SensorHAL();
    this.input = new InputHAL(canvas);
    
    console.log('[AndroidHAL] Fully initialized');
  }
}
