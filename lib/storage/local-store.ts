/**
 * LocalStore: IndexedDB Wrapper for Local-First Game Storage
 * Allows storing large ISOs/APKs on the device without consuming cloud quota.
 */

interface LocalFile {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: number;
    synced: boolean; // True if uploaded to cloud
    data: Blob;
}

export class LocalStore {
    private dbName = 'NachoLocalStore';
    private storeName = 'files';
    private version = 1;
    private db: IDBDatabase | null = null;

    private async open(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.version);

            req.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            req.onsuccess = (e) => {
                this.db = (e.target as IDBOpenDBRequest).result;
                resolve(this.db!);
            };

            req.onerror = () => reject(req.error);
        });
    }

    public async saveFile(file: File): Promise<string> {
        const db = await this.open();
        const id = crypto.randomUUID();

        const record: LocalFile = {
            id,
            name: file.name,
            type: file.type,
            size: file.size,
            createdAt: Date.now(),
            synced: false,
            data: file
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const req = store.add(record);

            req.onsuccess = () => resolve(id);
            req.onerror = () => reject(req.error);
        });
    }

    public async getFile(id: string): Promise<LocalFile | null> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.get(id);

            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    public async listFiles(): Promise<Omit<LocalFile, 'data'>[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.getAll();

            req.onsuccess = () => {
                // Return metadata only to save memory
                const records = req.result as LocalFile[];
                resolve(records.map(({ data, ...meta }) => meta));
            };
            req.onerror = () => reject(req.error);
        });
    }

    public async deleteFile(id: string): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const req = store.delete(id);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // Check if we have enough quota
    public async hasQuota(bytes: number): Promise<boolean> {
        if (!navigator.storage || !navigator.storage.estimate) return true; // Assume yes if API missing
        const estimate = await navigator.storage.estimate();
        const remaining = (estimate.quota || 0) - (estimate.usage || 0);
        return remaining > bytes;
    }
}

export const localStore = new LocalStore();
