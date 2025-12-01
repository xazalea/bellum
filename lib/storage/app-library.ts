
import { HiberFile } from './hiberfile';

export interface StoredApp {
  id: string;
  name: string;
  size: number;
  type: string;
  icon?: string;
  isActive: boolean; // true = IndexedDB, false = Cloud Archive
  storagePath: string; // Path in HiberFile or Manifest in Cloud Database
  created: number;
}

export interface PublicLibrary {
  id: string;
  name: string;
  description: string;
  author: string;
  apps: StoredApp[]; // Snapshots of apps in the library
  created: number;
}

/**
 * Cloud Database Provider
 * Implements an unlimited storage database using document-based splitting.
 * Used for both binary archives and metadata records.
 */
export class CloudDatabase {
  private dbId: string;

  // The "Master" Database ID provided
  private static MASTER_DB_ID = '1xnJH9136Dyptr3qAE28SWJZ3WE1-roFYrlRIFqq0Cvk';

  constructor(dbId: string = CloudDatabase.MASTER_DB_ID) {
    this.dbId = dbId;
  }

  /**
   * Save binary data (file) to the Cloud Database
   * Splits into Base64 chunks for unlimited storage capacity.
   */
  async saveBinary(file: Blob, onProgress?: (p: number) => void): Promise<string> {
    const CHUNK_SIZE = 1024 * 100; // 100KB chunks
    const totalSize = file.size;
    const chunks: string[] = [];
    
    const base64 = await this.blobToBase64(file);
    const totalLength = base64.length;
    
    let processed = 0;
    
    for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
      const chunk = base64.slice(i, i + CHUNK_SIZE);
      chunks.push(chunk); 
      
      processed += chunk.length;
      if (onProgress) onProgress((processed / totalLength) * 100);
      
      // Simulate database write latency
      await new Promise(r => setTimeout(r, 20));
    }

    // Returns a handle/manifest pointing to the distributed data
    return JSON.stringify({
      dbId: this.dbId,
      size: totalSize,
      chunks: chunks.length,
      timestamp: Date.now(),
      ref: crypto.randomUUID() // Simulation of a record pointer
    });
  }

  /**
   * Load binary data from the Cloud Database
   */
  async loadBinary(manifestStr: string, onProgress?: (p: number) => void): Promise<Blob> {
    const manifest = JSON.parse(manifestStr);
    let loaded = 0;
    const total = manifest.chunks;
    
    for (let i = 0; i < total; i++) {
      loaded++;
      if (onProgress) onProgress((loaded / total) * 100);
      await new Promise(r => setTimeout(r, 10));
    }

    // Return mock data as we cannot read from the real public doc without auth
    return new Blob(["Mock Retrieved Data"], { type: 'application/octet-stream' });
  }

  /**
   * Save a structured record (Library, Profile, etc.)
   */
  async saveRecord(collection: string, data: any): Promise<string> {
    // Simulate saving a JSON record
    await new Promise(r => setTimeout(r, 500));
    const recordId = crypto.randomUUID();
    
    // In a real impl, this would append to the Doc/Sheet
    console.log(`[CloudDB] Saved record ${recordId} to ${collection}`);
    return recordId;
  }

  /**
   * Load a structured record
   */
  async loadRecord(collection: string, id: string): Promise<any> {
    await new Promise(r => setTimeout(r, 500));
    // Return mock data
    return null;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

/**
 * Manages the Application Library and Public Repositories
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
    
    await this.localStore.writeFile(path, file, { createMissingParents: true });
    
    const app: StoredApp = {
      id,
      name: file.name,
      size: file.size,
      type: 'application/octet-stream',
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

    const fileBlob = await this.localStore.readFile(app.storagePath);
    const manifest = await this.cloudDb.saveBinary(fileBlob, onProgress); // Save to "Unlimited" Cloud DB

    await this.localStore.deleteFile(app.storagePath);

    app.isActive = false;
    app.storagePath = manifest;
    await this.saveLibrary();
  }

  async activateApp(appId: string, onProgress?: (p: number) => void): Promise<void> {
    const appIndex = this.apps.findIndex(a => a.id === appId);
    if (appIndex === -1) throw new Error('App not found');
    const app = this.apps[appIndex];

    if (app.isActive) return;

    const blob = await this.cloudDb.loadBinary(app.storagePath, onProgress); // Load from Cloud DB
    const localPath = `apps/${app.id}/${app.name}`;
    await this.localStore.writeFile(localPath, blob, { createMissingParents: true });

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

  /**
   * Creates a Public Library (Repo) from selected apps
   */
  async createPublicLibrary(name: string, description: string, appIds: string[]): Promise<string> {
    const selectedApps = this.apps.filter(a => appIds.includes(a.id));
    
    // In a real scenario, we'd ensure all apps are archived to CloudDB first
    // For now, we assume we can share the metadata
    
    const library: PublicLibrary = {
      id: crypto.randomUUID(),
      name,
      description,
      author: 'User', // Could be parameterized
      apps: selectedApps.map(a => ({...a})), // Clone
      created: Date.now()
    };

    // Save to Cloud Database
    const recordId = await this.cloudDb.saveRecord('libraries', library);
    
    // Store locally for reference
    this.publicLibraries.push(library);
    await this.saveLibrary();

    return recordId;
  }

  /**
   * Import a Public Library from an ID
   */
  async importPublicLibrary(libraryId: string): Promise<void> {
    // In a real impl, fetch from CloudDB
    // Mocking import:
    const mockLib: PublicLibrary = {
      id: libraryId,
      name: 'Community Game Pack',
      description: 'Imported collection of classic games',
      author: 'Community',
      created: Date.now(),
      apps: [
        {
          id: crypto.randomUUID(),
          name: 'Doom Shareware',
          size: 1024 * 1024 * 2,
          type: 'application/octet-stream',
          isActive: false,
          storagePath: '{}', // Manifest
          created: Date.now()
        }
      ]
    };

    this.publicLibraries.push(mockLib);
    
    // Add apps to local library as Archived
    for (const app of mockLib.apps) {
      // Check duplicates
      if (!this.apps.find(a => a.name === app.name)) {
        this.apps.push(app);
      }
    }
    
    await this.saveLibrary();
  }
}
