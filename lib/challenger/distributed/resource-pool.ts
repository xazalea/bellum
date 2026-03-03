/**
 * Resource Pool Management & Load Balancing
 * 
 * Manages the distributed resource pool with:
 * - Automatic load balancing
 * - Surplus resource detection
 * - Non-blocking task submission
 * - Result aggregation
 * - Failure handling (degrade quality, not speed)
 * 
 * Coordination:
 * - Never block host device
 * - Workers contribute only surplus resources
 * - Self-balancing workload distribution
 * - Automatic failover
 */

import type { Device, Task, TaskResult, DeviceCapabilities } from './execution-fabric';
import { ExecutionFabric } from './execution-fabric';

export interface ResourcePool {
  totalCompute: number;
  totalMemory: number;
  totalVRAM: number;
  availableCompute: number;
  availableMemory: number;
  availableVRAM: number;
  utilizationPercent: number;
}

export interface LoadBalanceStrategy {
  type: 'round-robin' | 'least-loaded' | 'capability-based' | 'latency-aware';
  rebalanceInterval: number; // ms
}

export interface WorkloadMetrics {
  deviceId: string;
  computeLoad: number; // [0, 1]
  memoryLoad: number; // [0, 1]
  bandwidth: number; // bytes/s
  latency: number; // ms
  taskThroughput: number; // tasks/s
  failureRate: number; // [0, 1]
}

/**
 * Surplus Resource Detector
 */
class SurplusDetector {
  private deviceMetrics: Map<string, WorkloadMetrics> = new Map();
  private surplusThreshold: number = 0.3; // 30% idle = surplus

  /**
   * Update device metrics
   */
  updateMetrics(metrics: WorkloadMetrics): void {
    this.deviceMetrics.set(metrics.deviceId, metrics);
  }

  /**
   * Detect surplus resources on a device
   */
  detectSurplus(deviceId: string): {
    hasSurplus: boolean;
    availableCompute: number;
    availableMemory: number;
  } {
    const metrics = this.deviceMetrics.get(deviceId);
    
    if (!metrics) {
      return { hasSurplus: false, availableCompute: 0, availableMemory: 0 };
    }

    const computeIdle = 1.0 - metrics.computeLoad;
    const memoryIdle = 1.0 - metrics.memoryLoad;
    
    const hasSurplus = computeIdle > this.surplusThreshold && memoryIdle > this.surplusThreshold;
    
    return {
      hasSurplus,
      availableCompute: computeIdle,
      availableMemory: memoryIdle
    };
  }

  /**
   * Get all devices with surplus
   */
  getDevicesWithSurplus(): string[] {
    const devices: string[] = [];
    
    for (const [deviceId, metrics] of this.deviceMetrics) {
      const surplus = this.detectSurplus(deviceId);
      if (surplus.hasSurplus) {
        devices.push(deviceId);
      }
    }
    
    return devices;
  }

  /**
   * Set surplus threshold
   */
  setSurplusThreshold(threshold: number): void {
    this.surplusThreshold = Math.max(0, Math.min(1, threshold));
  }
}

/**
 * Load Balancer
 */
class LoadBalancer {
  private strategy: LoadBalanceStrategy;
  private deviceLoads: Map<string, number> = new Map();
  private deviceAssignments: Map<string, number> = new Map(); // device -> task count
  private roundRobinIndex: number = 0;

  constructor(strategy: LoadBalanceStrategy) {
    this.strategy = strategy;
  }

