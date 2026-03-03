/**
 * Audio Re-encoder
 * Transform PCM → Opus/Parametric models
 * Compression: 10x-100x depending on content
 */

import { ParametricAudioSynthesizer, ProceduralAudioSpec } from '../procedural/audio-synthesis';

export type AudioContentType = 'music' | 'sfx' | 'voice' | 'ambient' | 'unknown';

export interface AudioAnalysis {
  type: AudioContentType;
  duration: number;
  sampleRate: number;
  channels: number;
  isParameterizable: boolean;
  recommendedEncoding: 'opus' | 'parametric' | 'raw';
  estimatedCompressionRatio: number;
}

export interface ReencodedAudio {
  encoding: 'opus' | 'parametric' | 'raw';
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  spec?: ProceduralAudioSpec; // If parametric
}

/**
 * Audio Re-encoder
 */
export class AudioReencoder {
  /**
   * Analyze audio to determine optimal encoding
   */
  static analyzeAudio(audioBuffer: AudioBuffer): AudioAnalysis {
    const { duration, sampleRate, numberOfChannels } = audioBuffer;
    const channelData = audioBuffer.getChannelData(0);

    // Detect content type
    const type = this.detectAudioType(channelData, sampleRate);

    // Check if parameterizable
    const isParameterizable = this.isParameterizable(channelData, type);

    // Recommend encoding
    let recommendedEncoding: 'opus' | 'parametric' | 'raw';
    let estimatedCompressionRatio: number;

    if (isParameterizable) {
      recommendedEncoding = 'parametric';
      estimatedCompressionRatio = 50;
    } else if (type === 'music') {
      recommendedEncoding = 'opus';
      estimatedCompressionRatio = 10;
    } else if (type === 'voice') {
      recommendedEncoding = 'opus';
      estimatedCompressionRatio = 20;
    } else {
      recommendedEncoding = 'opus';
      estimatedCompressionRatio = 10;
    }

    return {
      type,
      duration,
      sampleRate,
      channels: numberOfChannels,
      isParameterizable,
      recommendedEncoding,
      estimatedCompressionRatio,
    };
  }

  /**
   * Re-encode audio
   */
  static async reencode(audioBuffer: AudioBuffer): Promise<ReencodedAudio> {
    const analysis = this.analyzeAudio(audioBuffer);
    const originalSize = audioBuffer.length * audioBuffer.numberOfChannels * 4; // Float32

    if (analysis.recommendedEncoding === 'parametric') {
      const spec = await ParametricAudioSynthesizer.extractSpec(audioBuffer);
      if (spec) {
        const data = ParametricAudioSynthesizer.serializeSpec(spec);
        return {
          encoding: 'parametric',
          data,
          originalSize,
          compressedSize: data.length,
          compressionRatio: originalSize / data.length,
          spec,
        };
      }
    }

    // Fallback to Opus encoding (simulated)
    const compressedData = await this.encodeOpus(audioBuffer, analysis.type);

    return {
      encoding: 'opus',
      data: compressedData,
      originalSize,
      compressedSize: compressedData.length,
      compressionRatio: originalSize / compressedData.length,
    };
  }

  private static detectAudioType(data: Float32Array, sampleRate: number): AudioContentType {
    // Simple heuristics
    const avgAmplitude = data.reduce((sum, v) => sum + Math.abs(v), 0) / data.length;
    
    // Count zero crossings
    let zeroCrossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }

    const zeroCrossingRate = zeroCrossings / data.length;

    if (avgAmplitude < 0.1 && zeroCrossingRate < 0.01) {
      return 'ambient';
    } else if (zeroCrossingRate > 0.1) {
      return 'sfx';
    } else if (avgAmplitude > 0.3) {
      return 'music';
    } else {
      return 'voice';
    }
  }

  private static isParameterizable(data: Float32Array, type: AudioContentType): boolean {
    // Simple sounds (tones, beeps) are parameterizable
    return type === 'sfx' && data.length < 48000; // < 1 second
  }

  private static async encodeOpus(audioBuffer: AudioBuffer, type: AudioContentType): Promise<Uint8Array> {
    // Opus encoding would require a WASM library
    // For now, simulate compression
    const bitrate = type === 'voice' ? 24000 : 48000;
    const duration = audioBuffer.duration;
    const estimatedSize = Math.ceil((bitrate / 8) * duration);
    
    // Return dummy compressed data
    return new Uint8Array(estimatedSize);
  }
}
