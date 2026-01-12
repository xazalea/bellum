/**
 * Frame Reprojection System
 * 
 * Depth-aware frame reprojection and synthesis for temporal frame generation.
 * Takes previous frames and warps them forward in time using motion vectors.
 * 
 * Key Techniques:
 * - Depth-aware warping: Prevents background bleeding through foreground
 * - Temporal accumulation: Blends multiple previous frames for stability
 * - Confidence masking: Weights pixels by prediction confidence
 * - Motion blur synthesis: Generates natural motion blur from vectors
 * - Hole filling: Fills disocclusions using temporal neighborhood
 */

import type { Frame } from './temporal-synthesis';
import type { MotionVectorData } from './motion-vectors';

export interface ReprojectionConfig {
  depthThreshold: number; // Depth difference threshold for disocclusion
  confidenceThreshold: number; // Minimum confidence for reprojection
  blurSamples: number; // Samples for motion blur
  temporalBlendWeight: number; // Weight for temporal accumulation
  holeFillRadius: number; // Radius for hole filling
}

export interface ReprojectedFrame {
  colorBuffer: GPUTexture;
  depthBuffer: GPUTexture;
  confidenceMap: GPUTexture;
  coverage: number; // Percentage of valid pixels [0, 1]
}

/**
 * Frame Reprojection Engine
 */
export class FrameReprojection {
  private device: GPUDevice;
  private config: ReprojectionConfig;

  // GPU Pipelines
  private reprojectionPipeline: GPUComputePipeline | null = null;
  private holeFillPipeline: GPUComputePipeline | null = null;
  private motionBlurPipeline: GPUComputePipeline | null = null;
  private confidencePipeline: GPUComputePipeline | null = null;
  private temporalAccumPipeline: GPUComputePipeline | null = null;

  constructor(device: GPUDevice, config: Partial<ReprojectionConfig> = {}) {
    this.device = device;
    this.config = {
      depthThreshold: 0.01,
      confidenceThreshold: 0.3,
      blurSamples: 8,
      temporalBlendWeight: 0.9,
      holeFillRadius: 2,
      ...config
    };

    console.log('[FrameReprojection] Initialized');
  }

  /**
   * Initialize GPU pipelines
   */
  async initializePipelines(): Promise<void> {
    this.reprojectionPipeline = await this.createReprojectionPipeline();
    this.holeFillPipeline = await this.createHoleFillPipeline();
    this.motionBlurPipeline = await this.createMotionBlurPipeline();
    this.confidencePipeline = await this.createConfidencePipeline();
    this.temporalAccumPipeline = await this.createTemporalAccumPipeline();

    console.log('[FrameReprojection] Pipelines initialized');
  }

  /**
   * Create depth-aware reprojection pipeline
   */
  private async createReprojectionPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Config {
          depthThreshold: f32,
          confidenceThreshold: f32,
        }

        @group(0) @binding(0) var prevColor: texture_2d<f32>;
        @group(0) @binding(1) var prevDepth: texture_2d<f32>;
        @group(0) @binding(2) var motionVectors: texture_2d<f32>;
        @group(0) @binding(3) var currentDepth: texture_2d<f32>;
        @group(0) @binding(4) var<uniform> config: Config;
        @group(0) @binding(5) var outputColor: texture_storage_2d<rgba16float, write>;
        @group(0) @binding(6) var outputConfidence: texture_storage_2d<r16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(prevColor);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let uv = vec2<f32>(f32(id.x), f32(id.y)) / vec2<f32>(f32(dims.x), f32(dims.y));
          
          // Read motion vector
          let motion = textureLoad(motionVectors, coord, 0).xy;
          
          // Calculate source position in previous frame
          let sourceUV = uv + motion;
          let sourceCoord = vec2<i32>(sourceUV * vec2<f32>(f32(dims.x), f32(dims.y)));
          
          // Check bounds
          if (sourceCoord.x < 0 || sourceCoord.x >= i32(dims.x) || 
              sourceCoord.y < 0 || sourceCoord.y >= i32(dims.y)) {
            // Out of bounds - mark as invalid
            textureStore(outputColor, coord, vec4<f32>(0.0, 0.0, 0.0, 0.0));
            textureStore(outputConfidence, coord, vec4<f32>(0.0, 0.0, 0.0, 0.0));
            return;
          }

