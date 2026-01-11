/**
 * Audio Codec Support
 * AAC, MP3, Opus, Vorbis decoding via WebCodecs/Web Audio API
 */

export enum AudioCodec {
  AAC = 'aac',
  MP3 = 'mp3',
  OPUS = 'opus',
  VORBIS = 'vorbis',
  FLAC = 'flac',
}

export interface AudioSample {
  data: Float32Array[];
  sampleRate: number;
  channels: number;
  timestamp: number;
  duration: number;
}

export interface AudioDecoderConfig {
  codec: AudioCodec;
  sampleRate: number;
  channels: number;
  bitrate?: number;
}

/**
 * Audio Decoder using WebCodecs API and Web Audio API
 */
export class AudioDecoder {
  private decoder: globalThis.AudioDecoder | null = null;
  private audioContext: AudioContext;
  private codec: AudioCodec;
  private sampleQueue: AudioSample[] = [];
  private onSampleCallback: ((sample: AudioSample) => void) | null = null;
  private isInitialized = false;
  
  constructor(config: AudioDecoderConfig) {
    this.codec = config.codec;
    this.audioContext = new AudioContext({ sampleRate: config.sampleRate });
    
    if (!('AudioDecoder' in globalThis)) {
      console.warn('[AudioDecoder] WebCodecs not supported, using fallback');
      this.initFallbackDecoder(config);
      return;
    }
    
    this.initDecoder(config);
  }
  
  /**
   * Initialize WebCodecs decoder
   */
  private initDecoder(config: AudioDecoderConfig): void {
    const codecString = this.getCodecString(config.codec, config.sampleRate, config.channels);
    
    this.decoder = new (globalThis as any).AudioDecoder({
      output: (audioData: any) => {
        this.handleAudioData(audioData);
      },
      error: (error: Error) => {
        console.error('[AudioDecoder] Error:', error);
      },
    });
    
    if (this.decoder) {
      this.decoder.configure({
        codec: codecString,
        sampleRate: config.sampleRate,
        numberOfChannels: config.channels,
      });
    }
    
    this.isInitialized = true;
    console.log(`[AudioDecoder] Initialized: ${codecString}`);
  }
  
  /**
   * Initialize fallback decoder using Web Audio API
   */
  private initFallbackDecoder(config: AudioDecoderConfig): void {
    // Use Web Audio API's decodeAudioData for fallback
    this.isInitialized = true;
    console.log(`[AudioDecoder] Using Web Audio API fallback for ${config.codec}`);
  }
  
  /**
   * Get codec string for WebCodecs
   */
  public getCodecString(codec: AudioCodec, sampleRate: number, channels: number): string {
    switch (codec) {
      case AudioCodec.AAC:
        // AAC-LC
        return 'mp4a.40.2';
      case AudioCodec.MP3:
        return 'mp3';
      case AudioCodec.OPUS:
        return 'opus';
      case AudioCodec.VORBIS:
        return 'vorbis';
      case AudioCodec.FLAC:
        return 'flac';
      default:
        return 'mp4a.40.2';
    }
  }
  
