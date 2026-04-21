/**
 * Compute Task Protocol for Mesh Offloading
 * Extends FabricMesh with distributed compute capabilities
 */

import { FabricMesh, FabricPeer, FabricServiceAd } from './mesh';

export type TaskType = 
  | 'COMPILE_DEX' 
  | 'COMPILE_PE' 
  | 'RENDER_FRAME' 
  | 'DECOMPRESS' 
  | 'TRANSCODE'
  | 'ANALYZE';

export type TaskPriority = 'low' | 'normal' | 'high';

export type TaskStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

export interface ComputeTask {
  id: string;
  type: TaskType;
  input: Uint8Array;
  memoryBudget: number;
  timeoutMs: number;
  priority: TaskPriority;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface ComputeResult {
  taskId: string;
  ok: boolean;
  output?: Uint8Array;
  error?: string;
  metrics: {
    computeTime: number;
    memoryUsed: number;
    bytesIn: number;
    bytesOut: number;
  };
  peerId: string;
  completedAt: number;
  checksum?: string; // SHA-256 hash for integrity verification
}

export interface ResultChunk {
  taskId: string;
  chunkIndex: number;
  totalChunks: number;
  data: Uint8Array;
  checksum: string;
}

export interface ResultStream {
  taskId: string;
  chunks: ResultChunk[];
  totalSize: number;
  receivedSize: number;
  complete: boolean;
  checksum: string; // Overall checksum for verification
}

export interface ComputeProgress {
  taskId: string;
  progress: number; // 0-100
  stage: string;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface ComputeCapability {
  peerId: string;
  nodeId: string;
  taskTypes: TaskType[];
  maxMemory: number;
  currentLoad: number; // 0-100
  avgComputeTime: Record<TaskType, number>;
  supportedFeatures: string[];
  lastUpdated: number;
}

export interface TaskAck {
  taskId: string;
  accepted: boolean;
  reason?: string;
  estimatedTime?: number;
}

// Protocol message types
type ComputeMessage =
  | { type: 'COMPUTE_AD'; payload: ComputeCapability }
  | { type: 'COMPUTE_TASK'; payload: ComputeTask }
  | { type: 'COMPUTE_ACK'; payload: TaskAck }
  | { type: 'COMPUTE_PROGRESS'; payload: ComputeProgress }
  | { type: 'COMPUTE_RESULT'; payload: ComputeResult }
  | { type: 'COMPUTE_CANCEL'; payload: { taskId: string } };

// Event callbacks
export type TaskProgressCallback = (progress: ComputeProgress) => void;
export type TaskCompleteCallback = (result: ComputeResult) => void;
export type CapabilityUpdateCallback = (capabilities: ComputeCapability[]) => void;

class ComputeProtocol {
  private mesh: FabricMesh;
  private capabilities: Map<string, ComputeCapability> = new Map();
  private pendingTasks: Map<string, {
    task: ComputeTask;
    resolve: (result: ComputeResult) => void;
    reject: (error: Error) => void;
    progressCallback?: TaskProgressCallback;
    startTime: number;
    timeoutId: number | null;
    retryCount: number;
    assignedPeer?: string;
  }> = new Map();
  
  private taskQueue: ComputeTask[] = [];
  private maxRetries = 3;
  private defaultTimeout = 30000;
  
  private progressCallbacks: Set<TaskProgressCallback> = new Set();
  private completeCallbacks: Set<TaskCompleteCallback> = new Set();
  private capabilityCallbacks: Set<CapabilityUpdateCallback> = new Set();

  constructor(mesh: FabricMesh) {
    this.mesh = mesh;
    this.setupMeshHandlers();
  }

  /**
   * Set up handlers for mesh messages
   */
  private setupMeshHandlers(): void {
    // Handle compute capability advertisements
    this.mesh.onRpcRequest((req) => {
      const { id, serviceId, request, fromPeerId } = req;
      
      try {
        const msg = request as ComputeMessage;
        
        switch (msg.type) {
          case 'COMPUTE_AD':
            this.handleCapabilityAd(msg.payload, fromPeerId);
            this.mesh.respondRpc(fromPeerId, id, true, { received: true });
            break;
            
          case 'COMPUTE_TASK':
            this.handleIncomingTask(msg.payload, fromPeerId, id);
            break;
            
          case 'COMPUTE_ACK':
            this.handleTaskAck(msg.payload);
            this.mesh.respondRpc(fromPeerId, id, true, { received: true });
            break;
            
          case 'COMPUTE_PROGRESS':
            this.handleProgress(msg.payload);
            this.mesh.respondRpc(fromPeerId, id, true, { received: true });
            break;
            
          case 'COMPUTE_RESULT':
            this.handleResult(msg.payload);
            this.mesh.respondRpc(fromPeerId, id, true, { received: true });
            break;
            
          case 'COMPUTE_CANCEL':
            this.handleCancel(msg.payload.taskId);
            this.mesh.respondRpc(fromPeerId, id, true, { received: true });
            break;
        }
      } catch (e) {
        this.mesh.respondRpc(fromPeerId, id, false, undefined, String(e));
      }
    });
  }

