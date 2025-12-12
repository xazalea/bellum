/**
 * OPFS-backed local cache for installed app payloads.
 *
 * Storage is local + cluster (cluster replication is handled separately).
 * This cache is best-effort: browsers may evict storage.
 */

async function getRootDir(): Promise<FileSystemDirectoryHandle> {
  const dir = await navigator.storage.getDirectory();
  return dir as FileSystemDirectoryHandle;
}

async function ensureDir(root: FileSystemDirectoryHandle, name: string) {
  return (await root.getDirectoryHandle(name, { create: true })) as FileSystemDirectoryHandle;
}

export async function opfsWriteBytes(key: string, bytes: Uint8Array): Promise<void> {
  const root = await getRootDir();
  const nacho = await ensureDir(root, "nacho");
  const apps = await ensureDir(nacho, "apps");
  const fileHandle = await apps.getFileHandle(`${key}.bin`, { create: true });
  const writable = await fileHandle.createWritable();

  // Ensure ArrayBuffer-backed write.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await writable.write(copy.buffer);
  await writable.close();
}

export async function opfsReadBytes(key: string): Promise<Uint8Array | null> {
  try {
    const root = await getRootDir();
    const nacho = await ensureDir(root, "nacho");
    const apps = await ensureDir(nacho, "apps");
    const fileHandle = await apps.getFileHandle(`${key}.bin`, { create: false });
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

export async function opfsDelete(key: string): Promise<void> {
  try {
    const root = await getRootDir();
    const nacho = await ensureDir(root, "nacho");
    const apps = await ensureDir(nacho, "apps");
    await apps.removeEntry(`${key}.bin`);
  } catch {
    // ignore
  }
}