  /**
   * Decode audio chunk
   */
  async decode(data: Uint8Array, timestamp: number): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[AudioDecoder] Decoder not initialized');
      return;
    }
    
    if (this.decoder) {
      // Use WebCodecs
      const chunk = new (globalThis as any).EncodedAudioChunk({
        type: 'key',
        timestamp: timestamp * 1000, // Convert to microseconds
        data,
      });
      
      this.decoder.decode(chunk);
    } else {
      // Use Web Audio API fallback
      await this.decodeWithWebAudio(data, timestamp);
    }
  }
  
  /**
   * Decode using Web Audio API
   */
  private async decodeWithWebAudio(data: Uint8Array, timestamp: number): Promise<void> {
    try {
      // Create a proper ArrayBuffer (not SharedArrayBuffer)
      const buffer = new Uint8Array(data).buffer as ArrayBuffer;
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      
      const channels: Float32Array[] = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
      }
      
      const sample: AudioSample = {
        data: channels,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        timestamp,
        duration: audioBuffer.duration * 1000, // Convert to milliseconds
      };
      
      this.sampleQueue.push(sample);
      
      if (this.onSampleCallback) {
        this.onSampleCallback(sample);
      }
    } catch (e) {
      console.error('[AudioDecoder] Failed to decode audio:', e);
    }
  }
  
  /**
   * Handle decoded audio data
   */
  private handleAudioData(audioData: any): void {
    // Extract audio samples
    const channels: Float32Array[] = [];
    const sampleRate = audioData.sampleRate;
    const numberOfChannels = audioData.numberOfChannels;
    const numberOfFrames = audioData.numberOfFrames;
    
    // Allocate buffers for each channel
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const buffer = new Float32Array(numberOfFrames);
      audioData.copyTo(buffer, { planeIndex: ch });
      channels.push(buffer);
    }
    
    const sample: AudioSample = {
      data: channels,
      sampleRate,
      channels: numberOfChannels,
      timestamp: audioData.timestamp / 1000, // Convert back to milliseconds
      duration: (numberOfFrames / sampleRate) * 1000,
    };
    
    this.sampleQueue.push(sample);
    
    if (this.onSampleCallback) {
      this.onSampleCallback(sample);
    }
    
    audioData.close();
  }
  
  /**
   * Set sample callback
   */
  onSample(callback: (sample: AudioSample) => void): void {
    this.onSampleCallback = callback;
  }
  
  /**
   * Get next sample from queue
   */
  getSample(): AudioSample | null {
    return this.sampleQueue.shift() || null;
  }
  
  /**
   * Play audio sample
   */
  play(sample: AudioSample): void {
    const audioBuffer = this.audioContext.createBuffer(
      sample.channels,
      sample.data[0].length,
      sample.sampleRate
    );
    
    for (let ch = 0; ch < sample.channels; ch++) {
      // Ensure Float32Array uses proper ArrayBuffer (handle SharedArrayBuffer)
      const channelData = sample.data[ch];
      
      // If the buffer is a SharedArrayBuffer, we must clone it to a standard ArrayBuffer
      // Otherwise TypeScript complains because copyToChannel expects Float32Array backed by ArrayBuffer
      let buffer: Float32Array;
      
      if (channelData.buffer instanceof SharedArrayBuffer) {
        buffer = new Float32Array(channelData);
      } else {
        buffer = channelData;
      }
      
      // Force cast to any to bypass strict ArrayBuffer vs SharedArrayBuffer check
      // We've already ensured it's safe above, but TS is being pedantic about the type signature overlap
      audioBuffer.copyToChannel(buffer as any, ch);
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
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
    this.sampleQueue = [];
    this.isInitialized = false;
  }
  
  /**
   * Check if codec is supported
   */
  static async isSupported(codec: AudioCodec): Promise<boolean> {
    if ('AudioDecoder' in globalThis) {
      const decoder = new AudioDecoder({ codec, sampleRate: 48000, channels: 2 });
      const codecString = decoder.getCodecString(codec, 48000, 2);
      
      const support = await (globalThis as any).AudioDecoder.isConfigSupported({
        codec: codecString,
        sampleRate: 48000,
        numberOfChannels: 2,
      });
      
      return support.supported;
    }
    
    // Fallback: check Web Audio API support
    return true; // Web Audio API is widely supported
  }
}

/**
 * AAC Decoder
 */
export class AACDecoder extends AudioDecoder {
  constructor(sampleRate: number = 48000, channels: number = 2) {
    super({
      codec: AudioCodec.AAC,
      sampleRate,
      channels,
    });
  }
}

/**
 * MP3 Decoder
 */
export class MP3Decoder extends AudioDecoder {
  constructor(sampleRate: number = 48000, channels: number = 2) {
    super({
      codec: AudioCodec.MP3,
      sampleRate,
      channels,
    });
  }
}

/**
 * Opus Decoder
 */
export class OpusDecoder extends AudioDecoder {
  constructor(sampleRate: number = 48000, channels: number = 2) {
    super({
      codec: AudioCodec.OPUS,
      sampleRate,
      channels,
    });
  }
}

/**
 * Audio Encoder using WebCodecs API
 */
export class AudioEncoder {
  private encoder: globalThis.AudioEncoder | null = null;
  private codec: AudioCodec;
  private onChunkCallback: ((chunk: Uint8Array, timestamp: number) => void) | null = null;
  
