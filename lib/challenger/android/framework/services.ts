/**
 * Android Services
 * Background tasks and long-running operations
 */

import { Intent } from './activity-manager';

export enum ServiceState {
  CREATED = 'created',
  STARTED = 'started',
  BOUND = 'bound',
  DESTROYED = 'destroyed',
}

export interface ServiceInfo {
  id: string;
  className: string;
  packageName: string;
  state: ServiceState;
  sticky: boolean;
  foreground: boolean;
  startId: number;
  created: number;
}

export interface IBinder {
  // Simplified binder interface
  transact(code: number, data: any): any;
}

export abstract class Service {
  abstract onStartCommand(intent: Intent, flags: number, startId: number): number;
  abstract onBind(intent: Intent): IBinder | null;
  abstract onUnbind(intent: Intent): boolean;
  abstract onDestroy(): void;
  
  onCreate(): void {}
  
  // Return codes
  static readonly START_STICKY = 1;
  static readonly START_NOT_STICKY = 2;
  static readonly START_REDELIVER_INTENT = 3;
  
  // Flags
  static readonly START_FLAG_REDELIVERY = 0x0001;
  static readonly START_FLAG_RETRY = 0x0002;
}

export interface BoundService {
  serviceInfo: ServiceInfo;
  binder: IBinder;
  connections: ServiceConnection[];
}

export interface ServiceConnection {
  onServiceConnected(name: string, binder: IBinder): void;
  onServiceDisconnected(name: string): void;
}

/**
 * Service Manager
 */
export class ServiceManager {
  private services: Map<string, ServiceInfo> = new Map();
  private boundServices: Map<string, BoundService> = new Map();
  private nextServiceId = 1;
  private nextStartId = 1;
  
  constructor() {
    console.log('[ServiceManager] Initialized');
  }
  
  /**
   * Start service
   */
  async startService(intent: Intent, service: Service): Promise<ServiceInfo> {
    const serviceId = `service_${this.nextServiceId++}`;
    const startId = this.nextStartId++;
    
    console.log(`[ServiceManager] Starting service: ${serviceId}`);
    
    let serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      // Create new service
      serviceInfo = {
        id: serviceId,
        className: intent.component?.className || 'Service',
        packageName: intent.component?.packageName || 'com.example',
        state: ServiceState.CREATED,
        sticky: false,
        foreground: false,
        startId,
        created: Date.now(),
      };
      
      this.services.set(serviceId, serviceInfo);
      
      // Call onCreate
      service.onCreate();
    }
    
    // Call onStartCommand
    const result = service.onStartCommand(intent, 0, startId);
    serviceInfo.sticky = result === Service.START_STICKY;
    serviceInfo.state = ServiceState.STARTED;
    
    return serviceInfo;
  }
  
  /**
   * Stop service
   */
  async stopService(serviceId: string, service: Service): Promise<boolean> {
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) return false;
    
    console.log(`[ServiceManager] Stopping service: ${serviceId}`);
    
    // Unbind all connections
    const bound = this.boundServices.get(serviceId);
    if (bound) {
      for (const connection of bound.connections) {
        connection.onServiceDisconnected(serviceId);
      }
      this.boundServices.delete(serviceId);
    }
    
    // Call onDestroy
    service.onDestroy();
    
    serviceInfo.state = ServiceState.DESTROYED;
    this.services.delete(serviceId);
    
    return true;
  }
  
  /**
   * Bind service
   */
  async bindService(
    intent: Intent,
    service: Service,
    connection: ServiceConnection,
    flags: number = 0
  ): Promise<boolean> {
    const serviceId = `service_${this.nextServiceId++}`;
    
    console.log(`[ServiceManager] Binding service: ${serviceId}`);
    
    let serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      // Create new service
      serviceInfo = {
        id: serviceId,
        className: intent.component?.className || 'Service',
        packageName: intent.component?.packageName || 'com.example',
        state: ServiceState.CREATED,
        sticky: false,
        foreground: false,
        startId: 0,
        created: Date.now(),
      };
      
      this.services.set(serviceId, serviceInfo);
      
      // Call onCreate
      service.onCreate();
    }
    
    // Call onBind
    const binder = service.onBind(intent);
    if (!binder) return false;
    
    serviceInfo.state = ServiceState.BOUND;
    
    // Store bound service
    let bound = this.boundServices.get(serviceId);
    if (!bound) {
      bound = {
        serviceInfo,
        binder,
        connections: [],
      };
      this.boundServices.set(serviceId, bound);
    }
    
    bound.connections.push(connection);
    
    // Notify connection
    connection.onServiceConnected(serviceId, binder);
    
    return true;
  }
  
  /**
   * Unbind service
   */
  async unbindService(
    serviceId: string,
    service: Service,
    connection: ServiceConnection
  ): Promise<void> {
    const bound = this.boundServices.get(serviceId);
    if (!bound) return;
    
    console.log(`[ServiceManager] Unbinding service: ${serviceId}`);
    
    // Remove connection
    const index = bound.connections.indexOf(connection);
    if (index !== -1) {
      bound.connections.splice(index, 1);
    }
    
    // Notify disconnection
    connection.onServiceDisconnected(serviceId);
    
    // If no more connections, stop service
    if (bound.connections.length === 0) {
      this.boundServices.delete(serviceId);
      
      const serviceInfo = this.services.get(serviceId);
      if (serviceInfo && serviceInfo.state === ServiceState.BOUND) {
        // Call onUnbind and optionally onDestroy
        const intent: Intent = {
          action: '',
          component: {
            packageName: serviceInfo.packageName,
            className: serviceInfo.className,
          },
        };
        
        service.onUnbind(intent);
        service.onDestroy();
        
        this.services.delete(serviceId);
      }
    }
  }
  
  /**
   * Get service info
   */
  getServiceInfo(serviceId: string): ServiceInfo | null {
    return this.services.get(serviceId) || null;
  }
  
  /**
   * Get all running services
   */
  getRunningServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }
  
  /**
   * Start foreground service
   */
  startForeground(serviceId: string, notificationId: number, notification: any): void {
    const serviceInfo = this.services.get(serviceId);
    if (serviceInfo) {
      serviceInfo.foreground = true;
      console.log(`[ServiceManager] Service ${serviceId} now running in foreground`);
    }
  }
  
  /**
   * Stop foreground service
   */
  stopForeground(serviceId: string, removeNotification: boolean = true): void {
    const serviceInfo = this.services.get(serviceId);
    if (serviceInfo) {
      serviceInfo.foreground = false;
      console.log(`[ServiceManager] Service ${serviceId} no longer in foreground`);
    }
  }
}

/**
 * Intent Service - simplified background service
 */
export abstract class IntentService extends Service {
  private workerQueue: Intent[] = [];
  private processing = false;
  
  abstract onHandleIntent(intent: Intent): void | Promise<void>;
  
  onStartCommand(intent: Intent, flags: number, startId: number): number {
    this.workerQueue.push(intent);
    this.processQueue();
    return Service.START_NOT_STICKY;
  }
  
  onBind(intent: Intent): IBinder | null {
    return null; // IntentService doesn't support binding
  }
  
  onUnbind(intent: Intent): boolean {
    return false;
  }
  
  onDestroy(): void {
    this.workerQueue = [];
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.workerQueue.length === 0) return;
    
    this.processing = true;
    
    while (this.workerQueue.length > 0) {
      const intent = this.workerQueue.shift()!;
      try {
        await this.onHandleIntent(intent);
      } catch (e) {
        console.error('[IntentService] Error handling intent:', e);
      }
    }
    
    this.processing = false;
  }
}
