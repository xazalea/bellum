/**
 * Distributed Execution Fabric
 * 
 * Forms a cooperative execution fabric from multiple local devices:
 * - WebRTC for local network devices (phones, tablets, laptops)
 * - SharedArrayBuffer for same-machine workers
 * - Automatic discovery and handshake
 * - Non-invasive resource contribution
 * 
 * Makes multiple user devices appear as a single, powerful machine.
 * 
 * Key Principles:
 * - Automatic, invisible, self-balancing
 * - Non-invasive (only surplus resources)
 * - No traditional servers or centralized cloud
 * - Opportunistic sharing
 * - Graceful degradation
 */

export interface Device {
  id: string;
  type: 'host' | 'worker';
  capabilities: DeviceCapabilities;
  connection: DeviceConnection;
  status: 'discovering' | 'connecting' | 'connected' | 'disconnected';
  lastHeartbeat: number;
  workload: number; // [0, 1]
}

export interface DeviceCapabilities {
  computeUnits: number;
  memory: number;
  gpuVRAM: number;
  bandwidth: number; // bytes/s
  battery: number | null; // [0, 1] or null if N/A
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
}

export interface DeviceConnection {
  type: 'webrtc' | 'shared-worker' | 'service-worker';
  channel: RTCDataChannel | MessagePort | null;
  latency: number; // ms
  bandwidth: number; // bytes/s
}

export interface Task {
  id: string;
  type: 'compute' | 'physics' | 'ml' | 'decompress' | 'shader';
  priority: number; // [0, 1]
  data: ArrayBuffer;
  estimatedDuration: number; // ms
  deadline: number; // timestamp
  deviceAffinity?: string; // Preferred device ID
}

export interface TaskResult {
  taskId: string;
  deviceId: string;
  result: ArrayBuffer;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * WebRTC Device Discovery
 */
class WebRTCDiscovery {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private discoveryCallbacks: ((device: Device) => void)[] = [];
  
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  constructor() {
    console.log('[WebRTCDiscovery] Initialized');
  }

  /**
   * Start device discovery
   */
  async startDiscovery(): Promise<void> {
    console.log('[WebRTCDiscovery] Starting discovery...');
    
    // In a real implementation, would use:
    // - mDNS/Bonjour for local network discovery
    // - WebRTC signaling server for initial handshake
    // - BLE for nearby device discovery
    
    // For now, simulated discovery
    await this.simulateDiscovery();
  }

  /**
   * Simulate device discovery (for development)
   */
  private async simulateDiscovery(): Promise<void> {
    // Simulate finding local devices
    const mockDevices: Partial<Device>[] = [
      {
        id: 'device-tablet-1',
        type: 'worker',
        capabilities: {
          computeUnits: 4,
          memory: 4 * 1024 * 1024 * 1024,
          gpuVRAM: 1 * 1024 * 1024 * 1024,
          bandwidth: 100 * 1024 * 1024,
          battery: 0.8,
          thermalState: 'nominal'
        }
      },
      {
        id: 'device-phone-1',
        type: 'worker',
        capabilities: {
          computeUnits: 8,
          memory: 6 * 1024 * 1024 * 1024,
          gpuVRAM: 2 * 1024 * 1024 * 1024,
          bandwidth: 50 * 1024 * 1024,
          battery: 0.6,
          thermalState: 'fair'
        }
      }
    ];

    for (const mockDevice of mockDevices) {
      // Would normally establish WebRTC connection here
      console.log(`[WebRTCDiscovery] Discovered device: ${mockDevice.id}`);
    }
  }

  /**
   * Create peer connection
   */
  async createPeerConnection(deviceId: string): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: this.iceServers
    };

