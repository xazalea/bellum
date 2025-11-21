/**
 * Puter.js Cloud Storage Client
 * Handles all cloud storage operations for VM files
 */

declare global {
  interface Window {
    puter?: {
      fs: {
        write: (path: string, content: string | Blob, options?: { dedupeName?: boolean; createMissingParents?: boolean }) => Promise<any>;
        read: (path: string) => Promise<Blob>;
        readdir: (path: string) => Promise<Array<{ name: string; path: string; is_dir: boolean }>>;
        mkdir: (path: string) => Promise<any>;
        stat: (path: string) => Promise<{ name: string; size: number; path: string; is_dir: boolean; created: number; modified: number }>;
        delete: (path: string) => Promise<void>;
        copy: (src: string, dest: string) => Promise<void>;
        move: (src: string, dest: string) => Promise<void>;
        rename: (oldPath: string, newPath: string) => Promise<void>;
        upload: (files: FileList | File[]) => Promise<Array<{ name: string; size: number; path: string }>>;
        getReadURL: (path: string) => Promise<string>;
      };
      ui: {
        showOpenFilePicker: () => Promise<{ read: () => Promise<Blob>; path: string }>;
        showSaveFilePicker: (content: string | Blob, filename: string) => Promise<{ path: string }>;
      };
      print: (message: string) => void;
    };
  }
}

export class PuterClient {
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    return new Promise((resolve, reject) => {
      if (window.puter) {
        this.initialized = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      script.onload = () => {
        // Wait a bit for puter to be available
        const checkPuter = setInterval(() => {
          if (window.puter) {
            this.initialized = true;
            clearInterval(checkPuter);
            resolve();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkPuter);
          if (!this.initialized) {
            reject(new Error('Puter.js failed to initialize'));
          }
        }, 5000);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Puter.js'));
      };
      document.head.appendChild(script);
    });
  }

  async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  async writeFile(path: string, content: string | Blob, options?: { dedupeName?: boolean; createMissingParents?: boolean }): Promise<any> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.fs.write(path, content, options);
  }

  async readFile(path: string): Promise<Blob> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.fs.read(path);
  }

  async readFileAsText(path: string): Promise<string> {
    const blob = await this.readFile(path);
    return await blob.text();
  }

  async readFileAsArrayBuffer(path: string): Promise<ArrayBuffer> {
    const blob = await this.readFile(path);
    return await blob.arrayBuffer();
  }

  async listDirectory(path: string): Promise<Array<{ name: string; path: string; is_dir: boolean }>> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.fs.readdir(path);
  }

  async createDirectory(path: string): Promise<void> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    await window.puter.fs.mkdir(path);
  }

  async getFileInfo(path: string): Promise<{ name: string; size: number; path: string; is_dir: boolean; created: number; modified: number }> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.fs.stat(path);
  }

  async deleteFile(path: string): Promise<void> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    await window.puter.fs.delete(path);
  }

  async copyFile(src: string, dest: string): Promise<void> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    await window.puter.fs.copy(src, dest);
  }

  async moveFile(src: string, dest: string): Promise<void> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    await window.puter.fs.move(src, dest);
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    await window.puter.fs.rename(oldPath, newPath);
  }

  async uploadFiles(files: FileList | File[]): Promise<Array<{ name: string; size: number; path: string }>> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.fs.upload(files);
  }

  async getReadURL(path: string): Promise<string> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.fs.getReadURL(path);
  }

  /**
   * Stream a large file in chunks
   */
  async streamFile(
    path: string,
    onChunk: (chunk: ArrayBuffer, progress: number) => void,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): Promise<void> {
    await this.ensureInitialized();
    
    const fileInfo = await this.getFileInfo(path);
    const totalSize = fileInfo.size;
    let loaded = 0;

    // Read file in chunks
    // Note: Puter.js doesn't have native streaming, so we'll read the whole file
    // and process it in chunks
    const blob = await this.readFile(path);
    const arrayBuffer = await blob.arrayBuffer();

    // Process in chunks
    for (let offset = 0; offset < arrayBuffer.byteLength; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, arrayBuffer.byteLength);
      const chunk = arrayBuffer.slice(offset, end);
      loaded += chunk.byteLength;
      const progress = (loaded / totalSize) * 100;
      onChunk(chunk, progress);
    }
  }

  /**
   * Upload a large file with progress tracking
   */
  async uploadWithProgress(
    files: FileList | File[],
    onProgress: (progress: number, file: string) => void
  ): Promise<Array<{ name: string; size: number; path: string }>> {
    await this.ensureInitialized();
    
    const fileArray = Array.from(files);
    const results: Array<{ name: string; size: number; path: string }> = [];
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    let uploaded = 0;

    for (const file of fileArray) {
      try {
        await this.writeFile(file.name, file, { createMissingParents: true });
        uploaded += file.size;
        const progress = (uploaded / totalSize) * 100;
        onProgress(progress, file.name);
        
        const fileInfo = await this.getFileInfo(file.name);
        results.push({
          name: file.name,
          size: fileInfo.size,
          path: fileInfo.path,
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Check if a file exists
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await this.getFileInfo(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  async showOpenFilePicker(): Promise<{ read: () => Promise<Blob>; path: string }> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.ui.showOpenFilePicker();
  }

  async showSaveFilePicker(content: string | Blob, filename: string): Promise<{ path: string }> {
    await this.ensureInitialized();
    if (!window.puter) {
      throw new Error('Puter.js is not available');
    }
    return await window.puter.ui.showSaveFilePicker(content, filename);
  }
}

// Singleton instance
export const puterClient = new PuterClient();

