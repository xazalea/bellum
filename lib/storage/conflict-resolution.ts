/**
 * Conflict Resolution for Multi-Device Sync
 * Handles save conflicts when the same game is played on multiple devices
 */

import { listGameSaves, downloadGameSave, GameSaveMetadata } from './cloud-save-manager';
import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

export interface ConflictInfo {
  localSave: GameSaveMetadata | null;
  remoteSave: GameSaveMetadata | null;
  conflictType: 'local_newer' | 'remote_newer' | 'same_time' | 'no_conflict';
  timeDifference: number; // milliseconds
}

export interface ConflictResolution {
  strategy: 'keep_local' | 'keep_remote' | 'keep_both' | 'merge';
  winningSaveId: string | null;
  message: string;
}

const CONFLICT_THRESHOLD_MS = 5 * 1000; // 5 seconds - if saves are within this window, consider them same time
const LAST_SYNC_KEY = 'challenger_last_sync_timestamps';

/**
 * Get the last sync timestamp for a game
 */
function getLastSyncTimestamp(gameId: string): number {
  if (typeof window === 'undefined') return 0;
  
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  if (!stored) return 0;
  
  const timestamps = JSON.parse(stored);
  return timestamps[gameId] || 0;
}

/**
 * Set the last sync timestamp for a game
 */
function setLastSyncTimestamp(gameId: string, timestamp: number): void {
  if (typeof window === 'undefined') return;
  
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  const timestamps = stored ? JSON.parse(stored) : {};
  timestamps[gameId] = timestamp;
  localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(timestamps));
}

/**
 * Detect conflicts between local and remote saves
 */
export async function detectConflict(gameId: string): Promise<ConflictInfo> {
  const currentFingerprint = await getDeviceFingerprintId();
  const saves = await listGameSaves(gameId);
  
  // Find the most recent save from current device (local)
  const localSaves = saves.filter(s => s.metadata?.fingerprint === currentFingerprint);
  const localSave = localSaves.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  
  // Find the most recent save from other devices (remote)
  const remoteSaves = saves.filter(s => s.metadata?.fingerprint !== currentFingerprint);
  const remoteSave = remoteSaves.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  
  // No conflict if only one side has saves
  if (!localSave && !remoteSave) {
    return { localSave, remoteSave, conflictType: 'no_conflict', timeDifference: 0 };
  }
  
  if (!localSave) {
    return { localSave, remoteSave, conflictType: 'remote_newer', timeDifference: Infinity };
  }
  
  if (!remoteSave) {
    return { localSave, remoteSave, conflictType: 'local_newer', timeDifference: Infinity };
  }
  
  // Both exist - compare timestamps
  const timeDiff = localSave.updatedAt - remoteSave.updatedAt;
  
  if (Math.abs(timeDiff) < CONFLICT_THRESHOLD_MS) {
    return { localSave, remoteSave, conflictType: 'same_time', timeDifference: timeDiff };
  }
  
  return {
    localSave,
    remoteSave,
    conflictType: timeDiff > 0 ? 'local_newer' : 'remote_newer',
    timeDifference: Math.abs(timeDiff)
  };
}

/**
 * Auto-resolve conflict based on strategy
 */
