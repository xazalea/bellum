/**
 * Remote Execution
 * Execute compute blocks and jobs on remote peers via mesh
 * 
 * Features:
 * - Automatic offloading of hot paths
 * - Fallback to local execution
 * - Job state tracking
 * - Performance monitoring
 */

import { meshScheduler } from './mesh-scheduler';
import { type ComputeJob, type DeviceCapabilities } from './compute';
import { hotPathProfiler, ExecutionTier } from '../execution/profiler';

export interface RemoteExecutionResult {
  jobId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  peerId: string;
  localFallback: boolean;
}

export interface OffloadPolicy {
  // When to offload
  minBlockSize: number; // bytes
  minExecutionCount: number; // Only offload hot paths
  enableOffload: boolean;
  
  // Which peers to use
  preferLocal: boolean; // Try local first
  maxLatency: number; // ms
  minBandwidth: number; // bytes/s
  
  // Retry policy
  maxRetries: number;
  retryDelay: number; // ms
}

/**
 * Remote Execution Service
 * Manages offloading compute tasks to mesh peers
 */
export class RemoteExecution {
  private static instance: RemoteExecution;
  
  private activeJobs: Map<string, Promise<RemoteExecutionResult>> = new Map();
  private jobHistory: RemoteExecutionResult[] = [];
  private offloadPolicy: OffloadPolicy;
  
  private constructor() {
    this.offloadPolicy = {
      minBlockSize: 1024, // 1KB minimum
      minExecutionCount: 1000, // Only offload hot paths
      enableOffload: true,
      preferLocal: false,
      maxLatency: 200, // 200ms max
      minBandwidth: 10 * 1024 * 1024, // 10 MB/s min
      maxRetries: 2,
      retryDelay: 1000,
    };
  }
  
  public static getInstance(): RemoteExecution {
    if (!RemoteExecution.instance) {
      RemoteExecution.instance = new RemoteExecution();
    }
    return RemoteExecution.instance;
  }
  
