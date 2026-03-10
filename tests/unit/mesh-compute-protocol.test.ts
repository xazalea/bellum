/**
 * Unit tests for mesh compute protocol
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MeshComputeProtocol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task Creation', () => {
    it('should create a valid compute task', () => {
      const task = createComputeTask({
        type: 'COMPILE_DEX',
        input: new Uint8Array([1, 2, 3]),
        priority: 'normal',
        timeoutMs: 30000,
      });

      expect(task.id).toBeDefined();
      expect(task.type).toBe('COMPILE_DEX');
      expect(task.priority).toBe('normal');
    });

    it('should generate unique task IDs', () => {
      const task1 = createComputeTask({ type: 'RENDER_FRAME', input: new Uint8Array() });
      const task2 = createComputeTask({ type: 'RENDER_FRAME', input: new Uint8Array() });

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('Task Serialization', () => {
    it('should serialize and deserialize tasks correctly', () => {
      const originalTask = createComputeTask({
        type: 'DECOMPRESS',
        input: new Uint8Array([1, 2, 3, 4, 5]),
        priority: 'high',
        memoryBudget: 1024 * 1024,
      });

      const serialized = serializeTask(originalTask);
      const deserialized = deserializeTask(serialized);

      expect(deserialized.id).toBe(originalTask.id);
      expect(deserialized.type).toBe(originalTask.type);
      expect(deserialized.input).toEqual(originalTask.input);
    });
  });

  describe('Task Priority Queue', () => {
    it('should order tasks by priority', () => {
      const queue = new TaskPriorityQueue();

      queue.enqueue({ id: '1', priority: 'low', type: 'TEST' } as any);
      queue.enqueue({ id: '2', priority: 'high', type: 'TEST' } as any);
      queue.enqueue({ id: '3', priority: 'normal', type: 'TEST' } as any);

      const first = queue.dequeue();
      const second = queue.dequeue();
      const third = queue.dequeue();

      expect(first?.priority).toBe('high');
      expect(second?.priority).toBe('normal');
      expect(third?.priority).toBe('low');
    });

    it('should handle empty queue', () => {
      const queue = new TaskPriorityQueue();
      expect(queue.dequeue()).toBeUndefined();
    });
  });

  describe('Capability Advertisement', () => {
    it('should create capability message', () => {
      const capabilities = {
        cpuCores: 8,
        memory: 16,
        webgpu: true,
        supportedTasks: ['COMPILE_DEX', 'RENDER_FRAME', 'DECOMPRESS'],
      };

      const message = createCapabilityMessage(capabilities);

      expect(message.type).toBe('CAPABILITY_ANNOUNCE');
      expect(message.payload.cpuCores).toBe(8);
      expect(message.payload.supportedTasks).toHaveLength(3);
    });
  });

  describe('Task Submission', () => {
    it('should submit task and receive acknowledgment', async () => {
      const mockPeer = {
        send: vi.fn().mockResolvedValue({ type: 'TASK_ACK', taskId: 'test-id' }),
      };

      const task = createComputeTask({ type: 'COMPILE_DEX', input: new Uint8Array() });
      const ack = await submitTask(mockPeer as any, task);

      expect(mockPeer.send).toHaveBeenCalled();
      expect(ack.type).toBe('TASK_ACK');
    });

    it('should handle submission timeout', async () => {
      const mockPeer = {
        send: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      };

      const task = createComputeTask({ type: 'COMPILE_DEX', input: new Uint8Array() });

      await expect(submitTaskWithTimeout(mockPeer as any, task, 100)).rejects.toThrow('timeout');
    });
  });

  describe('Result Verification', () => {
    it('should verify result integrity', async () => {
      const input = new Uint8Array([1, 2, 3]);
      const output = new Uint8Array([4, 5, 6]);
      const checksum = await computeChecksum(output);

      const result = {
        taskId: 'test-id',
        ok: true,
        output,
        checksum,
      };

      const isValid = await verifyResult(result);
      expect(isValid).toBe(true);
    });

    it('should detect corrupted results', async () => {
      const output = new Uint8Array([1, 2, 3]);
      const checksum = 'invalid-checksum';

      const result = {
        taskId: 'test-id',
        ok: true,
        output,
        checksum,
      };

      const isValid = await verifyResult(result);
      expect(isValid).toBe(false);
    });
  });

  describe('Load Balancing', () => {
    it('should select peer with best capability', () => {
      const peers = [
        { id: 'peer1', capabilities: { cpuScore: 50, queueSize: 5 } },
        { id: 'peer2', capabilities: { cpuScore: 80, queueSize: 2 } },
        { id: 'peer3', capabilities: { cpuScore: 70, queueSize: 8 } },
      ];

      const selected = selectBestPeer(peers as any);
      expect(selected?.id).toBe('peer2');
    });

    it('should return undefined when no peers available', () => {
      const selected = selectBestPeer([]);
      expect(selected).toBeUndefined();
    });
  });

  describe('Task Retry Logic', () => {
    it('should retry failed tasks with exponential backoff', async () => {
      let attempts = 0;
      const mockExecute = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      const result = await retryWithBackoff(mockExecute, { maxRetries: 3, baseDelay: 10 });

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should fail after max retries', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Permanent failure'));

      await expect(
        retryWithBackoff(mockExecute, { maxRetries: 2, baseDelay: 10 })
      ).rejects.toThrow('Permanent failure');

      expect(mockExecute).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Peer Disconnect Handling', () => {
    it('should reassign tasks on peer disconnect', () => {
      const taskScheduler = new TaskScheduler();
      const task = createComputeTask({ type: 'TEST', input: new Uint8Array() });

      taskScheduler.assignTask(task, 'peer1');
      expect(taskScheduler.getAssignedPeer(task.id)).toBe('peer1');

      taskScheduler.handlePeerDisconnect('peer1');
      expect(taskScheduler.getAssignedPeer(task.id)).toBeUndefined();
      expect(taskScheduler.getPendingTasks()).toContainEqual(expect.objectContaining({ id: task.id }));
    });
  });
});

// Helper implementations
function createComputeTask(options: {
  type: string;
  input: Uint8Array;
  priority?: 'low' | 'normal' | 'high';
  timeoutMs?: number;
  memoryBudget?: number;
}): any {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: options.type,
    input: options.input,
    priority: options.priority || 'normal',
    timeoutMs: options.timeoutMs || 30000,
    memoryBudget: options.memoryBudget || 0,
    createdAt: Date.now(),
  };
}

function serializeTask(task: any): string {
  return JSON.stringify({
    ...task,
    input: Array.from(task.input),
  });
}

function deserializeTask(serialized: string): any {
  const parsed = JSON.parse(serialized);
  return {
    ...parsed,
    input: new Uint8Array(parsed.input),
  };
}

class TaskPriorityQueue {
  private queue: any[] = [];

  enqueue(task: any): void {
    this.queue.push(task);
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  dequeue(): any | undefined {
    return this.queue.shift();
  }
}

function createCapabilityMessage(capabilities: any): any {
  return {
    type: 'CAPABILITY_ANNOUNCE',
    timestamp: Date.now(),
    payload: capabilities,
  };
}

async function submitTask(peer: any, task: any): Promise<any> {
  return peer.send({ type: 'TASK_SUBMIT', task });
}

async function submitTaskWithTimeout(peer: any, task: any, timeout: number): Promise<any> {
  return Promise.race([
    submitTask(peer, task),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
  ]);
}

async function computeChecksum(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyResult(result: any): Promise<boolean> {
  const computedChecksum = await computeChecksum(result.output);
  return computedChecksum === result.checksum;
}

function selectBestPeer(peers: any[]): any | undefined {
  if (peers.length === 0) return undefined;

  return peers.reduce((best, peer) => {
    const bestScore = best.capabilities.cpuScore - best.capabilities.queueSize * 5;
    const peerScore = peer.capabilities.cpuScore - peer.capabilities.queueSize * 5;
    return peerScore > bestScore ? peer : best;
  });
}

async function retryWithBackoff(
  fn: () => Promise<any>,
  options: { maxRetries: number; baseDelay: number }
): Promise<any> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < options.maxRetries) {
        const delay = options.baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

class TaskScheduler {
  private assignments: Map<string, string> = new Map();
  private tasks: Map<string, any> = new Map();
  private pending: any[] = [];

  assignTask(task: any, peerId: string): void {
    this.tasks.set(task.id, task);
    this.assignments.set(task.id, peerId);
  }

  getAssignedPeer(taskId: string): string | undefined {
    return this.assignments.get(taskId);
  }

  handlePeerDisconnect(peerId: string): void {
    for (const [taskId, assignedPeer] of this.assignments) {
      if (assignedPeer === peerId) {
        this.assignments.delete(taskId);
        const task = this.tasks.get(taskId);
        if (task) {
          this.pending.push(task);
        }
      }
    }
  }

  getPendingTasks(): any[] {
    return this.pending;
  }
}

export {};