    const pc = new RTCPeerConnection(config);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to peer via signaling
        console.log(`[WebRTCDiscovery] ICE candidate for ${deviceId}`);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTCDiscovery] Connection state: ${pc.connectionState}`);
    };

    this.peerConnections.set(deviceId, pc);
    
    return pc;
  }

  /**
   * Create data channel
   */
  createDataChannel(deviceId: string, pc: RTCPeerConnection): RTCDataChannel {
    const channel = pc.createDataChannel('execution-fabric', {
      ordered: false, // Unordered for lower latency
      maxRetransmits: 0 // No retransmits
    });

    channel.onopen = () => {
      console.log(`[WebRTCDiscovery] Data channel open: ${deviceId}`);
    };

    channel.onmessage = (event) => {
      // Handle incoming messages
      this.handleMessage(deviceId, event.data);
    };

    this.dataChannels.set(deviceId, channel);
    
    return channel;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(deviceId: string, data: any): void {
    // Message handling (would parse and route)
    console.log(`[WebRTCDiscovery] Message from ${deviceId}`);
  }

  /**
   * Send message to device
   */
  sendMessage(deviceId: string, message: any): boolean {
    const channel = this.dataChannels.get(deviceId);
    
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(message));
      return true;
    }
    
    return false;
  }

  /**
   * Add discovery callback
   */
  onDeviceDiscovered(callback: (device: Device) => void): void {
    this.discoveryCallbacks.push(callback);
  }

  /**
   * Close connection
   */
  closeConnection(deviceId: string): void {
    const pc = this.peerConnections.get(deviceId);
    const channel = this.dataChannels.get(deviceId);
    
    channel?.close();
    pc?.close();
    
    this.peerConnections.delete(deviceId);
    this.dataChannels.delete(deviceId);
    
    console.log(`[WebRTCDiscovery] Closed connection: ${deviceId}`);
  }
}

/**
 * Shared Worker Communication
 */
class SharedWorkerComm {
  private workers: Map<string, Worker> = new Map();
  private nextWorkerId: number = 0;

  constructor() {
    console.log('[SharedWorkerComm] Initialized');
  }

  /**
   * Spawn worker
   */
  spawnWorker(): string {
    const workerId = `worker-${this.nextWorkerId++}`;
    
    // Create worker with inline code
    const workerCode = `
      self.onmessage = function(e) {
        const { taskId, type, data } = e.data;
        
        // Process task
        const result = processTask(type, data);
        
        // Send result back
        self.postMessage({
          taskId,
          result,
          duration: 10, // Would measure actual duration
          success: true
        });
      };
      
      function processTask(type, data) {
        // Simplified task processing
        switch (type) {
          case 'compute':
            // Perform computation
            return new ArrayBuffer(1024);
          case 'physics':
            // Physics simulation
            return new ArrayBuffer(2048);
          default:
            return new ArrayBuffer(0);
        }
      }
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    this.workers.set(workerId, worker);
    
    console.log(`[SharedWorkerComm] Spawned worker: ${workerId}`);
    
    return workerId;
  }

  /**
   * Send task to worker
   */
  sendTask(workerId: string, task: Task): Promise<TaskResult> {
    const worker = this.workers.get(workerId);
    
    if (!worker) {
      return Promise.reject(new Error(`Worker not found: ${workerId}`));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Task timeout'));
      }, task.deadline - Date.now());

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        resolve({
          taskId: task.id,
          deviceId: workerId,
          result: e.data.result,
          duration: e.data.duration,
          success: e.data.success,
          error: e.data.error
        });
      };

      worker.postMessage({
        taskId: task.id,
        type: task.type,
        data: task.data
      });
    });
  }

  /**
   * Terminate worker
   */
  terminateWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    
    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
      console.log(`[SharedWorkerComm] Terminated worker: ${workerId}`);
    }
  }

  /**
   * Get worker count
   */
  getWorkerCount(): number {
    return this.workers.size;
  }
}

/**
 * Distributed Execution Fabric
 */
export class ExecutionFabric {
  private devices: Map<string, Device> = new Map();
  private taskQueue: Task[] = [];
  private activeTasks: Map<string, Task> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();
  
  // Communication layers
  private webrtc: WebRTCDiscovery;
  private workers: SharedWorkerComm;
  
  // Host device
  private hostDevice: Device;
  
  // Statistics
  private totalTasksCompleted: number = 0;
  private totalTasksFailed: number = 0;
  private avgTaskDuration: number = 0;

  constructor() {
    this.webrtc = new WebRTCDiscovery();
    this.workers = new SharedWorkerComm();
    
    // Initialize host device
    this.hostDevice = this.createHostDevice();
    this.devices.set(this.hostDevice.id, this.hostDevice);
    
    // Setup discovery
    this.webrtc.onDeviceDiscovered((device) => {
      this.addDevice(device);
    });

    // Spawn initial workers
    this.spawnInitialWorkers();

    console.log('[ExecutionFabric] Initialized');
  }

