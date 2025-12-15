import { authService } from "@/lib/firebase/auth-service";
import { getClusterBase } from "@/lib/cluster/cluster-base";

export interface ClusterFileManifest {
  fileId: string;
  fileName: string;
  totalBytes: number;
  chunkBytes: number;
  totalChunks: number;
  createdAtUnixMs: number;
}

export type ClusterFileScope = "user" | "public";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = authService.getCurrentUser();
  if (!user) return {};
  // Legacy header name kept for compatibility with external cluster server.
  return { "X-Nacho-UserId": user.uid };
}

async function gzipDecompressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const anyGlobal = globalThis as unknown as { DecompressionStream?: any };
  if (!anyGlobal.DecompressionStream) return bytes;
  const ds = new anyGlobal.DecompressionStream("gzip");
  // Ensure ArrayBuffer-backed input (BlobPart typings exclude SharedArrayBuffer).
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(ds);
  const outBlob = await new Response(stream).blob();
  return new Uint8Array(await outBlob.arrayBuffer());
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

export async function fetchClusterManifest(
  fileId: string,
  scope: ClusterFileScope = "user"
): Promise<ClusterFileManifest> {
  const base = getClusterBase();
  const headers = await getAuthHeaders();

  // Telegram-backed: fileId is the Telegram file_id of the manifest json.
  if (!base && (await isTelegramEnabled())) {
    const res = await fetch(`/api/telegram/manifest?fileId=${encodeURIComponent(fileId)}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Manifest fetch failed (${res.status}): ${t}`);
    }
    const j = (await res.json()) as any;
    // Normalize to existing manifest type.
    return {
      fileId,
      fileName: String(j.fileName || "file"),
      totalBytes: Number(j.totalBytes || 0),
      chunkBytes: Number(j.chunkBytes || 0),
      totalChunks: Number(j.totalChunks || (Array.isArray(j.chunks) ? j.chunks.length : 0)),
      createdAtUnixMs: Number(j.createdAtUnixMs || Date.now()),
    };
  }

  const path = scope === "public" ? `/api/public/files/${fileId}/manifest` : `/api/files/${fileId}/manifest`;
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Manifest fetch failed (${res.status}): ${t}`);
  }
  return (await res.json()) as ClusterFileManifest;
}

export async function downloadClusterFile(
  fileId: string,
  opts: {
    compressedChunks?: boolean;
    scope?: ClusterFileScope;
    onProgress?: (p: { chunkIndex: number; totalChunks: number }) => void;
  } = {}
): Promise<{ fileName: string; bytes: Uint8Array }> {
  const base = getClusterBase();
  const headers = await getAuthHeaders();
  const scope = opts.scope ?? "user";
  const telegramMode = !base && (await isTelegramEnabled());
  const manifest = await fetchClusterManifest(fileId, scope);
  const chunkBase = telegramMode
    ? ""
    : scope === "public"
      ? `${base}/api/public/files/${fileId}/chunk`
      : `${base}/api/files/${fileId}/chunk`;

  const parts: Uint8Array[] = [];
  let totalLen = 0;

  // Telegram-backed: fetch full manifest once and stream each chunk by telegram file_id.
  let telegramChunks: Array<{ index: number; telegramFileId: string }> | null = null;
  if (telegramMode) {
    const res = await fetch(`/api/telegram/manifest?fileId=${encodeURIComponent(fileId)}`, { headers, cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Manifest fetch failed (${res.status}): ${t}`);
    }
    const j = (await res.json()) as any;
    telegramChunks = Array.isArray(j.chunks) ? (j.chunks as any[]).map((c) => ({ index: Number(c.index), telegramFileId: String(c.telegramFileId) })) : [];
  }

  for (let i = 0; i < manifest.totalChunks; i++) {
    const res = telegramMode
      ? await fetch(`/api/telegram/file?file_id=${encodeURIComponent(telegramChunks?.find((c) => c.index === i)?.telegramFileId || "")}`, { headers })
      : await fetch(`${chunkBase}/${i}`, { headers });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Chunk download failed (${res.status}) [${i}/${manifest.totalChunks}]: ${t}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const out = opts.compressedChunks ? await gzipDecompressBytes(buf) : buf;
    parts.push(out);
    totalLen += out.byteLength;
    opts.onProgress?.({ chunkIndex: i, totalChunks: manifest.totalChunks });
  }

  const merged = new Uint8Array(totalLen);
  let off = 0;
  for (const p of parts) {
    merged.set(p, off);
    off += p.byteLength;
  }

  return { fileName: manifest.fileName, bytes: merged };
}

export async function deleteClusterFile(fileId: string): Promise<void> {
  const base = getClusterBase();
  const headers = await getAuthHeaders();
  const res = await fetch(`${base}/api/files/${fileId}`, { method: "DELETE", headers });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Delete failed (${res.status}): ${t}`);
  }
}

export async function promoteClusterFileToPublic(fileId: string): Promise<void> {
  const base = getClusterBase();
  const headers = await getAuthHeaders();
  const res = await fetch(`${base}/api/files/${fileId}/make-public`, { method: "POST", headers });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Make-public failed (${res.status}): ${t}`);
  }
}

