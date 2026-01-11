import { authService } from "@/lib/firebase/auth-service";

export interface DiscordManifest {
  fileId: string;
  fileName: string;
  totalBytes: number;
  chunkBytes: number;
  totalChunks: number;
  chunks: Array<{
    index: number;
    sizeBytes: number;
    sha256: string;
    messageId: string;
    attachmentUrl: string;
  }>;
  createdAt: number;
  ownerUid: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = authService.getCurrentUser();
  if (!user) return {};
  return { "X-Nacho-UserId": user.uid };
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  const hash = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Fetch manifest from Discord backend
 */
export async function fetchDiscordManifest(fileId: string): Promise<DiscordManifest> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/discord/manifest?fileId=${encodeURIComponent(fileId)}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Discord manifest (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { manifest: DiscordManifest };
  return json.manifest;
}

/**
 * Download a single chunk from Discord CDN
 */
async function downloadChunkFromDiscordCDN(
  attachmentUrl: string,
  expectedSha256?: string
): Promise<Uint8Array> {
  const res = await fetch(attachmentUrl, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord CDN download failed (${res.status}): ${text}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());

  // Verify hash if provided
  if (expectedSha256) {
    const actualHash = await sha256Hex(bytes);
    if (actualHash !== expectedSha256) {
      throw new Error(`Hash mismatch: expected ${expectedSha256}, got ${actualHash}`);
    }
  }

  return bytes;
}

/**
 * Download a chunk with fallback for expired CDN URLs
 */
async function downloadChunkWithFallback(
  chunkInfo: DiscordManifest['chunks'][0],
  retries: number = 2
): Promise<Uint8Array> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Try direct CDN URL first
      return await downloadChunkFromDiscordCDN(chunkInfo.attachmentUrl, chunkInfo.sha256);
    } catch (e: any) {
      lastError = e;
      
      // If CDN URL failed (likely expired), try to fetch fresh URL via message ID
      if (attempt < retries - 1) {
        console.warn(`[Discord] CDN download attempt ${attempt + 1} failed, trying message ID fallback:`, e.message);
        
        try {
          const headers = await getAuthHeaders();
          const res = await fetch(`/api/discord/file?messageId=${encodeURIComponent(chunkInfo.messageId)}`, {
            method: "GET",
            headers,
          });

          if (res.ok) {
            const bytes = new Uint8Array(await res.arrayBuffer());
            
            // Verify hash
            const actualHash = await sha256Hex(bytes);
            if (actualHash === chunkInfo.sha256) {
              return bytes;
            }
            
            throw new Error(`Hash mismatch after message ID fallback`);
          }
        } catch (fallbackError: any) {
          console.warn(`[Discord] Message ID fallback failed:`, fallbackError.message);
        }
        
        // Wait before retry
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Discord download failed after retries');
}

/**
 * Download and reassemble a file from Discord storage
 */
export async function chunkedDownloadDiscordFile(
  fileId: string,
  opts: {
    onProgress?: (p: {
      chunkIndex: number;
      totalChunks: number;
      downloadedBytes: number;
      totalBytes: number;
    }) => void;
  } = {}
): Promise<Blob> {
  // Fetch manifest
  const manifest = await fetchDiscordManifest(fileId);

  if (manifest.totalChunks === 0) {
    throw new Error("Manifest has no chunks");
  }

  // Download chunks in parallel with concurrency limit
  const MAX_CONCURRENCY = 6;
  const chunkData: Uint8Array[] = new Array(manifest.totalChunks);
  let downloadedBytes = 0;

  const queue = Array.from({ length: manifest.totalChunks }, (_, i) => i);

  const worker = async () => {
    while (queue.length > 0) {
      const i = queue.shift();
      if (i === undefined) break;

      const chunkInfo = manifest.chunks[i];
      const bytes = await downloadChunkWithFallback(chunkInfo);
      
      chunkData[i] = bytes;
      downloadedBytes += bytes.byteLength;

      opts.onProgress?.({
        chunkIndex: i,
        totalChunks: manifest.totalChunks,
        downloadedBytes,
        totalBytes: manifest.totalBytes,
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(manifest.totalChunks, MAX_CONCURRENCY) }, worker)
  );

  // Verify all chunks were downloaded
  for (let i = 0; i < manifest.totalChunks; i++) {
    if (!chunkData[i]) {
      throw new Error(`Missing chunk ${i}`);
    }
  }

  // Reassemble file
  const blob = new Blob(chunkData, { type: "application/octet-stream" });
  return blob;
}

/**
 * Download a Discord file and return as a File object
 */
export async function downloadDiscordFileAsFile(
  fileId: string,
  opts: {
    onProgress?: (p: {
      chunkIndex: number;
      totalChunks: number;
      downloadedBytes: number;
      totalBytes: number;
    }) => void;
  } = {}
): Promise<File> {
  const manifest = await fetchDiscordManifest(fileId);
  const blob = await chunkedDownloadDiscordFile(fileId, opts);
  return new File([blob], manifest.fileName, { type: "application/octet-stream" });
}

/**
 * Get direct download URL for a Discord file (if not expired)
 * Note: Discord CDN URLs expire after ~24 hours
 */
export async function getDiscordFileInfo(fileId: string): Promise<{
  fileName: string;
  totalBytes: number;
  createdAt: number;
  expired: boolean;
}> {
  const manifest = await fetchDiscordManifest(fileId);
  
  // Check if URLs are likely expired (24 hours)
  const now = Date.now();
  const age = now - manifest.createdAt;
  const expired = age > 24 * 60 * 60 * 1000;

  return {
    fileName: manifest.fileName,
    totalBytes: manifest.totalBytes,
    createdAt: manifest.createdAt,
    expired,
  };
}
