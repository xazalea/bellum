/**
 * Android Framework Services
 * Implements ActivityManagerService, PackageManagerService, WindowManagerService, SurfaceFlinger
 */

import { DEXFile, ClassDefItem, MethodItem, CodeItem } from './dex-parser';

// Intent for activity launching
export interface Intent {
  action: string;
  data?: string;
  type?: string;
  component?: {
    packageName: string;
    className: string;
  };
  extras?: Map<string, any>;
  flags?: number;
}

// Activity info
export interface ActivityInfo {
  name: string;
  packageName: string;
  label?: string;
  icon?: string;
  theme?: string;
  launchMode?: 'standard' | 'singleTop' | 'singleTask' | 'singleInstance';
}

// Service info
export interface ServiceInfo {
  name: string;
  packageName: string;
  exported?: boolean;
}

// Package info
export interface PackageInfo {
  packageName: string;
  versionName?: string;
  versionCode?: number;
  activities: ActivityInfo[];
  services: ServiceInfo[];
  permissions: string[];
  applicationInfo: ApplicationInfo;
}

// Application info
export interface ApplicationInfo {
  packageName: string;
  sourceDir: string;
  dataDir: string;
  nativeLibraryDir?: string;
  flags: number;
  targetSdkVersion: number;
}

// Window (for WindowManager)
export interface Window {
  id: number;
  attrs: WindowManagerLayoutParams;
  view: any; // View hierarchy root
  surface?: Surface;
  isVisible: boolean;
  isFocused: boolean;
}

// Window layout params
export interface WindowManagerLayoutParams {
  type: number;
  flags: number;
  format: number;
  width: number;
  height: number;
  x?: number;
  y?: number;
  gravity?: number;
  title?: string;
}

// Surface for rendering
export interface Surface {
  width: number;
  height: number;
  format: number;
  buffer: ArrayBuffer;
  canvas?: any;
}

// Process record
export interface ProcessRecord {
  pid: number;
  uid: number;
  packageName: string;
  processName: string;
  activities: string[];
  services: string[];
  dexFiles: DEXFile[];
  memoryUsage: number;
  priority: number;
}

// Display metrics
export interface DisplayMetrics {
  widthPixels: number;
  heightPixels: number;
  density: number;
  densityDpi: number;
  scaledDensity: number;
  xdpi: number;
  ydpi: number;
}

/**
 * Activity Manager Service
 * Manages activity lifecycle and task stack
 */
export class ActivityManagerService {
  private activities: Map<string, ActivityInfo> = new Map();
  private taskStack: string[] = [];
  private currentActivity: string | null = null;
  private processes: Map<number, ProcessRecord> = new Map();
  private nextPid = 1000;
  private nextUid = 10000;
  
  private listeners: Set<(event: string, data: any) => void> = new Set();

  constructor() {
    console.log('[AMS] ActivityManagerService initialized');
  }

  /**
   * Start a new activity
   */
  async startActivity(intent: Intent): Promise<void> {
    console.log(`[AMS] startActivity: ${intent.action || intent.component?.className}`);

    const activityName = intent.component?.className || intent.action;
    if (!activityName) {
      throw new Error('Intent must specify component or action');
    }

    const activityInfo = this.activities.get(activityName);
    if (!activityInfo) {
      console.warn(`[AMS] Activity not found: ${activityName}, creating placeholder`);
      // Create placeholder activity
      this.activities.set(activityName, {
        name: activityName,
        packageName: intent.component?.packageName || 'unknown',
      });
    }

    // Add to task stack
    if (this.currentActivity) {
      this.taskStack.push(this.currentActivity);
    }
    this.currentActivity = activityName;

    // Notify listeners
    this.emit('activityStarted', { activityName, intent });

    console.log(`[AMS] Activity started: ${activityName}`);
  }

  /**
   * Finish current activity
   */
  async finishActivity(activityName?: string): Promise<void> {
    const target = activityName || this.currentActivity;
    if (!target) return;

    console.log(`[AMS] finishActivity: ${target}`);

    // Pop from stack
    if (this.currentActivity === target) {
      this.currentActivity = this.taskStack.pop() || null;
    } else {
      const idx = this.taskStack.lastIndexOf(target);
      if (idx >= 0) {
        this.taskStack.splice(idx, 1);
      }
    }

    this.emit('activityFinished', { activityName: target });
  }

  /**
   * Register an activity
   */
  registerActivity(info: ActivityInfo): void {
    this.activities.set(info.name, info);
    console.log(`[AMS] Registered activity: ${info.name}`);
  }

