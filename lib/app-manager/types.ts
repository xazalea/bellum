/**
 * App Manager Types
 */

import { VMType } from '../vm/types';

export enum AppType {
  APPLICATION = 'application',
  GAME = 'game',
}

export enum AppPlatform {
  LINUX = 'linux',
  WINDOWS = 'windows',
  ANDROID = 'android',
  DOS = 'dos',
  PLAYSTATION = 'playstation',
  XBOX = 'xbox',
}

export interface AppMetadata {
  id: string;
  name: string;
  description?: string;
  type: AppType;
  platform: AppPlatform;
  version?: string;
  icon?: string; // URL or path to icon
  screenshots?: string[];
  requirements?: {
    memory?: number; // MB
    diskSpace?: number; // MB
    vmType?: VMType;
  };
  filePath: string; // Path in Puter.js storage
  installedAt?: Date;
  lastPlayed?: Date;
  playCount?: number;
  saveDataPath?: string; // Path to save data in Puter.js
  compatibility?: {
    patched: boolean;
    patches?: string[];
    notes?: string;
  };
}

export interface AppInstallation {
  app: AppMetadata;
  vmId: string;
  status: 'installing' | 'installed' | 'failed';
  progress?: number;
  error?: string;
}

export interface AppLauncher {
  launch(app: AppMetadata, vmId: string): Promise<void>;
  install(appFile: File | Blob, metadata: Partial<AppMetadata>): Promise<AppMetadata>;
  uninstall(appId: string): Promise<void>;
  listInstalled(vmId?: string): Promise<AppMetadata[]>;
  getAppInfo(appId: string): Promise<AppMetadata | null>;
}

