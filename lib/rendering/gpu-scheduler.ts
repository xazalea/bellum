/**
 * GPU Scheduler (tiny-gpu-inspired)
 * Batches render work into warps and coalesces memory uploads.
 */

export interface RenderWarp {
  pipelineKey: string;
  commandCount: number;
  submittedAt: number;
}

export interface MemoryUpload {
  bufferId: string;
  size: number;
  submittedAt: number;
}

export class GPUScheduler {
  private warps: RenderWarp[] = [];
  private uploads: MemoryUpload[] = [];
  private maxWarpSize = 64;

  enqueueWarp(pipelineKey: string, commandCount: number): void {
    this.warps.push({
      pipelineKey,
      commandCount,
      submittedAt: performance.now(),
    });
  }

  enqueueUpload(bufferId: string, size: number): void {
    this.uploads.push({ bufferId, size, submittedAt: performance.now() });
  }

  flush(): { warps: RenderWarp[]; uploads: MemoryUpload[] } {
    const warps = this.coalesceWarps();
    const uploads = this.coalesceUploads();
    this.warps = [];
    this.uploads = [];
    return { warps, uploads };
  }

  private coalesceWarps(): RenderWarp[] {
    const grouped = new Map<string, number>();
    for (const warp of this.warps) {
      grouped.set(warp.pipelineKey, (grouped.get(warp.pipelineKey) || 0) + warp.commandCount);
    }
    const batched: RenderWarp[] = [];
    for (const [pipelineKey, commandCount] of grouped.entries()) {
      let remaining = commandCount;
      while (remaining > 0) {
        const batch = Math.min(this.maxWarpSize, remaining);
        batched.push({ pipelineKey, commandCount: batch, submittedAt: performance.now() });
        remaining -= batch;
      }
    }
    return batched;
  }

  private coalesceUploads(): MemoryUpload[] {
    const grouped = new Map<string, number>();
    for (const upload of this.uploads) {
      grouped.set(upload.bufferId, (grouped.get(upload.bufferId) || 0) + upload.size);
    }
    return Array.from(grouped.entries()).map(([bufferId, size]) => ({
      bufferId,
      size,
      submittedAt: performance.now(),
    }));
  }
}
