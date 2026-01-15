/**
 * Correction Engine
 * 
 * Invisibly corrects prediction errors without visible snaps or pops.
 * Operates asynchronously in the background, blending corrections into motion.
 * 
 * Correction Strategy:
 * - Never snap or visibly correct
 * - Blend corrections into motion over multiple frames
 * - Use motion blur to hide corrections
 * - Apply depth-based masking
 * - Temporal blending for smooth transitions
 * 
 * Error Masking Techniques:
 * - Motion-based: Hide errors during camera/object motion
 * - Blur-based: Hide errors in motion-blurred regions
 * - Depth-based: Hide errors in distant/occluded areas
 * - Temporal: Spread corrections across multiple frames
 */

import type { Frame } from './temporal-synthesis';
import type { PredictionResult } from './prediction-engine';

export interface CorrectionConfig {
  maxCorrectionPerFrame: number; // Maximum correction amount per frame
  blendFrames: number; // Number of frames to blend correction
  motionThreshold: number; // Motion magnitude to enable aggressive correction
  depthBias: number; // Bias correction towards distant objects
  confidenceThreshold: number; // Minimum confidence to apply correction
}

export interface CorrectionRecord {
  predicted: any;
  authoritative: any;
  error: number;
  correctionApplied: number;
  remainingError: number;
  blendProgress: number; // [0, 1]
  startFrame: number;
}

/**
 * Correction Queue
 */
class CorrectionQueue {
  private corrections: Map<string, CorrectionRecord> = new Map();
  private frameCount: number = 0;

  add(id: string, record: CorrectionRecord): void {
    this.corrections.set(id, record);
  }

  get(id: string): CorrectionRecord | null {
    return this.corrections.get(id) || null;
  }

  remove(id: string): void {
    this.corrections.delete(id);
  }

  getActive(): CorrectionRecord[] {
    return Array.from(this.corrections.values())
      .filter(c => c.blendProgress < 1.0);
  }

  update(): void {
    this.frameCount++;
    
    // Update blend progress for all active corrections
    for (const [id, record] of this.corrections.entries()) {
      if (record.blendProgress >= 1.0) {
        this.corrections.delete(id);
      }
    }
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  clear(): void {
    this.corrections.clear();
  }
}

/**
 * Correction Engine
 */
export class CorrectionEngine {
  private config: CorrectionConfig;
  private correctionQueue: CorrectionQueue;
  private device: GPUDevice;

  // GPU pipelines
  private blendCorrectionPipeline: GPUComputePipeline | null = null;
  private motionMaskPipeline: GPUComputePipeline | null = null;
  private depthMaskPipeline: GPUComputePipeline | null = null;

  constructor(device: GPUDevice, config: Partial<CorrectionConfig> = {}) {
    this.device = device;
    this.config = {
      maxCorrectionPerFrame: 0.1, // 10% max correction per frame
      blendFrames: 8, // Blend over 8 frames
      motionThreshold: 0.05,
      depthBias: 0.7,
      confidenceThreshold: 0.3,
      ...config
    };

    this.correctionQueue = new CorrectionQueue();

    console.log('[CorrectionEngine] Initialized');
  }

  /**
   * Initialize GPU pipelines
   */
  async initializePipelines(): Promise<void> {
    this.blendCorrectionPipeline = await this.createBlendCorrectionPipeline();
    this.motionMaskPipeline = await this.createMotionMaskPipeline();
    this.depthMaskPipeline = await this.createDepthMaskPipeline();

    console.log('[CorrectionEngine] Pipelines initialized');
  }

  /**
   * Create blend correction pipeline
   */
  private async createBlendCorrectionPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct CorrectionParams {
          blendFactor: f32,
          maxCorrection: f32,
        }

        @group(0) @binding(0) var predictedFrame: texture_2d<f32>;
        @group(0) @binding(1) var authoritativeFrame: texture_2d<f32>;
        @group(0) @binding(2) var motionVectors: texture_2d<f32>;
        @group(0) @binding(3) var<uniform> params: CorrectionParams;
        @group(0) @binding(4) var outputFrame: texture_storage_2d<rgba16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(predictedFrame);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let predicted = textureLoad(predictedFrame, coord, 0);
          let authoritative = textureLoad(authoritativeFrame, coord, 0);
          let motion = textureLoad(motionVectors, coord, 0).xy;
          
