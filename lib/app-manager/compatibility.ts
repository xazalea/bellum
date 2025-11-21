/**
 * App Compatibility Layer
 * Handles compatibility checks and patches for apps/games
 */

import { AppMetadata, AppPlatform, AppType } from './types';
import { puterClient } from '../puter/client';

export interface CompatibilityCheck {
  compatible: boolean;
  issues: string[];
  patches: string[];
  warnings: string[];
}

export class CompatibilityChecker {
  /**
   * Check if an app is compatible with the platform
   */
  static async checkCompatibility(
    app: AppMetadata,
    platform: AppPlatform
  ): Promise<CompatibilityCheck> {
    const result: CompatibilityCheck = {
      compatible: true,
      issues: [],
      patches: [],
      warnings: [],
    };

    // Platform-specific checks
    switch (platform) {
      case AppPlatform.ANDROID:
        result.compatible = await this.checkAndroidCompatibility(app, result);
        break;
      case AppPlatform.WINDOWS:
        result.compatible = await this.checkWindowsCompatibility(app, result);
        break;
      case AppPlatform.LINUX:
        result.compatible = await this.checkLinuxCompatibility(app, result);
        break;
      case AppPlatform.DOS:
        result.compatible = await this.checkDOSCompatibility(app, result);
        break;
      case AppPlatform.PLAYSTATION:
      case AppPlatform.XBOX:
        result.compatible = await this.checkConsoleCompatibility(app, result);
        break;
    }

    return result;
  }

  private static async checkAndroidCompatibility(
    app: AppMetadata,
    result: CompatibilityCheck
  ): Promise<boolean> {
    // Check for native dependencies that might not work in web
    if (app.filePath.endsWith('.apk')) {
      // APK files need to be checked for native libraries
      result.warnings.push(
        'APK may contain native libraries that require compatibility patches'
      );
      result.patches.push('android-native-patch');
    }

    // Check file size (large APKs might be slow)
    try {
      const fileInfo = await puterClient.getFileInfo(app.filePath);
      if (fileInfo.size > 100 * 1024 * 1024) {
        // > 100MB
        result.warnings.push('Large APK file may take time to load');
      }
    } catch (error) {
      result.issues.push('Could not check file size');
    }

    return result.issues.length === 0;
  }

  private static async checkWindowsCompatibility(
    app: AppMetadata,
    result: CompatibilityCheck
  ): Promise<boolean> {
    // Windows apps running in js-dos may have compatibility issues
    if (app.filePath.endsWith('.exe')) {
      result.warnings.push(
        'Windows executable may require DOSBox compatibility mode'
      );
      result.patches.push('windows-dosbox-patch');
    }

    if (app.filePath.endsWith('.msi')) {
      result.issues.push('MSI installers are not directly supported');
      result.patches.push('msi-extract-patch');
    }

    return result.issues.length === 0;
  }

  private static async checkLinuxCompatibility(
    app: AppMetadata,
    result: CompatibilityCheck
  ): Promise<boolean> {
    // Linux apps in v86 should generally work
    if (app.filePath.endsWith('.deb') || app.filePath.endsWith('.rpm')) {
      result.warnings.push('Package installers may require manual installation');
    }

    return true;
  }

  private static async checkDOSCompatibility(
    app: AppMetadata,
    result: CompatibilityCheck
  ): Promise<boolean> {
    // DOS games/apps should work well with js-dos
    if (
      app.filePath.endsWith('.exe') ||
      app.filePath.endsWith('.com') ||
      app.filePath.endsWith('.bat')
    ) {
      // These should work
      return true;
    }

    result.warnings.push('Unknown DOS file format');
    return true;
  }

  private static async checkConsoleCompatibility(
    app: AppMetadata,
    result: CompatibilityCheck
  ): Promise<boolean> {
    // Console games need ISO/ROM files
    if (
      app.filePath.endsWith('.iso') ||
      app.filePath.endsWith('.bin') ||
      app.filePath.endsWith('.cue')
    ) {
      return true;
    }

    result.issues.push('Console games require ISO/ROM format files');
    return false;
  }

  /**
   * Apply compatibility patches to an app
   */
  static async applyPatches(
    app: AppMetadata,
    patches: string[]
  ): Promise<AppMetadata> {
    const patchedApp = { ...app };
    patchedApp.compatibility = {
      patched: true,
      patches: patches,
      notes: 'App has been patched for web compatibility',
    };

    // Apply specific patches
    for (const patch of patches) {
      switch (patch) {
        case 'android-native-patch':
          // Remove or stub native libraries
          await this.patchAndroidNative(app);
          break;
        case 'windows-dosbox-patch':
          // Configure DOSBox compatibility
          await this.patchWindowsDOSBox(app);
          break;
        case 'msi-extract-patch':
          // Extract MSI contents
          await this.patchMSIExtract(app);
          break;
      }
    }

    return patchedApp;
  }

  private static async patchAndroidNative(app: AppMetadata): Promise<void> {
    // Placeholder for Android native library patching
    // In production, this would:
    // 1. Extract APK
    // 2. Remove native libraries
    // 3. Repackage APK
    console.log(`Patching Android native libraries for ${app.name}`);
  }

  private static async patchWindowsDOSBox(app: AppMetadata): Promise<void> {
    // Placeholder for Windows DOSBox compatibility
    // In production, this would configure DOSBox settings
    console.log(`Applying DOSBox compatibility for ${app.name}`);
  }

  private static async patchMSIExtract(app: AppMetadata): Promise<void> {
    // Placeholder for MSI extraction
    // In production, this would extract MSI contents
    console.log(`Extracting MSI for ${app.name}`);
  }
}

