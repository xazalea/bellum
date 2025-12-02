
import { HiberFile } from './hiberfile';
import { CompressionService } from './compression';

export interface StoredApp {
  id: string;
  name: string;
  size: number;
  type: string;
  icon?: string;
  isActive: boolean; // true = IndexedDB (Hot), false = Cloud Archive (Cold)
  storagePath: string; // Path in HiberFile or Manifest ID
  created: number;
}

export interface PublicLibrary {
  id: string;
  name: string;
  description: string;
  author: string;
  apps: StoredApp[];
  created: number;
}

interface ArchiveManifest {
  id: string;
  originalSize: number;
  compressedSize: number;
  chunks: string[]; // Paths to chunks in Cold Storage
  timestamp: number;
  mimeType: string;
}

/**
 * Cloud Database Provider (Simulated Unlimited Storage)
 * Uses a separate IndexedDB store ("Cold Storage") to simulate a cloud bucket.
 * Implements real Chunking and Compression.
 */
export class CloudDatabase {
  private coldStore: HiberFile;

  constructor() {
    // We use a separate HiberFile instance pointing to a different DB
    // This isolates "Cloud" storage from "Local" storage
    this.coldStore = new HiberFile('bellum-cloud-storage');
  }

  private get puter() {
    return (typeof window !== 'undefined' ? (window as any).puter : null);
  }

  /**
   * Archive binary data
   * 1. Compress
   * 2. Split into chunks
   * 3. Store in Cold Storage (Puter or LocalDB)
   */
  async saveBinary(file: Blob, onProgress?: (p: number) => void): Promise<string> {
    // Try Puter Cloud first (Unlimited Storage)
    if (this.puter) {
        try {
            // Use popup auth if not signed in
            if (!this.puter.auth.isSignedIn()) {
                 await this.puter.auth.signIn();
            }
            
            if (this.puter.auth.isSignedIn()) {
                const archiveId = crypto.randomUUID();
                const path = `bellum/archives/${archiveId}`;
                
                // Create directory
                await this.puter.fs.mkdir(`bellum/archives`).catch(() => {});
                
                // Write file (Puter handles large files)
                await this.puter.fs.write(path, file);
                
                // Store metadata about type
                await this.puter.fs.write(path + '.meta', JSON.stringify({ type: file.type }));
                
                return `puter:${path}`;
            }
        } catch (e) {
            console.warn('Puter Cloud save failed, falling back to local Cold Storage', e);
        }
    }

    // Fallback to Local Cold Storage (IndexedDB)
    // 1. Compress
    const compressed = await CompressionService.compress(file);
    
    // 2. Chunking Configuration
    const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks (Standard Cloud Block Size)
    const totalSize = compressed.size;
    const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
    const chunkPaths: string[] = [];
    const archiveId = crypto.randomUUID();

    // 3. Process Chunks
    const buffer = await compressed.arrayBuffer();
    
    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunkData = buffer.slice(start, end);
      
      const chunkPath = `archives/${archiveId}/chunk_${i}`;
      await this.coldStore.writeFile(chunkPath, chunkData);
      chunkPaths.push(chunkPath);

      if (onProgress) {
        onProgress(((i + 1) / chunkCount) * 100);
      }
    }

    // 4. Create Manifest
    const manifest: ArchiveManifest = {
      id: archiveId,
      originalSize: file.size,
      compressedSize: totalSize,
      chunks: chunkPaths,
      timestamp: Date.now(),
      mimeType: file.type
    };

    // Store Manifest in Cold Storage as well
    const manifestPath = `manifests/${archiveId}.json`;
    await this.coldStore.writeFile(manifestPath, JSON.stringify(manifest));

    return manifestPath;
  }

  /**
   * Restore binary data
   * 1. Read chunks
   * 2. Assemble
   * 3. Decompress
   */
  async loadBinary(manifestPath: string, onProgress?: (p: number) => void): Promise<Blob> {
    // Check if stored in Puter Cloud
    if (manifestPath.startsWith('puter:')) {
        const path = manifestPath.replace('puter:', '');
        if (this.puter) {
            if (!this.puter.auth.isSignedIn()) await this.puter.auth.signIn();
            
            const blob = await this.puter.fs.read(path);
            
            // Try to get metadata for type
            let type = 'application/octet-stream';
            try {
                const meta = await this.puter.fs.read(path + '.meta');
                const metaJson = await (meta as Blob).text();
                type = JSON.parse(metaJson).type;
            } catch (e) {}
            
            return new Blob([blob as Blob], { type });
        }
        throw new Error('Puter Cloud unavailable but file stored there');
    }

    // 1. Load Manifest
    const manifestJson = await this.coldStore.readFileAsText(manifestPath);
    const manifest: ArchiveManifest = JSON.parse(manifestJson);

    // 2. Load Chunks
    const chunks: ArrayBuffer[] = [];
    let loadedCount = 0;

    for (const chunkPath of manifest.chunks) {
      const chunkBlob = await this.coldStore.readFile(chunkPath);
      chunks.push(await chunkBlob.arrayBuffer());
      
      loadedCount++;
      if (onProgress) {
        onProgress((loadedCount / manifest.chunks.length) * 100);
      }
    }

    // 3. Assemble
    const compressedBlob = new Blob(chunks);

    // 4. Decompress
    const originalBlob = await CompressionService.decompress(compressedBlob);
    
    // Restore type
    return new Blob([originalBlob], { type: manifest.mimeType });
  }

  /**
   * Save Metadata Record
   */
  async saveRecord(collection: string, data: any): Promise<string> {
    const id = data.id || crypto.randomUUID();
    const path = `records/${collection}/${id}.json`;
    await this.coldStore.writeFile(path, JSON.stringify(data));
    return id;
  }

  /**
   * Load Metadata Record
   */
  async loadRecord(collection: string, id: string): Promise<any> {
    const path = `records/${collection}/${id}.json`;
    const json = await this.coldStore.readFileAsText(path);
    return JSON.parse(json);
  }
}

