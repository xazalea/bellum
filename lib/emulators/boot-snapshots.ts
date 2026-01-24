export interface BootSnapshotConfig {
  key: string;
  version?: number;
}

type SnapshotRecord = {
  key: string;
  version: number;
  data: ArrayBuffer;
  updatedAt: number;
};

const DB_NAME = 'bellum_microvm_snapshots';
const STORE = 'snapshots';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBootSnapshot(
  config: BootSnapshotConfig,
  data: ArrayBuffer
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const record: SnapshotRecord = {
    key: config.key,
    version: config.version ?? 1,
    data,
    updatedAt: Date.now(),
  };
  store.put(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadBootSnapshot(
  config: BootSnapshotConfig
): Promise<ArrayBuffer | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const record = await new Promise<SnapshotRecord | undefined>((resolve, reject) => {
    const req = store.get(config.key);
    req.onsuccess = () => resolve(req.result as SnapshotRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  if (!record) return null;
  if (config.version && record.version !== config.version) return null;
  return record.data;
}

export async function clearBootSnapshot(key: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