  /**
   * Create host device representation
   */
  private createHostDevice(): Device {
    return {
      id: 'host-device',
      type: 'host',
      capabilities: this.detectHostCapabilities(),
      connection: {
        type: 'shared-worker',
        channel: null,
        latency: 0,
        bandwidth: Infinity
      },
      status: 'connected',
      lastHeartbeat: Date.now(),
      workload: 0
    };
  }

  /**
   * Detect host device capabilities
   */
  private detectHostCapabilities(): DeviceCapabilities {
    return {
      computeUnits: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 * 1024 * 1024 : 8 * 1024 * 1024 * 1024,
      gpuVRAM: 2 * 1024 * 1024 * 1024, // Estimated
      bandwidth: 1000 * 1024 * 1024, // 1 GB/s internal
      battery: null, // Not applicable
      thermalState: 'nominal'
    };
  }

  /**
   * Spawn initial workers
   */
  private spawnInitialWorkers(): void {
    const workerCount = Math.max(2, (navigator.hardwareConcurrency || 4) - 2);
    
    for (let i = 0; i < workerCount; i++) {
      const workerId = this.workers.spawnWorker();
      
      const workerDevice: Device = {
        id: workerId,
        type: 'worker',
        capabilities: {
          computeUnits: 1,
          memory: 512 * 1024 * 1024, // 512MB per worker
          gpuVRAM: 0,
          bandwidth: Infinity,
          battery: null,
          thermalState: 'nominal'
        },
        connection: {
          type: 'shared-worker',
          channel: null,
          latency: 0.1,
          bandwidth: Infinity
        },
        status: 'connected',
        lastHeartbeat: Date.now(),
        workload: 0
      };
      
      this.devices.set(workerId, workerDevice);
    }
    
    console.log(`[ExecutionFabric] Spawned ${workerCount} workers`);
  }

  /**
   * Start device discovery
   */
  async startDiscovery(): Promise<void> {
    await this.webrtc.startDiscovery();
  }

  /**
   * Add discovered device to fabric
   */
  addDevice(device: Device): void {
    this.devices.set(device.id, device);
    console.log(`[ExecutionFabric] Added device: ${device.id} (${device.type})`);
  }

  /**
   * Remove device from fabric
   */
  removeDevice(deviceId: string): void {
    this.devices.delete(deviceId);
    console.log(`[ExecutionFabric] Removed device: ${deviceId}`);
  }

  /**
   * Submit task for execution
   */
  submitTask(task: Task): Promise<TaskResult> {
    this.taskQueue.push(task);
    this.activeTasks.set(task.id, task);
    
    return this.scheduleTask(task);
  }

  /**
   * Schedule task to best available device
   */
  private async scheduleTask(task: Task): Promise<TaskResult> {
    // Find best device for task
    const device = this.selectDevice(task);
    
    if (!device) {
      // No device available, queue for later
      return Promise.reject(new Error('No device available'));
    }

    // Execute task on device
    const startTime = Date.now();
    
    try {
      let result: TaskResult;
      
      if (device.connection.type === 'shared-worker') {
        result = await this.workers.sendTask(device.id, task);
      } else if (device.connection.type === 'webrtc') {
        result = await this.executeTaskViaWebRTC(device, task);
      } else {
        throw new Error('Unsupported connection type');
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.avgTaskDuration = (this.avgTaskDuration * this.totalTasksCompleted + duration) / (this.totalTasksCompleted + 1);
      this.totalTasksCompleted++;
      
      // Update device workload
      device.workload = Math.max(0, device.workload - 0.1);
      
      this.activeTasks.delete(task.id);
      this.taskResults.set(task.id, result);
      
      return result;
    } catch (error) {
      this.totalTasksFailed++;
      this.activeTasks.delete(task.id);
      
      throw error;
    }
  }

  /**
   * Execute task via WebRTC
   */
  private async executeTaskViaWebRTC(device: Device, task: Task): Promise<TaskResult> {
    // Send task via WebRTC data channel
    const message = {
      type: 'task',
      taskId: task.id,
      taskType: task.type,
      data: task.data
    };
    
    this.webrtc.sendMessage(device.id, message);
    
    // Wait for result (simplified)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Task timeout'));
      }, task.deadline - Date.now());
      