  /**
   * Execute a compute job remotely
   */
  async executeJob(
    job: ComputeJob,
    localFallback: boolean = true
  ): Promise<RemoteExecutionResult> {
    const jobId = job.id || crypto.randomUUID();
    job.id = jobId;
    
    const startTime = Date.now();
    
    // Check if we should offload
    if (!this.shouldOffload(job)) {
      if (localFallback) {
        return this.executeLocally(job, startTime);
      }
      throw new Error('Job does not meet offload criteria');
    }
    
    // Check if job is already running
    const existing = this.activeJobs.get(jobId);
    if (existing) {
      return existing;
    }
    
    // Schedule job on mesh
    const jobPromise = this.executeOnMesh(job, startTime, localFallback);
    this.activeJobs.set(jobId, jobPromise);
    
    try {
      const result = await jobPromise;
      this.jobHistory.push(result);
      
      // Keep only last 100 results
      if (this.jobHistory.length > 100) {
        this.jobHistory.shift();
      }
      
      return result;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }
  
  /**
   * Check if job should be offloaded
   */
  private shouldOffload(job: ComputeJob): boolean {
    if (!this.offloadPolicy.enableOffload) return false;
    
    // Check job size
    const jobSize = this.estimateJobSize(job);
    if (jobSize < this.offloadPolicy.minBlockSize) return false;
    
    // For compilation jobs, check if it's a hot path
    if (job.type === 'COMPILE_CHUNK' && job.payload.code) {
      // Would check profiler for execution count
      // For now, allow offload if job is large enough
      return jobSize >= this.offloadPolicy.minBlockSize;
    }
    
    return true;
  }
  
  /**
   * Execute job on mesh
   */
  private async executeOnMesh(
    job: ComputeJob,
    startTime: number,
    localFallback: boolean
  ): Promise<RemoteExecutionResult> {
    try {
      const jobClass = job.deadline && job.deadline - Date.now() < 5000 ? 'interactive' : 'batch';
      // Schedule job
      const scheduleResult = await meshScheduler.scheduleJob(
        job,
        'scored',
        job.deadline ? job.deadline - Date.now() : undefined,
        { jobClass }
      );
      
      if (!scheduleResult.success) {
        throw new Error(scheduleResult.error || 'Scheduling failed');
      }
      
      const duration = Date.now() - startTime;
      
      return {
        jobId: job.id!,
        success: true,
        result: scheduleResult,
        duration,
        peerId: scheduleResult.assignedPeerId,
        localFallback: false,
      };
    } catch (error: any) {
      // Fallback to local execution if enabled
      if (localFallback) {
        console.warn(`[RemoteExecution] Mesh execution failed, falling back to local: ${error.message}`);
        return this.executeLocally(job, startTime);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        jobId: job.id!,
        success: false,
        error: error.message,
        duration,
        peerId: '',
        localFallback: false,
      };
    }
  }
  
  /**
   * Execute job locally (fallback)
   */
  private async executeLocally(
    job: ComputeJob,
    startTime: number
  ): Promise<RemoteExecutionResult> {
    // Simulate local execution
    // In real implementation, would use local JIT compiler
    
    try {
      // Simulate processing time
      const jobSize = this.estimateJobSize(job);
      const processingTime = Math.min(100, jobSize / 10000); // ~10KB/ms
      
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      const duration = Date.now() - startTime;
      
      return {
        jobId: job.id!,
        success: true,
        result: { local: true, processed: jobSize },
        duration,
        peerId: 'local',
        localFallback: true,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        jobId: job.id!,
        success: false,
        error: error.message,
        duration,
        peerId: 'local',
        localFallback: true,
      };
    }
  }
  
  /**
   * Offload hot path compilation
   */
  async offloadHotPathCompilation(
    address: number,
    code: Uint8Array,
    arch: 'x86' | 'arm' | 'dalvik'
  ): Promise<RemoteExecutionResult | null> {
    const profile = hotPathProfiler.getBlockProfile(address);
    
    // Only offload if it's a hot path
    if (!profile || profile.executionCount < this.offloadPolicy.minExecutionCount) {
      return null;
    }
    
    const job: ComputeJob = {
      id: crypto.randomUUID(),
      type: 'COMPILE_CHUNK',
      payload: { code, arch },
      priority: profile.tier === ExecutionTier.CRITICAL ? 0.9 : 0.7,
    };
    
    return this.executeJob(job, true);
  }
  
  /**
   * Get offload policy
   */
  getOffloadPolicy(): OffloadPolicy {
    return { ...this.offloadPolicy };
  }
  
  /**
   * Update offload policy
   */
  updateOffloadPolicy(policy: Partial<OffloadPolicy>): void {
    this.offloadPolicy = { ...this.offloadPolicy, ...policy };
  }
  
  /**
   * Get job statistics
   */
  getStatistics(): {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    localFallbacks: number;
    avgDuration: number;
    avgRemoteDuration: number;
    avgLocalDuration: number;
  } {
    const total = this.jobHistory.length;
    const successful = this.jobHistory.filter(j => j.success).length;
    const failed = total - successful;
    const localFallbacks = this.jobHistory.filter(j => j.localFallback).length;
    
    const avgDuration = total > 0
      ? this.jobHistory.reduce((sum, j) => sum + j.duration, 0) / total
      : 0;
    
    const remoteJobs = this.jobHistory.filter(j => !j.localFallback);
    const avgRemoteDuration = remoteJobs.length > 0
      ? remoteJobs.reduce((sum, j) => sum + j.duration, 0) / remoteJobs.length
      : 0;
    
    const localJobs = this.jobHistory.filter(j => j.localFallback);
    const avgLocalDuration = localJobs.length > 0
      ? localJobs.reduce((sum, j) => sum + j.duration, 0) / localJobs.length
      : 0;
    
    return {
      totalJobs: total,
      successfulJobs: successful,
      failedJobs: failed,
      localFallbacks,
      avgDuration,
      avgRemoteDuration,
      avgLocalDuration,
    };
  }
  
  /**
   * Estimate job size
   */
  private estimateJobSize(job: ComputeJob): number {
    let size = 0;
    
    if (job.payload.code) size += job.payload.code.byteLength;
    if (job.payload.data) size += job.payload.data.byteLength;
    if (job.payload.modelWeights) size += job.payload.modelWeights.byteLength;
    if (job.payload.shaderSource) size += job.payload.shaderSource.length * 2; // UTF-16
    
    return size;
  }
  
  /**
   * Get active jobs
   */
  getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys());
  }
  
  /**
   * Get job history
   */
  getJobHistory(): RemoteExecutionResult[] {
    return [...this.jobHistory];
  }
}

// Export singleton
export const remoteExecution = RemoteExecution.getInstance();
