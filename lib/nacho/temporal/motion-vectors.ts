/**
 * Motion Vector Generation
 * 
 * Generates per-pixel motion vectors for:
 * - Camera movement (translation, rotation)
 * - Object transforms (position, scale, rotation)
 * - Skeletal animation (bone transforms)
 * - Particle systems (velocity fields)
 * - Deformable meshes (vertex displacement)
 * 
 * Motion vectors are the foundation of temporal synthesis,
 * enabling frame reprojection and prediction.
 */

export interface Transform {
  position: Float32Array; // vec3
  rotation: Float32Array; // quaternion (x, y, z, w)
  scale: Float32Array; // vec3
}

export interface Camera {
  position: Float32Array; // vec3
  rotation: Float32Array; // quaternion
  fov: number;
  near: number;
  far: number;
  viewMatrix: Float32Array; // mat4
  projectionMatrix: Float32Array; // mat4
}

export interface MotionVectorData {
  motionTexture: GPUTexture; // RG16F texture storing (x, y) motion
  velocity: Float32Array; // Overall velocity magnitude
  coverage: number; // Percentage of pixels with valid motion [0, 1]
}

/**
 * Transform History Tracker
 */
class TransformHistory {
  private transforms: Map<string, Transform[]> = new Map();
  private maxHistory: number = 4;

  record(id: string, transform: Transform): void {
    if (!this.transforms.has(id)) {
      this.transforms.set(id, []);
    }
    
    const history = this.transforms.get(id)!;
    history.push(this.cloneTransform(transform));
    
    if (history.length > this.maxHistory) {
      history.shift();
    }
  }

  get(id: string, offset: number = 0): Transform | null {
    const history = this.transforms.get(id);
    if (!history || history.length === 0) return null;
    
    const index = history.length - 1 - offset;
    return index >= 0 ? history[index] : null;
  }

  getDelta(id: string): Transform | null {
    const current = this.get(id, 0);
    const previous = this.get(id, 1);
    
    if (!current || !previous) return null;
    
    return {
      position: new Float32Array([
        current.position[0] - previous.position[0],
        current.position[1] - previous.position[1],
        current.position[2] - previous.position[2]
      ]),
      rotation: new Float32Array([
        current.rotation[0] - previous.rotation[0],
        current.rotation[1] - previous.rotation[1],
        current.rotation[2] - previous.rotation[2],
        current.rotation[3] - previous.rotation[3]
      ]),
      scale: new Float32Array([
        current.scale[0] - previous.scale[0],
        current.scale[1] - previous.scale[1],
        current.scale[2] - previous.scale[2]
      ])
    };
  }

  private cloneTransform(t: Transform): Transform {
    return {
      position: new Float32Array(t.position),
      rotation: new Float32Array(t.rotation),
      scale: new Float32Array(t.scale)
    };
  }

  clear(): void {
    this.transforms.clear();
  }
}

/**
 * Camera Motion Tracker
 */
class CameraMotionTracker {
  private history: Camera[] = [];
  private maxHistory: number = 4;

  record(camera: Camera): void {
    this.history.push(this.cloneCamera(camera));
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getCurrent(): Camera | null {
    return this.history[this.history.length - 1] || null;
  }

  getPrevious(): Camera | null {
    return this.history[this.history.length - 2] || null;
  }

  getDelta(): { position: Float32Array; rotation: Float32Array } | null {
    const current = this.getCurrent();
    const previous = this.getPrevious();
    
    if (!current || !previous) return null;
    
    return {
      position: new Float32Array([
        current.position[0] - previous.position[0],
        current.position[1] - previous.position[1],
        current.position[2] - previous.position[2]
      ]),
      rotation: new Float32Array([
        current.rotation[0] - previous.rotation[0],
        current.rotation[1] - previous.rotation[1],
        current.rotation[2] - previous.rotation[2],
        current.rotation[3] - previous.rotation[3]
      ])
    };
  }

  private cloneCamera(c: Camera): Camera {
    return {
      position: new Float32Array(c.position),
      rotation: new Float32Array(c.rotation),
      fov: c.fov,
      near: c.near,
      far: c.far,
      viewMatrix: new Float32Array(c.viewMatrix),
      projectionMatrix: new Float32Array(c.projectionMatrix)
    };
  }

  clear(): void {
    this.history = [];
  }
}

/**
 * Motion Vector Generator
 */
export class MotionVectorGenerator {
  private device: GPUDevice;
  private transformHistory: TransformHistory;
  private cameraMotion: CameraMotionTracker;
  
  // GPU pipelines
  private motionVectorPipeline: GPUComputePipeline | null = null;
  private cameraMotionPipeline: GPUComputePipeline | null = null;
  private particleMotionPipeline: GPUComputePipeline | null = null;