/**
 * Manages the Application Library
 */
export class AppLibraryManager {
  private localStore: HiberFile;
  private cloudDb: CloudDatabase;
  private apps: StoredApp[] = [];
  private publicLibraries: PublicLibrary[] = [];

  constructor(localStore: HiberFile) {
    this.localStore = localStore;
    this.cloudDb = new CloudDatabase();
    this.loadLibrary();
  }

  private async loadLibrary() {
    try {
      const libJson = await this.localStore.readFileAsText('.library_index.json');
      const data = JSON.parse(libJson);
      this.apps = data.apps || [];
      this.publicLibraries = data.libraries || [];
    } catch (e) {
      this.apps = [];
      this.publicLibraries = [];
    }
  }

  private async saveLibrary() {
    await this.localStore.writeFile('.library_index.json', JSON.stringify({
      apps: this.apps,
      libraries: this.publicLibraries
    }));
  }

  getApps() {
    return this.apps;
  }

  getPublicLibraries() {
    return this.publicLibraries;
  }

  // --- App Management ---

  async installApp(file: File): Promise<StoredApp> {
    const id = crypto.randomUUID();
    const path = `apps/${id}/${file.name}`;
    
    // Save to "Hot" Storage (Local)
    await this.localStore.writeFile(path, file, { compress: true });
    
    const app: StoredApp = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      isActive: true,
      storagePath: path,
      created: Date.now()
    };

    this.apps.push(app);
    await this.saveLibrary();
    return app;
  }

  async deactivateApp(appId: string, onProgress?: (p: number) => void): Promise<void> {
    const appIndex = this.apps.findIndex(a => a.id === appId);
    if (appIndex === -1) throw new Error('App not found');
    const app = this.apps[appIndex];

    if (!app.isActive) return;

    // 1. Read from Local (Hot)
    const fileBlob = await this.localStore.readFile(app.storagePath);

    // 2. Save to Cloud (Cold) - Real Compression & Chunking
    const manifestPath = await this.cloudDb.saveBinary(fileBlob, onProgress);

    // 3. Delete from Local (Hot)
    await this.localStore.deleteFile(app.storagePath);

    // 4. Update State
    app.isActive = false;
    app.storagePath = manifestPath;
    await this.saveLibrary();
  }

  async activateApp(appId: string, onProgress?: (p: number) => void): Promise<void> {
    const appIndex = this.apps.findIndex(a => a.id === appId);
    if (appIndex === -1) throw new Error('App not found');
    const app = this.apps[appIndex];

    if (app.isActive) return;

    // 1. Load from Cloud (Cold) - Real Decompression & Assembly
    const blob = await this.cloudDb.loadBinary(app.storagePath, onProgress);

    // 2. Save to Local (Hot)
    const localPath = `apps/${app.id}/${app.name}`;
    await this.localStore.writeFile(localPath, blob, { compress: true });

    // 3. Update State
    app.isActive = true;
    app.storagePath = localPath;
    await this.saveLibrary();
  }

  async deleteApp(appId: string) {
    const appIndex = this.apps.findIndex(a => a.id === appId);
    if (appIndex === -1) return;
    const app = this.apps[appIndex];

    if (app.isActive) {
      await this.localStore.deleteFile(app.storagePath);
    }
    
    this.apps.splice(appIndex, 1);
    await this.saveLibrary();
  }

  // --- Public Library Management ---

  async createPublicLibrary(name: string, description: string, appIds: string[]): Promise<string> {
    const selectedApps = this.apps.filter(a => appIds.includes(a.id));
    
    const library: PublicLibrary = {
      id: crypto.randomUUID(),
      name,
      description,
      author: 'User', 
      apps: selectedApps.map(a => ({...a})), 
      created: Date.now()
    };

    const recordId = await this.cloudDb.saveRecord('libraries', library);
    
    this.publicLibraries.push(library);
    await this.saveLibrary();

    return recordId;
  }

  async importPublicLibrary(libraryId: string): Promise<void> {
    // Try to load from Cold Store
    try {
      const library = await this.cloudDb.loadRecord('libraries', libraryId);
      if (library) {
        this.publicLibraries.push(library);
        // Merge apps
        for (const app of library.apps) {
           if (!this.apps.find(a => a.id === app.id)) {
             // Imported apps are initially Inactive (Archive references)
             this.apps.push(app);
           }
        }
        await this.saveLibrary();
        return;
      }
    } catch (e) {
      console.warn('Library not found in local cloud cache');
    }
    throw new Error('Library Import Failed');
  }
}