  /**
   * Advertise local compute capabilities
   */
  advertiseCapabilities(capability: Omit<ComputeCapability, 'peerId' | 'lastUpdated'>): void {
    const nodeId = this.mesh.getLocalNodeId();
    if (!nodeId) return;

    const fullCapability: ComputeCapability = {
      ...capability,
      peerId: nodeId,
      lastUpdated: Date.now(),
    };

    this.mesh.advertiseService(`compute-${nodeId}`, 'compute-service');
    
    // Broadcast capability
    this.broadcastComputeMessage({
      type: 'COMPUTE_AD',
      payload: fullCapability,
    });
  }

  /**
   * Submit a compute task
   */
  async submitTask(
    task: Omit<ComputeTask, 'id' | 'createdAt'>,
    onProgress?: TaskProgressCallback
  ): Promise<ComputeResult> {
    const fullTask: ComputeTask = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      // Store pending task
      this.pendingTasks.set(fullTask.id, {
        task: fullTask,
        resolve,
        reject,
        progressCallback: onProgress,
        startTime: Date.now(),
        timeoutId: null,
        retryCount: 0,
      });

      // Set timeout
      const timeoutId = window.setTimeout(() => {
        this.handleTimeout(fullTask.id);
      }, fullTask.timeoutMs);
      
      this.pendingTasks.get(fullTask.id)!.timeoutId = timeoutId;

      // Find best peer for task
      const peer = this.selectBestPeer(fullTask.type, fullTask.memoryBudget);
      
      if (peer) {
        this.assignTaskToPeer(fullTask, peer.peerId);
      } else {
        // Queue task if no peer available
        this.queueTask(fullTask);
      }
    });
  }

  /**
   * Select best peer for a task type
   */
  private selectBestPeer(taskType: TaskType, memoryRequired: number): ComputeCapability | null {
    const candidates = Array.from(this.capabilities.values())
      .filter(cap => 
        cap.taskTypes.includes(taskType) &&
        cap.maxMemory >= memoryRequired &&
        cap.currentLoad < 90
      )
      .sort((a, b) => {
        // Prefer lower load
        if (a.currentLoad !== b.currentLoad) {
          return a.currentLoad - b.currentLoad;
        }
        // Then prefer faster compute time
        const aTime = a.avgComputeTime[taskType] || Infinity;
        const bTime = b.avgComputeTime[taskType] || Infinity;
        return aTime - bTime;
      });

    return candidates[0] || null;
  }

  /**
   * Assign task to a specific peer
   */
  private assignTaskToPeer(task: ComputeTask, peerId: string): void {
    const pending = this.pendingTasks.get(task.id);
    if (!pending) return;

    pending.assignedPeer = peerId;

    this.sendComputeMessage(peerId, {
      type: 'COMPUTE_TASK',
      payload: task,
    });
  }

  /**
   * Queue task for later execution
   */
  private queueTask(task: ComputeTask): void {
    // Insert by priority
    const priorityOrder: Record<TaskPriority, number> = {
      high: 0,
      normal: 1,
      low: 2,
    };
    
    const insertIndex = this.taskQueue.findIndex(
      t => priorityOrder[t.priority] > priorityOrder[task.priority]
    );
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
  }

  /**
   * Handle incoming task from another peer
   */
  private handleIncomingTask(task: ComputeTask, fromPeerId: string, requestId: string): void {
    // Check if we can handle this task
    const canHandle = this.canHandleTask(task);
    
    if (!canHandle.accepted) {
      this.mesh.respondRpc(fromPeerId, requestId, false, undefined, canHandle.reason);
      return;
    }

    // Acknowledge task
    const ack: TaskAck = {
      taskId: task.id,
      accepted: true,
      estimatedTime: this.estimateTaskTime(task.type),
    };
    
    this.sendComputeMessage(fromPeerId, { type: 'COMPUTE_ACK', payload: ack });

    // Execute task
    this.executeTask(task, fromPeerId);
  }

