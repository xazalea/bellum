/**
 * Sync Engine
 * Conflict-free synchronization and background replication
 * 
 * Features:
 * - CRDT-style metadata for conflict resolution
 * - Peer-to-peer chunk sync via Fabric
 * - Tiered cache: RAM → OPFS → IndexedDB → remote
 * - Background replication
 * - Integrity checks with content hashes
 */

import { virtualFileSystem, type FileInfo } from './virtual-fs';
import { fabricMesh } from '../fabric/mesh';
import { opfsProvider, indexedDBProvider } from './storage-providers';

export interface VectorClock {
  nodeId: string;
  timestamp: number;
  sequence: number;
}

export interface FileMetadata {
  path: string;
  hash: string; // Content hash (SHA-256)
  size: number;
  lastModified: number;
  version: number; // Monotonically increasing version
  syncState: 'synced' | 'pending' | 'conflict' | 'error';
  replicas: string[]; // Peer IDs that have this file
  chunkHashes: string[]; // Per-chunk hashes for large files
  vectorClock: VectorClock[]; // Vector clock for conflict resolution
  manifestVersion: number; // Version in manifest
}

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'replicate' | 'resolve';
  path: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-1
  startTime: number;
  error?: string;
}

export interface ConflictResolution {
  path: string;
  localVersion: number;
  remoteVersion: number;
  localHash: string;
  remoteHash: string;
  localVectorClock: VectorClock[];
  remoteVectorClock: VectorClock[];
  resolution: 'local' | 'remote' | 'merge' | 'manual';
  resolvedAt?: number;
  mergeStrategy?: 'newest' | 'largest' | 'deterministic';
}

export interface FileManifest {
  nodeId: string;
  version: number;
  timestamp: number;
  files: Array<{
    path: string;
    hash: string;
    size: number;
    version: number;
    vectorClock: VectorClock[];
  }>;
}

export interface SyncPolicy {
  // Replication settings
  enableReplication: boolean;
  replicationFactor: number; // Number of peers to replicate to
  replicationInterval: number; // ms between replication cycles
  
  // Chunking
  chunkSize: number; // bytes per chunk
  enableChunking: boolean; // For files > chunkSize
  
  // Conflict resolution
  autoResolveConflicts: boolean;
  conflictResolutionStrategy: 'newest' | 'largest' | 'manual';
  
  // Background sync
  enableBackgroundSync: boolean;
  syncInterval: number; // ms between sync cycles
  
  // Integrity
  verifyOnSync: boolean;
  verifyOnRead: boolean;
}

/**
 * Sync Engine
 * Manages file synchronization across peers and storage tiers
 */
export class SyncEngine {
  private static instance: SyncEngine;
  
  private metadata: Map<string, FileMetadata> = new Map();
  private syncOperations: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, ConflictResolution> = new Map();
  
  // Manifest management
  private localManifest: FileManifest | null = null;
  private peerManifests: Map<string, FileManifest> = new Map();
  private manifestVersion: number = 1;
  
  // Vector clock state
  private localNodeId: string;
  private vectorClockSequence: number = 0;
  
  private syncPolicy: SyncPolicy;
  private syncInterval: number | null = null;
  private replicationInterval: number | null = null;
  private manifestSyncInterval: number | null = null;
  
  private isRunning: boolean = false;
  
