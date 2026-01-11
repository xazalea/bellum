/**
 * Video Codec Support
 * H.264, VP9, HEVC (H.265) decoding via WebCodecs API
 */

export enum VideoCodec {
  H264 = 'h264',
  VP9 = 'vp9',
  HEVC = 'hevc',
  AV1 = 'av1',
}

export interface VideoFrame {
  data: Uint8Array;
  width: number;
  height: number;
  format: 'I420' | 'NV12' | 'RGBA';
  timestamp: number;
  duration: number;
}

export interface DecoderConfig {
  codec: VideoCodec;
  width: number;
  height: number;
  hardwareAcceleration?: 'prefer-hardware' | 'prefer-software';
  optimizeForLatency?: boolean;
}

/**
 * Video Decoder using WebCodecs API
 */
export class VideoDecoder {
  private decoder: globalThis.VideoDecoder | null = null;
  private codec: VideoCodec;
  private frameQueue: VideoFrame[] = [];
  private onFrameCallback: ((frame: VideoFrame) => void) | null = null;
  private isInitialized = false;
  
  constructor(config: DecoderConfig) {
    this.codec = config.codec;
    
    if (!('VideoDecoder' in globalThis)) {
      console.warn('[VideoDecoder] WebCodecs not supported');
      return;
    }
    
    this.initDecoder(config);
  }
  
  /**
   * Initialize WebCodecs decoder
   */
  private initDecoder(config: DecoderConfig): void {
    const codecString = this.getCodecString(config.codec, config.width, config.height);
    
    this.decoder = new (globalThis as any).VideoDecoder({
      output: (frame: any) => {
        this.handleFrame(frame);
      },
      error: (error: Error) => {
        console.error('[VideoDecoder] Error:', error);
      },
    });
    
    this.decoder.configure({
      codec: codecString,
      codedWidth: config.width,
      codedHeight: config.height,
      hardwareAcceleration: config.hardwareAcceleration || 'prefer-hardware',
      optimizeForLatency: config.optimizeForLatency || false,
    });
    
    this.isInitialized = true;
    console.log(`[VideoDecoder] Initialized: ${codecString}`);
  }
  
  /**
   * Get codec string for WebCodecs
   */
  private getCodecString(codec: VideoCodec, width: number, height: number): string {
    switch (codec) {
      case VideoCodec.H264:
        // H.264 Baseline Profile
        return 'avc1.42E01E';
      case VideoCodec.VP9:
        // VP9 Profile 0
        return 'vp09.00.10.08';
      case VideoCodec.HEVC:
        // HEVC Main Profile
        return 'hev1.1.6.L93.B0';
      case VideoCodec.AV1:
        // AV1 Main Profile
        return 'av01.0.04M.08';
      default:
        return 'avc1.42E01E';
    }
  }
  
  /**
   * Decode video chunk
   */
  decode(data: Uint8Array, timestamp: number, isKeyframe: boolean = false): void {
    if (!this.decoder || !this.isInitialized) {
      console.warn('[VideoDecoder] Decoder not initialized');
      return;
    }
    
    const chunk = new (globalThis as any).EncodedVideoChunk({
      type: isKeyframe ? 'key' : 'delta',
      timestamp: timestamp * 1000, // Convert to microseconds
      data,
    });
    
    this.decoder.decode(chunk);
  }
  
  /**
   * Handle decoded frame
   */
  private handleFrame(videoFrame: any): void {
    // Extract frame data
    const width = videoFrame.displayWidth || videoFrame.codedWidth;
    const height = videoFrame.displayHeight || videoFrame.codedHeight;
    
    // Create canvas to extract RGBA data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoFrame, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      
      const frame: VideoFrame = {
        data: new Uint8Array(imageData.data.buffer),
        width,
        height,
        format: 'RGBA',
        timestamp: videoFrame.timestamp / 1000, // Convert back to milliseconds
        duration: videoFrame.duration / 1000,
      };
      
      this.frameQueue.push(frame);
      
      if (this.onFrameCallback) {
        this.onFrameCallback(frame);
      }
    }
    
    videoFrame.close();
  }
  
  /**
   * Set frame callback
   */
  onFrame(callback: (frame: VideoFrame) => void): void {
    this.onFrameCallback = callback;
  }
  
  /**
   * Get next frame from queue
   */
  getFrame(): VideoFrame | null {
    return this.frameQueue.shift() || null;
  }
  
  /**
   * Flush decoder
   */
  async flush(): Promise<void> {
    if (this.decoder) {
      await this.decoder.flush();
    }
  }
  
  /**
   * Close decoder
   */
  close(): void {
    if (this.decoder) {
      this.decoder.close();
      this.decoder = null;
    }
    this.frameQueue = [];
    this.isInitialized = false;
  }
  
  /**
   * Check if codec is supported
   */
  static async isSupported(codec: VideoCodec): Promise<boolean> {
    if (!('VideoDecoder' in globalThis)) {
      return false;
    }
    
    const decoder = new VideoDecoder({ codec, width: 1920, height: 1080 });
    const codecString = decoder.getCodecString(codec, 1920, 1080);
    
    const support = await (globalThis as any).VideoDecoder.isConfigSupported({
      codec: codecString,
      codedWidth: 1920,
      codedHeight: 1080,
    });
    
    return support.supported;
  }
}

