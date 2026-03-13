/**
 * Binary Loader Service
 * Loads and caches PE (Windows EXE/DLL) and DEX (Android APK) binaries
 * 
 * Features:
 * - Automatic file type detection
 * - Binary caching for fast subsequent loads
 * - Dependency resolution
 * - Library loading
 */

import { PEParser, PEFile, LoadedPE } from '../transpiler/pe_parser';
import { DEXParser, DEXFile, DalvikClass } from '../transpiler/dex_parser';

// ============================================================================
// Types
// ============================================================================

export type FileType = 'PE' | 'DEX' | 'ELF' | 'APK' | 'UNKNOWN';

export interface LoadedBinary {
  type: FileType;
  path: string;
  data: ArrayBuffer;
  parsed: PEFile | DEXFile;
  loaded?: LoadedPE | null;
  dependencies: string[];
  loadedAt: number;
}

export interface BinaryCache {
  binary: LoadedBinary;
  lastAccessed: number;
  accessCount: number;
}

export interface LoadOptions {
  forceReload?: boolean;
  loadDependencies?: boolean;
  baseAddress?: number;
}

// ============================================================================
// Binary Loader
// ============================================================================

export class BinaryLoader {
  private cache: Map<string, BinaryCache> = new Map();
  private maxCacheSize: number = 100;
  private maxCacheAge: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Load executable file
   */
  async loadExecutable(path: string, options: LoadOptions = {}): Promise<LoadedBinary> {
    console.log(`[BinaryLoader] Loading executable: ${path}`);

    // Check cache first
    if (!options.forceReload) {
      const cached = this.getCachedBinary(path);
      if (cached) {
        console.log(`[BinaryLoader] Using cached binary: ${path}`);
        return cached;
      }
    }

    // Load binary data
    const data = await this.fetchBinary(path);
    const type = this.detectFileType(data);

    console.log(`[BinaryLoader] Detected file type: ${type}`);

    // Parse binary
    let parsed: PEFile | DEXFile;
    let dependencies: string[] = [];
    let loaded: LoadedPE | null = null;

    if (type === 'PE') {
      const parser = new PEParser(data);
      parsed = parser.parse();
      
      // Extract dependencies (imported DLLs)
      dependencies = (parsed as PEFile).imports.map(imp => imp.dll);
      
      // Load into memory
      const baseAddress = options.baseAddress || 0x400000;
      loaded = parser.loadIntoMemory(parsed as PEFile, baseAddress);
      parser.resolveImports(loaded, parsed as PEFile);
      
      console.log(`[BinaryLoader] PE loaded at 0x${baseAddress.toString(16)}, entry: 0x${loaded.entryPoint.toString(16)}`);
    } else if (type === 'DEX' || type === 'APK') {
      // APK files are ZIP containers; extract classes.dex or parse directly
      const dexData = type === 'APK' ? await this.extractDexFromApk(data) : data;
      const parser = new DEXParser(dexData);
      parsed = parser.parse();
      
      console.log(`[BinaryLoader] ${type} → DEX parsed: ${(parsed as DEXFile).classes.size} classes`);
    } else {
      throw new Error(`Unsupported file type: ${type}`);
    }

    const binary: LoadedBinary = {
      type,
      path,
      data,
      parsed,
      loaded,
      dependencies,
      loadedAt: Date.now(),
    };

    // Cache binary
    this.cacheBinary(path, binary);

    // Load dependencies if requested
    if (options.loadDependencies && dependencies.length > 0) {
      console.log(`[BinaryLoader] Loading ${dependencies.length} dependencies...`);
      for (const dep of dependencies) {
        await this.loadLibrary(dep, binary);
      }
    }

    return binary;
  }

  /**
   * Load library (DLL or shared library)
   */
  async loadLibrary(path: string, parent: LoadedBinary): Promise<LoadedBinary> {
    console.log(`[BinaryLoader] Loading library: ${path} (parent: ${parent.path})`);

    // Check if already loaded
    const cached = this.getCachedBinary(path);
    if (cached) {
      return cached;
    }

    // Resolve library path
    const resolvedPath = this.resolveLibraryPath(path, parent);
    
    try {
      return await this.loadExecutable(resolvedPath, { loadDependencies: false });
    } catch (error) {
      console.warn(`[BinaryLoader] Failed to load library ${path}:`, error);
      
      // Create stub binary for missing libraries
      return this.createStubLibrary(path, parent.type);
    }
  }

