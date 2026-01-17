/**
 * Challenger Storage Client (Disbox-inspired)
 * Uses Discord webhooks as a file storage backend with fingerprint-based quotas
 * Branded as "Challenger Storage" for the deep sea theme
 */

import { getDeviceFingerprintId } from '@/lib/auth/fingerprint';
import { compressFileGzip } from './compression';

export interface WebhookConfig {
  webhookUrl: string;
  maxChunkSize: number; // Discord limit: 25MB
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  chunkCount: number;
  fingerprint: string;
  createdAt: number;
  messageIds: string[];
  attachmentUrls: string[];
  mimeType?: string;
}

export interface QuotaInfo {
  fingerprint: string;
  usedBytes: number;
  limitBytes: number;
  availableBytes: number;
}

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1462182344021770413/VAvTz9ibnGBLEhI3GRHFfbsyy0uw5AsLGihzbTrkorkvivBEiEDLg9s2fduZKIwDeqY9';
const MAX_CHUNK_SIZE = 24 * 1024 * 1024; // 24MB (safe margin below Discord's 25MB limit)
const QUOTA_PER_FINGERPRINT = 4 * 1024 * 1024 * 1024; // 4GB per user

// LocalStorage keys
const STORAGE_PREFIX = 'bellum_discord_storage_';
const QUOTA_KEY = (fp: string) => `${STORAGE_PREFIX}quota_${fp}`;
const METADATA_KEY = (fp: string) => `${STORAGE_PREFIX}metadata_${fp}`;
const FILES_INDEX_KEY = (fp: string) => `${STORAGE_PREFIX}files_${fp}`;

/**
 * Get current fingerprint-based quota usage
 */
export async function getQuotaInfo(): Promise<QuotaInfo> {
  const fingerprint = await getDeviceFingerprintId();
  const quotaData = localStorage.getItem(QUOTA_KEY(fingerprint));
  const usedBytes = quotaData ? parseInt(quotaData, 10) : 0;

  return {
    fingerprint,
    usedBytes,
    limitBytes: QUOTA_PER_FINGERPRINT,
    availableBytes: Math.max(0, QUOTA_PER_FINGERPRINT - usedBytes),
  };
}

/**
 * Check if user has enough quota for a file
 */
export async function hasQuota(fileSizeBytes: number): Promise<boolean> {
  const quota = await getQuotaInfo();
  return quota.availableBytes >= fileSizeBytes;
}

/**
 * Update quota usage (add or subtract bytes)
 */
async function updateQuota(deltaBytes: number): Promise<void> {
  const fingerprint = await getDeviceFingerprintId();
  const quota = await getQuotaInfo();
  const newUsed = Math.max(0, quota.usedBytes + deltaBytes);
  localStorage.setItem(QUOTA_KEY(fingerprint), newUsed.toString());
}

/**
 * Save file metadata to localStorage
 */
async function saveFileMetadata(metadata: FileMetadata): Promise<void> {
  const fingerprint = await getDeviceFingerprintId();
  
  // Save individual file metadata
  localStorage.setItem(
    `${METADATA_KEY(fingerprint)}_${metadata.fileId}`,
    JSON.stringify(metadata)
  );

  // Update files index
  const indexKey = FILES_INDEX_KEY(fingerprint);
  const indexData = localStorage.getItem(indexKey);
  const fileIds: string[] = indexData ? JSON.parse(indexData) : [];
  
  if (!fileIds.includes(metadata.fileId)) {
    fileIds.push(metadata.fileId);
    localStorage.setItem(indexKey, JSON.stringify(fileIds));
  }
}

/**
 * Get file metadata by ID
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  const fingerprint = await getDeviceFingerprintId();
  const key = `${METADATA_KEY(fingerprint)}_${fileId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

/**
 * List all files for current fingerprint
 */