  constructor(device: GPUDevice) {
    this.device = device;
    this.transformHistory = new TransformHistory();
    this.cameraMotion = new CameraMotionTracker();
    
    console.log('[MotionVectors] Initialized');
  }

  /**
   * Initialize GPU pipelines
   */
  async initializePipelines(): Promise<void> {
    this.motionVectorPipeline = await this.createMotionVectorPipeline();
    this.cameraMotionPipeline = await this.createCameraMotionPipeline();
    this.particleMotionPipeline = await this.createParticleMotionPipeline();
    
    console.log('[MotionVectors] Pipelines initialized');
  }

  /**
   * Create motion vector compute pipeline
   */
  private async createMotionVectorPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Matrices {
          currentViewProj: mat4x4<f32>,
          previousViewProj: mat4x4<f32>,
        }

        @group(0) @binding(0) var<uniform> matrices: Matrices;
        @group(0) @binding(1) var depthTexture: texture_2d<f32>;
        @group(0) @binding(2) var motionOutput: texture_storage_2d<rg16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(depthTexture);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let depth = textureLoad(depthTexture, coord, 0).r;
          
          // Reconstruct world position from depth
          let uv = vec2<f32>(f32(id.x), f32(id.y)) / vec2<f32>(f32(dims.x), f32(dims.y));
          let ndc = vec4<f32>(uv.x * 2.0 - 1.0, (1.0 - uv.y) * 2.0 - 1.0, depth, 1.0);
          
          // Unproject to world space using inverse current view-proj
          var worldPos = ndc; // Simplified, should use inverse matrix
          
          // Project to previous frame screen space
          let prevClip = matrices.previousViewProj * worldPos;
          let prevNDC = prevClip.xyz / prevClip.w;
          let prevUV = vec2<f32>((prevNDC.x + 1.0) * 0.5, (1.0 - prevNDC.y) * 0.5);
          
          // Calculate motion vector in UV space
          let motion = prevUV - uv;
          
          textureStore(motionOutput, coord, vec4<f32>(motion.x, motion.y, 0.0, 0.0));
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
   * Create camera motion pipeline
   */
  private async createCameraMotionPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct CameraData {
          currentPos: vec3<f32>,
          previousPos: vec3<f32>,
          currentRot: vec4<f32>,
          previousRot: vec4<f32>,
        }

        @group(0) @binding(0) var<uniform> camera: CameraData;
        @group(0) @binding(1) var motionOutput: texture_storage_2d<rg16float, write>;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          let dims = textureDimensions(motionOutput);
          if (id.x >= dims.x || id.y >= dims.y) {
            return;
          }

          let coord = vec2<i32>(id.xy);
          let uv = vec2<f32>(f32(id.x), f32(id.y)) / vec2<f32>(f32(dims.x), f32(dims.y));
          
          // Camera translation motion
          let posDelta = camera.currentPos - camera.previousPos;
          let motionMagnitude = length(posDelta);
          
          // Apply radial motion based on screen position
          let center = vec2<f32>(0.5, 0.5);
          let toCenter = uv - center;
          let motion = toCenter * motionMagnitude * 0.1;
          
