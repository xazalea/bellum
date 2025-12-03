import { HiberFile } from './hiberfile';
import { CloudDatabase } from './cloud-database';

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
