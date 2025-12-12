import { authService } from "@/lib/firebase/auth-service";

export interface ClusterFileManifest {
  fileId: string;
  fileName: string;
  totalBytes: number;
  chunkBytes: number;
  totalChunks: number;
  createdAtUnixMs: number;
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

export async function fetchClusterManifest(fileId: string): Promise<ClusterFileManifest> {
  const base = getClusterBase();
  const headers = await getAuthHeaders();
  const res = await fetch(`${base}/api/files/${fileId}/manifest`, { headers });
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
    onProgress?: (p: { chunkIndex: number; totalChunks: number }) => void;
  } = {}
): Promise<{ fileName: string; bytes: Uint8Array }> {
  const base = getClusterBase();
  const headers = await getAuthHeaders();
  const manifest = await fetchClusterManifest(fileId);

  const parts: Uint8Array[] = [];
  let totalLen = 0;

  for (let i = 0; i < manifest.totalChunks; i++) {
    const res = await fetch(`${base}/api/files/${fileId}/chunk/${i}`, { headers });
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