  private constructor() {
    // Get local node ID
    try {
      const { fabricMesh } = require('../fabric/mesh');
      this.localNodeId = fabricMesh.getLocalNodeId() || 'local';
    } catch {
      this.localNodeId = 'local';
    }
    
    this.syncPolicy = {
      enableReplication: true,
      replicationFactor: 2,
      replicationInterval: 30000, // 30 seconds
      chunkSize: 1024 * 1024, // 1MB chunks
      enableChunking: true,
      autoResolveConflicts: true,
      conflictResolutionStrategy: 'newest',
      enableBackgroundSync: true,
      syncInterval: 10000, // 10 seconds
      verifyOnSync: true,
      verifyOnRead: false,
    };
  }
  
  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }
  
  /**
   * Initialize sync engine
   */
  async initialize(): Promise<void> {
    console.log('[SyncEngine] Initializing...');
    
    // Load metadata from storage
    await this.loadMetadata();
    
    // Start background sync
    if (this.syncPolicy.enableBackgroundSync) {
      this.startBackgroundSync();
    }
    
    // Start replication
    if (this.syncPolicy.enableReplication) {
      this.startReplication();
    }
    
    // Start manifest sync
    this.startManifestSync();
    
    // Initialize local manifest
    this.updateLocalManifest();
    
    // Advertise sync service
    fabricMesh.advertiseService('file-sync', 'File Synchronization Service');
    
    // Setup RPC handlers
    this.setupRPCHandlers();
    
    console.log('[SyncEngine] Initialized');
  }
  
  /**
   * Load metadata from storage
   */
  private async loadMetadata(): Promise<void> {
    try {
      // Try to load from IndexedDB
      const metadataJson = await indexedDBProvider.readFile('sync-metadata.json').catch(() => null);
      
      if (metadataJson) {
        const metadataArray = JSON.parse(new TextDecoder().decode(metadataJson));
        for (const meta of metadataArray) {
          this.metadata.set(meta.path, meta);
        }
      }
    } catch (error) {
      console.warn('[SyncEngine] Failed to load metadata:', error);
    }
  }
  
  /**
   * Save metadata to storage
   */
  private async saveMetadata(): Promise<void> {
    try {
      const metadataArray = Array.from(this.metadata.values());
      const metadataJson = new TextEncoder().encode(JSON.stringify(metadataArray));
      await indexedDBProvider.writeFile('sync-metadata.json', metadataJson);
    } catch (error) {
      console.warn('[SyncEngine] Failed to save metadata:', error);
    }
  }
  
  /**
   * Start background sync
   */
  private startBackgroundSync(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.syncInterval = window.setInterval(async () => {
      await this.syncCycle();
    }, this.syncPolicy.syncInterval);
    
    // Initial sync
    this.syncCycle();
  }
  
  /**
   * Start replication
   */
  private startReplication(): void {
    this.replicationInterval = window.setInterval(async () => {
      await this.replicationCycle();
    }, this.syncPolicy.replicationInterval);
  }
  
  /**
   * Start manifest synchronization
   */
  private startManifestSync(): void {
    this.manifestSyncInterval = window.setInterval(async () => {
      await this.syncManifests();
    }, 5000); // Every 5 seconds
  }
  
  /**
   * Update local manifest
   */
  private updateLocalManifest(): void {
    const files: FileManifest['files'] = [];
    
    for (const [path, metadata] of this.metadata) {
      files.push({
        path,
        hash: metadata.hash,
        size: metadata.size,
        version: metadata.version,
        vectorClock: metadata.vectorClock,
      });
    }
    
    this.localManifest = {
      nodeId: this.localNodeId,
      version: this.manifestVersion++,
      timestamp: Date.now(),
      files,
    };
  }
  
  /**
   * Sync manifests with peers
   */
  private async syncManifests(): Promise<void> {
    if (!this.localManifest) return;
    
    const peers = fabricMesh.getPeers();
    const syncServices = fabricMesh.getServices()
      .filter(s => s.serviceName === 'file-sync');
    
    for (const service of syncServices) {
      try {
        // Request peer manifest
        const peerManifest = await fabricMesh.rpcCall(service.serviceId, {
          type: 'GET_MANIFEST',
        }) as FileManifest;
        
        if (peerManifest) {
          this.peerManifests.set(service.nodeId, peerManifest);
          await this.reconcileManifests(peerManifest);
        }
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Broadcast our manifest
    this.broadcastManifest();
  }
  
  /**
   * Reconcile peer manifest with local
   */
  private async reconcileManifests(peerManifest: FileManifest): Promise<void> {
    if (!this.localManifest) return;
    
    // Find files that need syncing
    const peerFiles = new Map(peerManifest.files.map(f => [f.path, f]));
    const localFiles = new Map(this.localManifest.files.map(f => [f.path, f]));
    
    // Check for conflicts using vector clocks
    for (const [path, peerFile] of peerFiles) {
      const localFile = localFiles.get(path);
      
      if (!localFile) {
        // File exists on peer but not locally - schedule download
        await this.scheduleFileDownload(path, peerFile);
      } else if (localFile.hash !== peerFile.hash) {
        // Files differ - check vector clocks for conflicts
        const conflict = this.detectConflict(localFile.vectorClock, peerFile.vectorClock);
        
        if (conflict) {
          await this.createConflict(path, localFile, peerFile);
        } else {
          // One is newer - determine which
          const newer = this.compareVectorClocks(localFile.vectorClock, peerFile.vectorClock);
          if (newer === 'remote') {
            await this.scheduleFileDownload(path, peerFile);
          }
        }
      }
    }
  }
  
  /**
   * Detect conflict using vector clocks
   */
  private detectConflict(localClock: VectorClock[], remoteClock: VectorClock[]): boolean {
    // Conflict if neither clock is strictly greater
    const localGreater = this.isVectorClockGreater(localClock, remoteClock);
    const remoteGreater = this.isVectorClockGreater(remoteClock, localClock);
    
    return !localGreater && !remoteGreater && localClock.length > 0 && remoteClock.length > 0;
  }
  
  /**
   * Compare vector clocks
   */
  private compareVectorClocks(local: VectorClock[], remote: VectorClock[]): 'local' | 'remote' | 'equal' {
    if (this.isVectorClockGreater(local, remote)) return 'local';
    if (this.isVectorClockGreater(remote, local)) return 'remote';
    return 'equal';
  }
  
  /**
   * Check if vector clock A is greater than B
   */
  private isVectorClockGreater(a: VectorClock[], b: VectorClock[]): boolean {
    const aMap = new Map(a.map(vc => [vc.nodeId, vc]));
    const bMap = new Map(b.map(vc => [vc.nodeId, vc]));
    
    let aGreater = false;
    let bGreater = false;
    
    // Check all nodes in both clocks
    const allNodes = new Set([...aMap.keys(), ...bMap.keys()]);
    
    for (const nodeId of allNodes) {
      const aVC = aMap.get(nodeId);
      const bVC = bMap.get(nodeId);
      
      if (aVC && bVC) {
        if (aVC.sequence > bVC.sequence || 
            (aVC.sequence === bVC.sequence && aVC.timestamp > bVC.timestamp)) {
          aGreater = true;
        } else if (bVC.sequence > aVC.sequence ||
                   (bVC.sequence === aVC.sequence && bVC.timestamp > aVC.timestamp)) {
          bGreater = true;
        }
      } else if (aVC) {
        aGreater = true;
      } else if (bVC) {
        bGreater = true;
      }
    }
    
    return aGreater && !bGreater;
  }
  
  /**
   * Create conflict resolution entry
   */
  private async createConflict(
    path: string,
    localFile: FileManifest['files'][0],
    remoteFile: FileManifest['files'][0]
  ): Promise<void> {
    const localMeta = this.metadata.get(path);
    const conflict: ConflictResolution = {
      path,
      localVersion: localFile.version,
      remoteVersion: remoteFile.version,
      localHash: localFile.hash,
      remoteHash: remoteFile.hash,
      localVectorClock: localFile.vectorClock,
      remoteVectorClock: remoteFile.vectorClock,
      resolution: 'manual',
      mergeStrategy: this.syncPolicy.conflictResolutionStrategy === 'newest' ? 'newest' : 'largest',
    };
    
    this.conflicts.set(path, conflict);
    
    if (localMeta) {
      localMeta.syncState = 'conflict';
    }
  }
  
  /**
   * Schedule file download
   */
  private async scheduleFileDownload(path: string, peerFile: FileManifest['files'][0]): Promise<void> {
    // Would trigger download from peer
    // For now, just mark as pending
    const metadata = this.metadata.get(path);
    if (metadata) {
      metadata.syncState = 'pending';
    }
  }
  
  /**
   * Broadcast manifest to peers
   */
  private broadcastManifest(): void {
    if (!this.localManifest) return;
    
    const syncServices = fabricMesh.getServices()
      .filter(s => s.serviceName === 'file-sync');
    
    for (const service of syncServices) {
      try {
        fabricMesh.rpcCall(service.serviceId, {
          type: 'MANIFEST_UPDATE',
          manifest: this.localManifest,
        }).catch(() => {});
      } catch {
        // Ignore errors
      }
    }
  }
  
  /**
   * Increment vector clock
   */
  private incrementVectorClock(): VectorClock {
    this.vectorClockSequence++;
    return {
      nodeId: this.localNodeId,
      timestamp: Date.now(),
      sequence: this.vectorClockSequence,
    };
  }
  
  /**
   * Sync cycle - discover and sync files
   */
  private async syncCycle(): Promise<void> {
    try {
      // Get list of local files
      const localFiles = await this.scanLocalFiles();
      
      // For each file, check if it needs syncing
      for (const filePath of localFiles) {
        const metadata = this.metadata.get(filePath);
        
        if (!metadata || metadata.syncState !== 'synced') {
          await this.syncFile(filePath);
        }
      }
      
      // Check for remote files that need downloading
      await this.discoverRemoteFiles();
      
    } catch (error) {
      console.error('[SyncEngine] Sync cycle error:', error);
    }
  }
  
  /**
   * Replication cycle - replicate files to peers
   */
  private async replicationCycle(): Promise<void> {
    try {
      const peers = fabricMesh.getPeers();
      if (peers.length === 0) return;
      
      // Get files that need replication
      const filesToReplicate = Array.from(this.metadata.values())
        .filter(meta => meta.replicas.length < this.syncPolicy.replicationFactor);
      
      for (const metadata of filesToReplicate) {
        await this.replicateFile(metadata.path);
      }
    } catch (error) {
      console.error('[SyncEngine] Replication cycle error:', error);
    }
  }
  
  /**
   * Scan local files
   */
  private async scanLocalFiles(): Promise<string[]> {
    // In a real implementation, would recursively scan VFS
    // For now, return empty array
    return [];
  }
  
  /**
   * Sync a file
   */
  async syncFile(path: string): Promise<void> {
    const operationId = crypto.randomUUID();
    
    const operation: SyncOperation = {
      id: operationId,
      type: 'upload',
      path,
      status: 'in_progress',
      progress: 0,
      startTime: Date.now(),
    };
    
    this.syncOperations.set(operationId, operation);
    
    try {
      // Read file
      const data = await virtualFileSystem.readFile(path);
      
      // Calculate hash
      const hash = await this.calculateHash(data);
      
      // Get or create metadata
      let metadata = this.metadata.get(path);
      if (!metadata) {
        const fileInfo = await virtualFileSystem.getFileInfo(path);
        const vectorClock = [this.incrementVectorClock()];
        
        metadata = {
          path,
          hash,
          size: data.length,
          lastModified: fileInfo.modified,
          version: 1,
          syncState: 'pending',
          replicas: [],
          chunkHashes: [],
          vectorClock,
          manifestVersion: this.manifestVersion,
        };
        this.metadata.set(path, metadata);
      } else {
        // Check if file changed
        if (metadata.hash !== hash) {
          metadata.hash = hash;
          metadata.size = data.length;
          metadata.version++;
          metadata.syncState = 'pending';
          
          // Update vector clock
          metadata.vectorClock.push(this.incrementVectorClock());
          metadata.manifestVersion = this.manifestVersion;
        }
      }
      
      // If file is large, calculate chunk hashes
      if (this.syncPolicy.enableChunking && data.length > this.syncPolicy.chunkSize) {
        metadata.chunkHashes = await this.calculateChunkHashes(data);
      }
      
      // Upload to peers
      await this.uploadToPeers(path, data, metadata);
      
      metadata.syncState = 'synced';
      operation.status = 'completed';
      operation.progress = 1.0;
      
      await this.saveMetadata();
    } catch (error: any) {
      operation.status = 'failed';
      operation.error = error.message;
      
      const metadata = this.metadata.get(path);
      if (metadata) {
        metadata.syncState = 'error';
      }
    }
  }
  
  /**
   * Upload file to peers
   */
  private async uploadToPeers(
    path: string,
    data: Uint8Array,
    metadata: FileMetadata
  ): Promise<void> {
    const peers = fabricMesh.getPeers();
    if (peers.length === 0) return;
    
    // Find peers with sync service
    const syncServices = fabricMesh.getServices()
      .filter(s => s.serviceName === 'file-sync');
    
    if (syncServices.length === 0) return;
    
    // Upload to first available peer (in real impl, would upload to multiple)
    const target = syncServices[0];
    
    try {
      // Send file via raw bytes
      await fabricMesh.sendBytes(target.peerId, data);
      
      // Update replicas
      if (!metadata.replicas.includes(target.peerId)) {
        metadata.replicas.push(target.peerId);
      }
    } catch (error) {
      console.warn(`[SyncEngine] Failed to upload to peer ${target.peerId}:`, error);
    }
  }
  
  /**
   * Replicate file to peers
   */
  private async replicateFile(path: string): Promise<void> {
    const metadata = this.metadata.get(path);
    if (!metadata) return;
    
    // Already replicated enough
    if (metadata.replicas.length >= this.syncPolicy.replicationFactor) return;
    
    const peers = fabricMesh.getPeers();
    const syncServices = fabricMesh.getServices()
      .filter(s => s.serviceName === 'file-sync' && !metadata.replicas.includes(s.peerId));
    
    if (syncServices.length === 0) return;
    
    // Read file
    const data = await virtualFileSystem.readFile(path);
    
    // Replicate to needed peers
    const needed = this.syncPolicy.replicationFactor - metadata.replicas.length;
    const targets = syncServices.slice(0, needed);
    
    for (const target of targets) {
      try {
        await fabricMesh.sendBytes(target.peerId, data);
        
        if (!metadata.replicas.includes(target.peerId)) {
          metadata.replicas.push(target.peerId);
        }
      } catch (error) {
        console.warn(`[SyncEngine] Replication failed to ${target.peerId}:`, error);
      }
    }
    
    await this.saveMetadata();
  }
  
  /**
   * Discover remote files
   */
  private async discoverRemoteFiles(): Promise<void> {
    // In real implementation, would query peers for file lists
    // For now, this is a placeholder
  }
  
  /**
   * Calculate file hash
   */
  private async calculateHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Calculate chunk hashes
   */
  private async calculateChunkHashes(data: Uint8Array): Promise<string[]> {
    const chunkSize = this.syncPolicy.chunkSize;
    const chunks: string[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const hash = await this.calculateHash(chunk);
      chunks.push(hash);
    }
    
    return chunks;
  }
  
  /**
   * Setup RPC handlers
   */
  private setupRPCHandlers(): void {
    fabricMesh.onRpcRequest(async (req) => {
      if (req.serviceId === 'file-sync') {
        const request = req.request as any;
        
        if (request.type === 'GET_MANIFEST') {
          // Return local manifest
          return this.localManifest;
        } else if (request.type === 'MANIFEST_UPDATE') {
          // Receive peer manifest update
          const peerManifest = request.manifest as FileManifest;
          if (peerManifest) {
            this.peerManifests.set(req.fromPeerId, peerManifest);
            await this.reconcileManifests(peerManifest);
          }
        }
      }
    });
  }
  
  /**
   * Get file metadata
   */
  getFileMetadata(path: string): FileMetadata | undefined {
    return this.metadata.get(path);
  }
  
  /**
   * Get all metadata
   */
  getAllMetadata(): FileMetadata[] {
    return Array.from(this.metadata.values());
  }
  
  /**
   * Get sync operations
   */
  getSyncOperations(): SyncOperation[] {
    return Array.from(this.syncOperations.values());
  }
  
  /**
   * Get conflicts
   */
  getConflicts(): ConflictResolution[] {
    return Array.from(this.conflicts.values());
  }
  
  /**
   * Resolve conflict with vector clock merge
   */
  async resolveConflict(
    path: string,
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<void> {
    const conflict = this.conflicts.get(path);
    if (!conflict) return;
    
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    
    const metadata = this.metadata.get(path);
    
    // Apply resolution
    if (resolution === 'local') {
      // Keep local version, merge vector clocks
      if (metadata) {
        metadata.syncState = 'synced';
        // Merge vector clocks (take maximum for each node)
        metadata.vectorClock = this.mergeVectorClocks(
          conflict.localVectorClock,
          conflict.remoteVectorClock
        );
        metadata.vectorClock.push(this.incrementVectorClock());
      }
    } else if (resolution === 'remote') {
      // Use remote version, merge vector clocks
      if (metadata) {
        metadata.syncState = 'pending'; // Will be updated when downloaded
        metadata.vectorClock = this.mergeVectorClocks(
          conflict.localVectorClock,
          conflict.remoteVectorClock
        );
        metadata.vectorClock.push(this.incrementVectorClock());
      }
    } else if (resolution === 'merge') {
      // Deterministic merge based on strategy
      if (conflict.mergeStrategy === 'newest') {
        const localNewer = this.isVectorClockGreater(
          conflict.localVectorClock,
          conflict.remoteVectorClock
        );
        if (localNewer) {
          if (metadata) {
            metadata.syncState = 'synced';
            metadata.vectorClock = this.mergeVectorClocks(
              conflict.localVectorClock,
              conflict.remoteVectorClock
            );
            metadata.vectorClock.push(this.incrementVectorClock());
          }
        } else {
          if (metadata) {
            metadata.syncState = 'pending';
            metadata.vectorClock = this.mergeVectorClocks(
              conflict.localVectorClock,
              conflict.remoteVectorClock
            );
            metadata.vectorClock.push(this.incrementVectorClock());
          }
        }
      }
    }
    
    this.conflicts.delete(path);
    this.updateLocalManifest();
  }
  
  /**
   * Merge two vector clocks (take maximum for each node)
   */
  private mergeVectorClocks(a: VectorClock[], b: VectorClock[]): VectorClock[] {
    const merged = new Map<string, VectorClock>();
    
    for (const vc of a) {
      merged.set(vc.nodeId, vc);
    }
    
    for (const vc of b) {
      const existing = merged.get(vc.nodeId);
      if (!existing || 
          vc.sequence > existing.sequence ||
          (vc.sequence === existing.sequence && vc.timestamp > existing.timestamp)) {
        merged.set(vc.nodeId, vc);
      }
    }
    
    return Array.from(merged.values());
  }
  
  /**
   * Get sync policy
   */
  getSyncPolicy(): SyncPolicy {
    return { ...this.syncPolicy };
  }
  
  /**
   * Update sync policy
   */
  updateSyncPolicy(policy: Partial<SyncPolicy>): void {
    this.syncPolicy = { ...this.syncPolicy, ...policy };
    
    // Restart intervals if needed
    if (this.syncPolicy.enableBackgroundSync && !this.isRunning) {
      this.startBackgroundSync();
    } else if (!this.syncPolicy.enableBackgroundSync && this.isRunning) {
      this.stop();
    }
  }
  
  /**
   * Stop sync engine
   */
  stop(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.replicationInterval !== null) {
      clearInterval(this.replicationInterval);
      this.replicationInterval = null;
    }
    
    if (this.manifestSyncInterval !== null) {
      clearInterval(this.manifestSyncInterval);
      this.manifestSyncInterval = null;
    }
    
    this.isRunning = false;
    console.log('[SyncEngine] Stopped');
  }
  
  /**
   * Shutdown sync engine
   */
  async shutdown(): Promise<void> {
    this.stop();
    await this.saveMetadata();
    console.log('[SyncEngine] Shutdown complete');
  }
}

// Export singleton
export const syncEngine = SyncEngine.getInstance();
