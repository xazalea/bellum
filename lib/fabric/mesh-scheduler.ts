/**
 * Mesh Scheduler
 * Intelligent task routing and scheduling for P2P compute mesh
 * 
 * Features:
 * - Capability-based peer selection
 * - Latency and bandwidth-aware routing
 * - Task retry and quorum support
 * - Streaming RPC with flow control
 */

import { fabricMesh, type FabricServiceAd } from './mesh';
import { type DeviceCapabilities, type ComputeJob, type TaskSchedulingResult } from './compute';

export interface PeerCapabilities extends DeviceCapabilities {
  peerId: string;
  nodeId: string;
  lastHeartbeat: number;
  latency: number; // ms
  latencyVariance: number; // ms^2 (for jitter measurement)
  bandwidth: number; // bytes/s
  currentLoad: number; // 0-1
  supportedTaskTypes: ComputeJob['type'][];
  
  // Scoring metrics
  successRate: number; // 0-1 (historic)
  totalJobsCompleted: number;
  totalJobsFailed: number;
  averageResponseTime: number; // ms
  availability: number; // 0-1 (uptime ratio)
  lastSuccessTime: number;
  lastFailureTime: number;
}

export interface ScheduledTask {
  jobId: string;
  job: ComputeJob;
  assignedPeer: PeerCapabilities | null;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'retrying' | 'preempted';
  retryCount: number;
  startTime: number;
  deadline: number;
  result?: any;
  error?: string;
  jobClass: 'interactive' | 'batch' | 'background'; // Job priority class
  preemptible: boolean; // Can be preempted by higher priority jobs
}

export interface RoutingStrategy {
  name: string;
  selectPeer(job: ComputeJob, candidates: PeerCapabilities[]): PeerCapabilities | null;
}

/**
 * Mesh Scheduler
 * Routes compute jobs to optimal peers in the fabric mesh
 */
export class MeshScheduler {
  private static instance: MeshScheduler;
  
  private capabilities: Map<string, PeerCapabilities> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private routingStrategies: Map<string, RoutingStrategy> = new Map();
  
  // Task batching
  private batchQueue: ComputeJob[] = [];
  private batchSize: number = 10;
  private batchInterval: number = 100; // ms
  private batchTimer: number | null = null;
  
  // Streaming RPC state
  private activeStreams: Map<string, {
    peerId: string;
    streamId: string;
    chunks: Uint8Array[];
    totalSize: number;
    onComplete: (data: Uint8Array) => void;
    onError: (error: Error) => void;
  }> = new Map();
  
  private heartbeatInterval: number | null = null;
  private taskTimeout: number = 30000; // 30 seconds default
  
  private constructor() {
    this.initialize();
  }
  
  public static getInstance(): MeshScheduler {
    if (!MeshScheduler.instance) {
      MeshScheduler.instance = new MeshScheduler();
    }
    return MeshScheduler.instance;
  }
  
  /**
   * Initialize scheduler
   */
  private initialize(): void {
    console.log('[MeshScheduler] Initializing...');
    
    // Register routing strategies
    this.registerRoutingStrategy('latency', {
      name: 'latency',
      selectPeer: (job, candidates) => this.selectByLatency(job, candidates),
    });
    
    this.registerRoutingStrategy('bandwidth', {
      name: 'bandwidth',
      selectPeer: (job, candidates) => this.selectByBandwidth(job, candidates),
    });
    
    this.registerRoutingStrategy('capacity', {
      name: 'capacity',
      selectPeer: (job, candidates) => this.selectByCapacity(job, candidates),
    });
    
    this.registerRoutingStrategy('balanced', {
      name: 'balanced',
      selectPeer: (job, candidates) => this.selectBalanced(job, candidates),
    });
    
    this.registerRoutingStrategy('scored', {
      name: 'scored',
      selectPeer: (job, candidates) => this.selectByScore(job, candidates),
    });
    
    // Start batch processor
    this.startBatchProcessor();
    
    // Start capability heartbeat
    this.startCapabilityHeartbeat();
    
    // Listen for service advertisements
    this.setupServiceListener();
    
    console.log('[MeshScheduler] Initialized');
  }
  
  /**
   * Start capability heartbeat
   */
  private startCapabilityHeartbeat(): void {
    // Advertise our capabilities every 5 seconds
    this.heartbeatInterval = window.setInterval(() => {
      this.advertiseCapabilities();
    }, 5000);
    
    // Initial advertisement
    this.advertiseCapabilities();
  }
  
