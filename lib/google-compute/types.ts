/**
 * Google Compute Types
 * Type definitions for Google compute offloading
 */

export interface ComputeTask {
  id: string;
  type: 'web-app' | 'javascript' | 'rendering' | 'generic';
  payload: ComputeTaskPayload;
  priority: number;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export type ComputeTaskPayload =
  | WebAppPayload
  | JavaScriptPayload
  | RenderingPayload
  | GenericPayload;

export interface WebAppPayload {
  type: 'web-app';
  url: string;
  extractionConfig: ResultExtractionConfig;
}

export interface JavaScriptPayload {
  type: 'javascript';
  code: string;
  extractionConfig: ResultExtractionConfig;
}

export interface RenderingPayload {
  type: 'rendering';
  html: string;
  extractionConfig: ResultExtractionConfig;
}

export interface GenericPayload {
  type: 'generic';
  data: unknown;
}

export interface ResultExtractionConfig {
  method: 'dom' | 'console' | 'postMessage' | 'http';
  selector?: string;
  timeout?: number;
  callbackUrl?: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
  provider: 'google' | 'cluster';
  metadata?: {
    googleDatacenter?: string;
    clusterNode?: string;
    retries?: number;
  };
}

export interface ComputeCapacity {
  provider: 'google' | 'cluster';
  available: boolean;
  maxConcurrentTasks: number;
  currentTasks: number;
  utilizationPercent: number;
  rateLimited: boolean;
  estimatedQueueTime?: number;
}

export interface GoogleComputeConfig {
  enabled: boolean;
  offloadThreshold: number;
  maxConcurrentTasks: number;
  taskTimeout: number;
  rateLimitBackoff: number;
  fallbackToCluster: boolean;
  allowedTaskTypes: ComputeTask['type'][];
}

export interface GoogleComputeMetrics {
  tasksRouted: number;
  tasksSucceeded: number;
  tasksFailed: number;
  averageExecutionTime: number;
  rateLimitIncidents: number;
  costSavings: number;
  timestamp: number;
}

export interface TaskExecutionContext {
  task: ComputeTask;
  startTime: number;
  provider: 'google' | 'cluster';
  iframeElement?: HTMLIFrameElement;
  abortController?: AbortController;
}
