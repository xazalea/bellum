/**
 * Android App Compatibility Layer
 * Handles various Android application types
 * 
 * Supported:
 * - Native apps (ARM/x86)
 * - Java/Kotlin apps
 * - Unity games
 * - Unreal Engine games
 * - React Native apps
 * - Flutter apps
 */

import { binaryLoader } from '../engine/binary-loader';
import { executionPipeline } from '../engine/execution-pipeline';

export type AndroidAppType = 'native' | 'java' | 'unity' | 'unreal' | 'reactnative' | 'flutter';

export interface AndroidAppInfo {
  type: AndroidAppType;
  path: string;
  packageName: string;
  versionName: string;
  requiresGL: boolean;
  requiresVulkan: boolean;
}

export class AndroidCompatibility {
  /**
   * Detect app type from APK
   */
  async detectAppType(apkPath: string): Promise<AndroidAppType> {
    try {
      const binary = await binaryLoader.loadExecutable(apkPath);
      
      // Check for Unity
      if (binary.dependencies.some(dep => dep.includes('libunity'))) {
        return 'unity';
      }

      // Check for Unreal Engine
      if (binary.dependencies.some(dep => dep.includes('libUE4'))) {
        return 'unreal';
      }

      // Check for React Native
      if (binary.dependencies.some(dep => dep.includes('libreactnative'))) {
        return 'reactnative';
      }

      // Check for Flutter
      if (binary.dependencies.some(dep => dep.includes('libflutter'))) {
        return 'flutter';
      }

      // Check for native libs
      if (binary.dependencies.some(dep => dep.endsWith('.so'))) {
        return 'native';
      }

      return 'java';
    } catch (error) {
      console.error('[AndroidCompat] Failed to detect app type:', error);
      return 'java';
    }
  }

  /**
   * Launch Java/Kotlin app
   */
  async launchJavaApp(path: string): Promise<void> {
    console.log('[AndroidCompat] Launching Java app:', path);
    await executionPipeline.executeAndroid(path, {
      enableJIT: true,
      enableProfiling: false,
      enableGPU: false,
    });
  }

  /**
   * Launch Unity game
   */
  async launchUnityGame(path: string): Promise<void> {
    console.log('[AndroidCompat] Launching Unity game:', path);
    await executionPipeline.executeAndroid(path, {
      enableJIT: true,
      enableProfiling: true,
      enableGPU: true,
    });
  }

  /**
   * Launch native app
   */
  async launchNativeApp(path: string): Promise<void> {
    console.log('[AndroidCompat] Launching native app:', path);
    await executionPipeline.executeAndroid(path, {
      enableJIT: true,
      enableProfiling: false,
      enableGPU: true,
    });
  }
}

export const androidCompatibility = new AndroidCompatibility();
