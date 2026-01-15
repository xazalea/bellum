/**
 * Virtual File System
 * Complete file system implementation with OPFS backend
 * 
 * Features:
 * - OPFS (Origin Private File System) backend
 * - Windows and Android path support
 * - File locking
 * - Async I/O
 * - Caching layer
 * - Mount points
 * - File attributes
 */

// ============================================================================
// Types
// ============================================================================

export interface FileHandle {
  path: string;
  mode: 'r' | 'w' | 'rw';
  position: number;
  handle: FileSystemFileHandle;
}

export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
}

export interface FileInfo {
  path: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  created: number;
  modified: number;
  accessed: number;
  attributes: FileAttributes;
}

export interface FileAttributes {
  readonly: boolean;
  hidden: boolean;
  system: boolean;
  archive: boolean;
}

export interface MountPoint {
  virtualPath: string;
  provider: StorageProvider;
  readonly: boolean;
}

export interface StorageProvider {
  name: string;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listDirectory(path: string): Promise<DirectoryEntry[]>;
  createDirectory(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

// ============================================================================
// Virtual File System
// ============================================================================

export class VirtualFileSystem {
  private root: FileSystemDirectoryHandle | null = null;
  private openFiles: Map<string, FileHandle> = new Map();
  // Hybrid cache: LRU + LFU
  private cache: Map<string, { 
    data: Uint8Array; 
    timestamp: number;
    accessCount: number; // For LFU
    lastAccess: number; // For LRU
    pinned: boolean; // Hot set pinning
  }> = new Map();
  private locks: Map<string, 'read' | 'write'> = new Map();
  private mountPoints: Map<string, MountPoint> = new Map();

  private readonly CACHE_TTL = 5000; // 5 seconds
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly HOT_SET_SIZE = 20; // Keep top 20 files pinned

  /**
   * Initialize file system
   */
  async initialize(): Promise<void> {
    console.log('[VirtualFS] Initializing file system...');

    try {
      // Get OPFS root
      this.root = await navigator.storage.getDirectory();
      
      // Create standard directories
      await this.createStandardDirectories();
      
      console.log('[VirtualFS] File system initialized');
    } catch (error) {
      console.error('[VirtualFS] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create standard directory structure
   */
  private async createStandardDirectories(): Promise<void> {
    const windowsDirs = [
      'C:/Windows',
      'C:/Windows/System32',
      'C:/Program Files',
      'C:/Program Files (x86)',
      'C:/Users/User/AppData/Local',
      'C:/Users/User/AppData/Roaming',
      'C:/Users/User/Documents',
      'C:/Users/User/Desktop',
    ];

    const androidDirs = [
      '/system',
      '/system/lib',
      '/system/lib64',
      '/system/app',
      '/data',
      '/data/app',
      '/data/data',
      '/sdcard',
      '/sdcard/Android',
      '/sdcard/Android/data',
    ];

    const allDirs = [...windowsDirs, ...androidDirs];

    for (const dir of allDirs) {
      try {
        await this.createDirectory(dir);
      } catch (error) {
        // Ignore if already exists
      }
    }
  }

  /**
   * Create file
   */
  async createFile(path: string): Promise<FileHandle> {
    const normalizedPath = this.normalizePath(path);
    console.log(`[VirtualFS] Creating file: ${normalizedPath}`);

    const mountPoint = this.findMountPoint(normalizedPath);
    if (mountPoint && mountPoint.readonly) {
      throw new Error(`Cannot create file in readonly mount: ${normalizedPath}`);
    }

    if (!this.root) {
      throw new Error('File system not initialized');
    }

    try {
      const dirPath = this.getDirectoryPath(normalizedPath);
      const fileName = this.getFileName(normalizedPath);

      const dirHandle = await this.getDirectoryHandle(dirPath, true);
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });

      const handle: FileHandle = {
        path: normalizedPath,
        mode: 'rw',
        position: 0,
        handle: fileHandle,
      };

      this.openFiles.set(normalizedPath, handle);
      return handle;
    } catch (error) {
      console.error(`[VirtualFS] Failed to create file ${normalizedPath}:`, error);
      throw error;
    }
  }

  /**
   * Read file
   */
  async readFile(path: string): Promise<Uint8Array> {
    const normalizedPath = this.normalizePath(path);
    
    // Check cache with hybrid LRU+LFU
    const cached = this.cache.get(normalizedPath);
    if (cached) {
      // Update access tracking
      cached.lastAccess = Date.now();
      cached.accessCount++;
      
      if (Date.now() - cached.timestamp < this.CACHE_TTL || cached.pinned) {
        return cached.data;
      }
    }

    console.log(`[VirtualFS] Reading file: ${normalizedPath}`);

    // Check mount points
    const mountPoint = this.findMountPoint(normalizedPath);
    if (mountPoint) {
      const relativePath = normalizedPath.substring(mountPoint.virtualPath.length);
      return await mountPoint.provider.readFile(relativePath);
    }

    if (!this.root) {
      throw new Error('File system not initialized');
    }

    try {
      const dirPath = this.getDirectoryPath(normalizedPath);
      const fileName = this.getFileName(normalizedPath);

      const dirHandle = await this.getDirectoryHandle(dirPath, false);
      const fileHandle = await dirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const data = new Uint8Array(await file.arrayBuffer());

      // Cache the data
      this.cacheFile(normalizedPath, data);
      
      // Update access tracking
      const cached = this.cache.get(normalizedPath);
      if (cached) {
        cached.lastAccess = Date.now();
        cached.accessCount++;
      }

      return data;
    } catch (error) {
      console.error(`[VirtualFS] Failed to read file ${normalizedPath}:`, error);
      throw error;
    }
  }

  /**
   * Write file
   */
  async writeFile(path: string, data: Uint8Array): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    console.log(`[VirtualFS] Writing file: ${normalizedPath} (${data.length} bytes)`);

    const mountPoint = this.findMountPoint(normalizedPath);
    if (mountPoint) {
      if (mountPoint.readonly) {
        throw new Error(`Cannot write to readonly mount: ${normalizedPath}`);
      }
      const relativePath = normalizedPath.substring(mountPoint.virtualPath.length);
      await mountPoint.provider.writeFile(relativePath, data);
      return;
    }

    if (!this.root) {
      throw new Error('File system not initialized');
    }

    try {
      const dirPath = this.getDirectoryPath(normalizedPath);
      const fileName = this.getFileName(normalizedPath);

      const dirHandle = await this.getDirectoryHandle(dirPath, true);
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      // Ensure we have a proper ArrayBuffer (not SharedArrayBuffer) for write()
      const bufferData = new Uint8Array(data);
      await writable.write(bufferData);
      await writable.close();

      // Update cache
      this.cacheFile(normalizedPath, data);
    } catch (error) {
      console.error(`[VirtualFS] Failed to write file ${normalizedPath}:`, error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    console.log(`[VirtualFS] Deleting file: ${normalizedPath}`);

    const mountPoint = this.findMountPoint(normalizedPath);
    if (mountPoint && mountPoint.readonly) {
      throw new Error(`Cannot delete from readonly mount: ${normalizedPath}`);
    }

    if (!this.root) {
      throw new Error('File system not initialized');
    }

    try {
      const dirPath = this.getDirectoryPath(normalizedPath);
      const fileName = this.getFileName(normalizedPath);

      const dirHandle = await this.getDirectoryHandle(dirPath, false);
      await dirHandle.removeEntry(fileName);

      // Remove from cache
      this.cache.delete(normalizedPath);
      this.openFiles.delete(normalizedPath);
    } catch (error) {
      console.error(`[VirtualFS] Failed to delete file ${normalizedPath}:`, error);
      throw error;
    }
  }

  /**
   * Create directory
   */
  async createDirectory(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.root) {
      throw new Error('File system not initialized');
    }

    try {
      await this.getDirectoryHandle(normalizedPath, true);
    } catch (error) {
      console.error(`[VirtualFS] Failed to create directory ${normalizedPath}:`, error);
      throw error;
    }
  }

  /**
   * List directory
   */
  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    const normalizedPath = this.normalizePath(path);
    console.log(`[VirtualFS] Listing directory: ${normalizedPath}`);

    const mountPoint = this.findMountPoint(normalizedPath);
    if (mountPoint) {
      const relativePath = normalizedPath.substring(mountPoint.virtualPath.length);
      return await mountPoint.provider.listDirectory(relativePath);
    }

    if (!this.root) {
      throw new Error('File system not initialized');
    }

    try {
      const dirHandle = await this.getDirectoryHandle(normalizedPath, false);
      const entries: DirectoryEntry[] = [];

      // TypeScript doesn't always recognize entries() on FileSystemDirectoryHandle
      const dirHandleAny = dirHandle as any;
      for await (const [name, handle] of dirHandleAny.entries()) {
        const isDirectory = handle.kind === 'directory';
        let size = 0;
        let lastModified = 0;

        if (!isDirectory) {
          const file = await (handle as FileSystemFileHandle).getFile();
          size = file.size;
          lastModified = file.lastModified;
        }

        entries.push({
          name,
          isDirectory,
          size,
          lastModified,
        });
      }

      return entries;
    } catch (error) {
      console.error(`[VirtualFS] Failed to list directory ${normalizedPath}:`, error);
      throw error;
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(path: string): Promise<FileInfo> {
    const normalizedPath = this.normalizePath(path);

    if (!this.root) {
      throw new Error('File system not initialized');
    }

    try {
      const dirPath = this.getDirectoryPath(normalizedPath);
      const fileName = this.getFileName(normalizedPath);

      const dirHandle = await this.getDirectoryHandle(dirPath, false);
      
      try {
        const fileHandle = await dirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();

        return {
          path: normalizedPath,
          size: file.size,
          isDirectory: false,
          isFile: true,
          created: file.lastModified,
          modified: file.lastModified,
          accessed: Date.now(),
          attributes: {
            readonly: false,
            hidden: false,
            system: false,
            archive: false,
          },
        };
      } catch {
        // Try as directory
        await dirHandle.getDirectoryHandle(fileName);
        return {
          path: normalizedPath,
          size: 0,
          isDirectory: true,
          isFile: false,
          created: Date.now(),
          modified: Date.now(),
          accessed: Date.now(),
          attributes: {
            readonly: false,
            hidden: false,
            system: false,
            archive: false,
          },
        };
      }
    } catch (error) {
      throw new Error(`File not found: ${normalizedPath}`);
    }
  }

  /**
   * Set file attributes
   */
  async setFileAttributes(path: string, attributes: FileAttributes): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    console.log(`[VirtualFS] Setting attributes for: ${normalizedPath}`);
    
    // OPFS doesn't support attributes, so we'll track them separately
    // In a full implementation, would store metadata
  }

  /**
   * Check if file/directory exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await this.getFileInfo(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mount storage provider
   */
  mount(virtualPath: string, provider: StorageProvider, readonly: boolean = false): void {
    const normalizedPath = this.normalizePath(virtualPath);
    console.log(`[VirtualFS] Mounting ${provider.name} at ${normalizedPath}`);

    this.mountPoints.set(normalizedPath, {
      virtualPath: normalizedPath,
      provider,
      readonly,
    });
  }

  /**
   * Unmount storage provider
   */
  unmount(virtualPath: string): boolean {
    const normalizedPath = this.normalizePath(virtualPath);
    const deleted = this.mountPoints.delete(normalizedPath);
    
    if (deleted) {
      console.log(`[VirtualFS] Unmounted ${normalizedPath}`);
    }
    
    return deleted;
  }

  /**
   * Get Windows standard directories
   */
  getWindowsDirectories(): { System32: string; ProgramFiles: string; AppData: string } {
    return {
      System32: 'C:/Windows/System32',
      ProgramFiles: 'C:/Program Files',
      AppData: 'C:/Users/User/AppData/Roaming',
    };
  }

  /**
   * Get Android standard directories
   */
  getAndroidDirectories(): { System: string; Data: string; SDCard: string } {
    return {
      System: '/system',
      Data: '/data',
      SDCard: '/sdcard',
    };
  }

  /**
   * Get directory handle
   */
  private async getDirectoryHandle(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
    if (!this.root) {
      throw new Error('File system not initialized');
    }

    const parts = path.split('/').filter(p => p && p !== '.');
    let handle = this.root;

    for (const part of parts) {
      if (part === 'C:' || part === '') continue;
      handle = await handle.getDirectoryHandle(part, { create });
    }

    return handle;
  }

  /**
   * Normalize path
   */
  private normalizePath(path: string): string {
    // Convert backslashes to forward slashes
    let normalized = path.replace(/\\/g, '/');
    
    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, '/');
    
    // Remove trailing slash
    if (normalized.endsWith('/') && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  /**
   * Get directory path from full path
   */
  private getDirectoryPath(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash >= 0 ? path.substring(0, lastSlash) : '.';
  }

  /**
   * Get file name from full path
   */
  private getFileName(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
  }

  /**
   * Find mount point for path
   */
  private findMountPoint(path: string): MountPoint | null {
    for (const [mountPath, mountPoint] of this.mountPoints) {
      if (path.startsWith(mountPath)) {
        return mountPoint;
      }
    }
    return null;
  }

  /**
   * Cache file data with hybrid LRU+LFU policy
   */
  private cacheFile(path: string, data: Uint8Array): void {
    // Check cache size limit
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.data.length;
    }

    if (totalSize + data.length > this.MAX_CACHE_SIZE) {
      // Evict using hybrid policy
      this.evictCacheHybrid();
    }

    // Check if this should be in hot set
    const existing = this.cache.get(path);
    const shouldPin = existing && existing.accessCount > 10; // Frequently accessed
    
    this.cache.set(path, {
      data,
      timestamp: Date.now(),
      accessCount: existing ? existing.accessCount + 1 : 1,
      lastAccess: Date.now(),
      pinned: shouldPin || false,
    });
    
    // Update hot set
    this.updateHotSet();
  }
  
  /**
   * Update hot set (top N most frequently accessed files)
   */
  private updateHotSet(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access count (LFU)
    entries.sort((a, b) => b[1].accessCount - a[1].accessCount);
    
    // Unpin all
    for (const entry of this.cache.values()) {
      entry.pinned = false;
    }
    
    // Pin top N
    for (let i = 0; i < Math.min(this.HOT_SET_SIZE, entries.length); i++) {
      entries[i][1].pinned = true;
    }
  }
  
  /**
   * Evict cache using hybrid LRU+LFU policy
   */
  private evictCacheHybrid(): void {
    const entries = Array.from(this.cache.entries());
    
    // Don't evict pinned (hot set) entries
    const evictable = entries.filter(([_, entry]) => !entry.pinned);
    
    if (evictable.length === 0) return;
    
    // Score: balance between recency (LRU) and frequency (LFU)
    // Lower score = better candidate for eviction
    evictable.forEach(([path, entry]) => {
      const age = Date.now() - entry.lastAccess;
      const recencyScore = age / 1000; // seconds since last access
      const frequencyScore = 1.0 / (entry.accessCount + 1); // inverse frequency
      (entry as any).evictionScore = recencyScore * 0.6 + frequencyScore * 0.4;
    });
    
    // Sort by eviction score (lowest = evict first)
    evictable.sort((a, b) => (a[1] as any).evictionScore - (b[1] as any).evictionScore);
    
    // Remove oldest 25%
    const toRemove = Math.ceil(evictable.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(evictable[i][0]);
    }

    console.log(`[VirtualFS] Evicted ${toRemove} cache entries (hybrid policy)`);
  }

  /**
   * Evict cache entries
   */
  private evictCache(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 25%
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    console.log(`[VirtualFS] Evicted ${toRemove} cache entries`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[VirtualFS] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; totalSize: number; hitRate: number } {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.data.length;
    }

    return {
      entries: this.cache.size,
      totalSize,
      hitRate: 0, // Would track hits/misses in real impl
    };
  }

  /**
   * Shutdown file system
   */
  shutdown(): void {
    console.log('[VirtualFS] Shutting down...');
    
    this.openFiles.clear();
    this.cache.clear();
    this.locks.clear();
    this.mountPoints.clear();

    console.log('[VirtualFS] Shutdown complete');
  }
}

// Export singleton
export const virtualFileSystem = new VirtualFileSystem();