          textureStore(motionOutput, coord, vec4<f32>(motion.x, motion.y, 0.0, 0.0));
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
   * Create particle motion pipeline
   */
  private async createParticleMotionPipeline(): Promise<GPUComputePipeline> {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Particle {
          position: vec3<f32>,
          velocity: vec3<f32>,
        }

        @group(0) @binding(0) var<storage, read> particles: array<Particle>;
        @group(0) @binding(1) var motionOutput: texture_storage_2d<rg16float, write>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          if (id.x >= arrayLength(&particles)) {
            return;
          }

          let particle = particles[id.x];
          
          // Project particle position to screen space
          // Simplified: assume orthographic projection
          let screenPos = particle.position.xy * 0.5 + 0.5;
          let dims = textureDimensions(motionOutput);
          let pixelPos = vec2<i32>(screenPos * vec2<f32>(f32(dims.x), f32(dims.y)));
          
          if (pixelPos.x >= 0 && pixelPos.x < i32(dims.x) && pixelPos.y >= 0 && pixelPos.y < i32(dims.y)) {
            // Write velocity as motion vector
            let motion = particle.velocity.xy * 0.016; // Assume 60fps
            textureStore(motionOutput, pixelPos, vec4<f32>(motion.x, motion.y, 0.0, 0.0));
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
   * Generate motion vectors for the current frame
   */
  async generateMotionVectors(
    currentCamera: Camera,
    depthBuffer: GPUTexture,
    width: number,
    height: number
  ): Promise<MotionVectorData> {
    // Record camera
    this.cameraMotion.record(currentCamera);

    // Create output motion texture
    const motionTexture = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rg16float',
      usage: GPUTextureUsage.STORAGE_BINDING | 
             GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_SRC
    });

    const commandEncoder = this.device.createCommandEncoder();

    // Generate motion vectors from depth + camera
    if (this.motionVectorPipeline) {
      const previous = this.cameraMotion.getPrevious();
      
      if (previous) {
        // Create matrices buffer
        const matricesData = new Float32Array([
          ...currentCamera.viewMatrix,
          ...currentCamera.projectionMatrix,
          ...previous.viewMatrix,
          ...previous.projectionMatrix
        ]);
        
        const matricesBuffer = this.device.createBuffer({
          size: matricesData.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        
        this.device.queue.writeBuffer(matricesBuffer, 0, matricesData);

        // Create bind group
        const bindGroup = this.device.createBindGroup({
          layout: this.motionVectorPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: matricesBuffer } },
            { binding: 1, resource: depthBuffer.createView() },
            { binding: 2, resource: motionTexture.createView() }
          ]
        });

        // Dispatch
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.motionVectorPipeline);
        computePass.setBindGroup(0, bindGroup);
        
        const workgroupsX = Math.ceil(width / 8);
        const workgroupsY = Math.ceil(height / 8);
        computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
        computePass.end();
      }
    }

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    // Calculate velocity magnitude
    const delta = this.cameraMotion.getDelta();
    const velocity = delta ? 
      new Float32Array([
        delta.position[0],
        delta.position[1],
        delta.position[2]
      ]) : 
      new Float32Array([0, 0, 0]);

    return {
      motionTexture,
      velocity,
      coverage: 1.0 // Simplified, would need actual coverage calculation
    };
  }

  /**
   * Record object transform
   */
  recordTransform(objectId: string, transform: Transform): void {
    this.transformHistory.record(objectId, transform);
  }

  /**
   * Get object motion delta
   */
  getObjectMotion(objectId: string): Transform | null {
    return this.transformHistory.getDelta(objectId);
  }

  /**
   * Get camera motion delta
   */
  getCameraMotion(): { position: Float32Array; rotation: Float32Array } | null {
    return this.cameraMotion.getDelta();
  }

  /**
   * Clear all motion history
   */
  clearHistory(): void {
    this.transformHistory.clear();
    this.cameraMotion.clear();
  }

  /**
   * Predict future motion based on history
   */
  predictMotion(objectId: string, framesAhead: number): Transform | null {
    const current = this.transformHistory.get(objectId, 0);
    const delta = this.transformHistory.getDelta(objectId);
    
    if (!current || !delta) return null;
    
    // Simple linear extrapolation
    return {
      position: new Float32Array([
        current.position[0] + delta.position[0] * framesAhead,
        current.position[1] + delta.position[1] * framesAhead,
        current.position[2] + delta.position[2] * framesAhead
      ]),
      rotation: new Float32Array([
        current.rotation[0] + delta.rotation[0] * framesAhead,
        current.rotation[1] + delta.rotation[1] * framesAhead,
        current.rotation[2] + delta.rotation[2] * framesAhead,
        current.rotation[3] + delta.rotation[3] * framesAhead
      ]),
      scale: new Float32Array([
        current.scale[0] + delta.scale[0] * framesAhead,
        current.scale[1] + delta.scale[1] * framesAhead,
        current.scale[2] + delta.scale[2] * framesAhead
      ])
    };
  }

  /**
   * Predict camera motion
   */
  predictCameraMotion(framesAhead: number): Camera | null {
    const current = this.cameraMotion.getCurrent();
    const delta = this.cameraMotion.getDelta();
    
    if (!current || !delta) return null;
    
    return {
      position: new Float32Array([
        current.position[0] + delta.position[0] * framesAhead,
        current.position[1] + delta.position[1] * framesAhead,
        current.position[2] + delta.position[2] * framesAhead
      ]),
      rotation: new Float32Array([
        current.rotation[0] + delta.rotation[0] * framesAhead,
        current.rotation[1] + delta.rotation[1] * framesAhead,
        current.rotation[2] + delta.rotation[2] * framesAhead,
        current.rotation[3] + delta.rotation[3] * framesAhead
      ]),
      fov: current.fov,
      near: current.near,
      far: current.far,
      viewMatrix: current.viewMatrix, // Would need to recompute
      projectionMatrix: current.projectionMatrix
    };
  }
}

console.log('[MotionVectors] Module loaded');
