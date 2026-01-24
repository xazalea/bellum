export interface GamesCatalog {
  id: 'games';
  games: GameRecord[];
  total: number;
  cachedAt: number;
  etag?: string | null;
  lastModified?: string | null;
}

export interface GameRecord {
  id: string;
  title: string;
  description: string;
  thumb: string;
  file: string;
  width?: string;
  height?: string;
  platform?: string;
}

const DB_NAME = 'bellum-games';
const DB_VERSION = 1;
const STORE_NAME = 'catalog';
const CATALOG_KEY = 'games';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function readGamesCatalog(): Promise<GamesCatalog | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CATALOG_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  } catch (error) {
    console.warn('[GamesCache] Failed to read catalog', error);
    return null;
  }
}

export async function writeGamesCatalog(catalog: GamesCatalog): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(catalog);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('[GamesCache] Failed to write catalog', error);
  }
}

export function getCatalogAgeMs(catalog: GamesCatalog): number {
  return Date.now() - catalog.cachedAt;
}
