
// HiberFile - Local Persistent Storage using IndexedDB
// Replaces Puter.js for file hosting

import { CompressionService } from './compression';

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

  constructor(dbName: string = 'hiberfile-storage') {
      this.dbName = dbName;
      this.initPromise = this.ensureInitialized();
  }

  async ensureInitialized() {
    if (this.initialized) return;
    return new Promise<void>((resolve, reject) => {
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

  private async getStore(storeName: string, mode: IDBTransactionMode) {
    await this.initPromise;
    if (!this.db) throw new Error('HiberFile DB not initialized');
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  async writeFile(path: string, content: string | Blob | ArrayBuffer | Uint8Array, options: { compress?: boolean } = { compress: true }) {
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

    const chunkStore = await this.getStore(this.chunkStoreName, 'readwrite');
    const fileStore = await this.getStore(this.storeName, 'readwrite');

    // Process chunks
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, blob.size);
        const chunkBlob = blob.slice(start, end);
        
        // Compress chunk if requested
        let finalChunk = chunkBlob;
        if (options.compress) {
            finalChunk = await CompressionService.compress(chunkBlob);
        }

        // Generate key (simple content hash would be better for dedup, but path+index is safer for now)
        const chunkKey = `${path}_chunk_${i}`;
        chunkKeys.push(chunkKey);

        await new Promise<void>((resolve, reject) => {
            const req = chunkStore.put({
                key: chunkKey,
                content: finalChunk,
                compressed: options.compress
            });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

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
      const request = fileStore.put(manifest);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve({ path });
    });
  }

  async readFile(path: string): Promise<Blob> {
    path = path.startsWith('/') ? path.substring(1) : path;
    const fileStore = await this.getStore(this.storeName, 'readonly');
    
    const manifest = await new Promise<FileManifest>((resolve, reject) => {
        const req = fileStore.get(path);
        req.onsuccess = () => req.result ? resolve(req.result) : reject(new Error(`File not found: ${path}`));
        req.onerror = () => reject(req.error);
    });

    if (manifest.is_dir) throw new Error('Cannot read directory');

    // Reassemble
    const chunkStore = await this.getStore(this.chunkStoreName, 'readonly');
    const chunks: Blob[] = [];

    for (const chunkKey of manifest.chunks) {
        const chunkData = await new Promise<any>((resolve, reject) => {
            const req = chunkStore.get(chunkKey);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!chunkData) throw new Error(`Chunk missing: ${chunkKey}`);

        if (chunkData.compressed) {
            chunks.push(await CompressionService.decompress(chunkData.content));
        } else {
            chunks.push(chunkData.content);
        }
    }

    return new Blob(chunks);
  }
  
  // Optimized lazy chunk reader for the Engine
  async readChunk(path: string, offset: number, length: number): Promise<ArrayBuffer> {
      path = path.startsWith('/') ? path.substring(1) : path;
      const fileStore = await this.getStore(this.storeName, 'readonly');
      
      // Get Manifest
      const manifest = await new Promise<FileManifest>((resolve, reject) => {
          const req = fileStore.get(path);
          req.onsuccess = () => req.result ? resolve(req.result) : reject(new Error(`File not found: ${path}`));
          req.onerror = () => reject(req.error);
      });

      // Calculate which chunks cover the requested range
      const startChunkIndex = Math.floor(offset / manifest.chunkSize);
      const endChunkIndex = Math.floor((offset + length - 1) / manifest.chunkSize);
      
      const chunkStore = await this.getStore(this.chunkStoreName, 'readonly');
      const loadedChunks: Blob[] = [];
      
      // Fetch only necessary chunks
      for (let i = startChunkIndex; i <= endChunkIndex; i++) {
          if (i >= manifest.chunks.length) break;
          
          const chunkKey = manifest.chunks[i];
          const chunkData = await new Promise<any>((resolve, reject) => {
              const req = chunkStore.get(chunkKey);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
          });

          let blob = chunkData.content;
          if (chunkData.compressed) {
              blob = await CompressionService.decompress(blob);
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
    path = path.startsWith('/') ? path.substring(1) : path;
    const fileStore = await this.getStore(this.storeName, 'readwrite');
    
    // Get manifest to delete chunks
    try {
        const manifest = await new Promise<FileManifest>((resolve, reject) => {
            const req = fileStore.get(path);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (manifest && manifest.chunks) {
            const chunkStore = await this.getStore(this.chunkStoreName, 'readwrite');
            await Promise.all(manifest.chunks.map(key => new Promise<void>((resolve) => {
                const req = chunkStore.delete(key);
                req.onsuccess = () => resolve();
            })));
        }
    } catch (e) {
        console.warn('Error cleaning up chunks:', e);
    }

    return new Promise<void>((resolve, reject) => {
      const request = fileStore.delete(path);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
    
  async createDirectory(path: string): Promise<void> {
      path = path.startsWith('/') ? path.substring(1) : path;
      const store = await this.getStore('readwrite');
      return new Promise<void>((resolve, reject) => {
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
      path = path.startsWith('/') ? path.substring(1) : path;
      const store = await this.getStore('readonly');
      return new Promise<any[]>((resolve, reject) => {
          const request = store.getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
              const all = request.result as any[];
              // Simple prefix matching for simulated folder structure
              // Direct children only
              const files = all.filter(f => {
                  if (path === '' || path === '/') return !f.path.includes('/'); // Root
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
      path = path.startsWith('/') ? path.substring(1) : path;
      const store = await this.getStore('readonly');
      return new Promise<any>((resolve, reject) => {
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

  // UI Helpers - Replaces Puter UI
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
// Alias for compatibility during refactor
export const puterClient = hiberFile;