  /**
   * Get current activity
   */
  getCurrentActivity(): string | null {
    return this.currentActivity;
  }

  /**
   * Get task stack
   */
  getTaskStack(): string[] {
    return [...this.taskStack];
  }

  /**
   * Start a new process
   */
  startProcess(packageName: string, processName: string): ProcessRecord {
    const pid = this.nextPid++;
    const uid = this.nextUid++;

    const process: ProcessRecord = {
      pid,
      uid,
      packageName,
      processName,
      activities: [],
      services: [],
      dexFiles: [],
      memoryUsage: 0,
      priority: 0,
    };

    this.processes.set(pid, process);
    console.log(`[AMS] Started process: ${processName} (pid=${pid}, uid=${uid})`);

    return process;
  }

  /**
   * Get process by PID
   */
  getProcess(pid: number): ProcessRecord | undefined {
    return this.processes.get(pid);
  }

  /**
   * Kill a process
   */
  killProcess(pid: number): void {
    const process = this.processes.get(pid);
    if (process) {
      console.log(`[AMS] Killing process: ${process.processName} (pid=${pid})`);
      this.processes.delete(pid);
      this.emit('processKilled', { pid, processName: process.processName });
    }
  }

  /**
   * Get all processes
   */
  getProcesses(): ProcessRecord[] {
    return Array.from(this.processes.values());
  }

  /**
   * Add event listener
   */
  addListener(callback: (event: string, data: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('[AMS] Listener error:', e);
      }
    }
  }
}

/**
 * Package Manager Service
 * Manages installed packages and provides package info
 */
export class PackageManagerService {
  private packages: Map<string, PackageInfo> = new Map();
  private activities: Map<string, ActivityInfo> = new Map();
  private services: Map<string, ServiceInfo> = new Map();

  constructor() {
    console.log('[PMS] PackageManagerService initialized');
  }

  /**
   * Install a package
   */
  async installPackage(apkBuffer: ArrayBuffer, dexFile?: DEXFile): Promise<PackageInfo> {
    // Parse APK manifest (simplified - would need full APK parsing)
    const packageName = `app.${Date.now()}`;
    
    const info: PackageInfo = {
      packageName,
      versionName: '1.0',
      versionCode: 1,
      activities: [],
      services: [],
      permissions: [],
      applicationInfo: {
        packageName,
        sourceDir: '/data/app/' + packageName,
        dataDir: '/data/data/' + packageName,
        flags: 0,
        targetSdkVersion: 30,
      },
    };

    // Extract activities from DEX if available
    if (dexFile) {
      for (const [className, classDef] of dexFile.classes) {
        // Check if it's an Activity subclass
        if (this.isActivityClass(classDef)) {
          const activityInfo: ActivityInfo = {
            name: className,
            packageName,
          };
          info.activities.push(activityInfo);
          this.activities.set(className, activityInfo);
        }
        
        // Check if it's a Service subclass
        if (this.isServiceClass(classDef)) {
          const serviceInfo: ServiceInfo = {
            name: className,
            packageName,
          };
          info.services.push(serviceInfo);
          this.services.set(className, serviceInfo);
        }
      }
    }

    this.packages.set(packageName, info);
    console.log(`[PMS] Installed package: ${packageName} (${info.activities.length} activities, ${info.services.length} services)`);

    return info;
  }

  /**
   * Check if class is an Activity
   */
  private isActivityClass(classDef: ClassDefItem): boolean {
    // Check superclass chain
    const superName = classDef.superClassName;
    return superName.includes('Activity') || 
           superName === 'Landroid/app/Activity;' ||
           superName === 'Landroidx/appcompat/app/AppCompatActivity;';
  }

  /**
   * Check if class is a Service
   */
  private isServiceClass(classDef: ClassDefItem): boolean {
    const superName = classDef.superClassName;
    return superName.includes('Service') ||
           superName === 'Landroid/app/Service;';
  }

  /**
   * Get package info
   */
  getPackageInfo(packageName: string): PackageInfo | undefined {
    return this.packages.get(packageName);
  }

  /**
   * Get activity info
   */
  getActivityInfo(className: string): ActivityInfo | undefined {
    return this.activities.get(className);
  }

  /**
   * Get service info
   */
  getServiceInfo(className: string): ServiceInfo | undefined {
    return this.services.get(className);
  }

  /**
   * Get all packages
   */
  getInstalledPackages(): PackageInfo[] {
    return Array.from(this.packages.values());
  }

