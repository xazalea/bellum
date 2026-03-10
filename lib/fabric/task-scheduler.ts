/**
 * Task Scheduler for Mesh Compute Offloading
 * Manages task queue, scheduling, and peer assignment
 */

import { ComputeTask, ComputeResult, TaskPriority, TaskType, ComputeCapability } from './compute-protocol';

export interface ScheduledTask {
  task: ComputeTask;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
  assignedPeer?: string;
  attempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: ComputeResult;
  error?: string;
}

export interface SchedulerConfig {
  maxConcurrentTasks: number;
  maxRetries: number;
  taskTimeout: number;
  peerTimeout: number;
  loadBalanceStrategy: 'least-loaded' | 'round-robin' | 'capability-based';
}

export interface PeerState {
  peerId: string;
  capabilities: ComputeCapability;
  currentTasks: string[];
  totalCompleted: number;
  totalFailed: number;
  avgResponseTime: number;
  lastSeen: number;
  isAvailable: boolean;
}

type SchedulerCallback = (event: string, data: any) => void;

const DEFAULT_CONFIG: SchedulerConfig = {
  maxConcurrentTasks: 10,
  maxRetries: 3,
  taskTimeout: 60000,
  peerTimeout: 30000,
  loadBalanceStrategy: 'capability-based',
};

