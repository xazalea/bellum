
// HiberFile - Local Persistent Storage using IndexedDB
// Replaces Puter.js for file hosting

import { CompressionService } from '../nacho/storage/compression-service';

interface FileManifest {
    path: string;
    name: string;
    size: number;
    created: number;
    modified: number;
    is_dir: boolean;
    chunkSize: number;
    totalChunks: number;
    chunks: string[]; // Array of chunk keys
}

export class HiberFile {
  private dbName: string;
  private storeName = 'files';
  private chunkStoreName = 'chunks';
  private db: IDBDatabase | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private compressionService = CompressionService.getInstance();

  constructor(dbName: string = 'hiberfile-storage') {
      this.dbName = dbName;
      this.initPromise = this.ensureInitialized();
  }

  async ensureInitialized() {
    if (this.initialized) return;
    if (!this.initPromise) {
        this.initPromise = new Promise<void>((resolve, reject) => {
            if (typeof window === 'undefined') {
                resolve(); // Skip on server
                return;
            }
            const request = indexedDB.open(this.dbName, 2); // Bump version for new store
            request.onerror = () => {
                console.error('HiberFile DB Error:', request.error);
                resolve();
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'path' });
                }
                if (!db.objectStoreNames.contains(this.chunkStoreName)) {
                    db.createObjectStore(this.chunkStoreName, { keyPath: 'key' });
                }
            };
        });
    }
    return this.initPromise;
  }

  private async batchProcess<T, R>(items: T[], batchSize: number, processFn: (item: T) => Promise<R>): Promise<R[]> {
      const results: R[] = [];
      for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map(processFn));
          results.push(...batchResults);
      }
      return results;
  }

  async writeFile(path: string, content: string | Blob | ArrayBuffer | Uint8Array, options: { compress?: boolean } = { compress: true }) {
    await this.ensureInitialized();
    if (!this.db) throw new Error('DB not initialized');

    path = path.startsWith('/') ? path.substring(1) : path;
    
    // Normalize content to Blob
    let blob: Blob;
    if (content instanceof Blob) {
        blob = content;
    } else {
        blob = new Blob([content as any]);
    }

    // Chunking configuration
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
    const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
    const chunkKeys: string[] = [];

    // Prepare chunks
    const chunksToProcess = [];
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, blob.size);
        chunksToProcess.push({ index: i, chunk: blob.slice(start, end) });
    }

    // Process chunks in batches to prevent transaction overload
    await this.batchProcess(chunksToProcess, 5, async ({ index, chunk }) => {
        let finalChunk = chunk;
        let compressionMethod = 'none';
        
        if (options.compress) {
            const arrayBuffer = await chunk.arrayBuffer();
            const { data, method } = await this.compressionService.compress(new Uint8Array(arrayBuffer), path);
            // @ts-ignore - ArrayBufferLike strictness
            finalChunk = new Blob([data]);
            compressionMethod = method;
        }

        const chunkKey = `${path}_chunk_${index}`;
        chunkKeys[index] = chunkKey; // Store in order

        // New Transaction per chunk
        return new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction(this.chunkStoreName, 'readwrite');
            const store = tx.objectStore(this.chunkStoreName);
            const req = store.put({
                key: chunkKey,
                content: finalChunk,
                compressed: options.compress,
                compressionMethod 
            });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    });

    // Save Manifest
    const manifest: FileManifest = {
        path,
        name: path.split('/').pop() || path,
        size: blob.size,
        created: Date.now(),
        modified: Date.now(),
        is_dir: false,
        chunkSize: CHUNK_SIZE,
        totalChunks,
        chunks: chunkKeys
    };

    return new Promise<any>((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const fileStore = tx.objectStore(this.storeName);
      const request = fileStore.put(manifest);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve({ path });
    });
  }

  async readFile(path: string): Promise<Blob> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('DB not initialized');

    path = path.startsWith('/') ? path.substring(1) : path;
    
    // Transaction 1: Get Manifest
    const manifest = await new Promise<FileManifest>((resolve, reject) => {
        const tx = this.db!.transaction(this.storeName, 'readonly');
        const fileStore = tx.objectStore(this.storeName);
        const req = fileStore.get(path);
        req.onsuccess = () => req.result ? resolve(req.result) : reject(new Error(`File not found: ${path}`));
        req.onerror = () => reject(req.error);
    });

    if (manifest.is_dir) throw new Error('Cannot read directory');

    // Reassemble - Fetch in batches to avoid opening too many transactions
    // 1. Fetch all chunk data
    const chunkDataList = await this.batchProcess(manifest.chunks, 10, async (chunkKey) => {
        return new Promise<any>((resolve, reject) => {
            const tx = this.db!.transaction(this.chunkStoreName, 'readonly');
            const store = tx.objectStore(this.chunkStoreName);
            const req = store.get(chunkKey);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    });

    const chunks: Blob[] = [];

    // 2. Process/Decompress
    for (let i = 0; i < chunkDataList.length; i++) {
        const chunkData = chunkDataList[i];
        if (!chunkData) throw new Error(`Chunk missing: ${manifest.chunks[i]}`);

        if (chunkData.compressed) {
            const method = chunkData.compressionMethod || 'gzip'; 
            const arrayBuffer = await (chunkData.content as Blob).arrayBuffer();
            const decompressed = await this.compressionService.decompress(new Uint8Array(arrayBuffer), method as any);
            // @ts-ignore 
            chunks.push(new Blob([decompressed]));
        } else {
            chunks.push(chunkData.content);
        }
    }

    return new Blob(chunks);
  }
  
    // Optimized lazy chunk reader for the Engine
    async readChunk(path: string, offset: number, length: number): Promise<ArrayBuffer> {
        await this.ensureInitialized();
        if (!this.db) throw new Error('DB not initialized');

        path = path.startsWith('/') ? path.substring(1) : path;
        
        // Get Manifest
        const manifest = await new Promise<FileManifest>((resolve, reject) => {
             const tx = this.db!.transaction(this.storeName, 'readonly');
             const store = tx.objectStore(this.storeName);
            const req = store.get(path);
            req.onsuccess = () => req.result ? resolve(req.result) : reject(new Error(`File not found: ${path}`));
            req.onerror = () => reject(req.error);
        });

        // Calculate which chunks cover the requested range
        const startChunkIndex = Math.floor(offset / manifest.chunkSize);
        const endChunkIndex = Math.floor((offset + length - 1) / manifest.chunkSize);
        
        const loadedChunks: Blob[] = [];
        
        // 1. Fetch necessary chunks (raw)
        const requiredChunkKeys = [];
        for (let i = startChunkIndex; i <= endChunkIndex; i++) {
            if (i < manifest.chunks.length) {
                requiredChunkKeys.push(manifest.chunks[i]);
            }
        }

        // Fetch in batches
        const rawChunks = await this.batchProcess(requiredChunkKeys, 5, async (key) => {
             return new Promise<any>((resolve, reject) => {
                const tx = this.db!.transaction(this.chunkStoreName, 'readonly');
                const store = tx.objectStore(this.chunkStoreName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        });
        
        // 2. Decompress/Process
        for (const chunkData of rawChunks) {
            let blob = chunkData.content;
            if (chunkData.compressed) {
                // @ts-ignore 
                blob = await this.compressionService.decompress(new Uint8Array(await blob.arrayBuffer()), chunkData.compressionMethod || 'gzip');
                // @ts-ignore 
                blob = new Blob([blob]);
            }
            loadedChunks.push(blob);
        }

        // Combine necessary chunks
        const combinedBlob = new Blob(loadedChunks);
        
        // Slice the exact requested byte range relative to the start of the first loaded chunk
        const relativeOffset = offset % manifest.chunkSize;
        const slice = combinedBlob.slice(relativeOffset, relativeOffset + length);
        
        return await slice.arrayBuffer();
    }

  async readFileAsText(path: string): Promise<string> {
    const blob = await this.readFile(path);
    return await blob.text();
  }

  async readFileAsArrayBuffer(path: string): Promise<ArrayBuffer> {
    const blob = await this.readFile(path);
    return await blob.arrayBuffer();
  }

  async deleteFile(path: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('DB not initialized');

    path = path.startsWith('/') ? path.substring(1) : path;
    
    try {
        const manifest = await new Promise<FileManifest>((resolve, reject) => {
            const tx = this.db!.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.get(path);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (manifest && manifest.chunks) {
             // Batch delete chunks
             await this.batchProcess(manifest.chunks, 20, async (key) => {
                 return new Promise<void>((resolve) => {
                    const tx = this.db!.transaction(this.chunkStoreName, 'readwrite');
                    const chunkStore = tx.objectStore(this.chunkStoreName);
                    const req = chunkStore.delete(key);
                    req.onsuccess = () => resolve();
                 });
             });
        }
    } catch (e) {
        console.warn('Error cleaning up chunks:', e);
    }

    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const fileStore = tx.objectStore(this.storeName);
      const request = fileStore.delete(path);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
    
  // ... (rest of methods like createDirectory, listDirectory remain unchanged as they are single transactions)
  
  async createDirectory(path: string): Promise<void> {
      await this.ensureInitialized();
      if (!this.db) throw new Error('DB not initialized');

      path = path.startsWith('/') ? path.substring(1) : path;
      return new Promise<void>((resolve, reject) => {
          const tx = this.db!.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const request = store.put({
              path,
              is_dir: true,
              modified: Date.now(),
              created: Date.now(),
              name: path.split('/').pop() || path,
              size: 0
          });
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
      });
  }

  async listDirectory(path: string): Promise<Array<{ name: string; path: string; is_dir: boolean }>> {
      await this.ensureInitialized();
      if (!this.db) throw new Error('DB not initialized');

      path = path.startsWith('/') ? path.substring(1) : path;
      return new Promise<any[]>((resolve, reject) => {
          const tx = this.db!.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const request = store.getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
              const all = request.result as any[];
              const files = all.filter(f => {
                  if (path === '' || path === '/') return !f.path.includes('/'); 
                  if (!f.path.startsWith(path + '/')) return false;
                  const relative = f.path.slice(path.length + 1);
                  return !relative.includes('/');
              }).map(f => ({
                  name: f.name,
                  path: f.path,
                  is_dir: f.is_dir || false
              }));
              resolve(files);
          };
      });
  }

  async getFileInfo(path: string): Promise<{ name: string; size: number; path: string; is_dir: boolean; created: number; modified: number }> {
      await this.ensureInitialized();
      if (!this.db) throw new Error('DB not initialized');

      path = path.startsWith('/') ? path.substring(1) : path;
      return new Promise<any>((resolve, reject) => {
          const tx = this.db!.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const request = store.get(path);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
              if (request.result) {
                  const { name, size, path, is_dir, created, modified } = request.result;
                  resolve({ name, size, path, is_dir, created, modified });
              }
              else reject(new Error('File not found'));
          };
      });
  }

  async getReadURL(path: string): Promise<string> {
      const blob = await this.readFile(path);
      return URL.createObjectURL(blob);
  }
    
  async fileExists(path: string): Promise<boolean> {
      try {
          await this.getFileInfo(path);
          return true;
      } catch {
          return false;
      }
  }

  async copyFile(src: string, dest: string): Promise<void> {
      const content = await this.readFile(src);
      await this.writeFile(dest, content);
  }

  async moveFile(src: string, dest: string): Promise<void> {
      await this.copyFile(src, dest);
      await this.deleteFile(src);
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
      await this.moveFile(oldPath, newPath);
  }

  async uploadFiles(files: FileList | File[]): Promise<Array<{ name: string; size: number; path: string }>> {
      return this.uploadWithProgress(files, () => {});
  }

  async streamFile(
    path: string,
    onChunk: (chunk: ArrayBuffer, progress: number) => void,
    chunkSize: number = 1024 * 1024
  ): Promise<void> {
    const blob = await this.readFile(path);
    const buffer = await blob.arrayBuffer();
    const total = buffer.byteLength;
    
    for (let i = 0; i < total; i += chunkSize) {
        const chunk = buffer.slice(i, Math.min(i + chunkSize, total));
        const progress = ((i + chunk.byteLength) / total) * 100;
        onChunk(chunk, progress);
        // yield to event loop
        await new Promise(r => setTimeout(r, 0));
    }
  }

  async uploadWithProgress(
    files: FileList | File[],
    onProgress: (progress: number, file: string) => void
  ): Promise<Array<{ name: string; size: number; path: string }>> {
    const fileArray = Array.from(files);
    const results = [];
    const totalSize = fileArray.reduce((acc, f) => acc + f.size, 0);
    let uploaded = 0;

    for (const file of fileArray) {
        await this.writeFile(file.name, file);
        uploaded += file.size;
        onProgress((uploaded / totalSize) * 100, file.name);
        results.push({
            name: file.name,
            size: file.size,
            path: file.name
        });
    }
    return results;
  }

  // UI Helpers
  async showOpenFilePicker(): Promise<{ read: () => Promise<Blob>; path: string }> {
      return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.onchange = async () => {
              if (input.files && input.files[0]) {
                  const file = input.files[0];
                  const path = file.name;
                  await this.writeFile(path, file);
                  resolve({
                      read: () => Promise.resolve(file),
                      path
                  });
              } else {
                  reject(new Error('No file selected'));
              }
          };
          input.click();
      });
  }

  async showSaveFilePicker(content: string | Blob, filename: string): Promise<{ path: string }> {
      await this.writeFile(filename, content);
      return { path: filename };
  }
}

export const hiberFile = new HiberFile();
export const puterClient = hiberFile;
