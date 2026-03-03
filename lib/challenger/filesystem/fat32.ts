/**
 * FAT32 File System Implementation
 * Simplified FAT32 for Windows compatibility
 */

import { FileSystemBackend } from './vfs';

export interface FAT32BootSector {
  bytesPerSector: number;
  sectorsPerCluster: number;
  reservedSectors: number;
  numberOfFATs: number;
  totalSectors: number;
  fatSize: number;
  rootDirFirstCluster: number;
}

export interface FAT32DirEntry {
  name: string;
  attributes: number;
  firstCluster: number;
  fileSize: number;
  createdTime: Date;
  modifiedTime: Date;
  accessedTime: Date;
}

/**
 * FAT32 File System
 */
export class FAT32 implements FileSystemBackend {
  private bootSector: FAT32BootSector;
  private fat: Uint32Array; // File Allocation Table
  private clusterData: Map<number, Uint8Array> = new Map();
  private nextFreeCluster = 2; // Clusters 0 and 1 are reserved
  
  constructor(totalSize: number = 512 * 1024 * 1024) { // 512 MB default
    const bytesPerSector = 512;
    const sectorsPerCluster = 8; // 4KB clusters
    const clusterSize = bytesPerSector * sectorsPerCluster;
    const totalClusters = Math.floor(totalSize / clusterSize);
    
    this.bootSector = {
      bytesPerSector,
      sectorsPerCluster,
      reservedSectors: 32,
      numberOfFATs: 2,
      totalSectors: Math.floor(totalSize / bytesPerSector),
      fatSize: Math.ceil(totalClusters * 4 / bytesPerSector),
      rootDirFirstCluster: 2,
    };
    
    // Initialize FAT
    this.fat = new Uint32Array(totalClusters);
    this.fat[0] = 0x0FFFFFF8; // Media type
    this.fat[1] = 0x0FFFFFFF; // End of chain
    
    console.log(`[FAT32] Initialized ${totalSize / (1024 * 1024)}MB volume`);
  }
  
  /**
   * Read from inode (cluster chain)
   */
  async read(inode: number, offset: number, length: number): Promise<Uint8Array> {
    const clusterSize = this.getClusterSize();
    const startCluster = Math.floor(offset / clusterSize);
    const clusterOffset = offset % clusterSize;
    
    // Find starting cluster
    let cluster = inode;
    for (let i = 0; i < startCluster; i++) {
      cluster = this.fat[cluster];
      if (cluster >= 0x0FFFFFF8) {
        // End of chain
        return new Uint8Array(0);
      }
    }
    
    // Read data
    const result = new Uint8Array(length);
    let bytesRead = 0;
    let currentOffset = clusterOffset;
    
    while (bytesRead < length && cluster < 0x0FFFFFF8) {
      const clusterData = this.clusterData.get(cluster);
      if (!clusterData) break;
      
      const bytesToRead = Math.min(length - bytesRead, clusterSize - currentOffset);
      result.set(clusterData.subarray(currentOffset, currentOffset + bytesToRead), bytesRead);
      
      bytesRead += bytesToRead;
      currentOffset = 0;
      cluster = this.fat[cluster];
    }
    
    return result.slice(0, bytesRead);
  }
  
  /**
   * Write to inode (cluster chain)
   */
  async write(inode: number, offset: number, data: Uint8Array): Promise<void> {
    const clusterSize = this.getClusterSize();
    const clustersNeeded = Math.ceil((offset + data.length) / clusterSize);
    
    // Ensure we have enough clusters
    const clusters = this.getClusterChain(inode);
    while (clusters.length < clustersNeeded) {
      const newCluster = this.allocateCluster();
      if (clusters.length > 0) {
        this.fat[clusters[clusters.length - 1]] = newCluster;
      }
      clusters.push(newCluster);
    }
    
    // Write data
    let bytesWritten = 0;
    let clusterIndex = Math.floor(offset / clusterSize);
    let clusterOffset = offset % clusterSize;
    
    while (bytesWritten < data.length) {
      const cluster = clusters[clusterIndex];
      let clusterData = this.clusterData.get(cluster);
      
      if (!clusterData) {
        clusterData = new Uint8Array(clusterSize);
        this.clusterData.set(cluster, clusterData);
      }
      
      const bytesToWrite = Math.min(data.length - bytesWritten, clusterSize - clusterOffset);
      clusterData.set(data.subarray(bytesWritten, bytesWritten + bytesToWrite), clusterOffset);
      
      bytesWritten += bytesToWrite;
      clusterOffset = 0;
      clusterIndex++;
    }
  }
  
  /**
   * Allocate blocks (clusters)
   */
  async allocateBlocks(count: number): Promise<number[]> {
    const clusters: number[] = [];
    
    for (let i = 0; i < count; i++) {
      const cluster = this.allocateCluster();
      clusters.push(cluster);
      
      if (i > 0) {
        this.fat[clusters[i - 1]] = cluster;
      }
    }
    
    // Mark end of chain
    if (clusters.length > 0) {
      this.fat[clusters[clusters.length - 1]] = 0x0FFFFFFF;
    }
    
    return clusters;
  }
  
  /**
   * Free blocks (clusters)
   */
  async freeBlocks(blocks: number[]): Promise<void> {
    for (const cluster of blocks) {
      this.fat[cluster] = 0; // Mark as free
      this.clusterData.delete(cluster);
    }
  }
  
  /**
   * Allocate single cluster
   */
  private allocateCluster(): number {
    // Find next free cluster
    while (this.nextFreeCluster < this.fat.length) {
      if (this.fat[this.nextFreeCluster] === 0) {
        const cluster = this.nextFreeCluster;
        this.fat[cluster] = 0x0FFFFFFF; // Mark as end of chain
        this.nextFreeCluster++;
        return cluster;
      }
      this.nextFreeCluster++;
    }
    
    throw new Error('Disk full');
  }
  
  /**
   * Get cluster chain for inode
   */
  private getClusterChain(startCluster: number): number[] {
    const chain: number[] = [];
    let cluster = startCluster;
    
    while (cluster < 0x0FFFFFF8) {
      chain.push(cluster);
      cluster = this.fat[cluster];
    }
    
    return chain;
  }
  
  /**
   * Get cluster size
   */
  private getClusterSize(): number {
    return this.bootSector.bytesPerSector * this.bootSector.sectorsPerCluster;
  }
  
  /**
   * Format volume
   */
  format(): void {
    // Clear FAT
    this.fat.fill(0);
    this.fat[0] = 0x0FFFFFF8;
    this.fat[1] = 0x0FFFFFFF;
    
    // Clear cluster data
    this.clusterData.clear();
    this.nextFreeCluster = 2;
    
    console.log('[FAT32] Volume formatted');
  }
  
  /**
   * Get free space
   */
  getFreeSpace(): number {
    let freeClusters = 0;
    for (let i = 2; i < this.fat.length; i++) {
      if (this.fat[i] === 0) {
        freeClusters++;
      }
    }
    return freeClusters * this.getClusterSize();
  }
  
  /**
   * Get used space
   */
  getUsedSpace(): number {
    const totalSpace = (this.fat.length - 2) * this.getClusterSize();
    return totalSpace - this.getFreeSpace();
  }
}
