/**
 * Google Compute Configuration
 * Centralized configuration management for Google compute offloading
 */

import type { GoogleComputeConfig, ComputeTask } from './types';
import type { RoutingConfig } from './routing-strategy';

export interface GoogleComputeSettings extends GoogleComputeConfig {
  routing: RoutingConfig;
}

const DEFAULT_CONFIG: GoogleComputeSettings = {
  // Service configuration
  enabled: true,
  offloadThreshold: 0.7,
  maxConcurrentTasks: 10,
  taskTimeout: 30000,
  rateLimitBackoff: 60000,
  fallbackToCluster: true,
  allowedTaskTypes: ['web-app', 'javascript', 'rendering'],

  // Routing configuration
  routing: {
    googleOffloadThreshold: 0.7,
    clusterPreferredThreshold: 0.5,
    latencySensitivityMs: 100,
    enableGoogleFallback: true,
  },
};

export class ConfigManager {
  private config: GoogleComputeSettings;
  private listeners: Array<(config: GoogleComputeSettings) => void> = [];

  constructor(initialConfig?: Partial<GoogleComputeSettings>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...initialConfig,
      routing: {
        ...DEFAULT_CONFIG.routing,
        ...(initialConfig?.routing || {}),
      },
    };
  }

  /**
   * Get configuration
   */
  getConfig(): GoogleComputeSettings {
    return { ...this.config, routing: { ...this.config.routing } };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<GoogleComputeSettings>): void {
    this.config = {
      ...this.config,
      ...updates,
      routing: {
        ...this.config.routing,
        ...(updates.routing || {}),
      },
    };

    // Notify listeners
    this._notifyListeners();
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this._notifyListeners();
  }

  /**
   * Subscribe to config changes
   */
  subscribe(listener: (config: GoogleComputeSettings) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Enable Google compute
   */
  enable(): void {
    this.config.enabled = true;
    this._notifyListeners();
  }

  /**
   * Disable Google compute
   */
  disable(): void {
    this.config.enabled = false;
    this._notifyListeners();
  }

  /**
   * Set offload threshold
   */
  setOffloadThreshold(threshold: number): void {
    this.config.offloadThreshold = Math.max(0, Math.min(1, threshold));
    this.config.routing.googleOffloadThreshold = this.config.offloadThreshold;
    this._notifyListeners();
  }

  /**
   * Set max concurrent tasks
   */
  setMaxConcurrentTasks(max: number): void {
    this.config.maxConcurrentTasks = Math.max(1, max);
    this._notifyListeners();
  }

  /**
   * Add allowed task type
   */
  addAllowedTaskType(type: ComputeTask['type']): void {
    if (!this.config.allowedTaskTypes.includes(type)) {
      this.config.allowedTaskTypes.push(type);
      this._notifyListeners();
    }
  }

  /**
   * Remove allowed task type
   */
  removeAllowedTaskType(type: ComputeTask['type']): void {
    const index = this.config.allowedTaskTypes.indexOf(type);
    if (index > -1) {
      this.config.allowedTaskTypes.splice(index, 1);
      this._notifyListeners();
    }
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.offloadThreshold < 0 || this.config.offloadThreshold > 1) {
      errors.push('offloadThreshold must be between 0 and 1');
    }

    if (this.config.maxConcurrentTasks < 1) {
      errors.push('maxConcurrentTasks must be at least 1');
    }

    if (this.config.taskTimeout < 1000) {
      errors.push('taskTimeout must be at least 1000ms');
    }

    if (this.config.rateLimitBackoff < 1000) {
      errors.push('rateLimitBackoff must be at least 1000ms');
    }

    if (this.config.allowedTaskTypes.length === 0) {
      errors.push('At least one task type must be allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(configJson);
      this.config = {
        ...DEFAULT_CONFIG,
        ...imported,
        routing: {
          ...DEFAULT_CONFIG.routing,
          ...(imported.routing || {}),
        },
      };

      const validation = this.validate();
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      this._notifyListeners();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }

  /**
   * Notify listeners of config changes
   */
  private _notifyListeners(): void {
    const config = this.getConfig();
    for (const listener of this.listeners) {
      try {
        listener(config);
      } catch (error) {
        console.error('[ConfigManager] Listener error:', error);
      }
    }
  }
}

// Singleton instance
let instance: ConfigManager | null = null;

export function getConfigManager(
  initialConfig?: Partial<GoogleComputeSettings>
): ConfigManager {
  if (!instance) {
    instance = new ConfigManager(initialConfig);
  }
  return instance;
}

// Load config from environment variables if available
export function loadConfigFromEnv(): Partial<GoogleComputeSettings> {
  const config: Partial<GoogleComputeSettings> = {};

  if (process.env.GOOGLE_COMPUTE_ENABLED !== undefined) {
    config.enabled = process.env.GOOGLE_COMPUTE_ENABLED === 'true';
  }

  if (process.env.GOOGLE_COMPUTE_OFFLOAD_THRESHOLD) {
    config.offloadThreshold = parseFloat(
      process.env.GOOGLE_COMPUTE_OFFLOAD_THRESHOLD
    );
  }

  if (process.env.GOOGLE_COMPUTE_MAX_CONCURRENT_TASKS) {
    config.maxConcurrentTasks = parseInt(
      process.env.GOOGLE_COMPUTE_MAX_CONCURRENT_TASKS
    );
  }

  if (process.env.GOOGLE_COMPUTE_TASK_TIMEOUT) {
    config.taskTimeout = parseInt(process.env.GOOGLE_COMPUTE_TASK_TIMEOUT);
  }

  return config;
}