export function autoResolveConflict(conflict: ConflictInfo): ConflictResolution {
  switch (conflict.conflictType) {
    case 'no_conflict':
      return {
        strategy: 'keep_local',
        winningSaveId: conflict.localSave?.saveId || null,
        message: 'No conflict detected'
      };
      
    case 'local_newer':
      return {
        strategy: 'keep_local',
        winningSaveId: conflict.localSave?.saveId || null,
        message: `Local save is ${formatTimeDiff(conflict.timeDifference)} newer`
      };
      
    case 'remote_newer':
      return {
        strategy: 'keep_remote',
        winningSaveId: conflict.remoteSave?.saveId || null,
        message: `Remote save is ${formatTimeDiff(conflict.timeDifference)} newer`
      };
      
    case 'same_time':
      // When saves are made at nearly the same time, prefer the one with more data
      const localSize = conflict.localSave?.size || 0;
      const remoteSize = conflict.remoteSave?.size || 0;
      
      if (localSize >= remoteSize) {
        return {
          strategy: 'keep_local',
          winningSaveId: conflict.localSave?.saveId || null,
          message: 'Saves made at same time - keeping larger local save'
        };
      } else {
        return {
          strategy: 'keep_remote',
          winningSaveId: conflict.remoteSave?.saveId || null,
          message: 'Saves made at same time - keeping larger remote save'
        };
      }
      
    default:
      return {
        strategy: 'keep_local',
        winningSaveId: conflict.localSave?.saveId || null,
        message: 'Default: keeping local save'
      };
  }
}

/**
 * Format time difference for display
 */
function formatTimeDiff(ms: number): string {
  if (ms < 1000) return 'less than a second';
  if (ms < 60000) return `${Math.floor(ms / 1000)} seconds`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)} minutes`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours`;
  return `${Math.floor(ms / 86400000)} days`;
}

/**
 * Check if we should prompt user for conflict resolution
 */
export function shouldPromptForConflict(conflict: ConflictInfo): boolean {
  // Only prompt for same_time conflicts or when the difference is significant
  if (conflict.conflictType === 'same_time') return true;
  if (conflict.conflictType === 'no_conflict') return false;
  
  // Prompt if the older save is less than 1 hour old (user might care about both)
  const oneHour = 3600000;
  const olderTimestamp = conflict.conflictType === 'local_newer' 
    ? conflict.remoteSave?.updatedAt 
    : conflict.localSave?.updatedAt;
  
  if (olderTimestamp && (Date.now() - olderTimestamp) < oneHour) {
    return true;
  }
  
  return false;
}

/**
 * Sync saves for a game, handling conflicts
 */
export async function syncGameSaves(
  gameId: string,
  onConflict?: (conflict: ConflictInfo) => Promise<ConflictResolution>
): Promise<{
  synced: boolean;
  resolution?: ConflictResolution;
  conflict?: ConflictInfo;
}> {
  const conflict = await detectConflict(gameId);
  
  if (conflict.conflictType === 'no_conflict') {
    return { synced: true };
  }
  
  // Check if we should prompt user
  if (shouldPromptForConflict(conflict) && onConflict) {
    const resolution = await onConflict(conflict);
    setLastSyncTimestamp(gameId, Date.now());
    return { synced: true, resolution, conflict };
  }
  
  // Auto-resolve
  const resolution = autoResolveConflict(conflict);
  setLastSyncTimestamp(gameId, Date.now());
  
  return { synced: true, resolution, conflict };
}

/**
 * Get all saves that need sync attention
 */
export async function getPendingSyncConflicts(): Promise<Map<string, ConflictInfo>> {
  const allSaves = await listGameSaves();
  const gameIds = [...new Set(allSaves.map(s => s.gameId))];
  const conflicts = new Map<string, ConflictInfo>();
  
  for (const gameId of gameIds) {
    const conflict = await detectConflict(gameId);
    if (conflict.conflictType !== 'no_conflict' && shouldPromptForConflict(conflict)) {
      conflicts.set(gameId, conflict);
    }
  }
  
  return conflicts;
}

/**
 * Merge two saves (for games that support incremental saves)
 * This is a placeholder - actual implementation depends on game-specific save formats
 */
export async function mergeSaves(
  localSaveId: string,
  remoteSaveId: string
): Promise<Blob | null> {
  try {
    const [localData, remoteData] = await Promise.all([
      downloadGameSave(localSaveId),
      downloadGameSave(remoteSaveId)
    ]);
    
    // For now, just return the larger save
    // In a real implementation, this would parse the save format and merge intelligently
    return localData.size >= remoteData.size ? localData : remoteData;
  } catch (error) {
    console.error('Failed to merge saves:', error);
    return null;
  }
}