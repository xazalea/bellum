/**
 * Cloud Save Manager - Unified interface for game saves
 * Supports Discord and Telegram cloud storage backends
 */

import { 
  uploadFile as uploadToDiscord, 
  downloadFile as downloadFromDiscord,
  listFiles as listDiscordFiles,
  deleteFile as deleteDiscordFile,
  getFileMetadata as getDiscordFileMetadata,
  hasQuota as hasDiscordQuota,
  getQuotaInfo as getDiscordQuotaInfo,
  FileMetadata as DiscordFileMetadata
} from './discord-webhook-storage';

import {
  uploadFileToTelegram,
  downloadFileFromTelegram,
  listTelegramFiles,
  deleteTelegramFile,
  isTelegramConfigured,
  TelegramFileMetadata
} from './telegram-storage';

import { compressFileGzip } from './compression';

export type StorageBackend = 'discord' | 'telegram' | 'auto';

export interface GameSave {
  saveId: string;
  gameId: string;
  gameName: string;
  saveName: string;
  saveData: Blob;
  createdAt: number;
  updatedAt: number;
  platform: 'android' | 'windows' | 'web';
  metadata?: Record<string, unknown>;
}

export interface GameSaveMetadata {
  saveId: string;
  gameId: string;
  gameName: string;
  saveName: string;
  size: number;
  compressedSize?: number;
  createdAt: number;
  updatedAt: number;
  platform: 'android' | 'windows' | 'web';
  storageBackend: 'discord' | 'telegram';
  storageFileId: string;
  metadata?: Record<string, unknown>;
}

interface SaveIndex {
  saves: GameSaveMetadata[];
  lastUpdated: number;
}

const SAVE_INDEX_KEY = 'challenger_game_saves_index';
const SAVE_PREFIX = 'challenger_save_';

/**
 * Get the save index from localStorage
 */