      // Would normally listen for response
      // For now, simulate result
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({
          taskId: task.id,
          deviceId: device.id,
          result: new ArrayBuffer(1024),
          duration: 50,
          success: true
        });
      }, 50);
    });
  }

  /**
   * Select best device for task (now integrates with Fabric compute mesh)
   */
  private selectDevice(task: Task): Device | null {
    // Check device affinity first
    if (task.deviceAffinity) {
      const preferred = this.devices.get(task.deviceAffinity);
      if (preferred && preferred.status === 'connected' && preferred.workload < 0.8) {
        return preferred;
      }
    }

    // Try Fabric compute mesh first (for offloading to P2P peers)
    const fabricServices = fabricMesh.getServices().filter(s => s.serviceId === 'compute-v1');
    if (fabricServices.length > 0 && task.type === 'compute') {
      // Prefer Fabric mesh for compute tasks
      const fabricDevice: Device = {
        id: 'fabric-mesh',
        type: 'worker',
        capabilities: {
          computeUnits: fabricServices.length * 4, // Estimate
          memory: 8 * 1024 * 1024 * 1024,
          gpuVRAM: 2 * 1024 * 1024 * 1024,
          bandwidth: 100 * 1024 * 1024,
          battery: null,
          thermalState: 'nominal',
        },
        connection: {
          type: 'webrtc',
          channel: null,
          latency: 50, // Estimated P2P latency
          bandwidth: 10 * 1024 * 1024,
        },
        status: 'connected',
        lastHeartbeat: Date.now(),
        workload: 0.3, // Fabric mesh has capacity
      };
      return fabricDevice;
    }

    // Find device with lowest workload that meets requirements
    let bestDevice: Device | null = null;
    let bestScore = -Infinity;

    for (const device of this.devices.values()) {
      if (device.status !== 'connected') continue;
      if (device.workload > 0.9) continue; // Too busy
      
      // Calculate score
      const workloadScore = 1.0 - device.workload;
      const capabilityScore = device.capabilities.computeUnits / 8;
      const latencyScore = 1.0 / (1.0 + device.connection.latency);
      const priorityScore = task.priority;
      
      const score = workloadScore * 0.4 + capabilityScore * 0.3 + latencyScore * 0.2 + priorityScore * 0.1;
      
      if (score > bestScore) {
        bestScore = score;
        bestDevice = device;
      }
    }

    if (bestDevice) {
      bestDevice.workload = Math.min(1.0, bestDevice.workload + 0.1);
    }

    return bestDevice;
  }

  /**
   * Get all connected devices
   */
  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get total compute power
   */
  getTotalComputePower(): number {
    return Array.from(this.devices.values())
      .reduce((sum, device) => sum + device.capabilities.computeUnits, 0);
  }

  /**
   * Get statistics
   */
  getStats(): {
    deviceCount: number;
    totalComputeUnits: number;
    avgWorkload: number;
    tasksCompleted: number;
    tasksFailed: number;
    avgTaskDuration: number;
    activeTasks: number;
  } {
    const devices = Array.from(this.devices.values());
    const avgWorkload = devices.reduce((sum, d) => sum + d.workload, 0) / devices.length;
    
    return {
      deviceCount: devices.length,
      totalComputeUnits: this.getTotalComputePower(),
      avgWorkload,
      tasksCompleted: this.totalTasksCompleted,
      tasksFailed: this.totalTasksFailed,
      avgTaskDuration: this.avgTaskDuration,
      activeTasks: this.activeTasks.size
    };
  }

  /**
   * Shutdown fabric
   */
  shutdown(): void {
    // Close all WebRTC connections
    for (const device of this.devices.values()) {
      if (device.connection.type === 'webrtc') {
        this.webrtc.closeConnection(device.id);
      }
    }
    
    // Terminate all workers
    for (const device of this.devices.values()) {
      if (device.connection.type === 'shared-worker') {
        this.workers.terminateWorker(device.id);
      }
    }
    
    console.log('[ExecutionFabric] Shutdown complete');
  }
}

console.log('[ExecutionFabric] Module loaded');