class TaskScheduler {
  private config: SchedulerConfig;
  private taskQueue: Map<string, ScheduledTask> = new Map();
  private pendingQueue: ComputeTask[] = [];
  private peerStates: Map<string, PeerState> = new Map();
  private callbacks: Set<SchedulerCallback> = new Set();
  private processingInterval: number | null = null;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.processingInterval !== null) return;
    
    this.processingInterval = window.setInterval(() => {
      this.processQueue();
    }, 100);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.processingInterval !== null) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Add a task to the scheduler
   */
  scheduleTask(task: ComputeTask): string {
    const scheduledTask: ScheduledTask = {
      task,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    };

    this.taskQueue.set(task.id, scheduledTask);

    // Insert into pending queue by priority
    this.insertByPriority(task);

    this.notifyCallbacks('task_scheduled', { taskId: task.id, priority: task.priority });

    return task.id;
  }

  /**
   * Insert task into pending queue by priority
   */
  private insertByPriority(task: ComputeTask): void {
    const priorityOrder: Record<TaskPriority, number> = {
      high: 0,
      normal: 1,
      low: 2,
    };

    const taskPriority = priorityOrder[task.priority];
    
    let insertIndex = this.pendingQueue.length;
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const queuePriority = priorityOrder[this.pendingQueue[i].priority];
      if (queuePriority > taskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.pendingQueue.splice(insertIndex, 0, task);
  }

  /**
   * Cancel a scheduled task
   */
  cancelTask(taskId: string): boolean {
    const scheduled = this.taskQueue.get(taskId);
    if (!scheduled) return false;

    if (scheduled.status === 'running') {
      // Cannot cancel running task directly
      return false;
    }

    // Remove from queue
    const queueIndex = this.pendingQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.pendingQueue.splice(queueIndex, 1);
    }

    this.taskQueue.delete(taskId);
    this.notifyCallbacks('task_cancelled', { taskId });

    return true;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): ScheduledTask | undefined {
    return this.taskQueue.get(taskId);
  }

  /**
   * Get all tasks by status
   */
  getTasksByStatus(status: ScheduledTask['status']): ScheduledTask[] {
    return Array.from(this.taskQueue.values()).filter(t => t.status === status);
  }

  /**
   * Update peer capabilities
   */
  updatePeerCapabilities(capability: ComputeCapability): void {
    const existing = this.peerStates.get(capability.peerId);
    
    if (existing) {
      existing.capabilities = capability;
      existing.lastSeen = Date.now();
    } else {
      this.peerStates.set(capability.peerId, {
        peerId: capability.peerId,
        capabilities: capability,
        currentTasks: [],
        totalCompleted: 0,
        totalFailed: 0,
        avgResponseTime: 0,
        lastSeen: Date.now(),
        isAvailable: true,
      });
    }

    this.notifyCallbacks('peer_updated', { peerId: capability.peerId });
  }

  /**
   * Mark peer as disconnected
   */
  peerDisconnected(peerId: string): void {
    const peerState = this.peerStates.get(peerId);
    if (peerState) {
      peerState.isAvailable = false;
      
      // Reassign tasks assigned to this peer
      this.reassignPeerTasks(peerId);
    }

    this.notifyCallbacks('peer_disconnected', { peerId });
  }

  /**
   * Reassign tasks from a disconnected peer
   */
  private reassignPeerTasks(peerId: string): void {
    const tasksToReassign = Array.from(this.taskQueue.values())
      .filter(t => t.assignedPeer === peerId && (t.status === 'assigned' || t.status === 'running'));

    for (const scheduled of tasksToReassign) {
      scheduled.status = 'pending';
      scheduled.assignedPeer = undefined;
      scheduled.attempts++;
      
      if (scheduled.attempts < this.config.maxRetries) {
        this.insertByPriority(scheduled.task);
      } else {
        scheduled.status = 'failed';
        scheduled.error = 'Peer disconnected and max retries exceeded';
        this.notifyCallbacks('task_failed', { taskId: scheduled.task.id, error: scheduled.error });
      }
    }
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    // Check for timed out tasks
    this.checkTimeouts();

    // Get available peers
    const availablePeers = this.getAvailablePeers();
    if (availablePeers.length === 0) return;

    // Get current running task count
    const runningCount = this.getTasksByStatus('running').length;
    const availableSlots = this.config.maxConcurrentTasks - runningCount;
    if (availableSlots <= 0) return;

    // Process pending tasks
    const toProcess = this.pendingQueue.splice(0, Math.min(availableSlots, availablePeers.length));
    
    for (const task of toProcess) {
      const peer = this.selectPeerForTask(task, availablePeers);
      if (peer) {
        this.assignTaskToPeer(task.id, peer.peerId);
      } else {
        // Put back in queue if no suitable peer
        this.insertByPriority(task);
      }
    }
  }

  /**
   * Check for timed out tasks
   */
  private checkTimeouts(): void {
    const now = Date.now();
    
    for (const scheduled of this.taskQueue.values()) {
      if (scheduled.status === 'running' && scheduled.startedAt) {
        const elapsed = now - scheduled.startedAt;
        if (elapsed > scheduled.task.timeoutMs) {
          this.handleTaskTimeout(scheduled);
        }
      }
    }
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(scheduled: ScheduledTask): void {
    scheduled.attempts++;
    
    if (scheduled.attempts < this.config.maxRetries) {
      scheduled.status = 'pending';
      scheduled.assignedPeer = undefined;
      this.insertByPriority(scheduled.task);
      this.notifyCallbacks('task_retry', { taskId: scheduled.task.id, attempt: scheduled.attempts });
    } else {
      scheduled.status = 'failed';
      scheduled.error = 'Task timed out';
      scheduled.completedAt = Date.now();
      this.notifyCallbacks('task_failed', { taskId: scheduled.task.id, error: 'timeout' });
    }
  }

  /**
   * Get available peers
   */
  private getAvailablePeers(): PeerState[] {
    const now = Date.now();
    
    return Array.from(this.peerStates.values())
      .filter(peer => {
        if (!peer.isAvailable) return false;
        if (now - peer.lastSeen > this.config.peerTimeout) return false;
        if (peer.currentTasks.length >= this.config.maxConcurrentTasks) return false;
        if (peer.capabilities.currentLoad >= 90) return false;
        return true;
      });
  }

  /**
   * Select best peer for a task
   */
  private selectPeerForTask(task: ComputeTask, peers: PeerState[]): PeerState | null {
    // Filter peers that can handle this task type
    const capable = peers.filter(p => 
      p.capabilities.taskTypes.includes(task.type) &&
      p.capabilities.maxMemory >= task.memoryBudget
    );

    if (capable.length === 0) return null;

    switch (this.config.loadBalanceStrategy) {
      case 'least-loaded':
        return capable.reduce((best, p) => 
          p.currentTasks.length < best.currentTasks.length ? p : best
        );
      
      case 'round-robin':
        // Simple round-robin based on total completed
        return capable.reduce((best, p) => 
          p.totalCompleted < best.totalCompleted ? p : best
        );
      
      case 'capability-based':
      default:
        // Score based on capability and load
        return capable.reduce((best, p) => {
          const bestScore = this.scorePeer(best, task);
          const pScore = this.scorePeer(p, task);
          return pScore > bestScore ? p : best;
        });
    }
  }

  /**
   * Score a peer for task assignment
   */
  private scorePeer(peer: PeerState, task: ComputeTask): number {
    let score = 100;

    // Penalize high load
    score -= peer.capabilities.currentLoad;

    // Penalize current tasks
    score -= peer.currentTasks.length * 10;

    // Bonus for fast response time
    if (peer.avgResponseTime > 0) {
      const responseBonus = Math.max(0, 20 - (peer.avgResponseTime / 100));
      score += responseBonus;
    }

    // Bonus for success rate
    const total = peer.totalCompleted + peer.totalFailed;
    if (total > 0) {
      const successRate = peer.totalCompleted / total;
      score += successRate * 20;
    }

    // Bonus for specialized capability
    const avgTime = peer.capabilities.avgComputeTime[task.type];
    if (avgTime && avgTime < 1000) {
      score += 10;
    }

    return Math.max(0, score);
  }

  /**
   * Assign task to a peer
   */
  assignTaskToPeer(taskId: string, peerId: string): void {
    const scheduled = this.taskQueue.get(taskId);
    if (!scheduled) return;

    const peerState = this.peerStates.get(peerId);
    if (!peerState) return;

    scheduled.status = 'assigned';
    scheduled.assignedPeer = peerId;
    scheduled.attempts++;
    
    peerState.currentTasks.push(taskId);

    this.notifyCallbacks('task_assigned', { taskId, peerId });
  }

  /**
   * Mark task as started
   */
  startTask(taskId: string): void {
    const scheduled = this.taskQueue.get(taskId);
    if (!scheduled) return;

    scheduled.status = 'running';
    scheduled.startedAt = Date.now();

    this.notifyCallbacks('task_started', { taskId });
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, result: ComputeResult): void {
    const scheduled = this.taskQueue.get(taskId);
    if (!scheduled) return;

    scheduled.status = 'completed';
    scheduled.completedAt = Date.now();
    scheduled.result = result;

    // Update peer stats
    if (scheduled.assignedPeer) {
      const peerState = this.peerStates.get(scheduled.assignedPeer);
      if (peerState) {
        peerState.currentTasks = peerState.currentTasks.filter(id => id !== taskId);
        peerState.totalCompleted++;
        peerState.avgResponseTime = this.updateAverage(
          peerState.avgResponseTime,
          result.metrics.computeTime,
          peerState.totalCompleted
        );
      }
    }

    this.notifyCallbacks('task_completed', { taskId, result });
  }

  /**
   * Fail a task
   */
  failTask(taskId: string, error: string): void {
    const scheduled = this.taskQueue.get(taskId);
    if (!scheduled) return;

    scheduled.status = 'failed';
    scheduled.completedAt = Date.now();
    scheduled.error = error;

    // Update peer stats
    if (scheduled.assignedPeer) {
      const peerState = this.peerStates.get(scheduled.assignedPeer);
      if (peerState) {
        peerState.currentTasks = peerState.currentTasks.filter(id => id !== taskId);
        peerState.totalFailed++;
      }
    }

    this.notifyCallbacks('task_failed', { taskId, error });
  }

  /**
   * Update moving average
   */
  private updateAverage(current: number, newValue: number, count: number): number {
    return current + (newValue - current) / count;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    queueLength: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    availablePeers: number;
  } {
    return {
      queueLength: this.pendingQueue.length,
      runningTasks: this.getTasksByStatus('running').length,
      completedTasks: this.getTasksByStatus('completed').length,
      failedTasks: this.getTasksByStatus('failed').length,
      availablePeers: this.getAvailablePeers().length,
    };
  }

  /**
   * Subscribe to scheduler events
   */
  subscribe(callback: SchedulerCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(event: string, data: any): void {
    for (const callback of this.callbacks) {
      try {
        callback(event, data);
      } catch (e) {
        console.error('Scheduler callback error:', e);
      }
    }
  }

  /**
   * Clear completed and failed tasks
   */
  clearFinished(): void {
    for (const [id, scheduled] of this.taskQueue) {
      if (scheduled.status === 'completed' || scheduled.status === 'failed') {
        this.taskQueue.delete(id);
      }
    }
  }
}

// Singleton instance
export const taskScheduler = new TaskScheduler();
