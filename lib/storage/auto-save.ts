/**
 * Auto-Save System
 * Automatically saves game state on exit and loads on start
 */

import { 
  uploadGameSave, 
  downloadGameSave, 
  listGameSaves, 
  generateSaveId,
  GameSave,
  GameSaveMetadata
} from './cloud-save-manager';

export interface AutoSaveConfig {
  enabled: boolean;
  maxAutoSaves: number;
  saveOnExit: boolean;
  loadOnStart: boolean;
}

const AUTO_SAVE_CONFIG_KEY = 'challenger_autosave_config';
const AUTO_SAVE_SLOT_PREFIX = 'autosave_slot_';

const DEFAULT_CONFIG: AutoSaveConfig = {
  enabled: true,
  maxAutoSaves: 5,
  saveOnExit: true,
  loadOnStart: true,
};

/**
 * Get auto-save configuration
 */
export function getAutoSaveConfig(): AutoSaveConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  
  const stored = localStorage.getItem(AUTO_SAVE_CONFIG_KEY);
  if (stored) {
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  }
  return DEFAULT_CONFIG;
}

/**
 * Update auto-save configuration
 */
export function setAutoSaveConfig(config: Partial<AutoSaveConfig>): void {
  const current = getAutoSaveConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(AUTO_SAVE_CONFIG_KEY, JSON.stringify(updated));
}

/**
 * Get the auto-save slot key for a game
 */
function getAutoSaveSlotKey(gameId: string): string {
  return `${AUTO_SAVE_SLOT_PREFIX}${gameId}`;
}

/**
 * Auto-save game state on exit
 * Call this when the user leaves a game (navigates away, closes tab, etc.)
 */
export async function autoSaveOnExit(
  gameId: string,
  gameName: string,
  saveData: Blob,
  platform: 'android' | 'windows' | 'web',
  metadata?: Record<string, unknown>
): Promise<GameSaveMetadata | null> {
  const config = getAutoSaveConfig();
  
  if (!config.enabled || !config.saveOnExit) {
    console.log('Auto-save is disabled');
    return null;
  }

  try {
    // Create auto-save
    const save: GameSave = {
      saveId: generateSaveId(),
      gameId,
      gameName,
      saveName: `Auto-save ${new Date().toLocaleString()}`,
      saveData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      platform,
      metadata: {
        ...metadata,
        isAutoSave: true,
        exitTimestamp: Date.now(),
      },
    };

    const result = await uploadGameSave(save, 'auto');
    
    // Store reference to latest auto-save for this game
    localStorage.setItem(getAutoSaveSlotKey(gameId), JSON.stringify({
      saveId: result.saveId,
      timestamp: Date.now(),
    }));

    // Clean up old auto-saves if we exceed max
    await cleanupOldAutoSaves(gameId, config.maxAutoSaves);

    console.log('Auto-save successful:', result.saveId);
    return result;
  } catch (error) {
    console.error('Auto-save failed:', error);
    return null;
  }
}

/**
 * Auto-load game state on start
 * Call this when a game starts to restore the last save
 */
export async function autoLoadOnStart(
  gameId: string,
  onProgress?: (progress: { stage: string; loaded: number; total: number }) => void
): Promise<Blob | null> {
  const config = getAutoSaveConfig();
  
  if (!config.enabled || !config.loadOnStart) {
    console.log('Auto-load is disabled');
    return null;
  }

  try {
    // Get the latest auto-save reference
    const slotData = localStorage.getItem(getAutoSaveSlotKey(gameId));
    if (!slotData) {
      console.log('No auto-save found for game:', gameId);
      return null;
    }

    const { saveId } = JSON.parse(slotData);
    
    // Download the save
    const saveData = await downloadGameSave(saveId, onProgress);
    console.log('Auto-load successful:', saveId);
    return saveData;
  } catch (error) {
    console.error('Auto-load failed:', error);
    return null;
  }
}

/**
 * Get the latest auto-save info for a game
 */
export async function getLatestAutoSave(gameId: string): Promise<{
  saveId: string;
  timestamp: number;
} | null> {
  try {
    const slotData = localStorage.getItem(getAutoSaveSlotKey(gameId));
    if (!slotData) return null;
    
    return JSON.parse(slotData);
  } catch {
    return null;
  }
}

/**
 * Check if a game has an auto-save
 */
export function hasAutoSave(gameId: string): boolean {
  return localStorage.getItem(getAutoSaveSlotKey(gameId)) !== null;
}

/**
 * Clean up old auto-saves, keeping only the N most recent
 */
async function cleanupOldAutoSaves(gameId: string, maxSaves: number): Promise<void> {
  try {
    const allSaves = await listGameSaves(gameId);
    const autoSaves = allSaves
      .filter(s => s.metadata?.isAutoSave)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    // Delete old saves beyond the max
    const toDelete = autoSaves.slice(maxSaves);
    for (const save of toDelete) {
      try {
        const { deleteGameSave } = await import('./cloud-save-manager');
        await deleteGameSave(save.saveId);
        console.log('Deleted old auto-save:', save.saveId);
      } catch (e) {
        console.warn('Failed to delete old auto-save:', save.saveId, e);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old auto-saves:', error);
  }
}

/**
 * Delete auto-save for a game
 */
export function deleteAutoSave(gameId: string): void {
  localStorage.removeItem(getAutoSaveSlotKey(gameId));
}

/**
 * Setup beforeunload handler for auto-save
 * This ensures saves happen even if the user closes the tab
 */
export function setupAutoSaveHandler(
  getGameState: () => { gameId: string; gameName: string; saveData: Blob; platform: 'android' | 'windows' | 'web' } | null
): () => void {
  const handler = async (event: BeforeUnloadEvent) => {
    const config = getAutoSaveConfig();
    if (!config.enabled || !config.saveOnExit) return;

    const gameState = getGameState();
    if (!gameState) return;

    // For beforeunload, we need to use sendBeacon or sync XHR
    // since async operations won't complete
    try {
      // Store in sessionStorage for recovery on next visit
      const recoveryData = {
        gameId: gameState.gameId,
        gameName: gameState.gameName,
        saveData: await blobToBase64(gameState.saveData),
        platform: gameState.platform,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('challenger_recovery_save', JSON.stringify(recoveryData));
    } catch (e) {
      console.error('Failed to save recovery data:', e);
    }
  };

  window.addEventListener('beforeunload', handler);
  
  return () => {
    window.removeEventListener('beforeunload', handler);
  };
}

/**
 * Check for and restore recovery save
 */
export async function checkRecoverySave(): Promise<{
  gameId: string;
  gameName: string;
  saveData: Blob;
  platform: 'android' | 'windows' | 'web';
} | null> {
  const recoveryData = sessionStorage.getItem('challenger_recovery_save');
  if (!recoveryData) return null;

  try {
    const data = JSON.parse(recoveryData);
    const saveData = await base64ToBlob(data.saveData);
    
    // Clear recovery data
    sessionStorage.removeItem('challenger_recovery_save');
    
    return {
      gameId: data.gameId,
      gameName: data.gameName,
      saveData,
      platform: data.platform,
    };
  } catch (e) {
    console.error('Failed to restore recovery save:', e);
    sessionStorage.removeItem('challenger_recovery_save');
    return null;
  }
}

/**
 * Convert Blob to Base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Base64 string to Blob
 */
async function base64ToBlob(base64: string, type = 'application/octet-stream'): Promise<Blob> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}