/**
 * Google Compute Service
 * Main service for executing compute tasks via Google's infrastructure
 */

import type {
  ComputeTask,
  TaskResult,
  ComputeCapacity,
  GoogleComputeConfig,
  TaskExecutionContext,
} from './types';
import { getTaskExecutor } from './task-executor';

export class GoogleComputeService {
  private config: GoogleComputeConfig;
  private activeTasks: Map<string, TaskExecutionContext> = new Map();
  private rateLimited: boolean = false;
  private rateLimitUntil: number = 0;

  constructor(config: Partial<GoogleComputeConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      offloadThreshold: config.offloadThreshold ?? 0.7,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
      taskTimeout: config.taskTimeout ?? 30000,
      rateLimitBackoff: config.rateLimitBackoff ?? 60000,
      fallbackToCluster: config.fallbackToCluster ?? true,
      allowedTaskTypes: config.allowedTaskTypes ?? ['web-app', 'javascript', 'rendering'],
    };
  }

  /**
   * Execute a compute task on Google's infrastructure
   */
  async executeTask(task: ComputeTask): Promise<TaskResult> {
    const startTime = Date.now();

    // Validate task
    if (!this.canHandleTask(task)) {
      return {
        taskId: task.id,
        success: false,
        error: 'Task type not suitable for Google compute',
        executionTime: Date.now() - startTime,
        provider: 'cluster',
      };
    }

    // Check capacity
    const capacity = this.getCapacity();
    if (!capacity.available) {
      return {
        taskId: task.id,
        success: false,
        error: capacity.rateLimited
          ? 'Rate limited by Google'
          : 'No capacity available',
        executionTime: Date.now() - startTime,
        provider: 'cluster',
      };
    }

    // Create execution context
    const context: TaskExecutionContext = {
      task,
      startTime,
      provider: 'google',
      abortController: new AbortController(),
    };

    this.activeTasks.set(task.id, context);

    try {
      // Execute task based on payload type
      const result = await this._executeTaskInternal(context);

      this.activeTasks.delete(task.id);

      return {
        taskId: task.id,
        success: true,
        result,
        executionTime: Date.now() - startTime,
        provider: 'google',
        metadata: {
          googleDatacenter: 'unknown', // Would be detected from fingerprinting
        },
      };
    } catch (error) {
      this.activeTasks.delete(task.id);

      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('rate limit')) {
        this._handleRateLimit();
      }

      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        provider: 'google',
      };
    }
  }

  /**
   * Check if task is suitable for Google offload
   */
  canHandleTask(task: ComputeTask): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if task type is allowed
    if (!this.config.allowedTaskTypes.includes(task.type)) {
      return false;
    }

    // Check if we're rate limited
    if (this.rateLimited && Date.now() < this.rateLimitUntil) {
      return false;
    }

    // Task must be web-based
    return ['web-app', 'javascript', 'rendering'].includes(task.type);
  }

  /**
   * Get current capacity/availability
   */
  getCapacity(): ComputeCapacity {
    const now = Date.now();
    const isRateLimited = this.rateLimited && now < this.rateLimitUntil;

    return {
      provider: 'google',
      available: this.config.enabled && !isRateLimited && this.activeTasks.size < this.config.maxConcurrentTasks,
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      currentTasks: this.activeTasks.size,
      utilizationPercent: (this.activeTasks.size / this.config.maxConcurrentTasks) * 100,
      rateLimited: isRateLimited,
      estimatedQueueTime: isRateLimited ? this.rateLimitUntil - now : 0,
    };
  }

  /**
   * Create Google Translate URL for a web app/task
   */
  createTranslateUrl(taskUrl: string): string {
    const encodedUrl = encodeURIComponent(taskUrl);
    return `https://translate.google.com/translate?sl=auto&tl=en&u=${encodedUrl}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GoogleComputeConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): GoogleComputeConfig {
    return { ...this.config };
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const context = this.activeTasks.get(taskId);
    if (!context) {
      return false;
    }

    context.abortController?.abort();
    this.activeTasks.delete(taskId);
    return true;
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): string[] {
    return Array.from(this.activeTasks.keys());
  }

  /**
   * Internal task execution
   */
  private async _executeTaskInternal(context: TaskExecutionContext): Promise<unknown> {
    const { task } = context;
    const timeout = task.timeout || this.config.taskTimeout;

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout);
    });

    // Execute based on payload type
    let executionPromise: Promise<unknown>;

    switch (task.payload.type) {
      case 'web-app':
        executionPromise = this._executeWebApp(context);
        break;
      case 'javascript':
        executionPromise = this._executeJavaScript(context);
        break;
      case 'rendering':
        executionPromise = this._executeRendering(context);
        break;
      default:
        throw new Error('Unsupported task type');
    }

    // Race between execution and timeout
    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Execute web app task
   */
  private async _executeWebApp(context: TaskExecutionContext): Promise<unknown> {
    const { task } = context;
    if (task.payload.type !== 'web-app') {
      throw new Error('Invalid payload type');
    }

    const translateUrl = this.createTranslateUrl(task.payload.url);
    const executor = getTaskExecutor();

    // Execute in iframe and extract results
    return executor.executeInIframe(context, translateUrl);
  }

  /**
   * Execute JavaScript task
   */
  private async _executeJavaScript(context: TaskExecutionContext): Promise<unknown> {
    const { task } = context;
    if (task.payload.type !== 'javascript') {
      throw new Error('Invalid payload type');
    }

    // Package JavaScript as a web page
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Task ${task.id}</title></head>
<body>
<div id="result"></div>
<script>
${task.payload.code}
</script>
</body>
</html>
    `.trim();

    // Create a data URL
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    const translateUrl = this.createTranslateUrl(dataUrl);
    const executor = getTaskExecutor();

    // Execute in iframe and extract results
    return executor.executeInIframe(context, translateUrl);
  }

  /**
   * Execute rendering task
   */
  private async _executeRendering(context: TaskExecutionContext): Promise<unknown> {
    const { task } = context;
    if (task.payload.type !== 'rendering') {
      throw new Error('Invalid payload type');
    }

    // Similar to JavaScript execution
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(task.payload.html)}`;
    const translateUrl = this.createTranslateUrl(dataUrl);
    const executor = getTaskExecutor();

    // Execute in iframe and extract results
    return executor.executeInIframe(context, translateUrl);
  }

  /**
   * Handle rate limiting
   */
  private _handleRateLimit(): void {
    this.rateLimited = true;
    this.rateLimitUntil = Date.now() + this.config.rateLimitBackoff;

    console.warn(
      `[GoogleCompute] Rate limited. Backing off for ${this.config.rateLimitBackoff}ms`
    );
  }
}

// Singleton instance
let instance: GoogleComputeService | null = null;

export function getGoogleComputeService(
  config?: Partial<GoogleComputeConfig>
): GoogleComputeService {
  if (!instance) {
    instance = new GoogleComputeService(config);
  }
  return instance;
}
