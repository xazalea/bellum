/**
 * Cluster Settings
 * Configuration for cluster and Google compute integration
 */

import { getConfigManager, type GoogleComputeSettings } from '../google-compute/config';

export interface ClusterSettings {
  // Existing cluster settings
  enableP2P: boolean;
  enableWebRTC: boolean;
  maxPeers: number;
  heartbeatInterval: number;

  // Google compute integration
  googleCompute: GoogleComputeSettings;
}

const DEFAULT_SETTINGS: ClusterSettings = {
  enableP2P: true,
  enableWebRTC: true,
  maxPeers: 50,
  heartbeatInterval: 5000,

  googleCompute: getConfigManager().getConfig(),
};

class ClusterSettingsManager {
  private settings: ClusterSettings = { ...DEFAULT_SETTINGS };

  getSettings(): ClusterSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<ClusterSettings>): void {
    this.settings = {
      ...this.settings,
      ...updates,
    };

    // Update Google compute config if provided
    if (updates.googleCompute) {
      getConfigManager().updateConfig(updates.googleCompute);
    }
  }

  // Google compute shortcuts
  enableGoogleCompute(): void {
    getConfigManager().enable();
    this.settings.googleCompute = getConfigManager().getConfig();
  }

  disableGoogleCompute(): void {
    getConfigManager().disable();
    this.settings.googleCompute = getConfigManager().getConfig();
  }

  setGoogleOffloadThreshold(threshold: number): void {
    getConfigManager().setOffloadThreshold(threshold);
    this.settings.googleCompute = getConfigManager().getConfig();
  }
}

// Singleton
let instance: ClusterSettingsManager | null = null;

export function getClusterSettings(): ClusterSettingsManager {
  if (!instance) {
    instance = new ClusterSettingsManager();
  }
  return instance;
}
