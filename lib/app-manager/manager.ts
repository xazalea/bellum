/**
 * App Manager - Handles app installation, launching, and management
 */

import {
  AppMetadata,
  AppLauncher,
  AppInstallation,
  AppPlatform,
  AppType,
} from './types';
import { VMType } from '../vm/types';
import { puterClient } from '../puter/client';
import { CompatibilityChecker } from './compatibility';
import { backendClient } from '../backend/client';

export class AppManager implements AppLauncher {
  private appsPath = 'bellum/apps';
  private installations: Map<string, AppInstallation> = new Map();

  async initialize(): Promise<void> {
    // Ensure apps directory exists
    try {
      await puterClient.createDirectory(this.appsPath);
    } catch (error) {
      // Directory might already exist
    }
  }

  async install(
    appFile: File | Blob,
    metadata: Partial<AppMetadata>
  ): Promise<AppMetadata> {
    await this.initialize();

    // Generate app ID if not provided
    const appId = metadata.id || `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine platform from metadata or file extension
    const platform = this.detectPlatform(appFile, metadata.platform);

    // Create app metadata
    const app: AppMetadata = {
      id: appId,
      name: metadata.name || appFile instanceof File ? appFile.name : 'Unknown App',
      description: metadata.description,
      type: metadata.type || AppType.APPLICATION,
      platform: platform,
      version: metadata.version,
      icon: metadata.icon,
      screenshots: metadata.screenshots,
      requirements: metadata.requirements,
      filePath: `${this.appsPath}/${appId}/${appFile instanceof File ? appFile.name : 'app.bin'}`,
      installedAt: new Date(),
      playCount: 0,
      saveDataPath: `${this.appsPath}/${appId}/saves`,
    };

    // Check compatibility
    const compatibility = await CompatibilityChecker.checkCompatibility(
      app,
      platform
    );

    // Apply patches if needed
    if (compatibility.patches.length > 0) {
      // Try to use backend for patching if available
      try {
        const backendAvailable = await backendClient.checkHealth();
        if (backendAvailable) {
          const appUrl = await puterClient.getReadURL(app.filePath);
          const patchedUrl = await backendClient.patchCompatibility({
            url: appUrl,
            platform: app.platform,
            patches: compatibility.patches,
          });
          // Update app with patched URL
          app.filePath = patchedUrl;
        }
      } catch (error) {
        console.warn('Backend patching failed, using local patches:', error);
      }

      const patchedApp = await CompatibilityChecker.applyPatches(
        app,
        compatibility.patches
      );
      Object.assign(app, patchedApp);
    }

    // Create installation record
    const installation: AppInstallation = {
      app,
      vmId: '', // Will be set when launching
      status: 'installing',
      progress: 0,
    };
    this.installations.set(appId, installation);

    try {
      // Upload app file to Puter.js
      await puterClient.writeFile(app.filePath, appFile, {
        createMissingParents: true,
      });

      // Create saves directory
      await puterClient.createDirectory(app.saveDataPath!);

      // Save app metadata
      const metadataPath = `${this.appsPath}/${appId}/metadata.json`;
      await puterClient.writeFile(
        metadataPath,
        JSON.stringify(app, null, 2),
        { createMissingParents: true }
      );

      installation.status = 'installed';
      installation.progress = 100;
    } catch (error) {
      installation.status = 'failed';
      installation.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }

    return app;
  }

  async launch(app: AppMetadata, vmId: string): Promise<void> {
    // Update app metadata
    app.lastPlayed = new Date();
    app.playCount = (app.playCount || 0) + 1;

    // Save updated metadata
    const metadataPath = `${this.appsPath}/${app.id}/metadata.json`;
    await puterClient.writeFile(
      metadataPath,
      JSON.stringify(app, null, 2),
      { createMissingParents: true }
    );

    // Get app file URL
    const appUrl = await puterClient.getReadURL(app.filePath);

    // Launch app in VM
    // This will be handled by the VM implementation
    // For now, we just prepare the app for launch
    console.log(`Launching ${app.name} in VM ${vmId} from ${appUrl}`);

    // The actual launch will be handled by the VM's app launcher
    // which will mount the app file and execute it
  }

  async uninstall(appId: string): Promise<void> {
    try {
      // Delete app directory
      const appPath = `${this.appsPath}/${appId}`;
      // Note: Puter.js doesn't have recursive delete, so we'd need to delete files individually
      // For now, we'll just remove from our records
      this.installations.delete(appId);
    } catch (error) {
      console.error(`Failed to uninstall app ${appId}:`, error);
      throw error;
    }
  }

  async listInstalled(vmId?: string): Promise<AppMetadata[]> {
    await this.initialize();

    try {
      const apps: AppMetadata[] = [];
      const appDirs = await puterClient.listDirectory(this.appsPath);

      for (const dir of appDirs) {
        if (dir.is_dir) {
          try {
            const metadataPath = `${dir.path}/metadata.json`;
            const metadataJson = await puterClient.readFileAsText(metadataPath);
            const app: AppMetadata = JSON.parse(metadataJson);
            
            // Filter by VM if specified
            if (!vmId || this.isAppCompatibleWithVM(app, vmId)) {
              apps.push(app);
            }
          } catch (error) {
            console.warn(`Failed to load app metadata from ${dir.path}:`, error);
          }
        }
      }

      return apps;
    } catch (error) {
      console.error('Failed to list installed apps:', error);
      return [];
    }
  }

  async getAppInfo(appId: string): Promise<AppMetadata | null> {
    try {
      const metadataPath = `${this.appsPath}/${appId}/metadata.json`;
      const metadataJson = await puterClient.readFileAsText(metadataPath);
      return JSON.parse(metadataJson);
    } catch (error) {
      console.error(`Failed to get app info for ${appId}:`, error);
      return null;
    }
  }

  private detectPlatform(
    file: File | Blob,
    providedPlatform?: AppPlatform
  ): AppPlatform {
    if (providedPlatform) {
      return providedPlatform;
    }

    // Detect from file extension
    const fileName = file instanceof File ? file.name : 'app.bin';
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'apk':
        return AppPlatform.ANDROID;
      case 'exe':
      case 'msi':
        return AppPlatform.WINDOWS;
      case 'deb':
      case 'rpm':
        return AppPlatform.LINUX;
      case 'iso':
      case 'bin':
      case 'cue':
        // Could be PlayStation or Xbox
        return AppPlatform.PLAYSTATION; // Default to PlayStation
      default:
        return AppPlatform.LINUX; // Default
    }
  }

  private isAppCompatibleWithVM(app: AppMetadata, vmId: string): boolean {
    // This would check if the app is compatible with the VM type
    // For now, we'll do a simple platform match
    // In production, you'd check the VM's type and match it with app platform
    return true; // Simplified for now
  }

  getInstallationStatus(appId: string): AppInstallation | null {
    return this.installations.get(appId) || null;
  }
}

// Singleton instance
export const appManager = new AppManager();