  /**
   * Select device for task based on strategy
   */
  selectDevice(
    devices: Device[],
    task: Task,
    metrics: Map<string, WorkloadMetrics>
  ): Device | null {
    const availableDevices = devices.filter(d => d.status === 'connected');
    
    if (availableDevices.length === 0) return null;

    switch (this.strategy.type) {
      case 'round-robin':
        return this.selectRoundRobin(availableDevices);
      
      case 'least-loaded':
        return this.selectLeastLoaded(availableDevices, metrics);
      
      case 'capability-based':
        return this.selectCapabilityBased(availableDevices, task, metrics);
      
      case 'latency-aware':
        return this.selectLatencyAware(availableDevices, task, metrics);
      
      default:
        return availableDevices[0];
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(devices: Device[]): Device {
    const device = devices[this.roundRobinIndex % devices.length];
    this.roundRobinIndex++;
    return device;
  }

  /**
   * Least loaded selection
   */
  private selectLeastLoaded(
    devices: Device[],
    metrics: Map<string, WorkloadMetrics>
  ): Device {
    let leastLoaded = devices[0];
    let minLoad = 1.0;

    for (const device of devices) {
      const deviceMetrics = metrics.get(device.id);
      const load = deviceMetrics?.computeLoad || device.workload;
      
      if (load < minLoad) {
        minLoad = load;
        leastLoaded = device;
      }
    }

    return leastLoaded;
  }

  /**
   * Capability-based selection
   */
  private selectCapabilityBased(
    devices: Device[],
    task: Task,
    metrics: Map<string, WorkloadMetrics>
  ): Device {
    let bestDevice = devices[0];
    let bestScore = -Infinity;

    for (const device of devices) {
      const deviceMetrics = metrics.get(device.id);
      const load = deviceMetrics?.computeLoad || device.workload;
      
      // Score based on capabilities and current load
      const capabilityScore = this.calculateCapabilityScore(device.capabilities, task);
      const loadScore = 1.0 - load;
      
      const score = capabilityScore * 0.7 + loadScore * 0.3;
      
      if (score > bestScore) {
        bestScore = score;
        bestDevice = device;
      }
    }

    return bestDevice;
  }

  /**
   * Latency-aware selection
   */
  private selectLatencyAware(
    devices: Device[],
    task: Task,
    metrics: Map<string, WorkloadMetrics>
  ): Device {
    let bestDevice = devices[0];
    let bestScore = -Infinity;

    for (const device of devices) {
      const deviceMetrics = metrics.get(device.id);
      const load = deviceMetrics?.computeLoad || device.workload;
      const latency = deviceMetrics?.latency || device.connection.latency;
      
      // Favor low latency and low load
      const latencyScore = 1.0 / (1.0 + latency);
      const loadScore = 1.0 - load;
      
      const score = latencyScore * 0.6 + loadScore * 0.4;
      
      if (score > bestScore) {
        bestScore = score;
        bestDevice = device;
      }
    }

    return bestDevice;
  }

  /**
   * Calculate capability score for task
   */
  private calculateCapabilityScore(capabilities: DeviceCapabilities, task: Task): number {
    switch (task.type) {
      case 'compute':
        return capabilities.computeUnits / 16; // Normalize to 16 cores
      
      case 'ml':
        return capabilities.gpuVRAM / (4 * 1024 * 1024 * 1024); // Normalize to 4GB
      
      case 'decompress':
        return capabilities.memory / (8 * 1024 * 1024 * 1024); // Normalize to 8GB
      
      default:
        return capabilities.computeUnits / 16;
    }
  }

  /**
   * Record device assignment
   */
  recordAssignment(deviceId: string): void {
    const count = this.deviceAssignments.get(deviceId) || 0;
    this.deviceAssignments.set(deviceId, count + 1);
  }

  /**
   * Release device assignment
   */
  releaseAssignment(deviceId: string): void {
    const count = this.deviceAssignments.get(deviceId) || 0;
    this.deviceAssignments.set(deviceId, Math.max(0, count - 1));
  }

  /**
   * Rebalance workload
   */
  rebalance(devices: Device[], metrics: Map<string, WorkloadMetrics>): void {
    // Identify overloaded and underloaded devices
    const overloaded: Device[] = [];
    const underloaded: Device[] = [];

    for (const device of devices) {
      const deviceMetrics = metrics.get(device.id);
      const load = deviceMetrics?.computeLoad || device.workload;
      
      if (load > 0.8) {
        overloaded.push(device);
      } else if (load < 0.3) {
        underloaded.push(device);
      }
    }

    if (overloaded.length > 0 && underloaded.length > 0) {
      console.log(`[LoadBalancer] Rebalancing: ${overloaded.length} overloaded, ${underloaded.length} underloaded`);
      // Would trigger task migration here
    }
  }

  /**
   * Get load distribution statistics
   */
  getLoadDistribution(devices: Device[]): {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
  } {
    if (devices.length === 0) {
      return { min: 0, max: 0, avg: 0, stdDev: 0 };
    }

    const loads = devices.map(d => d.workload);
    const min = Math.min(...loads);
    const max = Math.max(...loads);
    const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
    
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avg, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance);

    return { min, max, avg, stdDev };
  }
}

/**
 * Result Aggregator
 */
class ResultAggregator {
  private pendingResults: Map<string, TaskResult[]> = new Map(); // group id -> results
  private completionCallbacks: Map<string, (results: TaskResult[]) => void> = new Map();

