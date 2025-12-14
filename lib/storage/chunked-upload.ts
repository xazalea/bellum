import { NACHO_STORAGE_LIMIT_BYTES } from "@/lib/storage/quota";
import { authService } from "@/lib/firebase/auth-service";

export interface ChunkedUploadInit {
  fileName: string;
  totalBytes: number;
  chunkBytes: number;
  contentType?: string | null;
}

export interface ChunkedUploadManifest {
  fileId: string;
  fileName: string;
  totalBytes: number;
  chunkBytes: number;
  totalChunks: number;
  createdAtUnixMs: number;
}

export interface ChunkedUploadResult {
  uploadId: string;
  fileId: string;
  totalChunks: number;
  storedBytes: number;
}

function getClusterBase(): string {
  return (
    (typeof process !== "undefined" &&
      (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })
        ?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
    ""
  );
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = authService.getCurrentUser();
  if (!user) return {};
  // Legacy header name kept for compatibility with external cluster server.
  return { "X-Nacho-UserId": user.uid };
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  // Ensure ArrayBuffer-backed payload for WebCrypto typings.
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  const hash = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function gzipCompressBlob(blob: Blob): Promise<Uint8Array> {
  // Best-effort gzip using native streams.
  // If unsupported, fall back to raw bytes (still functional).
  const anyGlobal = globalThis as unknown as { CompressionStream?: any };
  if (!anyGlobal.CompressionStream) {
    return new Uint8Array(await blob.arrayBuffer());
  }
  const cs = new anyGlobal.CompressionStream("gzip");
  const compressedStream = blob.stream().pipeThrough(cs);
  const compressedBlob = await new Response(compressedStream).blob();
  return new Uint8Array(await compressedBlob.arrayBuffer());
}

async function isTelegramEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`/api/telegram/status`, { cache: "no-store" });
    if (!res.ok) return false;
    const j = (await res.json()) as { enabled?: boolean };
    return !!j.enabled;
  } catch {
    return false;
  }
}

export async function chunkedUploadFile(
  file: File,
  opts: {
    chunkBytes?: number;
    compressChunks?: boolean;
    onProgress?: (p: {
      chunkIndex: number;
      totalChunks: number;
      uploadedBytes: number;
      totalBytes: number;
    }) => void;
  } = {}
): Promise<ChunkedUploadResult> {
  const base = getClusterBase();
  const user = authService.getCurrentUser();
  if (!user) throw new Error("Sign in required");

  // Best-effort: enforce cloud quota client-side (6GB) for Telegram-backed storage.
  // NOTE: quota tracking used to rely on client Firestore. With locked rules, we skip per-user tracking here.
  // Keep a simple hard cap so uploads don’t explode storage.
  if (file.size > NACHO_STORAGE_LIMIT_BYTES) throw new Error("File too large for cloud storage quota");

  const chunkBytes = opts.chunkBytes ?? 32 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkBytes);

  const headers = await getAuthHeaders();

  // If no external cluster base is configured and Telegram is enabled on this deployment,
  // use Telegram-backed storage routes hosted alongside the Vercel site.
  const useTelegram = !base && (await isTelegramEnabled());
  if (useTelegram) {
    const uploadId = crypto.randomUUID();
    const chunks: Array<{ index: number; telegramFileId: string; sizeBytes: number }> = [];
    let uploadedBytes = 0;
    let storedBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkBytes;
      const end = Math.min(file.size, start + chunkBytes);
      const chunk = file.slice(start, end);

      const payload = opts.compressChunks
        ? await gzipCompressBlob(chunk)
        : new Uint8Array(await chunk.arrayBuffer());

      // Ensure ArrayBuffer-backed bytes for fetch BodyInit typing.
      const sendBytes = new Uint8Array(payload.byteLength);
      sendBytes.set(payload);

      const res = await fetch(`/api/telegram/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": file.name,
          "X-Upload-Id": uploadId,
          "X-Chunk-Index": String(i),
          "X-Chunk-Total": String(totalChunks),
        },
        body: sendBytes.buffer,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Telegram chunk upload failed (${res.status}) [${i}/${totalChunks}]: ${t}`);
      }
      const j = (await res.json()) as { fileId: string };
      chunks.push({ index: i, telegramFileId: j.fileId, sizeBytes: sendBytes.byteLength });

      uploadedBytes += end - start;
      storedBytes += sendBytes.byteLength;
      opts.onProgress?.({ chunkIndex: i, totalChunks, uploadedBytes, totalBytes: file.size });
    }

    const manRes = await fetch(`/api/telegram/manifest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        totalBytes: file.size,
        chunkBytes,
        totalChunks,
        createdAtUnixMs: Date.now(),
        storedBytes,
        chunks,
      }),
    });
    if (!manRes.ok) {
      const t = await manRes.text().catch(() => "");
      throw new Error(`Manifest store failed (${manRes.status}): ${t}`);
    }
    const manJson = (await manRes.json()) as { fileId: string };

    return { uploadId, fileId: manJson.fileId, totalChunks, storedBytes };
  }

  const initBody: ChunkedUploadInit = {
    fileName: file.name,
    totalBytes: file.size,
    chunkBytes,
    contentType: file.type || null,
  };

  const initRes = await fetch(`${base}/api/uploads/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(initBody),
  });
  if (!initRes.ok) {
    const t = await initRes.text().catch(() => "");
    throw new Error(`Upload init failed (${initRes.status}): ${t}`);
  }
  const initJson = (await initRes.json()) as { uploadId: string; totalChunks: number };
  const uploadId = initJson.uploadId;

  let uploadedBytes = 0;
  let storedBytes = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkBytes;
    const end = Math.min(file.size, start + chunkBytes);
    const chunk = file.slice(start, end);

    const payload = opts.compressChunks
      ? await gzipCompressBlob(chunk)
      : new Uint8Array(await chunk.arrayBuffer());

    // Ensure ArrayBuffer-backed bytes for fetch BodyInit typing.
    const sendBytes = new Uint8Array(payload.byteLength);
    sendBytes.set(payload);
    const hash = await sha256Hex(sendBytes.buffer);

    const putRes = await fetch(`${base}/api/uploads/${uploadId}/chunk/${i}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Chunk-Sha256": hash,
        ...headers,
      },
      body: sendBytes.buffer,
    });
    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      throw new Error(`Chunk upload failed (${putRes.status}) [${i}/${totalChunks}]: ${t}`);
    }

    uploadedBytes += end - start;
    storedBytes += sendBytes.byteLength;
    opts.onProgress?.({ chunkIndex: i, totalChunks, uploadedBytes, totalBytes: file.size });
  }

  const completeRes = await fetch(`${base}/api/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ uploadId }),
  });
  if (!completeRes.ok) {
    const t = await completeRes.text().catch(() => "");
    throw new Error(`Upload complete failed (${completeRes.status}): ${t}`);
  }
  const completeJson = (await completeRes.json()) as { fileId: string };

  return {
    uploadId,
    fileId: completeJson.fileId,
    totalChunks,
    storedBytes,
  };
}