function getSaveIndex(): SaveIndex {
  if (typeof window === 'undefined') {
    return { saves: [], lastUpdated: Date.now() };
  }
  
  const stored = localStorage.getItem(SAVE_INDEX_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return { saves: [], lastUpdated: Date.now() };
}

/**
 * Save the index to localStorage
 */
function saveIndex(index: SaveIndex): void {
  if (typeof window === 'undefined') return;
  index.lastUpdated = Date.now();
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
}

/**
 * Determine the best available backend
 */
export function getBestBackend(): StorageBackend {
  if (isTelegramConfigured()) {
    return 'telegram';
  }
  return 'discord';
}

/**
 * Upload a game save to cloud storage
 */
export async function uploadGameSave(
  save: GameSave,
  backend: StorageBackend = 'auto',
  onProgress?: (progress: { stage: string; loaded: number; total: number }) => void
): Promise<GameSaveMetadata> {
  const selectedBackend = backend === 'auto' ? getBestBackend() : backend;
  
  // Create save file name
  const fileName = `${save.gameId}_${save.saveId}.sav`;
  
  // Compress save data
  onProgress?.({ stage: 'compressing', loaded: 0, total: save.saveData.size });
  const compressed = await compressFileGzip(new File([save.saveData], fileName));
  
  const fileToUpload = new File([compressed.blob], fileName, { 
    type: 'application/octet-stream' 
  });
  
  // Upload to selected backend
  onProgress?.({ stage: 'uploading', loaded: 0, total: fileToUpload.size });
  
  let storageFileId: string;
  let storageBackend: 'discord' | 'telegram';
  
  if (selectedBackend === 'telegram' && isTelegramConfigured()) {
    const metadata = await uploadFileToTelegram(fileToUpload, (p) => {
      onProgress?.({ stage: 'uploading', loaded: p.loaded, total: p.total });
    });
    storageFileId = metadata.fileId;
    storageBackend = 'telegram';
  } else {
    const metadata = await uploadToDiscord(fileToUpload, (p) => {
      onProgress?.({ stage: 'uploading', loaded: p.uploadedBytes, total: p.totalBytes });
    });
    storageFileId = metadata.fileId;
    storageBackend = 'discord';
  }
  
  // Create save metadata
  const saveMetadata: GameSaveMetadata = {
    saveId: save.saveId,
    gameId: save.gameId,
    gameName: save.gameName,
    saveName: save.saveName,
    size: save.saveData.size,
    compressedSize: compressed.compressedBytes,
    createdAt: save.createdAt,
    updatedAt: Date.now(),
    platform: save.platform,
    storageBackend,
    storageFileId,
    metadata: save.metadata,
  };
  
  // Update index
  const index = getSaveIndex();
  const existingIndex = index.saves.findIndex(s => s.saveId === save.saveId);
  if (existingIndex >= 0) {
    index.saves[existingIndex] = saveMetadata;
  } else {
    index.saves.push(saveMetadata);
  }
  saveIndex(index);
  
  return saveMetadata;
}

/**
 * Download a game save from cloud storage
 */
export async function downloadGameSave(
  saveId: string,
  onProgress?: (progress: { stage: string; loaded: number; total: number }) => void
): Promise<Blob> {
  const index = getSaveIndex();
  const saveMetadata = index.saves.find(s => s.saveId === saveId);
  
  if (!saveMetadata) {
    throw new Error(`Save not found: ${saveId}`);
  }
  
  onProgress?.({ stage: 'downloading', loaded: 0, total: saveMetadata.size });
  
  let compressedBlob: Blob;
  
  if (saveMetadata.storageBackend === 'telegram') {
    compressedBlob = await downloadFileFromTelegram(saveMetadata.storageFileId, (p) => {
      onProgress?.({ stage: 'downloading', loaded: p.loaded, total: p.total });
    });
  } else {
    compressedBlob = await downloadFromDiscord(saveMetadata.storageFileId, (p) => {
      onProgress?.({ stage: 'downloading', loaded: p.downloadedBytes, total: p.totalBytes });
    });
  }
  
  // Decompress
  onProgress?.({ stage: 'decompressing', loaded: 0, total: saveMetadata.size });
  
  try {
    // @ts-ignore - DecompressionStream may not be in all type definitions
    const ds = new DecompressionStream('gzip');
    const decompressedStream = compressedBlob.stream().pipeThrough(ds);
    const blob = await new Response(decompressedStream).blob();
    onProgress?.({ stage: 'complete', loaded: saveMetadata.size, total: saveMetadata.size });
    return blob;
  } catch {
    // If decompression fails, return as-is
    return compressedBlob;
  }
}

/**
 * List all game saves
 */
export async function listGameSaves(gameId?: string): Promise<GameSaveMetadata[]> {
  const index = getSaveIndex();
  
  if (gameId) {
    return index.saves.filter(s => s.gameId === gameId);
  }
  
  return index.saves.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Delete a game save
 */
export async function deleteGameSave(saveId: string): Promise<void> {
  const index = getSaveIndex();
  const saveMetadata = index.saves.find(s => s.saveId === saveId);
  
  if (!saveMetadata) {
    throw new Error(`Save not found: ${saveId}`);
  }
  
  // Delete from cloud storage
  if (saveMetadata.storageBackend === 'telegram') {
    await deleteTelegramFile(saveMetadata.storageFileId);
  } else {
    await deleteDiscordFile(saveMetadata.storageFileId);
  }
  
  // Update index
  index.saves = index.saves.filter(s => s.saveId !== saveId);
  saveIndex(index);
}

/**
 * Get storage quota info
 */
export async function getStorageQuota(): Promise<{
  used: number;
  total: number;
  available: number;
  backend: 'discord' | 'telegram';
}> {
  if (isTelegramConfigured()) {
    // Telegram doesn't have a strict quota we can query
    return {
      used: 0,
      total: 50 * 1024 * 1024, // 50MB per file
      available: 50 * 1024 * 1024,
      backend: 'telegram'
    };
  }
  
  const quota = await getDiscordQuotaInfo();
  return {
    used: quota.usedBytes,
    total: quota.limitBytes,
    available: quota.availableBytes,
    backend: 'discord'
  };
}

/**
 * Check if cloud storage is available
 */
export async function isCloudStorageAvailable(): Promise<boolean> {
  try {
    if (isTelegramConfigured()) {
      return true;
    }
    return await hasDiscordQuota(1024);
  } catch {
    return false;
  }
}

/**
 * Create a new save ID
 */
export function generateSaveId(): string {
  return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Auto-save on game exit (call this when leaving a game)
 */
export async function autoSaveGame(
  gameId: string,
  gameName: string,
  saveData: Blob,
  platform: 'android' | 'windows' | 'web'
): Promise<GameSaveMetadata | null> {
  try {
    const save: GameSave = {
      saveId: generateSaveId(),
      gameId,
      gameName,
      saveName: `Auto-save ${new Date().toLocaleString()}`,
      saveData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      platform,
    };
    
    return await uploadGameSave(save, 'auto');
  } catch (error) {
    console.error('Auto-save failed:', error);
    return null;
  }
}