  /**
   * Register a task group
   */
  registerGroup(groupId: string, taskCount: number, callback: (results: TaskResult[]) => void): void {
    this.pendingResults.set(groupId, []);
    this.completionCallbacks.set(groupId, callback);
  }

  /**
   * Add result to group
   */
  addResult(groupId: string, result: TaskResult): void {
    const results = this.pendingResults.get(groupId);
    
    if (results) {
      results.push(result);
      
      // Check if group is complete
      // Would need task count tracking in real implementation
    }
  }

  /**
   * Check if group is complete
   */
  isGroupComplete(groupId: string, expectedCount: number): boolean {
    const results = this.pendingResults.get(groupId);
    return results ? results.length >= expectedCount : false;
  }

  /**
   * Get group results
   */
  getGroupResults(groupId: string): TaskResult[] {
    return this.pendingResults.get(groupId) || [];
  }

  /**
   * Complete group and trigger callback
   */
  completeGroup(groupId: string): void {
    const results = this.pendingResults.get(groupId);
    const callback = this.completionCallbacks.get(groupId);
    
    if (results && callback) {
      callback(results);
      this.pendingResults.delete(groupId);
      this.completionCallbacks.delete(groupId);
    }
  }
}

/**
 * Resource Pool Manager
 */
export class ResourcePoolManager {
  private fabric: ExecutionFabric;
  private surplusDetector: SurplusDetector;
  private loadBalancer: LoadBalancer;
  private resultAggregator: ResultAggregator;
  
  // Metrics collection
  private metricsInterval: number = 100; // ms
  private metricsTimer: number | null = null;
  private deviceMetrics: Map<string, WorkloadMetrics> = new Map();
  
  // Rebalancing
  private rebalanceTimer: number | null = null;

  constructor(fabric: ExecutionFabric, strategy: LoadBalanceStrategy) {
    this.fabric = fabric;
    this.surplusDetector = new SurplusDetector();
    this.loadBalancer = new LoadBalancer(strategy);
    this.resultAggregator = new ResultAggregator();
    
    this.startMetricsCollection();
    this.startRebalancing(strategy.rebalanceInterval);

    console.log('[ResourcePoolManager] Initialized');
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = window.setInterval(() => {
      this.collectMetrics();
    }, this.metricsInterval);
  }

  /**
   * Collect metrics from all devices
   */
  private collectMetrics(): void {
    const devices = this.fabric.getDevices();
    
    for (const device of devices) {
      const metrics: WorkloadMetrics = {
        deviceId: device.id,
        computeLoad: device.workload,
        memoryLoad: 0.5, // Would measure actual memory usage
        bandwidth: device.connection.bandwidth,
        latency: device.connection.latency,
        taskThroughput: 0, // Would calculate from task history
        failureRate: 0 // Would track failures
      };
      
      this.deviceMetrics.set(device.id, metrics);
      this.surplusDetector.updateMetrics(metrics);
    }
  }

  /**
   * Start periodic rebalancing
   */
  private startRebalancing(interval: number): void {
    this.rebalanceTimer = window.setInterval(() => {
      this.rebalance();
    }, interval);
  }

  /**
   * Rebalance workload across devices
   */
  private rebalance(): void {
    const devices = this.fabric.getDevices();
    this.loadBalancer.rebalance(devices, this.deviceMetrics);
  }

