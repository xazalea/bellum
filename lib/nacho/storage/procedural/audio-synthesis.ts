/**
 * Parametric Audio Synthesis
 * Store synthesis parameters instead of PCM data
 * Compression: 5MB audio file → ~150 bytes parameters
 */

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export type EffectType = 'reverb' | 'delay' | 'chorus' | 'distortion' | 'compressor';

export interface ADSREnvelope {
  attack: number;  // seconds
  decay: number;   // seconds
  sustain: number; // 0-1
  release: number; // seconds
}

export interface FilterParams {
  type: FilterType;
  frequency: number; // Hz
  Q: number;         // Quality factor
  gain?: number;     // dB (for peaking/shelving filters)
}

export interface EffectParams {
  type: EffectType;
  mix: number; // 0-1

  // Reverb
  roomSize?: number;
  damping?: number;

  // Delay
  delayTime?: number;
  feedback?: number;

  // Chorus
  rate?: number;
  depth?: number;

  // Distortion
  amount?: number;

  // Compressor
  threshold?: number;
  ratio?: number;
  attack?: number;
  release?: number;
}

export interface NoteEvent {
  time: number;      // seconds
  frequency: number; // Hz
  duration: number;  // seconds
  velocity: number;  // 0-1
}

export interface ProceduralAudioSpec {
  oscillator: OscillatorType;
  envelope: ADSREnvelope;
  filter?: FilterParams;
  effects?: EffectParams[];
  notes?: NoteEvent[];
  sampleRate: number;
  duration: number;
  seed: number;
  version: number;
}

/**
 * Parametric Audio Synthesizer
 */
export class ParametricAudioSynthesizer {
  private audioContext: AudioContext | null = null;

  /**
   * Generate audio from procedural specification
   */
  async generate(spec: ProceduralAudioSpec): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const { sampleRate, duration } = spec;
    const length = Math.ceil(sampleRate * duration);
    const audioBuffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    if (spec.notes && spec.notes.length > 0) {
      // Synthesize notes
      for (const note of spec.notes) {
        this.synthesizeNote(channelData, note, spec, sampleRate);
      }
    } else {
      // Synthesize continuous tone
      this.synthesizeContinuous(channelData, spec, sampleRate);
    }

    // Apply filter
    if (spec.filter) {
      this.applyFilter(channelData, spec.filter, sampleRate);
    }

    // Apply effects
    if (spec.effects) {
      for (const effect of spec.effects) {
        await this.applyEffect(channelData, effect, sampleRate);
      }
    }

