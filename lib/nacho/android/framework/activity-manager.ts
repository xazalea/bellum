/**
 * Android Activity Manager
 * Manages application lifecycle, activities, and tasks
 */

export interface Activity {
  id: string;
  className: string;
  packageName: string;
  state: ActivityState;
  window: WindowInfo | null;
  intent: Intent | null;
  savedState: Bundle | null;
  created: number;
  resumed: number;
}

export enum ActivityState {
  CREATED = 'created',
  STARTED = 'started',
  RESUMED = 'resumed',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  DESTROYED = 'destroyed',
}

export interface Intent {
  action: string;
  category?: string[];
  data?: string;
  extras?: Bundle;
  component?: ComponentName;
  flags?: number;
}

export interface ComponentName {
  packageName: string;
  className: string;
}

export interface Bundle {
  [key: string]: any;
}

export interface WindowInfo {
  width: number;
  height: number;
  canvas?: HTMLCanvasElement;
}

export interface Task {
  id: number;
  affinity: string;
  activities: Activity[];
}

/**
 * Activity Manager Service
 */
export class ActivityManager {
  private activities: Map<string, Activity> = new Map();
  private tasks: Map<number, Task> = new Map();
  private nextActivityId = 1;
  private nextTaskId = 1;
  private foregroundActivity: Activity | null = null;
  
  // Activity stack
  private activityStack: Activity[] = [];
  
  // Lifecycle callbacks
  private lifecycleCallbacks: Map<string, LifecycleCallback> = new Map();
  
  constructor() {
    console.log('[ActivityManager] Initialized');
  }
  
  /**
   * Start activity from intent
   */
  async startActivity(intent: Intent, options?: {
    windowInfo?: WindowInfo;
  }): Promise<Activity> {
    console.log(`[ActivityManager] Starting activity:`, intent);
    
    const activityId = `activity_${this.nextActivityId++}`;
    const activity: Activity = {
      id: activityId,
      className: intent.component?.className || 'MainActivity',
      packageName: intent.component?.packageName || 'com.example',
      state: ActivityState.CREATED,
      window: options?.windowInfo || null,
      intent,
      savedState: null,
      created: Date.now(),
      resumed: 0,
    };
    
    this.activities.set(activityId, activity);
    this.activityStack.push(activity);
    
    // Create task if needed
    const taskId = this.nextTaskId++;
    const task: Task = {
      id: taskId,
      affinity: activity.packageName,
      activities: [activity],
    };
    this.tasks.set(taskId, task);
    
    // Run lifecycle callbacks
    await this.onCreate(activity);
    await this.onStart(activity);
    await this.onResume(activity);
    
    this.foregroundActivity = activity;
    
    return activity;
  }
  
  /**
   * Finish activity
   */
  async finishActivity(activityId: string): Promise<void> {
    const activity = this.activities.get(activityId);
    if (!activity) return;
    
    console.log(`[ActivityManager] Finishing activity: ${activityId}`);
    
    await this.onPause(activity);
    await this.onStop(activity);
    await this.onDestroy(activity);
    
    // Remove from stack
    const index = this.activityStack.indexOf(activity);
    if (index !== -1) {
      this.activityStack.splice(index, 1);
    }
    
    this.activities.delete(activityId);
    
    // Update foreground activity
    if (this.foregroundActivity === activity) {
      this.foregroundActivity = this.activityStack[this.activityStack.length - 1] || null;
      if (this.foregroundActivity) {
        await this.onResume(this.foregroundActivity);
      }
    }
  }
  
  /**
   * Pause activity
   */
  async pauseActivity(activityId: string): Promise<void> {
    const activity = this.activities.get(activityId);
    if (!activity || activity.state === ActivityState.PAUSED) return;
    
    await this.onPause(activity);
  }
  
  /**
   * Resume activity
   */
  async resumeActivity(activityId: string): Promise<void> {
    const activity = this.activities.get(activityId);
    if (!activity) return;
    
    if (activity.state === ActivityState.STOPPED) {
      await this.onRestart(activity);
      await this.onStart(activity);
    }
    
    await this.onResume(activity);
    this.foregroundActivity = activity;
  }
  
  /**
   * Get foreground activity
   */
  getForegroundActivity(): Activity | null {
    return this.foregroundActivity;
  }
  
