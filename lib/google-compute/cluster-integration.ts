/**
 * Cluster Integration
 * Integrates Google compute as a virtual peer in the cluster
 */

import type { Device, Task } from '../nacho/distributed/execution-fabric';
import type { ComputeTask, TaskResult } from './types';
import { getGoogleComputeService } from './google-compute-service';
import { getRoutingStrategy, type ClusterMetrics } from './routing-strategy';
import { getLoadAnalyzer } from './load-analyzer';

/**
 * Google Compute Virtual Peer
 * Represents Google compute as a virtual device in the cluster
 */
export class GoogleComputeVirtualPeer {
  readonly id: string = 'google-compute-virtual-peer';
  readonly type: 'virtual' = 'virtual';

  private googleService = getGoogleComputeService();
  private routingStrategy = getRoutingStrategy();
  private loadAnalyzer = getLoadAnalyzer();

  /**
   * Check if can handle task
   */
  canHandle(task: Task | ComputeTask): boolean {
    // Convert Task to ComputeTask format if needed
    const computeTask = this._convertTask(task);
    return this.googleService.canHandleTask(computeTask);
  }

  /**
   * Execute task on Google compute
   */
  async executeTask(task: Task | ComputeTask): Promise<TaskResult> {
    const computeTask = this._convertTask(task);
    return this.googleService.executeTask(computeTask);
  }

  /**
   * Get capacity
   */
  getCapacity() {
    return this.googleService.getCapacity();
  }

  /**
   * Get virtual device representation
   */
  asDevice(): Device {
    const capacity = this.getCapacity();

    return {
      id: this.id,
      label: 'Google Compute',
      status: capacity.available ? 'connected' : 'disconnected',
      workload: capacity.utilizationPercent / 100,
      capabilities: {
        computeUnits: 16, // Assume datacenter-class
        memory: 16 * 1024 * 1024 * 1024, // 16GB
        gpuVRAM: 0, // No GPU
        supportedTypes: ['compute', 'web', 'javascript'],
      },
      connection: {
        latency: 200, // Assume 200ms average
        bandwidth: 1000 * 1024 * 1024, // 1Gbps
        protocol: 'https',
      },
    };
  }

  /**
   * Convert Task to ComputeTask
   */
  private _convertTask(task: Task | ComputeTask): ComputeTask {
    // If already ComputeTask, return as is
    if ('payload' in task && typeof task.payload === 'object') {
      return task as ComputeTask;
    }

    // Convert from Task to ComputeTask
    const t = task as Task;
    return {
      id: t.id,
      type: this._mapTaskType(t.type),
      payload: {
        type: 'generic',
        data: t.data,
      },
      priority: 5,
      metadata: {},
    };
  }

  /**
   * Map task type
   */
  private _mapTaskType(
    type: string
  ): 'web-app' | 'javascript' | 'rendering' | 'generic' {
    switch (type) {
      case 'web':
        return 'web-app';
      case 'compute':
        return 'javascript';
      case 'render':
        return 'rendering';
      default:
        return 'generic';
    }
  }
}

/**
 * Cluster Router with Google Compute Integration
 * Routes tasks between cluster nodes and Google compute
 */
export class ClusterRouterWithGoogle {
  private virtualPeer = new GoogleComputeVirtualPeer();
  private routingStrategy = getRoutingStrategy();
  private loadAnalyzer = getLoadAnalyzer();

  /**
   * Route task to best provider
   */
  async routeTask(
    task: Task | ComputeTask,
    clusterDevices: Device[]
  ): Promise<{ provider: 'google' | 'cluster'; device?: Device }> {
    // Get cluster metrics
    const clusterMetrics = this._calculateClusterMetrics(clusterDevices);

    // Add sample to load analyzer
    this.loadAnalyzer.addSample(clusterMetrics);

    // Get Google capacity
    const googleCapacity = this.virtualPeer.getCapacity();

    // Convert to ComputeTask for routing
    const computeTask = this._convertToComputeTask(task);

    // Get routing decision
    const decision = this.routingStrategy.routeTask(
      computeTask,
      clusterMetrics,
      googleCapacity
    );

    if (decision.provider === 'google') {
      return { provider: 'google' };
    } else {
      // Select best cluster device
      const device = this._selectClusterDevice(clusterDevices, task);
      return { provider: 'cluster', device };
    }
  }

  /**
   * Execute task (routes and executes)
   */
  async executeTask(
    task: Task | ComputeTask,
    clusterDevices: Device[]
  ): Promise<TaskResult> {
    const route = await this.routeTask(task, clusterDevices);

    if (route.provider === 'google') {
      return this.virtualPeer.executeTask(task);
    } else {
      // Execute on cluster device
      // This would integrate with existing cluster execution logic
      throw new Error('Cluster execution not implemented in this integration');
    }
  }

  /**
   * Calculate cluster metrics
   */
  private _calculateClusterMetrics(devices: Device[]): ClusterMetrics {
    const activeDevices = devices.filter((d) => d.status === 'connected');

    const totalLoad = activeDevices.reduce((sum, d) => sum + d.workload, 0);
    const avgLoad = activeDevices.length > 0 ? totalLoad / activeDevices.length : 0;

    const avgLatency =
      activeDevices.length > 0
        ? activeDevices.reduce((sum, d) => sum + d.connection.latency, 0) /
          activeDevices.length
        : 0;

    return {
      totalNodes: devices.length,
      activeNodes: activeDevices.length,
      utilizationPercent: avgLoad * 100,
      averageLatency: avgLatency,
      queueLength: 0, // Would need to integrate with actual queue
    };
  }

  /**
   * Select best cluster device
   */
  private _selectClusterDevice(devices: Device[], task: Task | ComputeTask): Device {
    const activeDevices = devices.filter((d) => d.status === 'connected');

    if (activeDevices.length === 0) {
      throw new Error('No active cluster devices available');
    }

    // Simple least-loaded selection
    return activeDevices.reduce((best, current) =>
      current.workload < best.workload ? current : best
    );
  }

  /**
   * Convert to ComputeTask
   */
  private _convertToComputeTask(task: Task | ComputeTask): ComputeTask {
    if ('payload' in task && typeof task.payload === 'object') {
      return task as ComputeTask;
    }

    const t = task as Task;
    return {
      id: t.id,
      type: this._mapTaskType(t.type),
      payload: {
        type: 'generic',
        data: t.data,
      },
      priority: 5,
      metadata: {},
    };
  }

  /**
   * Map task type
   */
  private _mapTaskType(
    type: string
  ): 'web-app' | 'javascript' | 'rendering' | 'generic' {
    switch (type) {
      case 'web':
        return 'web-app';
      case 'compute':
        return 'javascript';
      case 'render':
        return 'rendering';
      default:
        return 'generic';
    }
  }

  /**
   * Get virtual peer
   */
  getVirtualPeer(): GoogleComputeVirtualPeer {
    return this.virtualPeer;
  }
}

// Singleton instances
let virtualPeerInstance: GoogleComputeVirtualPeer | null = null;
let routerInstance: ClusterRouterWithGoogle | null = null;

export function getGoogleComputeVirtualPeer(): GoogleComputeVirtualPeer {
  if (!virtualPeerInstance) {
    virtualPeerInstance = new GoogleComputeVirtualPeer();
  }
  return virtualPeerInstance;
}

export function getClusterRouterWithGoogle(): ClusterRouterWithGoogle {
  if (!routerInstance) {
    routerInstance = new ClusterRouterWithGoogle();
  }
  return routerInstance;
}
