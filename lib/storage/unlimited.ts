/**
 * Storage Integration (Local + Cluster only)
 *
 * IMPORTANT:
 * - Nacho does NOT use 3rd-party "free storage" hosting providers.
 * - All storage is either local (OPFS/IndexedDB) or the Nacho cluster server.
 *
 * This module is kept as a thin abstraction layer.
 */

export interface StorageProvider {
  name: string;
  upload(file: File, path: string): Promise<string>; // returns a fileId or internal URL
  download(idOrUrl: string): Promise<Blob>;
  delete(idOrUrl: string): Promise<void>;
  list(path: string): Promise<string[]>;
}

/**
 * Single-provider storage manager (cluster + local only).
 */
class UnlimitedStorageManager {
  private provider: StorageProvider | null = null;

  constructor() {
    // Provider is initialized lazily by the app when needed.
  }

  /**
   * Set the active provider (cluster/local).
   */
  setProvider(provider: StorageProvider) {
    this.provider = provider;
  }

  /**
   * Upload a file.
   */
  async uploadFile(file: File, path: string): Promise<string> {
    if (!this.provider) throw new Error("No storage provider configured");
    return await this.provider.upload(file, path);
  }

  /**
   * Download a file.
   */
  async downloadFile(idOrUrl: string): Promise<Blob> {
    if (!this.provider) throw new Error("No storage provider configured");
    return await this.provider.download(idOrUrl);
  }

  /**
   * Delete a file.
   */
  async deleteFile(idOrUrl: string): Promise<void> {
    if (!this.provider) throw new Error("No storage provider configured");
    await this.provider.delete(idOrUrl);
  }

  /**
   * List files in a directory.
   */
  async listFiles(path: string): Promise<string[]> {
    if (!this.provider) throw new Error("No storage provider configured");
    return await this.provider.list(path);
  }

  getStats() {
    return { activeProvider: this.provider?.name || "None", available: !!this.provider };
  }
}

// Singleton instance
export const unlimitedStorage = new UnlimitedStorageManager();