          // Read depths
          let currentDepthValue = textureLoad(currentDepth, coord, 0).r;
          let prevDepthValue = textureLoad(prevDepth, sourceCoord, 0).r;
          
          // Depth-aware disocclusion detection
          let depthDiff = abs(currentDepthValue - prevDepthValue);
          var confidence = 1.0;
          
          if (depthDiff > config.depthThreshold) {
            // Disocclusion detected - reduce confidence
            confidence = max(0.0, 1.0 - (depthDiff / config.depthThreshold));
          }
          
          // Motion magnitude affects confidence
          let motionMagnitude = length(motion);
          confidence *= 1.0 / (1.0 + motionMagnitude * 5.0);
          
          if (confidence < config.confidenceThreshold) {
            // Low confidence - mark as invalid
            textureStore(outputColor, coord, vec4<f32>(0.0, 0.0, 0.0, 0.0));
            textureStore(outputConfidence, coord, vec4<f32>(0.0, 0.0, 0.0, 0.0));
            return;
          }

          // Bilinear sampling
          let frac = fract(sourceUV * vec2<f32>(f32(dims.x), f32(dims.y)));
          let c00 = textureLoad(prevColor, sourceCoord, 0);
          let c10 = textureLoad(prevColor, sourceCoord + vec2<i32>(1, 0), 0);
          let c01 = textureLoad(prevColor, sourceCoord + vec2<i32>(0, 1), 0);
          let c11 = textureLoad(prevColor, sourceCoord + vec2<i32>(1, 1), 0);
          
          let color = mix(
            mix(c00, c10, frac.x),
            mix(c01, c11, frac.x),
            frac.y
          );
          
          textureStore(outputColor, coord, color);
          textureStore(outputConfidence, coord, vec4<f32>(confidence, 0.0, 0.0, 0.0));
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
   * Create hole filling pipeline
   */
  private async createHoleFillPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Config {
          fillRadius: i32,
        }

        @group(0) @binding(0) var inputColor: texture_2d<f32>;
        @group(0) @binding(1) var inputConfidence: texture_2d<f32>;
        @group(0) @binding(2) var<uniform> config: Config;
        @group(0) @binding(3) var outputColor: texture_storage_2d<rgba16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(inputColor);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let confidence = textureLoad(inputConfidence, coord, 0).r;
          
          // If pixel has valid data, pass through
          if (confidence > 0.0) {
            let color = textureLoad(inputColor, coord, 0);
            textureStore(outputColor, coord, color);
            return;
          }

          // Fill hole using neighborhood average
          var sum = vec4<f32>(0.0);
          var weightSum = 0.0;
          
          for (var dy = -config.fillRadius; dy <= config.fillRadius; dy++) {
            for (var dx = -config.fillRadius; dx <= config.fillRadius; dx++) {
              let sampleCoord = coord + vec2<i32>(dx, dy);
              
              if (sampleCoord.x >= 0 && sampleCoord.x < i32(dims.x) &&
                  sampleCoord.y >= 0 && sampleCoord.y < i32(dims.y)) {
                let sampleConf = textureLoad(inputConfidence, sampleCoord, 0).r;
                
                if (sampleConf > 0.0) {
                  let dist = length(vec2<f32>(f32(dx), f32(dy)));
                  let weight = sampleConf / (1.0 + dist);
                  
                  sum += textureLoad(inputColor, sampleCoord, 0) * weight;
                  weightSum += weight;
                }
              }
            }
          }
          
          if (weightSum > 0.0) {
            textureStore(outputColor, coord, sum / weightSum);
          } else {
            textureStore(outputColor, coord, vec4<f32>(0.0, 0.0, 0.0, 1.0));
          }
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
   * Create motion blur synthesis pipeline
   */
  private async createMotionBlurPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Config {
          numSamples: i32,
          blurStrength: f32,
        }