  /**
   * Advertise local capabilities
   */
  private advertiseCapabilities(): void {
    const localNodeId = fabricMesh.getLocalNodeId();
    if (!localNodeId) return;
    
    const capabilities = this.detectLocalCapabilities();
    
    // Store our own capabilities
    this.capabilities.set(localNodeId, {
      ...capabilities,
      peerId: localNodeId,
      nodeId: localNodeId,
      lastHeartbeat: Date.now(),
      latency: 0,
      currentLoad: this.calculateCurrentLoad(),
    });
    
    // Broadcast capability update via service ad
    fabricMesh.advertiseService('mesh-capabilities', 'Mesh Scheduler Capabilities');
    
    // In a real implementation, would send detailed capability data
    // For now, capabilities are inferred from service ads
  }
  
  /**
   * Detect local device capabilities
   */
  private detectLocalCapabilities(): DeviceCapabilities {
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory 
      ? (navigator as any).deviceMemory * 1024 * 1024 * 1024 
      : 8 * 1024 * 1024 * 1024;
    
    return {
      computeUnits: hardwareConcurrency,
      memory: deviceMemory,
      gpuVRAM: 2 * 1024 * 1024 * 1024, // Estimate
      bandwidth: 100 * 1024 * 1024, // 100 MB/s estimate
      battery: null,
      thermalState: 'nominal',
      supportedTaskTypes: [
        'COMPILE_CHUNK',
        'EXECUTE_TASK',
        'SHADER_COMPILE',
        'ML_INFERENCE',
        'PHYSICS_SIM',
        'DECOMPRESS',
      ],
    };
  }
  
  /**
   * Calculate current load
   */
  private calculateCurrentLoad(): number {
    const activeTasks = Array.from(this.scheduledTasks.values())
      .filter(t => t.status === 'running' || t.status === 'assigned').length;
    
    // Normalize to 0-1 (assume max 10 concurrent tasks)
    return Math.min(1.0, activeTasks / 10);
  }
  
