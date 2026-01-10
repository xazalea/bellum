/**
 * Android Runtime (ART) - Garbage Collector
 * Generational GC with mark-sweep-compact
 */

export interface HeapObject {
  id: number;
  type: string;
  data: any;
  size: number;
  generation: 'young' | 'old';
  marked: boolean;
  references: number[];
}

export interface GCStats {
  youngCollections: number;
  oldCollections: number;
  totalFreed: number;
  totalAllocated: number;
  heapSize: number;
  usedSize: number;
}

/**
 * Generational Garbage Collector for ART
 */
export class ARTGC {
  private heap: Map<number, HeapObject> = new Map();
  private youngGen: Set<number> = new Set();
  private oldGen: Set<number> = new Set();
  private roots: Set<number> = new Set();
  private nextId = 1;
  
  // GC parameters
  private youngGenThreshold = 8 * 1024 * 1024; // 8 MB
  private oldGenThreshold = 64 * 1024 * 1024; // 64 MB
  private youngGenSize = 0;
  private oldGenSize = 0;
  
  // Statistics
  private stats: GCStats = {
    youngCollections: 0,
    oldCollections: 0,
    totalFreed: 0,
    totalAllocated: 0,
    heapSize: 0,
    usedSize: 0,
  };
  
  /**
   * Allocate object in heap
   */
  allocate(type: string, data: any, size: number): number {
    const id = this.nextId++;
    const obj: HeapObject = {
      id,
      type,
      data,
      size,
      generation: 'young',
      marked: false,
      references: [],
    };
    
    this.heap.set(id, obj);
    this.youngGen.add(id);
    this.youngGenSize += size;
    this.stats.totalAllocated += size;
    this.stats.heapSize += size;
    this.stats.usedSize += size;
    
    // Trigger young GC if threshold exceeded
    if (this.youngGenSize > this.youngGenThreshold) {
      this.collectYoung();
    }
    
    return id;
  }
  
  /**
   * Add root reference (prevents collection)
   */
  addRoot(objectId: number): void {
    this.roots.add(objectId);
  }
  
  /**
   * Remove root reference
   */
  removeRoot(objectId: number): void {
    this.roots.delete(objectId);
  }
  
  /**
   * Add reference between objects
   */
  addReference(fromId: number, toId: number): void {
    const obj = this.heap.get(fromId);
    if (obj && !obj.references.includes(toId)) {
      obj.references.push(toId);
    }
  }
  
  /**
   * Get object from heap
   */
  get(objectId: number): any {
    return this.heap.get(objectId)?.data;
  }
  
  /**
   * Young generation collection (minor GC)
   */
  private collectYoung(): void {
    console.log('[ART GC] Starting young generation collection...');
    const startTime = Date.now();
    let freed = 0;
    
    // Mark phase: mark all reachable objects from roots
    this.unmarkAll();
    for (const rootId of this.roots) {
      this.mark(rootId);
    }
    
    // Sweep phase: collect unmarked young objects
    const toDelete: number[] = [];
    for (const objId of this.youngGen) {
      const obj = this.heap.get(objId);
      if (!obj) continue;
      
      if (!obj.marked) {
        // Object is garbage
        toDelete.push(objId);
        freed += obj.size;
      } else {
        // Object survived, promote to old generation
        this.promoteToOld(objId);
      }
    }
    
    // Delete garbage objects
    for (const objId of toDelete) {
      this.heap.delete(objId);
      this.youngGen.delete(objId);
    }
    
    this.youngGenSize -= freed;
    this.stats.youngCollections++;
    this.stats.totalFreed += freed;
    this.stats.usedSize -= freed;
    
    const duration = Date.now() - startTime;
    console.log(`[ART GC] Young GC completed in ${duration}ms, freed ${this.formatBytes(freed)}`);
    
    // Trigger old GC if threshold exceeded
    if (this.oldGenSize > this.oldGenThreshold) {
      this.collectOld();
    }
  }
  
  /**
   * Old generation collection (major GC)
   */
  private collectOld(): void {
    console.log('[ART GC] Starting old generation collection...');
    const startTime = Date.now();
    let freed = 0;
    
    // Mark phase: mark all reachable objects
    this.unmarkAll();
    for (const rootId of this.roots) {
      this.mark(rootId);
    }
    
    // Sweep phase: collect unmarked objects from both generations
    const toDelete: number[] = [];
    
    for (const objId of this.oldGen) {
      const obj = this.heap.get(objId);
      if (!obj) continue;
      
      if (!obj.marked) {
        toDelete.push(objId);
        freed += obj.size;
      }
    }
    
    // Delete garbage objects
    for (const objId of toDelete) {
      this.heap.delete(objId);
      this.oldGen.delete(objId);
    }
    
    // Compact phase (simplified - just update size tracking)
    this.oldGenSize -= freed;
    this.stats.oldCollections++;
    this.stats.totalFreed += freed;
    this.stats.usedSize -= freed;
    
    const duration = Date.now() - startTime;
    console.log(`[ART GC] Old GC completed in ${duration}ms, freed ${this.formatBytes(freed)}`);
  }
  
  /**
   * Mark object and all reachable objects
   */
  private mark(objectId: number): void {
    const obj = this.heap.get(objectId);
    if (!obj || obj.marked) return;
    
    obj.marked = true;
    
    // Recursively mark referenced objects
    for (const refId of obj.references) {
      this.mark(refId);
    }
  }
  
  /**
   * Unmark all objects
   */
  private unmarkAll(): void {
    for (const obj of this.heap.values()) {
      obj.marked = false;
    }
  }
  
  /**
   * Promote object from young to old generation
   */
  private promoteToOld(objectId: number): void {
    const obj = this.heap.get(objectId);
    if (!obj || obj.generation === 'old') return;
    
    obj.generation = 'old';
    this.youngGen.delete(objectId);
    this.oldGen.add(objectId);
    this.youngGenSize -= obj.size;
    this.oldGenSize += obj.size;
  }
  
  /**
   * Force garbage collection
   */
  forceCollection(): void {
    this.collectYoung();
    this.collectOld();
  }
  
  /**
   * Get GC statistics
   */
  getStats(): GCStats {
    return { ...this.stats };
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.youngCollections = 0;
    this.stats.oldCollections = 0;
    this.stats.totalFreed = 0;
  }
  
  /**
   * Get heap info
   */
  getHeapInfo(): {
    totalObjects: number;
    youngObjects: number;
    oldObjects: number;
    youngSize: number;
    oldSize: number;
    rootCount: number;
  } {
    return {
      totalObjects: this.heap.size,
      youngObjects: this.youngGen.size,
      oldObjects: this.oldGen.size,
      youngSize: this.youngGenSize,
      oldSize: this.oldGenSize,
      rootCount: this.roots.size,
    };
  }
  
  /**
   * Set GC parameters
   */
  setParameters(params: {
    youngGenThreshold?: number;
    oldGenThreshold?: number;
  }): void {
    if (params.youngGenThreshold !== undefined) {
      this.youngGenThreshold = params.youngGenThreshold;
    }
    if (params.oldGenThreshold !== undefined) {
      this.oldGenThreshold = params.oldGenThreshold;
    }
  }
  
  /**
   * Clear entire heap (for testing)
   */
  clear(): void {
    this.heap.clear();
    this.youngGen.clear();
    this.oldGen.clear();
    this.roots.clear();
    this.youngGenSize = 0;
    this.oldGenSize = 0;
    this.stats.heapSize = 0;
    this.stats.usedSize = 0;
  }
  
  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
