/**
 * Telegram Storage Client
 * Uses Telegram Bot API for file storage
 * Alternative to Discord webhook storage
 */

import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface TelegramFileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  telegramFileId: string;
  fingerprint: string;
  createdAt: number;
  messageId: number;
}

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for bots
const STORAGE_PREFIX = 'challenger_telegram_storage_';
const FILES_INDEX_KEY = (fp: string) => `${STORAGE_PREFIX}files_${fp}`;

let telegramConfig: TelegramConfig | null = null;

/**
 * Initialize Telegram storage with bot credentials
 */
export function initTelegramStorage(config: TelegramConfig): void {
  telegramConfig = config;
  localStorage.setItem(`${STORAGE_PREFIX}config`, JSON.stringify(config));
}

/**
 * Get stored Telegram config
 */
export function getTelegramConfig(): TelegramConfig | null {
  if (telegramConfig) return telegramConfig;
  
  const stored = localStorage.getItem(`${STORAGE_PREFIX}config`);
  if (stored) {
    telegramConfig = JSON.parse(stored);
    return telegramConfig;
  }
  return null;
}

/**
 * Check if Telegram storage is configured
 */
export function isTelegramConfigured(): boolean {
  return getTelegramConfig() !== null;
}

/**
 * Send a file to Telegram
 */
async function sendFileToTelegram(
  file: Blob,
  fileName: string
): Promise<{ messageId: number; telegramFileId: string }> {
  const config = getTelegramConfig();
  if (!config) {
    throw new Error('Telegram storage not configured');
  }

  const formData = new FormData();
  formData.append('chat_id', config.chatId);
  formData.append('document', file, fileName);

  const response = await fetch(
    `${TELEGRAM_API_BASE}${config.botToken}/sendDocument`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Telegram upload failed: ${error.description || response.statusText}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  const document = data.result.document;
  return {
    messageId: data.result.message_id,
    telegramFileId: document.file_id,
  };
}

/**
 * Get file download URL from Telegram
 */
async function getFileDownloadUrl(fileId: string): Promise<string> {
  const config = getTelegramConfig();
  if (!config) {
    throw new Error('Telegram storage not configured');
  }

  const response = await fetch(
    `${TELEGRAM_API_BASE}${config.botToken}/getFile?file_id=${fileId}`
  );

  if (!response.ok) {
    throw new Error('Failed to get file info from Telegram');
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return `https://api.telegram.org/file/bot${config.botToken}/${data.result.file_path}`;
}

/**
 * Save file metadata to localStorage
 */
async function saveFileMetadata(metadata: TelegramFileMetadata): Promise<void> {
  const fingerprint = await getDeviceFingerprintId();
  
  localStorage.setItem(
    `${STORAGE_PREFIX}${metadata.fileId}`,
    JSON.stringify(metadata)
  );

  const indexKey = FILES_INDEX_KEY(fingerprint);
  const indexData = localStorage.getItem(indexKey);
  const fileIds: string[] = indexData ? JSON.parse(indexData) : [];
  
  if (!fileIds.includes(metadata.fileId)) {
    fileIds.push(metadata.fileId);
    localStorage.setItem(indexKey, JSON.stringify(fileIds));
  }
}

/**
 * Upload a file to Telegram storage
 */
export async function uploadFileToTelegram(
  file: File,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<TelegramFileMetadata> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const config = getTelegramConfig();
  if (!config) {
    throw new Error('Telegram storage not configured. Please set up your bot token and chat ID.');
  }

  const fingerprint = await getDeviceFingerprintId();
  const fileId = crypto.randomUUID();

  const { messageId, telegramFileId } = await sendFileToTelegram(file, file.name);

  onProgress?.({ loaded: file.size, total: file.size });

  const metadata: TelegramFileMetadata = {
    fileId,
    fileName: file.name,
    fileSize: file.size,
    telegramFileId,
    fingerprint,
    createdAt: Date.now(),
    messageId,
  };

  await saveFileMetadata(metadata);

  return metadata;
}

/**
 * Download a file from Telegram storage
 */
export async function downloadFileFromTelegram(
  fileId: string,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<Blob> {
  const metadataStr = localStorage.getItem(`${STORAGE_PREFIX}${fileId}`);
  if (!metadataStr) {
    throw new Error(`File not found: ${fileId}`);
  }

  const metadata: TelegramFileMetadata = JSON.parse(metadataStr);
  
  const downloadUrl = await getFileDownloadUrl(metadata.telegramFileId);
  
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return response.blob();
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const total = metadata.fileSize;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    loaded += value.length;
    onProgress?.({ loaded, total });
  }

  return new Blob(chunks as BlobPart[]);
}

/**
 * List all files for current fingerprint
 */
export async function listTelegramFiles(): Promise<TelegramFileMetadata[]> {
  const fingerprint = await getDeviceFingerprintId();
  const indexKey = FILES_INDEX_KEY(fingerprint);
  const indexData = localStorage.getItem(indexKey);
  const fileIds: string[] = indexData ? JSON.parse(indexData) : [];

  const files: TelegramFileMetadata[] = [];
  for (const fileId of fileIds) {
    const metadataStr = localStorage.getItem(`${STORAGE_PREFIX}${fileId}`);
    if (metadataStr) {
      files.push(JSON.parse(metadataStr));
    }
  }

  return files.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Delete file metadata (note: cannot delete from Telegram)
 */
export async function deleteTelegramFile(fileId: string): Promise<void> {
  const fingerprint = await getDeviceFingerprintId();
  
  // Remove from index
  const indexKey = FILES_INDEX_KEY(fingerprint);
  const indexData = localStorage.getItem(indexKey);
  const fileIds: string[] = indexData ? JSON.parse(indexData) : [];
  const newFileIds = fileIds.filter(id => id !== fileId);
  localStorage.setItem(indexKey, JSON.stringify(newFileIds));

  // Remove metadata
  localStorage.removeItem(`${STORAGE_PREFIX}${fileId}`);
}

/**
 * Clear all Telegram storage config and metadata
 */
export function clearTelegramStorage(): void {
  // Clear config
  localStorage.removeItem(`${STORAGE_PREFIX}config`);
  telegramConfig = null;
  
  // Clear all file metadata (keys starting with prefix)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}