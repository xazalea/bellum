/**
 * Feature Flag Infrastructure
 * Supports gradual rollout, user targeting, and A/B testing
 */

export type RolloutStrategy = 'all' | 'none' | 'percentage' | 'user_segment' | 'tier_based';

export interface FeatureFlagConfig {
  name: string;
  enabled: boolean;
  strategy: RolloutStrategy;
  percentage?: number; // 0-100
  tiers?: string[]; // Device tiers that have access
  userSegments?: string[]; // User segments (e.g., 'beta', 'internal')
  startDate?: string; // ISO date string for scheduled rollout
  endDate?: string; // ISO date string for scheduled end
  dependencies?: string[]; // Other feature flags that must be enabled
}

export interface FeatureFlagState {
  name: string;
  enabled: boolean;
  reason: string;
}

// Default feature flags for the platform enhancement
const DEFAULT_FLAGS: FeatureFlagConfig[] = [
  {
    name: 'adaptive-execution',
    enabled: true,
    strategy: 'all',
  },
  {
    name: 'mesh-compute-offload',
    enabled: false,
    strategy: 'tier_based',
    tiers: ['tier1', 'tier4'],
  },
  {
    name: 'progressive-loading',
    enabled: true,
    strategy: 'all',
  },
  {
    name: 'intelligent-caching',
    enabled: true,
    strategy: 'all',
  },
  {
    name: 'performance-dashboard',
    enabled: true,
    strategy: 'percentage',
    percentage: 100,
  },
  {
    name: 'offline-support',
    enabled: true,
    strategy: 'all',
  },
  {
    name: 'developer-tools',
    enabled: false,
    strategy: 'user_segment',
    userSegments: ['developer', 'internal'],
  },
  {
    name: 'security-hardening',
    enabled: true,
    strategy: 'all',
  },
  {
    name: 'webgpu-rendering',
    enabled: true,
    strategy: 'tier_based',
    tiers: ['tier3'],
  },
  {
    name: 'jit-compilation',
    enabled: true,
    strategy: 'tier_based',
    tiers: ['tier2', 'tier3'],
  },
  {
    name: 'background-prefetch',
    enabled: true,
    strategy: 'tier_based',
    tiers: ['tier2', 'tier3'],
  },
];

class FeatureFlagManager {
  private flags: Map<string, FeatureFlagConfig> = new Map();
  private userSegment: string | null = null;
  private userTier: string | null = null;
  private userId: string | null = null;
  private overrideStorage: Map<string, boolean> = new Map();

  constructor() {
    // Initialize with default flags
    this.loadDefaults();
    // Load any persisted overrides
    this.loadOverrides();
  }

  private loadDefaults(): void {
    for (const flag of DEFAULT_FLAGS) {
      this.flags.set(flag.name, { ...flag });
    }
  }