  constructor(config: {
    codec: AudioCodec;
    sampleRate: number;
    channels: number;
    bitrate: number;
  }) {
    this.codec = config.codec;
    
    if (!('AudioEncoder' in globalThis)) {
      console.warn('[AudioEncoder] WebCodecs not supported');
      return;
    }
    
    this.initEncoder(config);
  }
  
  /**
   * Initialize WebCodecs encoder
   */
  private initEncoder(config: any): void {
    const decoder = new AudioDecoder({ codec: config.codec, sampleRate: config.sampleRate, channels: config.channels });
    const codecString = decoder.getCodecString(config.codec, config.sampleRate, config.channels);
    
    this.encoder = new (globalThis as any).AudioEncoder({
      output: (chunk: any, metadata: any) => {
        this.handleChunk(chunk, metadata);
      },
      error: (error: Error) => {
        console.error('[AudioEncoder] Error:', error);
      },
    });
    
    if (!this.encoder) {
      throw new Error('[AudioEncoder] Failed to create encoder');
    }
    
    this.encoder.configure({
      codec: codecString,
      sampleRate: config.sampleRate,
      numberOfChannels: config.channels,
      bitrate: config.bitrate,
    });
    
    console.log(`[AudioEncoder] Initialized: ${codecString}`);
  }
  
  /**
   * Encode audio sample
   */
  encode(sample: AudioSample): void {
    if (!this.encoder) {
      console.warn('[AudioEncoder] Encoder not initialized');
      return;
    }
    
    // Create AudioData from our sample
    const audioData = new (globalThis as any).AudioData({
      format: 'f32-planar',
      sampleRate: sample.sampleRate,
      numberOfFrames: sample.data[0].length,
      numberOfChannels: sample.channels,
      timestamp: sample.timestamp * 1000,
      data: this.interleaveChannels(sample.data),
    });
    
    this.encoder.encode(audioData);
    audioData.close();
  }
  
  /**
   * Interleave audio channels
   */
  private interleaveChannels(channels: Float32Array[]): Float32Array {
    const length = channels[0].length;
    const numChannels = channels.length;
    const interleaved = new Float32Array(length * numChannels);
    
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        interleaved[i * numChannels + ch] = channels[ch][i];
      }
    }
    
    return interleaved;
  }
  
  /**
   * Handle encoded chunk
   */
  private handleChunk(chunk: any, metadata: any): void {
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    
    if (this.onChunkCallback) {
      this.onChunkCallback(data, chunk.timestamp / 1000);
    }
  }
  
  /**
   * Set chunk callback
   */
  onChunk(callback: (chunk: Uint8Array, timestamp: number) => void): void {
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

/**
 * Audio Player - plays audio samples in real-time
 */
export class AudioPlayer {
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private nextPlayTime = 0;
  
  constructor(sampleRate: number = 48000) {
    this.audioContext = new AudioContext({ sampleRate });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.nextPlayTime = this.audioContext.currentTime;
  }
  
  /**
   * Play audio sample
   */
  play(sample: AudioSample): void {
    const audioBuffer = this.audioContext.createBuffer(
      sample.channels,
      sample.data[0].length,
      sample.sampleRate
    );
    
    for (let ch = 0; ch < sample.channels; ch++) {
      // Ensure Float32Array uses proper ArrayBuffer (handle SharedArrayBuffer)
      const channelData = sample.data[ch];
      
      // If the buffer is a SharedArrayBuffer, we must clone it to a standard ArrayBuffer
      // Otherwise TypeScript complains because copyToChannel expects Float32Array backed by ArrayBuffer
      let buffer: Float32Array;
      
      if (channelData.buffer instanceof SharedArrayBuffer) {
        buffer = new Float32Array(channelData);
      } else {
        buffer = channelData;
      }
      
      // Force cast to any to bypass strict ArrayBuffer vs SharedArrayBuffer check
      // We've already ensured it's safe above, but TS is being pedantic about the type signature overlap
      audioBuffer.copyToChannel(buffer as any, ch);
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    
    // Schedule playback to maintain continuity
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }
  
  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * Stop all playback
   */
  stop(): void {
    this.nextPlayTime = this.audioContext.currentTime;
  }
  
  /**
   * Close audio player
   */
  close(): void {
    this.audioContext.close();
  }
}