/**
 * H.264 Decoder
 */
export class H264Decoder extends VideoDecoder {
  constructor(width: number, height: number) {
    super({
      codec: VideoCodec.H264,
      width,
      height,
      hardwareAcceleration: 'prefer-hardware',
      optimizeForLatency: true,
    });
  }
}

/**
 * VP9 Decoder
 */
export class VP9Decoder extends VideoDecoder {
  constructor(width: number, height: number) {
    super({
      codec: VideoCodec.VP9,
      width,
      height,
      hardwareAcceleration: 'prefer-hardware',
    });
  }
}

/**
 * HEVC (H.265) Decoder
 */
export class HEVCDecoder extends VideoDecoder {
  constructor(width: number, height: number) {
    super({
      codec: VideoCodec.HEVC,
      width,
      height,
      hardwareAcceleration: 'prefer-hardware',
    });
  }
}

/**
 * Video Encoder using WebCodecs API
 */
export class VideoEncoder {
  private encoder: globalThis.VideoEncoder | null = null;
  private codec: VideoCodec;
  private onChunkCallback: ((chunk: Uint8Array, isKeyframe: boolean, timestamp: number) => void) | null = null;
  
  constructor(config: {
    codec: VideoCodec;
    width: number;
    height: number;
    bitrate: number;
    framerate: number;
    hardwareAcceleration?: 'prefer-hardware' | 'prefer-software';
  }) {
    this.codec = config.codec;
    
    if (!('VideoEncoder' in globalThis)) {
      console.warn('[VideoEncoder] WebCodecs not supported');
      return;
    }
    
    this.initEncoder(config);
  }
  
  /**
   * Initialize WebCodecs encoder
   */
  private initEncoder(config: any): void {
    const codecString = new VideoDecoder({ codec: config.codec, width: config.width, height: config.height } as any).getCodecString(config.codec, config.width, config.height);
    
    this.encoder = new (globalThis as any).VideoEncoder({
      output: (chunk: any, metadata: any) => {
        this.handleChunk(chunk, metadata);
      },
      error: (error: Error) => {
        console.error('[VideoEncoder] Error:', error);
      },
    });
    
    this.encoder.configure({
      codec: codecString,
      width: config.width,
      height: config.height,
      bitrate: config.bitrate,
      framerate: config.framerate,
      hardwareAcceleration: config.hardwareAcceleration || 'prefer-hardware',
    });
    
    console.log(`[VideoEncoder] Initialized: ${codecString}`);
  }
  
  /**
   * Encode frame
   */
  encode(frame: VideoFrame, isKeyframe: boolean = false): void {
    if (!this.encoder) {
      console.warn('[VideoEncoder] Encoder not initialized');
      return;
    }
    
    // Create VideoFrame from our frame data
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Ensure we have a standard buffer for ImageData
      let data = frame.data;
      if (data.buffer instanceof SharedArrayBuffer) {
        data = new Uint8Array(data); // Clone
      }

      const imageData = new ImageData(
        new Uint8ClampedArray(data),
        frame.width,
        frame.height
      );
      ctx.putImageData(imageData, 0, 0);
      
      const videoFrame = new (globalThis as any).VideoFrame(canvas, {
        timestamp: frame.timestamp * 1000,
      });
      
      this.encoder.encode(videoFrame, { keyFrame: isKeyframe });
      videoFrame.close();
    }
  }
  
  /**
   * Handle encoded chunk
   */
  private handleChunk(chunk: any, metadata: any): void {
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    
    if (this.onChunkCallback) {
      this.onChunkCallback(
        data,
        chunk.type === 'key',
        chunk.timestamp / 1000
      );
    }
  }
  
  /**
   * Set chunk callback
   */
  onChunk(callback: (chunk: Uint8Array, isKeyframe: boolean, timestamp: number) => void): void {
    this.onChunkCallback = callback;
  }
  
  /**
   * Flush encoder
   */
  async flush(): Promise<void> {
    if (this.encoder) {
      await this.encoder.flush();
    }
  }
  
  /**
   * Close encoder
   */
  close(): void {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
  }
}