export async function listFiles(): Promise<FileMetadata[]> {
  const fingerprint = await getDeviceFingerprintId();
  const indexKey = FILES_INDEX_KEY(fingerprint);
  const indexData = localStorage.getItem(indexKey);
  const fileIds: string[] = indexData ? JSON.parse(indexData) : [];

  const files: FileMetadata[] = [];
  for (const fileId of fileIds) {
    const metadata = await getFileMetadata(fileId);
    if (metadata) {
      files.push(metadata);
    }
  }

  return files.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Upload a chunk to Discord via webhook
 */
async function uploadChunkToDiscord(
  chunk: Blob,
  fileName: string,
  chunkIndex: number
): Promise<{ messageId: string; attachmentUrl: string }> {
  const formData = new FormData();
  formData.append('file', chunk, `${fileName}.part${chunkIndex}`);
  formData.append('content', `[Challenger Storage] ${fileName} - Chunk ${chunkIndex + 1}`);

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Discord webhook upload failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Discord webhook response includes the message ID and attachments
  return {
    messageId: data.id,
    attachmentUrl: data.attachments[0].url,
  };
}

/**
 * Upload a file to Discord webhook storage with compression
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: {
    chunkIndex: number;
    totalChunks: number;
    uploadedBytes: number;
    totalBytes: number;
    compressedBytes: number;
  }) => void
): Promise<FileMetadata> {
  // Check quota (based on original file size, not compressed)
  if (!(await hasQuota(file.size))) {
    throw new Error(`Quota exceeded. You have ${(await getQuotaInfo()).availableBytes} bytes available, but need ${file.size} bytes.`);
  }

  // Compress file using existing compression pipeline
  console.log(`[Challenger Storage] Compressing ${file.name}...`);
  const compressed = await compressFileGzip(file);
  console.log(`[Challenger Storage] Compressed ${compressed.originalBytes} → ${compressed.compressedBytes} bytes (${((1 - compressed.compressedBytes / compressed.originalBytes) * 100).toFixed(1)}% reduction)`);

  // Calculate chunks
  const totalChunks = Math.ceil(compressed.compressedBytes / MAX_CHUNK_SIZE);
  const fileId = crypto.randomUUID();
  const messageIds: string[] = [];
  const attachmentUrls: string[] = [];
  let uploadedBytes = 0;

  console.log(`[Challenger Storage] Uploading ${file.name} in ${totalChunks} chunk(s)...`);

  // Upload chunks sequentially (Discord webhooks have rate limits)
  for (let i = 0; i < totalChunks; i++) {
    const start = i * MAX_CHUNK_SIZE;
    const end = Math.min(compressed.compressedBytes, start + MAX_CHUNK_SIZE);
    const chunkBlob = compressed.blob.slice(start, end);

    try {
      const { messageId, attachmentUrl } = await uploadChunkToDiscord(
        chunkBlob,
        file.name,
        i
      );

      messageIds.push(messageId);
      attachmentUrls.push(attachmentUrl);
      uploadedBytes += (end - start);

      onProgress?.({
        chunkIndex: i,
        totalChunks,
        uploadedBytes: Math.floor((uploadedBytes / compressed.compressedBytes) * file.size),
        totalBytes: file.size,
        compressedBytes: uploadedBytes,
      });

      // Rate limit: wait 500ms between chunks
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[Challenger Storage] Failed to upload chunk ${i}:`, error);
      throw new Error(`Upload failed at chunk ${i + 1}/${totalChunks}: ${error}`);
    }
  }

  // Create metadata
  const fingerprint = await getDeviceFingerprintId();
  const metadata: FileMetadata = {
    fileId,
    fileName: file.name,
    originalSize: file.size,
    compressedSize: compressed.compressedBytes,
    chunkCount: totalChunks,
    fingerprint,
    createdAt: Date.now(),
    messageIds,
    attachmentUrls,
    mimeType: file.type,
  };

  // Save metadata and update quota (based on ORIGINAL file size)
  await saveFileMetadata(metadata);
  await updateQuota(file.size);

  console.log(`[Challenger Storage] Upload complete: ${file.name}`);
  return metadata;
}

/**
 * Download a file from Discord webhook storage
 */
export async function downloadFile(
  fileId: string,
  onProgress?: (progress: {
    chunkIndex: number;
    totalChunks: number;
    downloadedBytes: number;
    totalBytes: number;
  }) => void
): Promise<Blob> {
  const metadata = await getFileMetadata(fileId);
  if (!metadata) {
    throw new Error(`File not found: ${fileId}`);
  }

  console.log(`[Challenger Storage] Downloading ${metadata.fileName} (${metadata.chunkCount} chunks)...`);

  const chunks: Blob[] = [];
  let downloadedBytes = 0;

  // Download all chunks
  for (let i = 0; i < metadata.attachmentUrls.length; i++) {
    const url = metadata.attachmentUrls[i];
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download chunk ${i}: ${response.status}`);
      }

      const chunkBlob = await response.blob();
      chunks.push(chunkBlob);
      downloadedBytes += chunkBlob.size;

      onProgress?.({
        chunkIndex: i,
        totalChunks: metadata.chunkCount,
        downloadedBytes: Math.floor((downloadedBytes / metadata.compressedSize) * metadata.originalSize),
        totalBytes: metadata.originalSize,
      });
    } catch (error) {
      console.error(`[Challenger Storage] Failed to download chunk ${i}:`, error);
      throw new Error(`Download failed at chunk ${i + 1}/${metadata.chunkCount}: ${error}`);
    }
  }

  // Combine chunks
  const combinedBlob = new Blob(chunks);

  // Decompress using DecompressionStream
  console.log(`[Challenger Storage] Decompressing ${metadata.fileName}...`);
  try {
    // @ts-ignore
    const ds = new DecompressionStream('gzip');
    const decompressedStream = combinedBlob.stream().pipeThrough(ds);
    const decompressedBlob = await new Response(decompressedStream).blob();
    
    console.log(`[Challenger Storage] Download complete: ${metadata.fileName}`);
    return decompressedBlob;
  } catch (error) {
    console.error('[Challenger Storage] Decompression failed:', error);
    // If decompression fails, return the raw blob
    return combinedBlob;
  }
}

/**
 * Delete a file from Challenger storage
 * Note: Discord webhooks don't support message deletion, so we only remove metadata
 */
export async function deleteFile(fileId: string): Promise<void> {
  const metadata = await getFileMetadata(fileId);
  if (!metadata) {
    throw new Error(`File not found: ${fileId}`);
  }

  const fingerprint = await getDeviceFingerprintId();

  // Remove from index
  const indexKey = FILES_INDEX_KEY(fingerprint);
  const indexData = localStorage.getItem(indexKey);
  const fileIds: string[] = indexData ? JSON.parse(indexData) : [];
  const newFileIds = fileIds.filter(id => id !== fileId);
  localStorage.setItem(indexKey, JSON.stringify(newFileIds));

  // Remove metadata
  localStorage.removeItem(`${METADATA_KEY(fingerprint)}_${fileId}`);

  // Update quota (subtract ORIGINAL file size)
  await updateQuota(-metadata.originalSize);

  console.log(`[Challenger Storage] Deleted metadata for: ${metadata.fileName}`);
  console.log('[Challenger Storage] Note: Deep sea archives remain in Discord, but metadata has been removed.');
}