  /**
   * Uninstall a package
   */
  uninstallPackage(packageName: string): void {
    const info = this.packages.get(packageName);
    if (info) {
      // Remove activities and services
      for (const activity of info.activities) {
        this.activities.delete(activity.name);
      }
      for (const service of info.services) {
        this.services.delete(service.name);
      }
      
      this.packages.delete(packageName);
      console.log(`[PMS] Uninstalled package: ${packageName}`);
    }
  }
}

/**
 * Window Manager Service
 * Manages windows and their layout
 */
export class WindowManagerService {
  private windows: Map<number, Window> = new Map();
  private windowList: Window[] = [];
  private nextWindowId = 1;
  private focusedWindow: number | null = null;
  
  private displayMetrics: DisplayMetrics = {
    widthPixels: 1080,
    heightPixels: 1920,
    density: 2.625,
    densityDpi: 420,
    scaledDensity: 2.625,
    xdpi: 420,
    ydpi: 420,
  };

  private listeners: Set<(event: string, data: any) => void> = new Set();

  constructor() {
    console.log('[WMS] WindowManagerService initialized');
  }

  /**
   * Add a window
   */
  addWindow(attrs: WindowManagerLayoutParams): Window {
    const id = this.nextWindowId++;
    
    const window: Window = {
      id,
      attrs,
      view: null,
      isVisible: true,
      isFocused: false,
    };

    this.windows.set(id, window);
    this.windowList.push(window);
    
    console.log(`[WMS] Added window: ${id} (${attrs.width}x${attrs.height})`);
    
    this.emit('windowAdded', { windowId: id, attrs });
    
    return window;
  }

  /**
   * Remove a window
   */
  removeWindow(windowId: number): void {
    const window = this.windows.get(windowId);
    if (window) {
      this.windows.delete(windowId);
      this.windowList = this.windowList.filter(w => w.id !== windowId);
      
      if (this.focusedWindow === windowId) {
        this.focusedWindow = this.windowList.length > 0 
          ? this.windowList[this.windowList.length - 1].id 
          : null;
      }
      
      console.log(`[WMS] Removed window: ${windowId}`);
      this.emit('windowRemoved', { windowId });
    }
  }

  /**
   * Update window layout
   */
  updateWindowLayout(windowId: number, attrs: WindowManagerLayoutParams): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.attrs = { ...window.attrs, ...attrs };
      this.emit('windowLayoutChanged', { windowId, attrs });
    }
  }

  /**
   * Set window visibility
   */
  setWindowVisibility(windowId: number, visible: boolean): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.isVisible = visible;
      this.emit('windowVisibilityChanged', { windowId, visible });
    }
  }

  /**
   * Focus a window
   */
  focusWindow(windowId: number): void {
    // Unfocus current
    if (this.focusedWindow !== null) {
      const current = this.windows.get(this.focusedWindow);
      if (current) {
        current.isFocused = false;
      }
    }

    // Focus new
    const window = this.windows.get(windowId);
    if (window) {
      window.isFocused = true;
      this.focusedWindow = windowId;
      this.emit('windowFocused', { windowId });
    }
  }

  /**
   * Get window by ID
   */
  getWindow(windowId: number): Window | undefined {
    return this.windows.get(windowId);
  }

  /**
   * Get all windows
   */
  getWindows(): Window[] {
    return [...this.windowList];
  }

  /**
   * Get display metrics
   */
  getDisplayMetrics(): DisplayMetrics {
    return { ...this.displayMetrics };
  }

  /**
   * Set display metrics
   */
  setDisplayMetrics(metrics: Partial<DisplayMetrics>): void {
    this.displayMetrics = { ...this.displayMetrics, ...metrics };
    this.emit('displayMetricsChanged', this.displayMetrics);
  }

  /**
   * Add event listener
   */
  addListener(callback: (event: string, data: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('[WMS] Listener error:', e);
      }
    }
  }
}

/**
 * Surface Flinger
 * Composites surfaces and presents to display
 */
export class SurfaceFlinger {
  private surfaces: Map<number, Surface> = new Map();
  private displayWidth: number = 1080;
  private displayHeight: number = 1920;
  private frameBuffer: ArrayBuffer;
  private frameCount: number = 0;
  private vsyncCallbacks: Set<() => void> = new Set();
  private running: boolean = false;
  private rafHandle: number | null = null;

  constructor() {
    this.frameBuffer = new ArrayBuffer(this.displayWidth * this.displayHeight * 4);
    console.log('[SF] SurfaceFlinger initialized');
  }

