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
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}`, "X-Nacho-UserId": user.uid };
  } catch {
    return { "X-Nacho-UserId": user.uid };
  }
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
  if (!user) throw new Error("Not authenticated");

  const chunkBytes = opts.chunkBytes ?? 32 * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / chunkBytes);

  const headers = await getAuthHeaders();
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