  /**
   * Extract classes.dex from an APK (ZIP) archive.
   * Uses a lightweight ZIP central-directory scan.
   */
  private async extractDexFromApk(apkBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    const data = new Uint8Array(apkBuffer);

    // Search for the local file header of classes.dex inside the ZIP.
    // ZIP local file header signature: PK\x03\x04
    // We look for a file named "classes.dex".
    const targetName = 'classes.dex';
    const targetBytes = new TextEncoder().encode(targetName);

    for (let i = 0; i < data.length - 30; i++) {
      // Local file header signature
      if (data[i] === 0x50 && data[i + 1] === 0x4B &&
          data[i + 2] === 0x03 && data[i + 3] === 0x04) {
        const nameLen = data[i + 26] | (data[i + 27] << 8);
        const extraLen = data[i + 28] | (data[i + 29] << 8);

        if (nameLen === targetBytes.length) {
          const nameStart = i + 30;
          let match = true;
          for (let j = 0; j < targetBytes.length; j++) {
            if (data[nameStart + j] !== targetBytes[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            // Compression method: 0 = stored, 8 = deflate
            const compressionMethod = data[i + 8] | (data[i + 9] << 8);
            const compressedSize = data[i + 18] | (data[i + 19] << 8) |
                                   (data[i + 20] << 16) | (data[i + 21] << 24);
            const uncompressedSize = data[i + 22] | (data[i + 23] << 8) |
                                     (data[i + 24] << 16) | (data[i + 25] << 24);

            const fileDataStart = nameStart + nameLen + extraLen;

            if (compressionMethod === 0) {
              // Stored – return raw slice
              return apkBuffer.slice(fileDataStart, fileDataStart + uncompressedSize);
            } else {
              // Deflate – use DecompressionStream if available
              const compressed = data.slice(fileDataStart, fileDataStart + compressedSize);
              try {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                writer.write(compressed);
                writer.close();
                const reader = ds.readable.getReader();
                const chunks: Uint8Array[] = [];
                let totalLen = 0;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  chunks.push(value);
                  totalLen += value.byteLength;
                }
                const result = new Uint8Array(totalLen);
                let offset = 0;
                for (const chunk of chunks) {
                  result.set(chunk, offset);
                  offset += chunk.byteLength;
                }
                return result.buffer;
              } catch {
                console.warn('[BinaryLoader] Deflate decompression failed, returning raw data');
                return apkBuffer.slice(fileDataStart, fileDataStart + compressedSize);
              }
            }
          }
        }
      }
    }

    // If no classes.dex found, return the raw buffer and let the DEX parser handle the error
    console.warn('[BinaryLoader] classes.dex not found in APK, passing raw buffer');
    return apkBuffer;
  }

  /**
   * Detect file type from magic bytes
   */
  detectFileType(buffer: ArrayBuffer): FileType {
    const data = new Uint8Array(buffer);
    
    // Check PE (MZ header)
    if (data.length >= 2 && data[0] === 0x4D && data[1] === 0x5A) {
      return 'PE';
    }

    // Check DEX (dex\n)
    if (data.length >= 4 && 
        data[0] === 0x64 && data[1] === 0x65 && 
        data[2] === 0x78 && data[3] === 0x0A) {
      return 'DEX';
    }

    // Check ZIP/APK (PK\x03\x04)
    // APK files are ZIP archives containing classes.dex
    if (data.length >= 4 &&
        data[0] === 0x50 && data[1] === 0x4B &&
        data[2] === 0x03 && data[3] === 0x04) {
      return 'APK';
    }

    // Check ELF (0x7F, 'E', 'L', 'F')
    if (data.length >= 4 && 
        data[0] === 0x7F && data[1] === 0x45 && 
        data[2] === 0x4C && data[3] === 0x46) {
      return 'ELF';
    }

    return 'UNKNOWN';
  }

  /**
   * Get cached binary
   */
  getCachedBinary(path: string): LoadedBinary | null {
    const cacheEntry = this.cache.get(path);
    if (!cacheEntry) {
      return null;
    }

    // Check cache age
    const age = Date.now() - cacheEntry.lastAccessed;
    if (age > this.maxCacheAge) {
      console.log(`[BinaryLoader] Cache expired for: ${path}`);
      this.cache.delete(path);
      return null;
    }

    // Update access stats
    cacheEntry.lastAccessed = Date.now();
    cacheEntry.accessCount++;

    return cacheEntry.binary;
  }

  /**
   * Cache binary
   */
  cacheBinary(path: string, binary: LoadedBinary): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }

