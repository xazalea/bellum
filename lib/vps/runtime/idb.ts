export type VpsCheckpoint = {
  vpsId: string;
  seq: number;
  createdAt: number;
  state: any;
};

const DB_NAME = 'fabrik_vps_runtime_v1';
const DB_VERSION = 1;
const STORE_CHECKPOINTS = 'checkpoints';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHECKPOINTS)) {
        const s = db.createObjectStore(STORE_CHECKPOINTS, { keyPath: ['vpsId', 'seq'] });
        s.createIndex('by_vps', 'vpsId', { unique: false });
        s.createIndex('by_vps_seq', ['vpsId', 'seq'], { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('idb_open_failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('idb_tx_aborted'));
    tx.onerror = () => reject(tx.error || new Error('idb_tx_failed'));
  });
}

export async function putCheckpoint(cp: VpsCheckpoint): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORE_CHECKPOINTS], 'readwrite');
  tx.objectStore(STORE_CHECKPOINTS).put(cp);
  await txDone(tx);
  db.close();
}

export async function getLatestCheckpoint(vpsId: string): Promise<VpsCheckpoint | null> {
  const db = await openDb();
  const tx = db.transaction([STORE_CHECKPOINTS], 'readonly');
  const store = tx.objectStore(STORE_CHECKPOINTS);
  const idx = store.index('by_vps');
  const req = idx.openCursor(IDBKeyRange.only(vpsId), 'prev');

  const cp = await new Promise<VpsCheckpoint | null>((resolve) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve(null);
      resolve(cursor.value as VpsCheckpoint);
    };
    req.onerror = () => resolve(null);
  });

  await txDone(tx).catch(() => {});
  db.close();
  return cp;
}

