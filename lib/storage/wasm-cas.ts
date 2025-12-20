import { chunkedUploadFile } from '@/lib/storage/chunked-upload';
import { downloadClusterFile } from '@/lib/storage/chunked-download';

export type WasmCasPutResult = {
  artifactId: string; // sha256 hex
  fileId: string; // cluster/telegram manifest id
};

function readIndex(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem('bellum.wasm.cas.v1');
    if (!raw) return {};
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object') return {};
    return j as Record<string, string>;
  } catch {
    return {};
  }
}

function writeIndex(index: Record<string, string>) {
  try {
    window.localStorage.setItem('bellum.wasm.cas.v1', JSON.stringify(index));
  } catch {
    // ignore
  }
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(new Uint8Array(data));
  const hash = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function putWasmArtifactToCas(wasm: ArrayBuffer): Promise<WasmCasPutResult> {
  if (typeof window === 'undefined') throw new Error('CAS not available during SSR');
  const artifactId = await sha256Hex(wasm);
  const index = readIndex();
  const existing = index[artifactId];
  if (existing) return { artifactId, fileId: existing };

  // Upload as a normal cluster file using existing storage routes.
  const file = new File([wasm], `wasm_${artifactId}.wasm`, { type: 'application/wasm' });
  const up = await chunkedUploadFile(file, { chunkBytes: 8 * 1024 * 1024, compressChunks: false });
  index[artifactId] = up.fileId;
  writeIndex(index);
  return { artifactId, fileId: up.fileId };
}

export async function getWasmArtifactFromCas(artifactId: string): Promise<{ fileId: string; bytes: Uint8Array }> {
  if (typeof window === 'undefined') throw new Error('CAS not available during SSR');
  const index = readIndex();
  const fileId = index[String(artifactId || '').trim()] || '';
  if (!fileId) throw new Error('artifact_not_found');
  const dl = await downloadClusterFile(fileId, { scope: 'user' });
  return { fileId, bytes: dl.bytes };
}