  /**
   * Check if we can handle a task
   */
  private canHandleTask(task: ComputeTask): { accepted: boolean; reason?: string } {
    // Check memory budget
    const availableMemory = this.getAvailableMemory();
    if (availableMemory < task.memoryBudget) {
      return { accepted: false, reason: 'Insufficient memory' };
    }

    // Check current load
    const currentLoad = this.getCurrentLoad();
    if (currentLoad > 90) {
      return { accepted: false, reason: 'Overloaded' };
    }

    return { accepted: true };
  }

  /**
   * Execute a task (to be overridden by implementation)
   */
  private async executeTask(task: ComputeTask, requesterPeerId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Send progress updates
      const sendProgress = (progress: number, stage: string) => {
        this.sendComputeMessage(requesterPeerId, {
          type: 'COMPUTE_PROGRESS',
          payload: {
            taskId: task.id,
            progress,
            stage,
            elapsedMs: Date.now() - startTime,
            estimatedRemainingMs: 0,
          },
        });
      };

      sendProgress(0, 'starting');

      // Execute based on task type
      let output: Uint8Array;
      
      switch (task.type) {
        case 'DECOMPRESS':
          output = await this.executeDecompress(task.input, sendProgress);
          break;
        default:
          throw new Error(`Unsupported task type: ${task.type}`);
      }

      sendProgress(100, 'completed');

      // Send result
      const result: ComputeResult = {
        taskId: task.id,
        ok: true,
        output,
        metrics: {
          computeTime: Date.now() - startTime,
          memoryUsed: task.memoryBudget,
          bytesIn: task.input.byteLength,
          bytesOut: output.byteLength,
        },
        peerId: this.mesh.getLocalNodeId() || 'unknown',
        completedAt: Date.now(),
      };

      this.sendComputeMessage(requesterPeerId, { type: 'COMPUTE_RESULT', payload: result });
    } catch (e) {
      const result: ComputeResult = {
        taskId: task.id,
        ok: false,
        error: String(e),
        metrics: {
          computeTime: Date.now() - startTime,
          memoryUsed: 0,
          bytesIn: task.input.byteLength,
          bytesOut: 0,
        },
        peerId: this.mesh.getLocalNodeId() || 'unknown',
        completedAt: Date.now(),
      };

      this.sendComputeMessage(requesterPeerId, { type: 'COMPUTE_RESULT', payload: result });
    }
  }

  /**
   * Execute decompression task
   */
  private async executeDecompress(
    input: Uint8Array,
    onProgress: (progress: number, stage: string) => void
  ): Promise<Uint8Array> {
    // Use CompressionStream if available
    if (typeof CompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      // Create a fresh copy with a plain ArrayBuffer to satisfy TypeScript's BufferSource type
      const copy = new Uint8Array(input.byteLength);
      copy.set(input);
      // Use type assertion to satisfy TypeScript's strict BufferSource type
      writer.write(copy as unknown as BufferSource);
      writer.close();

      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalSize += value.byteLength;
        onProgress(50, 'decompressing');
      }

      const output = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
      }

      return output;
    }

    // Fallback: return input as-is (no decompression)
    return input;
  }

  /**
   * Handle task acknowledgment
   */
  private handleTaskAck(ack: TaskAck): void {
    const pending = this.pendingTasks.get(ack.taskId);
    if (!pending) return;

    if (!ack.accepted) {
      // Task rejected, try another peer
      this.retryTask(ack.taskId, ack.reason);
    }
  }

  /**
   * Handle progress update
   */
  private handleProgress(progress: ComputeProgress): void {
    const pending = this.pendingTasks.get(progress.taskId);
    if (!pending) return;

    if (pending.progressCallback) {
      pending.progressCallback(progress);
    }

    // Notify global listeners
    for (const cb of this.progressCallbacks) {
      cb(progress);
    }
  }

  /**
   * Handle task result
   */
  private handleResult(result: ComputeResult): void {
    const pending = this.pendingTasks.get(result.taskId);
    if (!pending) return;

    // Clear timeout
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    // Remove from pending
    this.pendingTasks.delete(result.taskId);

    if (result.ok) {
      pending.resolve(result);
    } else {
      pending.reject(new Error(result.error || 'Task failed'));
    }

    // Notify global listeners
    for (const cb of this.completeCallbacks) {
      cb(result);
    }
  }

  /**
   * Handle task timeout
   */
  private handleTimeout(taskId: string): void {
    const pending = this.pendingTasks.get(taskId);
    if (!pending) return;

    this.retryTask(taskId, 'timeout');
  }

  /**
   * Retry a task
   */
  private retryTask(taskId: string, reason?: string): void {
    const pending = this.pendingTasks.get(taskId);
    if (!pending) return;

    pending.retryCount++;

    if (pending.retryCount >= this.maxRetries) {
      // Max retries exceeded
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      this.pendingTasks.delete(taskId);
      pending.reject(new Error(`Task failed after ${this.maxRetries} retries: ${reason}`));
      return;
    }

    // Find another peer
    const peer = this.selectBestPeer(pending.task.type, pending.task.memoryBudget);
    
    if (peer && peer.peerId !== pending.assignedPeer) {
      this.assignTaskToPeer(pending.task, peer.peerId);
    } else {
      // Queue for later
      this.queueTask(pending.task);
    }
  }

  /**
   * Handle task cancellation
   */
  private handleCancel(taskId: string): void {
    const pending = this.pendingTasks.get(taskId);
    if (!pending) return;

    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTasks.delete(taskId);
    pending.reject(new Error('Task cancelled'));
  }

  /**
   * Handle capability advertisement
   */
  private handleCapabilityAd(capability: ComputeCapability, fromPeerId: string): void {
    capability.peerId = fromPeerId;
    capability.lastUpdated = Date.now();
    this.capabilities.set(fromPeerId, capability);

    // Notify listeners
    for (const cb of this.capabilityCallbacks) {
      cb(Array.from(this.capabilities.values()));
    }
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): void {
    const pending = this.pendingTasks.get(taskId);
    if (!pending) return;

    if (pending.assignedPeer) {
      this.sendComputeMessage(pending.assignedPeer, {
        type: 'COMPUTE_CANCEL',
        payload: { taskId },
      });
    }

    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingTasks.delete(taskId);
  }

  /**
   * Get available capabilities
   */
  getCapabilities(): ComputeCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: TaskProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Subscribe to task completion
   */
  onComplete(callback: TaskCompleteCallback): () => void {
    this.completeCallbacks.add(callback);
    return () => this.completeCallbacks.delete(callback);
  }

  /**
   * Subscribe to capability updates
   */
  onCapabilityUpdate(callback: CapabilityUpdateCallback): () => void {
    this.capabilityCallbacks.add(callback);
    return () => this.capabilityCallbacks.delete(callback);
  }

  /**
   * Get available memory (placeholder)
   */
  private getAvailableMemory(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      return mem.jsHeapSizeLimit - mem.usedJSHeapSize;
    }
    return 512 * 1024 * 1024; // Assume 512MB available
  }

  /**
   * Get current load (placeholder)
   */
  private getCurrentLoad(): number {
    // Could be enhanced to track actual compute load
    return 0;
  }

  /**
   * Estimate task execution time
   */
  private estimateTaskTime(taskType: TaskType): number {
    const estimates: Record<TaskType, number> = {
      COMPILE_DEX: 5000,
      COMPILE_PE: 3000,
      RENDER_FRAME: 100,
      DECOMPRESS: 500,
      TRANSCODE: 2000,
      ANALYZE: 1000,
    };
    return estimates[taskType] || 1000;
  }

  /**
   * Send compute message via mesh
   */
  private sendComputeMessage(peerId: string, msg: ComputeMessage): void {
    this.mesh.rpcCallByName('compute-service', msg).catch(() => {
      // Ignore errors
    });
  }

  /**
   * Broadcast compute message to all peers
   */
  private broadcastComputeMessage(msg: ComputeMessage): void {
    // Use mesh broadcast if available
    const node = (this.mesh as any).node;
    if (node && node.broadcast) {
      node.broadcast(msg);
    }
  }
}

// Export singleton factory (async for SSR-safe dynamic import)
let computeProtocolInstance: ComputeProtocol | null = null;

export async function getComputeProtocol(): Promise<ComputeProtocol> {
  if (!computeProtocolInstance) {
    const { fabricMesh } = await import('./mesh');
    computeProtocolInstance = new ComputeProtocol(fabricMesh);
  }
  return computeProtocolInstance;
}

export { ComputeProtocol };