  /**
   * Create a surface
   */
  createSurface(width: number, height: number, format: number = 1): Surface {
    const buffer = new ArrayBuffer(width * height * 4);
    
    const surface: Surface = {
      width,
      height,
      format,
      buffer,
    };

    this.surfaces.set(this.surfaces.size, surface);
    console.log(`[SF] Created surface: ${width}x${height}`);
    
    return surface;
  }

  /**
   * Destroy a surface
   */
  destroySurface(surface: Surface): void {
    for (const [id, s] of this.surfaces) {
      if (s === surface) {
        this.surfaces.delete(id);
        console.log(`[SF] Destroyed surface: ${id}`);
        break;
      }
    }
  }

  /**
   * Composite all surfaces to display
   */
  composite(): ArrayBuffer {
    // Clear frame buffer
    const view = new Uint32Array(this.frameBuffer);
    view.fill(0xFF000000); // Black with full alpha

    // Composite each surface (simplified - just copy)
    for (const surface of this.surfaces.values()) {
      this.blitSurface(surface, view);
    }

    this.frameCount++;
    return this.frameBuffer;
  }

  /**
   * Blit a surface to the frame buffer
   */
  private blitSurface(surface: Surface, framebuffer: Uint32Array): void {
    const srcView = new Uint32Array(surface.buffer);
    const srcWidth = surface.width;
    const srcHeight = surface.height;

    // Simple copy (no scaling)
    for (let y = 0; y < Math.min(srcHeight, this.displayHeight); y++) {
      for (let x = 0; x < Math.min(srcWidth, this.displayWidth); x++) {
        const srcIdx = y * srcWidth + x;
        const dstIdx = y * this.displayWidth + x;
        framebuffer[dstIdx] = srcView[srcIdx];
      }
    }
  }

  /**
   * Start vsync loop
   */
  startVsync(): void {
    if (this.running) return;
    this.running = true;
    this.vsyncLoop();
  }

  /**
   * Stop vsync loop
   */
  stopVsync(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  /**
   * Vsync loop
   */
  private vsyncLoop = (): void => {
    if (!this.running) return;

    // Notify vsync listeners
    for (const callback of this.vsyncCallbacks) {
      try {
        callback();
      } catch (e) {
        console.error('[SF] Vsync callback error:', e);
      }
    }

    // Composite
    this.composite();

    // Schedule next vsync
    this.rafHandle = requestAnimationFrame(this.vsyncLoop);
  };

  /**
   * Register vsync callback
   */
  onVsync(callback: () => void): () => void {
    this.vsyncCallbacks.add(callback);
    return () => this.vsyncCallbacks.delete(callback);
  }

  /**
   * Get frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Set display size
   */
  setDisplaySize(width: number, height: number): void {
    this.displayWidth = width;
    this.displayHeight = height;
    this.frameBuffer = new ArrayBuffer(width * height * 4);
    console.log(`[SF] Display size: ${width}x${height}`);
  }

  /**
   * Get frame buffer
   */
  getFrameBuffer(): ArrayBuffer {
    return this.frameBuffer;
  }
}

/**
 * Android Framework Services Container
 * Holds all system services
 */
export class AndroidFrameworkServices {
  activityManager: ActivityManagerService;
  packageManager: PackageManagerService;
  windowManager: WindowManagerService;
  surfaceFlinger: SurfaceFlinger;

  constructor() {
    this.activityManager = new ActivityManagerService();
    this.packageManager = new PackageManagerService();
    this.windowManager = new WindowManagerService();
    this.surfaceFlinger = new SurfaceFlinger();
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    console.log('[AndroidFramework] Initializing services...');
    
    // Start SurfaceFlinger vsync
    this.surfaceFlinger.startVsync();
    
    console.log('[AndroidFramework] Services initialized');
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    console.log('[AndroidFramework] Shutting down services...');
    
    this.surfaceFlinger.stopVsync();
    
    console.log('[AndroidFramework] Services shut down');
  }

  /**
   * Get system service by name
   */
  getSystemService(name: string): any {
    switch (name) {
      case 'activity':
        return this.activityManager;
      case 'package':
        return this.packageManager;
      case 'window':
        return this.windowManager;
      default:
        console.warn(`[AndroidFramework] Unknown service: ${name}`);
        return null;
    }
  }
}

// Singleton instance
let frameworkInstance: AndroidFrameworkServices | null = null;

export function getAndroidFramework(): AndroidFrameworkServices {
  if (!frameworkInstance) {
    frameworkInstance = new AndroidFrameworkServices();
  }
  return frameworkInstance;
}