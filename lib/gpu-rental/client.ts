export interface GpuRunResult {
  durationMs: number;
  workItems: number;
}

export async function runGpuRentalCompute(workItems = 1_000_000): Promise<GpuRunResult> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('No GPU adapter available');

  const device = await adapter.requestDevice();
  const start = performance.now();

  const shaderModule = device.createShaderModule({
    code: `
      @group(0) @binding(0) var<storage, read> a: array<u32>;
      @group(0) @binding(1) var<storage, read> b: array<u32>;
      @group(0) @binding(2) var<storage, read_write> out: array<u32>;

      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        let idx = id.x;
        if (idx < arrayLength(&out)) {
          out[idx] = a[idx] + b[idx];
        }
      }
    `,
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: shaderModule, entryPoint: 'main' },
  });

  const size = Math.max(1, workItems);
  const byteLength = size * 4;
  const a = device.createBuffer({ size: byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const b = device.createBuffer({ size: byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const out = device.createBuffer({ size: byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });

  const seed = new Uint32Array(size);
  for (let i = 0; i < size; i++) seed[i] = i % 1024;
  device.queue.writeBuffer(a, 0, seed);
  device.queue.writeBuffer(b, 0, seed);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: a } },
      { binding: 1, resource: { buffer: b } },
      { binding: 2, resource: { buffer: out } },
    ],
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(size / 256));
  pass.end();
  device.queue.submit([encoder.finish()]);

  try {
    if ('onSubmittedWorkDone' in device.queue) {
      await (device.queue as any).onSubmittedWorkDone();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } catch {
    // ignore
  }

  const durationMs = performance.now() - start;
  return { durationMs, workItems: size };
}