  private loadOverrides(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const overrides = localStorage.getItem('feature-flag-overrides');
      if (overrides) {
        const parsed = JSON.parse(overrides);
        for (const [name, enabled] of Object.entries(parsed)) {
          this.overrideStorage.set(name, enabled as boolean);
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  private saveOverrides(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const overrides: Record<string, boolean> = {};
      for (const [name, enabled] of this.overrideStorage) {
        overrides[name] = enabled;
      }
      localStorage.setItem('feature-flag-overrides', JSON.stringify(overrides));
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Set user context for flag evaluation
   */
  setUserContext(context: {
    userId?: string;
    segment?: string;
    tier?: string;
  }): void {
    if (context.userId) this.userId = context.userId;
    if (context.segment) this.userSegment = context.segment;
    if (context.tier) this.userTier = context.tier;
  }

  /**
   * Get all registered flags
   */
  getAllFlags(): FeatureFlagConfig[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific flag configuration
   */
  getFlag(name: string): FeatureFlagConfig | undefined {
    return this.flags.get(name);
  }

  /**
   * Register or update a feature flag
   */
  registerFlag(config: FeatureFlagConfig): void {
    this.flags.set(config.name, { ...config });
  }

  /**
   * Update multiple flags at once
   */
  updateFlags(configs: FeatureFlagConfig[]): void {
    for (const config of configs) {
      this.registerFlag(config);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(name: string): boolean {
    return this.evaluateFlag(name).enabled;
  }

  /**
   * Evaluate a feature flag with detailed reasoning
   */
  evaluateFlag(name: string): FeatureFlagState {
    // Check for manual override first
    if (this.overrideStorage.has(name)) {
      return {
        name,
        enabled: this.overrideStorage.get(name)!,
        reason: 'manual_override',
      };
    }

    const flag = this.flags.get(name);
    if (!flag) {
      return {
        name,
        enabled: false,
        reason: 'not_found',
      };
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return {
        name,
        enabled: false,
        reason: 'globally_disabled',
      };
    }

    // Check dependencies
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!this.isEnabled(dep)) {
          return {
            name,
            enabled: false,
            reason: `dependency_disabled:${dep}`,
          };
        }
      }
    }

    // Check scheduled rollout
    if (flag.startDate || flag.endDate) {
      const now = new Date();
      if (flag.startDate && new Date(flag.startDate) > now) {
        return {
          name,
          enabled: false,
          reason: 'scheduled_not_started',
        };
      }
      if (flag.endDate && new Date(flag.endDate) < now) {
        return {
          name,
          enabled: false,
          reason: 'scheduled_ended',
        };
      }
    }

    // Evaluate based on strategy
    switch (flag.strategy) {
      case 'all':
        return { name, enabled: true, reason: 'strategy_all' };

      case 'none':
        return { name, enabled: false, reason: 'strategy_none' };

      case 'percentage':
        return this.evaluatePercentage(flag);

      case 'user_segment':
        return this.evaluateUserSegment(flag);

      case 'tier_based':
        return this.evaluateTierBased(flag);

      default:
        return { name, enabled: false, reason: 'unknown_strategy' };
    }
  }

  private evaluatePercentage(flag: FeatureFlagConfig): FeatureFlagState {
    const percentage = flag.percentage ?? 0;
    
    if (percentage >= 100) {
      return { name: flag.name, enabled: true, reason: 'percentage_100' };
    }
    
    if (percentage <= 0) {
      return { name: flag.name, enabled: false, reason: 'percentage_0' };
    }

    // Use user ID for consistent hashing if available
    if (this.userId) {
      const hash = this.hashString(this.userId + flag.name);
      const userPercentage = hash % 100;
      const enabled = userPercentage < percentage;
      return {
        name: flag.name,
        enabled,
        reason: enabled ? 'percentage_user_included' : 'percentage_user_excluded',
      };
    }

    // Fall back to random (not consistent across sessions)
    const random = Math.random() * 100;
    const enabled = random < percentage;
    return {
      name: flag.name,
      enabled,
      reason: enabled ? 'percentage_random_included' : 'percentage_random_excluded',
    };
  }

  private evaluateUserSegment(flag: FeatureFlagConfig): FeatureFlagState {
    if (!flag.userSegments || flag.userSegments.length === 0) {
      return { name: flag.name, enabled: false, reason: 'no_segments_defined' };
    }

    if (!this.userSegment) {
      return { name: flag.name, enabled: false, reason: 'no_user_segment' };
    }

    const enabled = flag.userSegments.includes(this.userSegment);
    return {
      name: flag.name,
      enabled,
      reason: enabled ? `segment_match:${this.userSegment}` : 'segment_no_match',
    };
  }

  private evaluateTierBased(flag: FeatureFlagConfig): FeatureFlagState {
    if (!flag.tiers || flag.tiers.length === 0) {
      return { name: flag.name, enabled: false, reason: 'no_tiers_defined' };
    }

    if (!this.userTier) {
      // Default to tier2 if tier not set
      this.userTier = 'tier2';
    }

    const enabled = flag.tiers.includes(this.userTier);
    return {
      name: flag.name,
      enabled,
      reason: enabled ? `tier_match:${this.userTier}` : `tier_no_match:${this.userTier}`,
    };
  }

  /**
   * Simple string hash for consistent percentage assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Set a manual override for a flag
   */
  setOverride(name: string, enabled: boolean): void {
    this.overrideStorage.set(name, enabled);
    this.saveOverrides();
  }

  /**
   * Clear a manual override
   */
  clearOverride(name: string): void {
    this.overrideStorage.delete(name);
    this.saveOverrides();
  }

  /**
   * Clear all manual overrides
   */
  clearAllOverrides(): void {
    this.overrideStorage.clear();
    this.saveOverrides();
  }

  /**
   * Get all flag states for debugging
   */
  getAllStates(): FeatureFlagState[] {
    return Array.from(this.flags.keys()).map(name => this.evaluateFlag(name));
  }

  /**
   * Enable a flag for the current session (temporary override)
   */
  enableForSession(name: string): void {
    this.overrideStorage.set(name, true);
  }

  /**
   * Disable a flag for the current session (temporary override)
   */
  disableForSession(name: string): void {
    this.overrideStorage.set(name, false);
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// Convenience functions
export function isFeatureEnabled(name: string): boolean {
  return featureFlags.isEnabled(name);
}

export function getFeatureState(name: string): FeatureFlagState {
  return featureFlags.evaluateFlag(name);
}

export function setFeatureOverride(name: string, enabled: boolean): void {
  featureFlags.setOverride(name, enabled);
}

export function clearFeatureOverride(name: string): void {
  featureFlags.clearOverride(name);
}

// React hook for feature flags (if using React)
export function useFeatureFlag(name: string): { enabled: boolean; reason: string } {
  const state = featureFlags.evaluateFlag(name);
  return { enabled: state.enabled, reason: state.reason };
}

// Export types
export type { FeatureFlagConfig as FlagConfig, FeatureFlagState as FlagState };