    return audioBuffer;
  }

  private synthesizeNote(
    output: Float32Array,
    note: NoteEvent,
    spec: ProceduralAudioSpec,
    sampleRate: number
  ): void {
    const startSample = Math.floor(note.time * sampleRate);
    const endSample = Math.floor((note.time + note.duration) * sampleRate);
    const length = endSample - startSample;

    for (let i = 0; i < length && startSample + i < output.length; i++) {
      const t = i / sampleRate;
      const phase = (note.frequency * t * 2 * Math.PI) % (2 * Math.PI);
      
      // Generate oscillator sample
      let sample = this.generateOscillator(spec.oscillator, phase, spec.seed + i);
      
      // Apply envelope
      sample *= this.applyEnvelope(t, note.duration, spec.envelope);
      
      // Apply velocity
      sample *= note.velocity;
      
      // Mix into output
      output[startSample + i] += sample;
    }
  }

  private synthesizeContinuous(
    output: Float32Array,
    spec: ProceduralAudioSpec,
    sampleRate: number
  ): void {
    const frequency = 440; // A4
    const duration = spec.duration;

    for (let i = 0; i < output.length; i++) {
      const t = i / sampleRate;
      const phase = (frequency * t * 2 * Math.PI) % (2 * Math.PI);
      
      let sample = this.generateOscillator(spec.oscillator, phase, spec.seed + i);
      sample *= this.applyEnvelope(t, duration, spec.envelope);
      
      output[i] = sample;
    }
  }

  private generateOscillator(type: OscillatorType, phase: number, seed: number): number {
    switch (type) {
      case 'sine':
        return Math.sin(phase);
      
      case 'square':
        return phase < Math.PI ? 1 : -1;
      
      case 'sawtooth':
        return 2 * (phase / (2 * Math.PI)) - 1;
      
      case 'triangle':
        const t = phase / (2 * Math.PI);
        return 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
      
      case 'noise':
        // Seeded white noise
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x)) * 2 - 1;
      
      default:
        return Math.sin(phase);
    }
  }

  private applyEnvelope(t: number, duration: number, envelope: ADSREnvelope): number {
    const { attack, decay, sustain, release } = envelope;

    if (t < attack) {
      // Attack phase
      return t / attack;
    } else if (t < attack + decay) {
      // Decay phase
      const decayProgress = (t - attack) / decay;
      return 1 - (1 - sustain) * decayProgress;
    } else if (t < duration - release) {
      // Sustain phase
      return sustain;
    } else {
      // Release phase
      const releaseProgress = (t - (duration - release)) / release;
      return sustain * (1 - releaseProgress);
    }
  }

  private applyFilter(data: Float32Array, filter: FilterParams, sampleRate: number): void {
    // Simple biquad filter implementation
    const freq = filter.frequency;
    const Q = filter.Q;
    const omega = 2 * Math.PI * freq / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * Q);

    let b0, b1, b2, a0, a1, a2;

    switch (filter.type) {
      case 'lowpass':
        b0 = (1 - cs) / 2;
        b1 = 1 - cs;
        b2 = (1 - cs) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;
      
      case 'highpass':
        b0 = (1 + cs) / 2;
        b1 = -(1 + cs);
        b2 = (1 + cs) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;
      
      case 'bandpass':
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cs;
        a2 = 1 - alpha;
        break;
      
      default:
        return;
    }

    // Normalize coefficients
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;

    // Apply filter
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < data.length; i++) {
      const x0 = data[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

      data[i] = y0;

      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }
  }

  private async applyEffect(data: Float32Array, effect: EffectParams, sampleRate: number): Promise<void> {
    switch (effect.type) {
      case 'reverb':
        this.applyReverb(data, effect, sampleRate);
        break;
      
      case 'delay':
        this.applyDelay(data, effect, sampleRate);
        break;
      
      case 'distortion':
        this.applyDistortion(data, effect);
        break;
      
      case 'compressor':
        this.applyCompressor(data, effect, sampleRate);
        break;
    }
  }

  private applyReverb(data: Float32Array, effect: EffectParams, sampleRate: number): void {
    const roomSize = effect.roomSize || 0.5;
    const damping = effect.damping || 0.5;
    const mix = effect.mix;

    // Simplified Freeverb-style reverb
    const combDelays = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116];
    const allpassDelays = [225, 556, 441, 341];
    
    const combBuffers = combDelays.map(delay => new Float32Array(delay));
    const allpassBuffers = allpassDelays.map(delay => new Float32Array(delay));
    
    const combIndices = new Array(combDelays.length).fill(0);
    const allpassIndices = new Array(allpassDelays.length).fill(0);

    const output = new Float32Array(data.length);

    for (let i = 0; i < data.length; i++) {
      let sample = data[i];
      let reverbSample = 0;

      // Comb filters
      for (let j = 0; j < combDelays.length; j++) {
        const delayLength = combDelays[j];
        const index = combIndices[j];
        const delayed = combBuffers[j][index];
        
        combBuffers[j][index] = sample + delayed * roomSize * damping;
        combIndices[j] = (index + 1) % delayLength;
        
        reverbSample += delayed;
      }

      reverbSample /= combDelays.length;

      // Allpass filters
      for (let j = 0; j < allpassDelays.length; j++) {
        const delayLength = allpassDelays[j];
        const index = allpassIndices[j];
        const delayed = allpassBuffers[j][index];
        
        allpassBuffers[j][index] = reverbSample + delayed * 0.5;
        allpassIndices[j] = (index + 1) % delayLength;
        
        reverbSample = delayed - reverbSample * 0.5;
      }

      output[i] = sample * (1 - mix) + reverbSample * mix;
    }

    data.set(output);
  }

  private applyDelay(data: Float32Array, effect: EffectParams, sampleRate: number): void {
    const delayTime = effect.delayTime || 0.5;
    const feedback = effect.feedback || 0.3;
    const mix = effect.mix;

    const delayLength = Math.floor(delayTime * sampleRate);
    const delayBuffer = new Float32Array(delayLength);
    let delayIndex = 0;

    const output = new Float32Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      const delayed = delayBuffer[delayIndex];
      
      delayBuffer[delayIndex] = sample + delayed * feedback;
      delayIndex = (delayIndex + 1) % delayLength;
      
      output[i] = sample * (1 - mix) + delayed * mix;
    }

    data.set(output);
  }

  private applyDistortion(data: Float32Array, effect: EffectParams): void {
    const amount = effect.amount || 0.5;
    const mix = effect.mix;

    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      const distorted = Math.tanh(sample * (1 + amount * 10));
      data[i] = sample * (1 - mix) + distorted * mix;
    }
  }

  private applyCompressor(data: Float32Array, effect: EffectParams, sampleRate: number): void {
    const threshold = effect.threshold || -20; // dB
    const ratio = effect.ratio || 4;
    const attack = effect.attack || 0.003; // seconds
    const release = effect.release || 0.25; // seconds

    const thresholdLin = Math.pow(10, threshold / 20);
    const attackCoeff = Math.exp(-1 / (attack * sampleRate));
    const releaseCoeff = Math.exp(-1 / (release * sampleRate));

    let envelope = 0;

    for (let i = 0; i < data.length; i++) {
      const sample = Math.abs(data[i]);
      
      // Envelope follower
      if (sample > envelope) {
        envelope = attackCoeff * envelope + (1 - attackCoeff) * sample;
      } else {
        envelope = releaseCoeff * envelope + (1 - releaseCoeff) * sample;
      }

      // Compression
      if (envelope > thresholdLin) {
        const excess = envelope / thresholdLin;
        const gain = Math.pow(excess, 1 / ratio - 1);
        data[i] *= gain;
      }
    }
  }

  /**
   * Serialize spec to compact binary format
   */
  static serializeSpec(spec: ProceduralAudioSpec): Uint8Array {
    const json = JSON.stringify(spec);
    const encoder = new TextEncoder();
    return encoder.encode(json);
  }

  /**
   * Deserialize spec from binary format
   */
  static deserializeSpec(data: Uint8Array): ProceduralAudioSpec {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }

  /**
   * Extract synthesis parameters from audio data
   * Attempts to detect if audio can be represented parametrically
   */
  static async extractSpec(audioBuffer: AudioBuffer): Promise<ProceduralAudioSpec | null> {
    // Analyze audio to detect if it's synthesizable
    // For now, return null (not synthesizable)
    // In a real implementation, this would use FFT and pattern detection
    return null;
  }
}