  /**
   * Submit task with automatic load balancing
   */
  async submitTask(task: Task): Promise<TaskResult> {
    const devices = this.fabric.getDevices();
    const selectedDevice = this.loadBalancer.selectDevice(devices, task, this.deviceMetrics);
    
    if (!selectedDevice) {
      throw new Error('No device available for task');
    }

    // Assign task with device affinity
    task.deviceAffinity = selectedDevice.id;
    
    this.loadBalancer.recordAssignment(selectedDevice.id);
    
    try {
      const result = await this.fabric.submitTask(task);
      this.loadBalancer.releaseAssignment(selectedDevice.id);
      return result;
    } catch (error) {
      this.loadBalancer.releaseAssignment(selectedDevice.id);
      throw error;
    }
  }

  /**
   * Submit task group with result aggregation
   */
  async submitTaskGroup(
    groupId: string,
    tasks: Task[]
  ): Promise<TaskResult[]> {
    return new Promise((resolve, reject) => {
      this.resultAggregator.registerGroup(groupId, tasks.length, resolve);
      
      // Submit all tasks in parallel
      const promises = tasks.map(task => 
        this.submitTask(task)
          .then(result => {
            this.resultAggregator.addResult(groupId, result);
            
            if (this.resultAggregator.isGroupComplete(groupId, tasks.length)) {
              this.resultAggregator.completeGroup(groupId);
            }
          })
          .catch(error => {
            console.error(`[ResourcePoolManager] Task ${task.id} failed:`, error);
            // Continue with partial results
          })
      );
      
      // Timeout fallback
      Promise.all(promises).catch(() => {
        // Complete with partial results
        this.resultAggregator.completeGroup(groupId);
      });
    });
  }

  /**
   * Get resource pool status
   */
  getResourcePool(): ResourcePool {
    const devices = this.fabric.getDevices();
    
    let totalCompute = 0;
    let totalMemory = 0;
    let totalVRAM = 0;
    let availableCompute = 0;
    let availableMemory = 0;
    let availableVRAM = 0;
    
    for (const device of devices) {
      totalCompute += device.capabilities.computeUnits;
      totalMemory += device.capabilities.memory;
      totalVRAM += device.capabilities.gpuVRAM;
      
      const surplus = this.surplusDetector.detectSurplus(device.id);
      availableCompute += device.capabilities.computeUnits * surplus.availableCompute;
      availableMemory += device.capabilities.memory * surplus.availableMemory;
      availableVRAM += device.capabilities.gpuVRAM * surplus.availableMemory;
    }
    
    const utilizationPercent = totalCompute > 0 
      ? ((totalCompute - availableCompute) / totalCompute) * 100 
      : 0;

    return {
      totalCompute,
      totalMemory,
      totalVRAM,
      availableCompute,
      availableMemory,
      availableVRAM,
      utilizationPercent
    };
  }

  /**
   * Get devices with surplus resources
   */
  getDevicesWithSurplus(): string[] {
    return this.surplusDetector.getDevicesWithSurplus();
  }

  /**
   * Get load distribution statistics
   */
  getLoadDistribution(): {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
    isBalanced: boolean;
  } {
    const devices = this.fabric.getDevices();
    const distribution = this.loadBalancer.getLoadDistribution(devices);
    
    // Consider balanced if stdDev < 0.2
    const isBalanced = distribution.stdDev < 0.2;
    
    return {
      ...distribution,
      isBalanced
    };
  }

  /**
   * Get all device metrics
   */
  getDeviceMetrics(): Map<string, WorkloadMetrics> {
    return new Map(this.deviceMetrics);
  }

  /**
   * Stop resource pool management
   */
  stop(): void {
    if (this.metricsTimer !== null) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    if (this.rebalanceTimer !== null) {
      clearInterval(this.rebalanceTimer);
      this.rebalanceTimer = null;
    }
    
    console.log('[ResourcePoolManager] Stopped');
  }
}

console.log('[ResourcePoolManager] Module loaded');
