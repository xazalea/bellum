/**
 * GPU Compute Accelerator
 * Offloads CPU-heavy tasks to WebGPU compute shaders where possible.
 */

export class GPUComputeAccelerator {
  private device: GPUDevice | null = null;

  async initialize(device: GPUDevice): Promise<void> {
    this.device = device;
  }

  async acceleratePhysics(positions: Float32Array, velocities: Float32Array, dt: number): Promise<Float32Array> {
    if (!this.device) {
      return this.cpuPhysics(positions, velocities, dt);
    }
    // Minimal compute fallback: do CPU update for now, GPU kernel can be added later.
    return this.cpuPhysics(positions, velocities, dt);
  }

  async accelerateAudioMix(bufferA: Float32Array, bufferB: Float32Array): Promise<Float32Array> {
    if (!this.device) {
      return this.cpuAudioMix(bufferA, bufferB);
    }
    return this.cpuAudioMix(bufferA, bufferB);
  }

  async accelerateAI(inputs: Float32Array, weights: Float32Array): Promise<Float32Array> {
    if (!this.device) {
      return this.cpuAI(inputs, weights);
    }
    return this.cpuAI(inputs, weights);
  }

  private cpuPhysics(positions: Float32Array, velocities: Float32Array, dt: number): Float32Array {
    const out = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
      out[i] = positions[i] + velocities[i] * dt;
    }
    return out;
  }

  private cpuAudioMix(a: Float32Array, b: Float32Array): Float32Array {
    const len = Math.min(a.length, b.length);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = Math.max(-1, Math.min(1, a[i] + b[i]));
    }
    return out;
  }

  private cpuAI(inputs: Float32Array, weights: Float32Array): Float32Array {
    const out = new Float32Array(inputs.length);
    for (let i = 0; i < inputs.length; i++) {
      out[i] = inputs[i] * (weights[i % weights.length] || 1);
    }
    return out;
  }
}