    this.cache.set(path, {
      binary,
      lastAccessed: Date.now(),
      accessCount: 1,
    });

    console.log(`[BinaryLoader] Cached binary: ${path} (cache size: ${this.cache.size})`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[BinaryLoader] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ path: string; accessCount: number; age: number }>;
  } {
    const entries: Array<{ path: string; accessCount: number; age: number }> = [];
    
    for (const [path, entry] of this.cache) {
      entries.push({
        path,
        accessCount: entry.accessCount,
        age: Date.now() - entry.lastAccessed,
      });
    }

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries,
    };
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldestEntry(): void {
    let oldestPath: string | null = null;
    let oldestTime = Date.now();

    for (const [path, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestPath = path;
      }
    }

    if (oldestPath) {
      console.log(`[BinaryLoader] Evicting cache entry: ${oldestPath}`);
      this.cache.delete(oldestPath);
    }
  }

  /**
   * Resolve library path
   */
  private resolveLibraryPath(libName: string, parent: LoadedBinary): string {
    if (parent.type === 'PE') {
      // Windows DLL search order
      // 1. Same directory as parent
      // 2. System32
      // 3. Windows directory
      
      const parentDir = this.getDirectoryPath(parent.path);
      
      // Try same directory
      let resolved = `${parentDir}/${libName}`;
      
      // Try System32
      if (!libName.includes('/') && !libName.includes('\\')) {
        // Check if already has .dll extension
        if (!libName.toLowerCase().endsWith('.dll')) {
          resolved = `C:/Windows/System32/${libName}.dll`;
        } else {
          resolved = `C:/Windows/System32/${libName}`;
        }
      }
      
      return resolved;
    } else if (parent.type === 'DEX') {
      // Android library search order
      // 1. /system/lib
      // 2. /vendor/lib
      // 3. APK lib directory
      
      return `/system/lib/${libName}`;
    }

    return libName;
  }

  /**
   * Get directory path from full path
   */
  private getDirectoryPath(fullPath: string): string {
    const lastSlash = Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\'));
    return lastSlash >= 0 ? fullPath.substring(0, lastSlash) : '.';
  }

  /**
   * Create stub library for missing dependencies
   */
  private createStubLibrary(libName: string, type: FileType): LoadedBinary {
    console.log(`[BinaryLoader] Creating stub library: ${libName}`);

    // Create minimal stub data
    const stubData = new ArrayBuffer(1024);
    
    return {
      type,
      path: libName,
      data: stubData,
      parsed: {} as any, // Stub parsed data
      dependencies: [],
      loadedAt: Date.now(),
    };
  }

  /**
   * Fetch binary data
   * Uses fetch for all environments - Almostnode provides Node.js compat at runtime
   */
  private async fetchBinary(path: string): Promise<ArrayBuffer> {
    // Always use fetch - works in browser and with Almostnode
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.error(`[BinaryLoader] Failed to fetch ${path}:`, error);
      throw error;
    }
  }

  /**
   * Preload binaries (for optimization)
   */
  async preloadBinaries(paths: string[]): Promise<void> {
    console.log(`[BinaryLoader] Preloading ${paths.length} binaries...`);
    
    const promises = paths.map(path => 
      this.loadExecutable(path).catch(err => {
        console.warn(`[BinaryLoader] Failed to preload ${path}:`, err);
        return null;
      })
    );

    await Promise.all(promises);
    
    console.log('[BinaryLoader] Preload complete');
  }

  /**
   * Unload binary
   */
  unloadBinary(path: string): boolean {
    const deleted = this.cache.delete(path);
    if (deleted) {
      console.log(`[BinaryLoader] Unloaded binary: ${path}`);
    }
    return deleted;
  }

  /**
   * Get loaded binaries
   */
  getLoadedBinaries(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const binaryLoader = new BinaryLoader();