          // Calculate error
          let error = authoritative - predicted;
          let errorMagnitude = length(error.rgb);
          
          // Motion-based masking: more motion = more aggressive correction
          let motionMagnitude = length(motion);
          let motionMask = min(1.0, motionMagnitude * 10.0);
          
          // Limit correction per frame
          var correction = error * params.blendFactor;
          let correctionMagnitude = length(correction.rgb);
          
          if (correctionMagnitude > params.maxCorrection) {
            correction *= params.maxCorrection / correctionMagnitude;
          }
          
          // Apply motion masking - correct more during motion
          correction *= (1.0 + motionMask);
          
          // Blend predicted + correction
          let corrected = predicted + correction;
          
          textureStore(outputFrame, coord, corrected);
        }
      `
    });

    return this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });
  }

  /**
   * Create motion mask pipeline
   */
  private async createMotionMaskPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Params {
          motionThreshold: f32,
        }

        @group(0) @binding(0) var motionVectors: texture_2d<f32>;
        @group(0) @binding(1) var<uniform> params: Params;
        @group(0) @binding(2) var motionMask: texture_storage_2d<r16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(motionVectors);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let motion = textureLoad(motionVectors, coord, 0).xy;
          let motionMagnitude = length(motion);
          
          // Create mask: high motion = high mask value (more correction allowed)
          var mask = smoothstep(0.0, params.motionThreshold, motionMagnitude);
          
          textureStore(motionMask, coord, vec4<f32>(mask, 0.0, 0.0, 0.0));
        }
      `
    });

    return this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });
  }

  /**
   * Create depth mask pipeline
   */
  private async createDepthMaskPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Params {
          depthBias: f32,
        }

        @group(0) @binding(0) var depthBuffer: texture_2d<f32>;
        @group(0) @binding(1) var<uniform> params: Params;
        @group(0) @binding(2) var depthMask: texture_storage_2d<r16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(depthBuffer);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let depth = textureLoad(depthBuffer, coord, 0).r;
          
          // Create mask: distant = high mask (more correction allowed in background)
          let mask = pow(depth, params.depthBias);
          
          textureStore(depthMask, coord, vec4<f32>(mask, 0.0, 0.0, 0.0));
        }
      `
    });

    return this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });
  }

  /**
   * Record a prediction error for correction
   */
  recordPredictionError<T>(
    id: string,
    predicted: T,
    authoritative: T,
    confidence: number
  ): void {
    if (confidence < this.config.confidenceThreshold) {
      // Low confidence predictions don't need correction
      return;
    }

    // Calculate error magnitude
    const error = this.calculateError(predicted, authoritative);

    const record: CorrectionRecord = {
      predicted,
      authoritative,
      error,
      correctionApplied: 0,
      remainingError: error,
      blendProgress: 0,
      startFrame: this.correctionQueue.getFrameCount()
    };

    this.correctionQueue.add(id, record);
  }

  /**
   * Apply corrections to a frame
   */
  async applyCorrections(
    predictedFrame: Frame,
    authoritativeFrame: Frame,
    motionVectors: GPUTexture,
    width: number,
    height: number
  ): Promise<Frame> {
    if (!this.blendCorrectionPipeline) {
      return predictedFrame;
    }

    const commandEncoder = this.device.createCommandEncoder();

    // Create output texture
    const correctedColor = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    // Calculate blend factor based on number of blend frames
    const activeCorrections = this.correctionQueue.getActive();
    let avgBlendProgress = 0;
    
    if (activeCorrections.length > 0) {
      avgBlendProgress = activeCorrections.reduce((sum, c) => sum + c.blendProgress, 0) / activeCorrections.length;
    }

    const blendFactor = 1.0 / this.config.blendFrames;

    // Create params buffer
    const paramsData = new Float32Array([
      blendFactor,
      this.config.maxCorrectionPerFrame
    ]);
    
    const paramsBuffer = this.device.createBuffer({
      size: paramsData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.blendCorrectionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: predictedFrame.colorBuffer.createView() },
        { binding: 1, resource: authoritativeFrame.colorBuffer.createView() },
        { binding: 2, resource: motionVectors.createView() },
        { binding: 3, resource: { buffer: paramsBuffer } },
        { binding: 4, resource: correctedColor.createView() }
      ]
    });

    // Dispatch correction
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.blendCorrectionPipeline);
    computePass.setBindGroup(0, bindGroup);
    
    const workgroupsX = Math.ceil(width / 8);
    const workgroupsY = Math.ceil(height / 8);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
    computePass.end();

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    // Update correction queue
    this.updateCorrectionQueue();

    return {
      colorBuffer: correctedColor,
      depthBuffer: predictedFrame.depthBuffer,
      motionVectors: predictedFrame.motionVectors,
      width: width,
      height: height,
      timestamp: predictedFrame.timestamp,
      isAuthoritative: false,
      confidence: (predictedFrame.confidence + authoritativeFrame.confidence) / 2
    };
  }

  /**
   * Generate motion-based correction mask
   */
  async generateMotionMask(
    motionVectors: GPUTexture,
    width: number,
    height: number
  ): Promise<GPUTexture> {
    if (!this.motionMaskPipeline) {
      // Return dummy texture
      return this.device.createTexture({
        size: { width, height, depthOrArrayLayers: 1 },
        format: 'rgba16float' as GPUTextureFormat,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
      });
    }

    const commandEncoder = this.device.createCommandEncoder();

    const motionMask = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float' as GPUTextureFormat,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    const paramsData = new Float32Array([this.config.motionThreshold]);
    const paramsBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);

    const bindGroup = this.device.createBindGroup({
      layout: this.motionMaskPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: motionVectors.createView() },
        { binding: 1, resource: { buffer: paramsBuffer } },
        { binding: 2, resource: motionMask.createView() }
      ]
    });

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.motionMaskPipeline);
    computePass.setBindGroup(0, bindGroup);
    
    const workgroupsX = Math.ceil(width / 8);
    const workgroupsY = Math.ceil(height / 8);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    return motionMask;
  }

  /**
   * Generate depth-based correction mask
   */
  async generateDepthMask(
    depthBuffer: GPUTexture,
    width: number,
    height: number
  ): Promise<GPUTexture> {
    if (!this.depthMaskPipeline) {
      return this.device.createTexture({
        size: { width, height, depthOrArrayLayers: 1 },
        format: 'rgba16float' as GPUTextureFormat,
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
      });
    }

    const commandEncoder = this.device.createCommandEncoder();

    const depthMask = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float' as GPUTextureFormat,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    const paramsData = new Float32Array([this.config.depthBias]);
    const paramsBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);

    const bindGroup = this.device.createBindGroup({
      layout: this.depthMaskPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: depthBuffer.createView() },
        { binding: 1, resource: { buffer: paramsBuffer } },
        { binding: 2, resource: depthMask.createView() }
      ]
    });

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.depthMaskPipeline);
    computePass.setBindGroup(0, bindGroup);
    
    const workgroupsX = Math.ceil(width / 8);
    const workgroupsY = Math.ceil(height / 8);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    return depthMask;
  }

  /**
   * Update correction queue - advance blend progress
   */
  private updateCorrectionQueue(): void {
    const active = this.correctionQueue.getActive();
    
    for (const correction of active) {
      const framesElapsed = this.correctionQueue.getFrameCount() - correction.startFrame;
      correction.blendProgress = Math.min(1.0, framesElapsed / this.config.blendFrames);
      
      // Update applied correction
      const correctionThisFrame = correction.remainingError * (1.0 / this.config.blendFrames);
      correction.correctionApplied += correctionThisFrame;
      correction.remainingError -= correctionThisFrame;
    }

    this.correctionQueue.update();
  }

  /**
   * Calculate error magnitude between predicted and authoritative values
   */
  private calculateError(predicted: any, authoritative: any): number {
    // Simplified error calculation
    // In a real implementation, this would be type-specific
    
    if (typeof predicted === 'number' && typeof authoritative === 'number') {
      return Math.abs(authoritative - predicted);
    }
    
    if (predicted instanceof Float32Array && authoritative instanceof Float32Array) {
      let sum = 0;
      for (let i = 0; i < Math.min(predicted.length, authoritative.length); i++) {
        sum += Math.pow(authoritative[i] - predicted[i], 2);
      }
      return Math.sqrt(sum);
    }
    
    return 0;
  }

  /**
   * Get active corrections count
   */
  getActiveCorrectionCount(): number {
    return this.correctionQueue.getActive().length;
  }

  /**
   * Clear all corrections
   */
  clear(): void {
    this.correctionQueue.clear();
  }
}

console.log('[CorrectionEngine] Module loaded');
