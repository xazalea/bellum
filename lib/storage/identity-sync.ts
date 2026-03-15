/**
 * Identity Sync - Syncs user identity to Discord/Telegram cloud storage
 * Enables cross-device identity recovery and backup
 */

import { uploadFile, downloadFile, getFileMetadata, listFiles, hasQuota } from './discord-webhook-storage';

const IDENTITY_FILE_NAME = '.challenger_identity.json';
const IDENTITY_SYNC_KEY = 'challenger_identity_sync_status';

export interface SyncedIdentity {
  username: string;
  fingerprint: string;
  createdAt: number;
  lastLogin: number;
  syncedAt: number;
  deviceId: string;
}

export interface SyncStatus {
  lastSynced: number | null;
  syncEnabled: boolean;
  storageType: 'discord' | 'telegram' | 'none';
  error?: string;
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  if (typeof window === "undefined") {
    return { lastSynced: null, syncEnabled: false, storageType: 'none' };
  }
  
  const stored = localStorage.getItem(IDENTITY_SYNC_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  return { lastSynced: null, syncEnabled: false, storageType: 'none' };
}

/**
 * Update sync status
 */
function updateSyncStatus(status: Partial<SyncStatus>): void {
  if (typeof window === "undefined") return;
  
  const current = getSyncStatus();
  const updated = { ...current, ...status };
  localStorage.setItem(IDENTITY_SYNC_KEY, JSON.stringify(updated));
}

/**
 * Sync identity to Discord cloud storage
 */
export async function syncIdentityToCloud(identity: {
  username: string;
  fingerprint: string;
  createdAt: number;
  lastLogin: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    updateSyncStatus({ syncEnabled: true, storageType: 'discord', error: undefined });
    
    // Create identity blob
    const syncedIdentity: SyncedIdentity = {
      ...identity,
      syncedAt: Date.now(),
      deviceId: crypto.randomUUID(),
    };
    
    const jsonStr = JSON.stringify(syncedIdentity, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const file = new File([blob], IDENTITY_FILE_NAME, { type: 'application/json' });
    
    // Check if we already have an identity file
    const files = await listFiles();
    const existingIdentityFile = files.find(f => f.fileName === IDENTITY_FILE_NAME);
    
    // Delete old identity file if exists
    if (existingIdentityFile) {
      const { deleteFile } = await import('./discord-webhook-storage');
      await deleteFile(existingIdentityFile.fileId);
    }
    
    // Upload new identity
    const metadata = await uploadFile(file);
    
    updateSyncStatus({
      lastSynced: Date.now(),
      syncEnabled: true,
      storageType: 'discord',
    });
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Sync failed';
    updateSyncStatus({ error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Recover identity from Discord cloud storage
 */
export async function recoverIdentityFromCloud(): Promise<SyncedIdentity | null> {
  try {
    const files = await listFiles();
    const identityFile = files.find(f => f.fileName === IDENTITY_FILE_NAME);
    
    if (!identityFile) {
      return null;
    }
    
    const blob = await downloadFile(identityFile.fileId);
    const text = await blob.text();
    const identity = JSON.parse(text) as SyncedIdentity;
    
    return identity;
  } catch (error) {
    console.error('Failed to recover identity from cloud:', error);
    return null;
  }
}

/**
 * Enable/disable identity sync
 */
export async function setSyncEnabled(enabled: boolean, storageType: 'discord' | 'telegram' = 'discord'): Promise<void> {
  updateSyncStatus({
    syncEnabled: enabled,
    storageType: enabled ? storageType : 'none',
  });
}

/**
 * Check if identity sync is available
 */
export async function isSyncAvailable(): Promise<boolean> {
  try {
    // Check if we have at least 1KB of quota available
    return await hasQuota(1024);
  } catch {
    return false;
  }
}

/**
 * Auto-sync identity if enabled
 */
export async function autoSyncIdentity(identity: {
  username: string;
  fingerprint: string;
  createdAt: number;
  lastLogin: number;
}): Promise<void> {
  const status = getSyncStatus();
  
  if (status.syncEnabled && status.storageType === 'discord') {
    // Only sync if last sync was more than 1 hour ago
    const ONE_HOUR = 60 * 60 * 1000;
    if (!status.lastSynced || Date.now() - status.lastSynced > ONE_HOUR) {
      await syncIdentityToCloud(identity);
    }
  }
}