  /**
   * Setup service listener to track peer capabilities
   */
  private setupServiceListener(): void {
    // Poll services periodically to build capability map
    const updateInterval = setInterval(() => {
      const services = fabricMesh.getServices();
      
      for (const service of services) {
        if (service.serviceId === 'compute-v1' || service.serviceId === 'mesh-capabilities') {
          // Update or create capability entry
          const existing = this.capabilities.get(service.nodeId);
          
          if (existing) {
            existing.lastHeartbeat = Date.now();
          } else {
            // Create new capability entry with defaults
            this.capabilities.set(service.nodeId, {
              peerId: service.peerId,
              nodeId: service.nodeId,
              computeUnits: 4, // Default estimate
              memory: 4 * 1024 * 1024 * 1024,
              gpuVRAM: 1 * 1024 * 1024 * 1024,
              bandwidth: 50 * 1024 * 1024,
              battery: null,
              thermalState: 'nominal',
            lastHeartbeat: Date.now(),
            latency: 50, // Estimate
            latencyVariance: 10,
            currentLoad: 0,
            supportedTaskTypes: ['COMPILE_CHUNK', 'EXECUTE_TASK'],
            successRate: 1.0,
            totalJobsCompleted: 0,
            totalJobsFailed: 0,
            averageResponseTime: 50,
            availability: 1.0,
            lastSuccessTime: Date.now(),
            lastFailureTime: 0,
          });
          }
        }
      }
      
      // Remove stale peers (no heartbeat for 30 seconds)
      const now = Date.now();
      for (const [nodeId, caps] of this.capabilities.entries()) {
        if (nodeId !== fabricMesh.getLocalNodeId() && now - caps.lastHeartbeat > 30000) {
          this.capabilities.delete(nodeId);
        }
      }
    }, 2000);
  }
  
  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.batchTimer = window.setInterval(() => {
      this.processBatch();
    }, this.batchInterval);
  }
  
  /**
   * Process batched jobs
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.splice(0, this.batchSize);
    
    // Schedule batch concurrently
    await Promise.allSettled(
      batch.map(job => this.scheduleJobInternal(job, 'scored'))
    );
  }
  
  /**
   * Schedule a compute job (with optional batching)
   */
  async scheduleJob(
    job: ComputeJob,
    strategy: string = 'balanced',
    timeout?: number,
    options?: { batch?: boolean; jobClass?: 'interactive' | 'batch' | 'background' }
  ): Promise<TaskSchedulingResult> {
    // Determine job class
    const jobClass = options?.jobClass || 
      (job.deadline && job.deadline - Date.now() < 5000 ? 'interactive' : 'batch');
    
    // Batch low-priority jobs
    if (options?.batch || jobClass === 'background') {
      this.batchQueue.push(job);
      return {
        jobId: job.id!,
        assignedPeerId: 'batched',
        estimatedCompletionTime: this.batchInterval * 2,
        success: true,
      };
    }
    
    return this.scheduleJobInternal(job, strategy, timeout, jobClass);
  }
  
  /**
   * Internal job scheduling
   */
  private async scheduleJobInternal(
    job: ComputeJob,
    strategy: string = 'balanced',
    timeout?: number,
    jobClass: 'interactive' | 'batch' | 'background' = 'batch'
  ): Promise<TaskSchedulingResult> {
    const jobId = job.id || crypto.randomUUID();
    job.id = jobId;
    
    // Create scheduled task
    const task: ScheduledTask = {
      jobId,
      job,
      assignedPeer: null,
      status: 'pending',
      retryCount: 0,
      startTime: Date.now(),
      deadline: job.deadline || (Date.now() + (timeout || this.taskTimeout)),
      jobClass,
      preemptible: jobClass !== 'interactive',
    };
    
    this.scheduledTasks.set(jobId, task);
    
    // Find suitable peer
    const candidates = this.findCandidatePeers(job);
    
    if (candidates.length === 0) {
      task.status = 'failed';
      task.error = 'No suitable peers available';
      
      return {
        jobId,
        assignedPeerId: '',
        estimatedCompletionTime: 0,
        success: false,
        error: 'No suitable peers available',
      };
    }
    
    // Select peer using strategy
    const strategyImpl = this.routingStrategies.get(strategy) || this.routingStrategies.get('balanced')!;
    const selectedPeer = strategyImpl.selectPeer(job, candidates);
    
    if (!selectedPeer) {
      task.status = 'failed';
      task.error = 'Failed to select peer';
      
      return {
        jobId,
        assignedPeerId: '',
        estimatedCompletionTime: 0,
        success: false,
        error: 'Failed to select peer',
      };
    }
    
    task.assignedPeer = selectedPeer;
    task.status = 'assigned';
    
    // Execute job on peer
    try {
      const result = await this.executeJobOnPeer(job, selectedPeer, task);
      
      task.status = 'completed';
      task.result = result;
      
      // Update peer metrics on success
      selectedPeer.currentLoad = Math.max(0, selectedPeer.currentLoad - 0.1);
      selectedPeer.totalJobsCompleted++;
      selectedPeer.lastSuccessTime = Date.now();
      selectedPeer.successRate = selectedPeer.totalJobsCompleted / 
        (selectedPeer.totalJobsCompleted + selectedPeer.totalJobsFailed + 1);
      selectedPeer.averageResponseTime = 
        (selectedPeer.averageResponseTime * (selectedPeer.totalJobsCompleted - 1) + 
         (Date.now() - task.startTime)) / selectedPeer.totalJobsCompleted;
      
      return {
        jobId,
        assignedPeerId: selectedPeer.peerId,
        estimatedCompletionTime: Date.now() - task.startTime,
        success: true,
      };
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      
      // Update peer metrics on failure
      selectedPeer.totalJobsFailed++;
      selectedPeer.lastFailureTime = Date.now();
      selectedPeer.successRate = selectedPeer.totalJobsCompleted / 
        (selectedPeer.totalJobsCompleted + selectedPeer.totalJobsFailed);
      
      // Retry logic
      if (task.retryCount < 3 && jobClass !== 'background') {
        task.retryCount++;
        task.status = 'retrying';
        
        // Retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, task.retryCount)));
        
        return this.scheduleJobInternal(job, strategy, timeout, jobClass);
      }
      
      return {
        jobId,
        assignedPeerId: selectedPeer.peerId,
        estimatedCompletionTime: Date.now() - task.startTime,
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Execute job on peer (with streaming support for large jobs)
   */
  private async executeJobOnPeer(
    job: ComputeJob,
    peer: PeerCapabilities,
    task: ScheduledTask
  ): Promise<any> {
    // Check for preemption
    if (task.preemptible && this.shouldPreempt(task)) {
      task.status = 'preempted';
      throw new Error('Job preempted by higher priority task');
    }
    // Find service for this peer
    const services = fabricMesh.getServices();
    const service = services.find(s => s.nodeId === peer.nodeId && s.serviceId === 'compute-v1');
    
    if (!service) {
      throw new Error(`No compute service found for peer ${peer.nodeId}`);
    }
    
    // Update peer load
    peer.currentLoad = Math.min(1.0, peer.currentLoad + 0.2);
    
    try {
      // For large jobs, use streaming
      const jobSize = this.estimateJobSize(job);
      if (jobSize > 1024 * 1024) { // > 1MB
        return await this.executeJobStreaming(job, peer, service);
      }
      
      // Call RPC for small jobs
      const result = await fabricMesh.rpcCall(service.serviceId, job);
      return result;
    } catch (error: any) {
      // Update peer load on failure
      peer.currentLoad = Math.max(0, peer.currentLoad - 0.1);
      throw error;
    }
  }
  
  /**
   * Execute large job with streaming
   */
  private async executeJobStreaming(
    job: ComputeJob,
    peer: PeerCapabilities,
    service: any
  ): Promise<any> {
    // Serialize job to bytes
    const jobBytes = new TextEncoder().encode(JSON.stringify(job));
    const streamId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      // Setup stream receiver
      const receiver = {
        peerId: peer.peerId,
        streamId,
        chunks: [] as Uint8Array[],
        totalSize: jobBytes.length,
        onComplete: (data: Uint8Array) => {
          try {
            const result = JSON.parse(new TextDecoder().decode(data));
            this.activeStreams.delete(streamId);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        onError: (error: Error) => {
          this.activeStreams.delete(streamId);
          reject(error);
        },
      };
      
      this.activeStreams.set(streamId, receiver);
      
      // Send job via streaming
      fabricMesh.sendBytes(peer.peerId, jobBytes)
        .then(() => {
          // Wait for response stream
          fabricMesh.receiveBytes(streamId, peer.peerId, 1, 30000)
            .then(receiver.onComplete)
            .catch(receiver.onError);
        })
        .catch(receiver.onError);
    });
  }
  
  /**
   * Check if task should be preempted
   */
  private shouldPreempt(task: ScheduledTask): boolean {
    // Check for higher priority interactive jobs waiting
    const interactiveTasks = Array.from(this.scheduledTasks.values())
      .filter(t => t.jobClass === 'interactive' && t.status === 'pending');
    
    return interactiveTasks.length > 0 && task.jobClass !== 'interactive';
  }
  
  /**
   * Select peer by comprehensive score
   */
  private selectByScore(job: ComputeJob, candidates: PeerCapabilities[]): PeerCapabilities | null {
    if (candidates.length === 0) return null;
    
    return candidates.reduce((best, current) => {
      // Calculate composite score
      const latencyScore = 1.0 / (1.0 + current.latency / 100 + current.latencyVariance / 50);
      const successScore = current.successRate;
      const availabilityScore = current.availability;
      const loadScore = 1.0 - current.currentLoad;
      const capacityScore = current.computeUnits / 8;
      
      // Weighted combination
      const bestScore = 
        0.25 * (1.0 / (1.0 + best.latency / 100 + best.latencyVariance / 50)) +
        0.25 * best.successRate +
        0.15 * best.availability +
        0.15 * (1.0 - best.currentLoad) +
        0.20 * (best.computeUnits / 8);
      
      const currentScore = 
        0.25 * latencyScore +
        0.25 * successScore +
        0.15 * availabilityScore +
        0.15 * loadScore +
        0.20 * capacityScore;
      
      return currentScore > bestScore ? current : best;
    });
  }
  
  /**
   * Find candidate peers for a job
   */
  private findCandidatePeers(job: ComputeJob): PeerCapabilities[] {
    const candidates: PeerCapabilities[] = [];
    
    for (const caps of this.capabilities.values()) {
      // Skip self
      if (caps.nodeId === fabricMesh.getLocalNodeId()) continue;
      
      // Check if peer supports this task type
      if (!caps.supportedTaskTypes.includes(job.type)) continue;
      
      // Check if peer has capacity
      if (caps.currentLoad > 0.9) continue;
      
      // Check thermal state
      if (caps.thermalState === 'critical') continue;
      
      candidates.push(caps);
    }
    
    return candidates;
  }
  
  /**
   * Register routing strategy
   */
  registerRoutingStrategy(name: string, strategy: RoutingStrategy): void {
    this.routingStrategies.set(name, strategy);
  }
  
  /**
   * Select peer by latency
   */
  private selectByLatency(job: ComputeJob, candidates: PeerCapabilities[]): PeerCapabilities | null {
    if (candidates.length === 0) return null;
    
    return candidates.reduce((best, current) => 
      current.latency < best.latency ? current : best
    );
  }
  
  /**
   * Select peer by bandwidth
   */
  private selectByBandwidth(job: ComputeJob, candidates: PeerCapabilities[]): PeerCapabilities | null {
    if (candidates.length === 0) return null;
    
    // Estimate job size
    const jobSize = this.estimateJobSize(job);
    
    // Prefer peers with higher bandwidth for large jobs
    return candidates.reduce((best, current) => {
      const bestScore = best.bandwidth / (best.currentLoad + 0.1);
      const currentScore = current.bandwidth / (current.currentLoad + 0.1);
      return currentScore > bestScore ? current : best;
    });
  }
  
  /**
   * Select peer by capacity
   */
  private selectByCapacity(job: ComputeJob, candidates: PeerCapabilities[]): PeerCapabilities | null {
    if (candidates.length === 0) return null;
    
    return candidates.reduce((best, current) => {
      const bestScore = best.computeUnits * (1 - best.currentLoad);
      const currentScore = current.computeUnits * (1 - current.currentLoad);
      return currentScore > bestScore ? current : best;
    });
  }
  
  /**
   * Balanced selection (latency + capacity + load)
   */
  private selectBalanced(job: ComputeJob, candidates: PeerCapabilities[]): PeerCapabilities | null {
    if (candidates.length === 0) return null;
    
    const jobSize = this.estimateJobSize(job);
    const isLargeJob = jobSize > 1024 * 1024; // > 1MB
    
    return candidates.reduce((best, current) => {
      // Score based on multiple factors
      const latencyScore = 1.0 / (1.0 + current.latency / 100);
      const capacityScore = current.computeUnits / 8;
      const loadScore = 1.0 - current.currentLoad;
      const bandwidthScore = isLargeJob ? current.bandwidth / (100 * 1024 * 1024) : 1.0;
      
      const bestScore = 
        (best.latency < 100 ? 0.3 : 0.1) * (1.0 / (1.0 + best.latency / 100)) +
        0.3 * (best.computeUnits / 8) +
        0.2 * (1.0 - best.currentLoad) +
        (isLargeJob ? 0.2 * (best.bandwidth / (100 * 1024 * 1024)) : 0.2);
      
      const currentScore = 
        (current.latency < 100 ? 0.3 : 0.1) * latencyScore +
        0.3 * capacityScore +
        0.2 * loadScore +
        (isLargeJob ? 0.2 * bandwidthScore : 0.2);
      
      return currentScore > bestScore ? current : best;
    });
  }
  
  /**
   * Estimate job size in bytes
   */
  private estimateJobSize(job: ComputeJob): number {
    let size = 0;
    
    if (job.payload.code) size += job.payload.code.byteLength;
    if (job.payload.data) size += job.payload.data.byteLength;
    if (job.payload.modelWeights) size += job.payload.modelWeights.byteLength;
    if (job.payload.shaderSource) size += job.payload.shaderSource.length;
    
    return size;
  }
  
  /**
   * Get scheduled tasks
   */
  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }
  
  /**
   * Get peer capabilities
   */
  getPeerCapabilities(): PeerCapabilities[] {
    return Array.from(this.capabilities.values());
  }
  
  /**
   * Shutdown scheduler
   */
  shutdown(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.batchTimer !== null) {
      clearInterval(this.batchTimer);
    }
    this.capabilities.clear();
    this.scheduledTasks.clear();
    this.batchQueue = [];
    this.activeStreams.clear();
    console.log('[MeshScheduler] Shutdown complete');
  }
}

// Export singleton
export const meshScheduler = MeshScheduler.getInstance();