  /**
   * Get all activities
   */
  getAllActivities(): Activity[] {
    return Array.from(this.activities.values());
  }
  
  /**
   * Get activity by ID
   */
  getActivity(activityId: string): Activity | null {
    return this.activities.get(activityId) || null;
  }
  
  /**
   * Register lifecycle callback
   */
  registerLifecycleCallback(activityId: string, callback: LifecycleCallback): void {
    this.lifecycleCallbacks.set(activityId, callback);
  }
  
  /**
   * Unregister lifecycle callback
   */
  unregisterLifecycleCallback(activityId: string): void {
    this.lifecycleCallbacks.delete(activityId);
  }
  
  // ===== Lifecycle Methods =====
  
  private async onCreate(activity: Activity): Promise<void> {
    console.log(`[ActivityManager] onCreate: ${activity.id}`);
    activity.state = ActivityState.CREATED;
    
    const callback = this.lifecycleCallbacks.get(activity.id);
    if (callback?.onCreate) {
      await callback.onCreate(activity.savedState);
    }
  }
  
  private async onStart(activity: Activity): Promise<void> {
    console.log(`[ActivityManager] onStart: ${activity.id}`);
    activity.state = ActivityState.STARTED;
    
    const callback = this.lifecycleCallbacks.get(activity.id);
    if (callback?.onStart) {
      await callback.onStart();
    }
  }
  
  private async onResume(activity: Activity): Promise<void> {
    console.log(`[ActivityManager] onResume: ${activity.id}`);
    activity.state = ActivityState.RESUMED;
    activity.resumed = Date.now();
    
    const callback = this.lifecycleCallbacks.get(activity.id);
    if (callback?.onResume) {
      await callback.onResume();
    }
  }
  
  private async onPause(activity: Activity): Promise<void> {
    console.log(`[ActivityManager] onPause: ${activity.id}`);
    activity.state = ActivityState.PAUSED;
    
    const callback = this.lifecycleCallbacks.get(activity.id);
    if (callback?.onPause) {
      await callback.onPause();
    }
  }
  
  private async onStop(activity: Activity): Promise<void> {
    console.log(`[ActivityManager] onStop: ${activity.id}`);
    activity.state = ActivityState.STOPPED;
    
    const callback = this.lifecycleCallbacks.get(activity.id);
    if (callback?.onStop) {
      await callback.onStop();
    }
  }
  
  private async onDestroy(activity: Activity): Promise<void> {
    console.log(`[ActivityManager] onDestroy: ${activity.id}`);
    activity.state = ActivityState.DESTROYED;
    
    const callback = this.lifecycleCallbacks.get(activity.id);
    if (callback?.onDestroy) {
      await callback.onDestroy();
    }
    
    this.lifecycleCallbacks.delete(activity.id);
  }
  
  private async onRestart(activity: Activity): Promise<void> {
    console.log(`[ActivityManager] onRestart: ${activity.id}`);
    
    const callback = this.lifecycleCallbacks.get(activity.id);
    if (callback?.onRestart) {
      await callback.onRestart();
    }
  }
  
  /**
   * Save activity state
   */
  saveInstanceState(activityId: string, state: Bundle): void {
    const activity = this.activities.get(activityId);
    if (activity) {
      activity.savedState = state;
    }
  }
  
  /**
   * Get running tasks
   */
  getRunningTasks(maxNum: number): Task[] {
    return Array.from(this.tasks.values()).slice(0, maxNum);
  }
  
  /**
   * Kill background processes
   */
  killBackgroundProcesses(packageName: string): void {
    console.log(`[ActivityManager] Killing background processes: ${packageName}`);
    
    for (const [id, activity] of this.activities) {
      if (activity.packageName === packageName && 
          activity.state !== ActivityState.RESUMED) {
        this.finishActivity(id);
      }
    }
  }
}

/**
 * Lifecycle callback interface
 */
export interface LifecycleCallback {
  onCreate?: (savedInstanceState: Bundle | null) => void | Promise<void>;
  onStart?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
  onRestart?: () => void | Promise<void>;
  onSaveInstanceState?: (outState: Bundle) => void;
  onRestoreInstanceState?: (savedInstanceState: Bundle) => void;
}