        @group(0) @binding(0) var inputColor: texture_2d<f32>;
        @group(0) @binding(1) var motionVectors: texture_2d<f32>;
        @group(0) @binding(2) var<uniform> config: Config;
        @group(0) @binding(3) var outputColor: texture_storage_2d<rgba16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(inputColor);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let motion = textureLoad(motionVectors, coord, 0).xy;
          let motionMagnitude = length(motion);
          
          // Skip blur if motion is too small
          if (motionMagnitude < 0.001) {
            let color = textureLoad(inputColor, coord, 0);
            textureStore(outputColor, coord, color);
            return;
          }

          var sum = vec4<f32>(0.0);
          let step = motion * config.blurStrength / f32(config.numSamples);
          
          // Sample along motion vector
          for (var i = 0; i < config.numSamples; i++) {
            let t = f32(i) / f32(config.numSamples - 1) - 0.5;
            let sampleUV = vec2<f32>(f32(id.x), f32(id.y)) + step * t * vec2<f32>(f32(dims.x), f32(dims.y));
            let sampleCoord = vec2<i32>(sampleUV);
            
            if (sampleCoord.x >= 0 && sampleCoord.x < i32(dims.x) &&
                sampleCoord.y >= 0 && sampleCoord.y < i32(dims.y)) {
              sum += textureLoad(inputColor, sampleCoord, 0);
            }
          }
          
          textureStore(outputColor, coord, sum / f32(config.numSamples));
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
   * Create confidence map generation pipeline
   */
  private async createConfidencePipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        @group(0) @binding(0) var motionVectors: texture_2d<f32>;
        @group(0) @binding(1) var depthBuffer: texture_2d<f32>;
        @group(0) @binding(2) var prevDepthBuffer: texture_2d<f32>;
        @group(0) @binding(3) var outputConfidence: texture_storage_2d<r16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(motionVectors);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let motion = textureLoad(motionVectors, coord, 0).xy;
          let depth = textureLoad(depthBuffer, coord, 0).r;
          
          // Motion-based confidence
          let motionMagnitude = length(motion);
          let motionConfidence = 1.0 / (1.0 + motionMagnitude * 10.0);
          
          // Depth-based confidence (closer = more confident)
          let depthConfidence = 1.0 - depth;
          
          // Temporal stability (compare with previous depth)
          let prevDepth = textureLoad(prevDepthBuffer, coord, 0).r;
          let depthDiff = abs(depth - prevDepth);
          let stabilityConfidence = 1.0 / (1.0 + depthDiff * 50.0);
          
          // Combined confidence
          let confidence = motionConfidence * depthConfidence * stabilityConfidence;
          
          textureStore(outputConfidence, coord, vec4<f32>(confidence, 0.0, 0.0, 0.0));
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
   * Create temporal accumulation pipeline
   */
  private async createTemporalAccumPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Config {
          blendWeight: f32,
        }

        @group(0) @binding(0) var currentFrame: texture_2d<f32>;
        @group(0) @binding(1) var historyFrame: texture_2d<f32>;
        @group(0) @binding(2) var confidenceMap: texture_2d<f32>;
        @group(0) @binding(3) var<uniform> config: Config;
        @group(0) @binding(4) var outputFrame: texture_storage_2d<rgba16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(currentFrame);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let current = textureLoad(currentFrame, coord, 0);
          let history = textureLoad(historyFrame, coord, 0);
          let confidence = textureLoad(confidenceMap, coord, 0).r;
          
          // Adaptive blend based on confidence
          let adaptiveWeight = config.blendWeight * confidence;
          let blended = mix(current, history, adaptiveWeight);
          
          textureStore(outputFrame, coord, blended);
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
   * Reproject a frame forward in time
   */
  async reprojectFrame(
    previousFrame: Frame,
    currentDepth: GPUTexture,
    motionData: MotionVectorData,
    width: number,
    height: number
  ): Promise<ReprojectedFrame> {
    const commandEncoder = this.device.createCommandEncoder();

    // Create output textures
    const outputColor = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    const confidenceMap = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'r16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    // Step 1: Depth-aware reprojection
    if (this.reprojectionPipeline) {
      const configData = new Float32Array([
        this.config.depthThreshold,
        this.config.confidenceThreshold
      ]);
      
      const configBuffer = this.device.createBuffer({
        size: configData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      
      this.device.queue.writeBuffer(configBuffer, 0, configData);

      const bindGroup = this.device.createBindGroup({
        layout: this.reprojectionPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: previousFrame.colorBuffer.createView() },
          { binding: 1, resource: previousFrame.depthBuffer.createView() },
          { binding: 2, resource: motionData.motionTexture.createView() },
          { binding: 3, resource: currentDepth.createView() },
          { binding: 4, resource: { buffer: configBuffer } },
          { binding: 5, resource: outputColor.createView() },
          { binding: 6, resource: confidenceMap.createView() }
        ]
      });

      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(this.reprojectionPipeline);
      computePass.setBindGroup(0, bindGroup);
      
      const workgroupsX = Math.ceil(width / 8);
      const workgroupsY = Math.ceil(height / 8);
      computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
      computePass.end();
    }

    // Step 2: Hole filling
    const filledColor = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    if (this.holeFillPipeline) {
      const fillConfigData = new Int32Array([this.config.holeFillRadius]);
      const fillConfigBuffer = this.device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      
      this.device.queue.writeBuffer(fillConfigBuffer, 0, fillConfigData);

      const fillBindGroup = this.device.createBindGroup({
        layout: this.holeFillPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: outputColor.createView() },
          { binding: 1, resource: confidenceMap.createView() },
          { binding: 2, resource: { buffer: fillConfigBuffer } },
          { binding: 3, resource: filledColor.createView() }
        ]
      });

      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(this.holeFillPipeline);
      computePass.setBindGroup(0, fillBindGroup);
      
      const workgroupsX = Math.ceil(width / 8);
      const workgroupsY = Math.ceil(height / 8);
      computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
      computePass.end();
    }

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    return {
      colorBuffer: filledColor,
      depthBuffer: currentDepth,
      confidenceMap,
      coverage: motionData.coverage
    };
  }

  /**
   * Apply motion blur to a frame
   */
  async applyMotionBlur(
    frame: GPUTexture,
    motionVectors: GPUTexture,
    width: number,
    height: number
  ): Promise<GPUTexture> {
    if (!this.motionBlurPipeline) {
      return frame;
    }

    const commandEncoder = this.device.createCommandEncoder();

    const blurredOutput = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    const configData = new Float32Array([
      this.config.blurSamples,
      1.0 // blur strength
    ]);
    
    const configBuffer = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    this.device.queue.writeBuffer(configBuffer, 0, configData);

    const bindGroup = this.device.createBindGroup({
      layout: this.motionBlurPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: frame.createView() },
        { binding: 1, resource: motionVectors.createView() },
        { binding: 2, resource: { buffer: configBuffer } },
        { binding: 3, resource: blurredOutput.createView() }
      ]
    });

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.motionBlurPipeline);
    computePass.setBindGroup(0, bindGroup);
    
    const workgroupsX = Math.ceil(width / 8);
    const workgroupsY = Math.ceil(height / 8);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    return blurredOutput;
  }

  /**
   * Accumulate frame with temporal history
   */
  async accumulateWithHistory(
    currentFrame: GPUTexture,
    historyFrame: GPUTexture,
    confidenceMap: GPUTexture,
    width: number,
    height: number
  ): Promise<GPUTexture> {
    if (!this.temporalAccumPipeline) {
      return currentFrame;
    }

    const commandEncoder = this.device.createCommandEncoder();

    const accumulated = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba16float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });

    const configData = new Float32Array([this.config.temporalBlendWeight]);
    const configBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    this.device.queue.writeBuffer(configBuffer, 0, configData);

    const bindGroup = this.device.createBindGroup({
      layout: this.temporalAccumPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: currentFrame.createView() },
        { binding: 1, resource: historyFrame.createView() },
        { binding: 2, resource: confidenceMap.createView() },
        { binding: 3, resource: { buffer: configBuffer } },
        { binding: 4, resource: accumulated.createView() }
      ]
    });

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.temporalAccumPipeline);
    computePass.setBindGroup(0, bindGroup);
    
    const workgroupsX = Math.ceil(width / 8);
    const workgroupsY = Math.ceil(height / 8);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    return accumulated;
  }
}

console.log('[FrameReprojection] Module loaded');
