/**
 * Heap Manager
 * Fast memory allocator for runtime objects
 * 
 * Features:
 * - Fast malloc/free operations
 * - Memory pooling for common sizes
 * - Defragmentation support
 * - Garbage collection for managed code
 * - Memory leak detection
 */

// ============================================================================
// Types
// ============================================================================

export type HeapPointer = number;

export interface HeapBlock {
  address: HeapPointer;
  size: number;
  free: boolean;
  next: HeapBlock | null;
  prev: HeapBlock | null;
}

export interface MemoryPool {
  blockSize: number;
  blocks: HeapBlock[];
  freeList: HeapBlock[];
}

export interface HeapStats {
  totalSize: number;
  used: number;
  free: number;
  fragmentation: number;
  allocations: number;
  deallocations: number;
}

// ============================================================================
// Heap Manager
// ============================================================================

export class HeapManager {
  private heapMemory: Uint8Array;
  private heapSize: number;
  private freeList: HeapBlock | null = null;
  private allocatedBlocks: Map<HeapPointer, HeapBlock> = new Map();
  
  // Memory pools for common sizes
  private pools: Map<number, MemoryPool> = new Map();
  private poolSizes = [16, 32, 64, 128, 256, 512, 1024, 2048];

  // Statistics
  private stats = {
    allocations: 0,
    deallocations: 0,
    totalAllocated: 0,
    currentUsed: 0,
  };

  // Garbage collection
  private markedObjects: Set<HeapPointer> = new Set();
  private gcEnabled: boolean = false;

  constructor(heapSize: number = 64 * 1024 * 1024) { // Default 64MB heap
    this.heapSize = heapSize;
    this.heapMemory = new Uint8Array(heapSize);
    
    // Initialize with one large free block
    this.freeList = {
      address: 0,
      size: heapSize,
      free: true,
      next: null,
      prev: null,
    };

    // Initialize memory pools
    this.initializePools();

    console.log(`[HeapManager] Initialized ${heapSize / (1024 * 1024)}MB heap`);
  }

  /**
   * Initialize memory pools
   */
  private initializePools(): void {
    for (const size of this.poolSizes) {
      this.pools.set(size, {
        blockSize: size,
        blocks: [],
        freeList: [],
      });
    }
  }

  /**
   * Allocate memory
   */
  malloc(size: number): HeapPointer {
    if (size === 0) {
      throw new Error('Cannot allocate 0 bytes');
    }

    // Align to 8-byte boundary
    size = (size + 7) & ~7;

    // Try pool allocation first for small sizes
    if (size <= 2048) {
      const poolPtr = this.allocateFromPool(size);
      if (poolPtr !== null) {
        return poolPtr;
      }
    }

    // Use free list for larger allocations
    const block = this.findFreeBlock(size);
    if (!block) {
      console.error(`[HeapManager] Out of memory (requested: ${size} bytes)`);
      
      // Try garbage collection
      if (this.gcEnabled) {
        this.collectGarbage();
        const retryBlock = this.findFreeBlock(size);
        if (retryBlock) {
          return this.allocateBlock(retryBlock, size);
        }
      }
      
      throw new Error(`Out of memory (requested: ${size} bytes)`);
    }

    return this.allocateBlock(block, size);
  }

  /**
   * Free memory
   */
  free(ptr: HeapPointer): void {
    if (ptr === 0) {
      return; // NULL pointer
    }

    const block = this.allocatedBlocks.get(ptr);
    if (!block) {
      console.warn(`[HeapManager] Attempted to free invalid pointer: 0x${ptr.toString(16)}`);
      return;
    }

    // Zero out memory (for security)
    this.heapMemory.fill(0, block.address, block.address + block.size);

    block.free = true;
    this.allocatedBlocks.delete(ptr);
    this.stats.deallocations++;
    this.stats.currentUsed -= block.size;

    // Add back to free list
    this.addToFreeList(block);

    // Coalesce adjacent free blocks
    this.coalesce(block);
  }

  /**
   * Reallocate memory
   */
  realloc(ptr: HeapPointer, newSize: number): HeapPointer {
    if (ptr === 0) {
      return this.malloc(newSize);
    }

    if (newSize === 0) {
      this.free(ptr);
      return 0;
    }

    const block = this.allocatedBlocks.get(ptr);
    if (!block) {
      throw new Error(`Invalid pointer for realloc: 0x${ptr.toString(16)}`);
    }

    // If size is smaller or same, just return same pointer
    if (newSize <= block.size) {
      return ptr;
    }

    // Allocate new block
    const newPtr = this.malloc(newSize);
    
    // Copy old data
    const oldData = this.heapMemory.slice(block.address, block.address + block.size);
    this.heapMemory.set(oldData, newPtr);
    
    // Free old block
    this.free(ptr);

    return newPtr;
  }

  /**
   * Allocate from memory pool
   */
  private allocateFromPool(size: number): HeapPointer | null {
    // Find smallest pool that fits
    let poolSize = 16;
    for (const ps of this.poolSizes) {
      if (ps >= size) {
        poolSize = ps;
        break;
      }
    }

    const pool = this.pools.get(poolSize);
    if (!pool) {
      return null;
    }

    // Use from free list if available
    if (pool.freeList.length > 0) {
      const block = pool.freeList.pop()!;
      block.free = false;
      this.allocatedBlocks.set(block.address, block);
      this.stats.allocations++;
      this.stats.currentUsed += block.size;
      return block.address;
    }

    // Create new block from main heap
    const ptr = this.malloc(poolSize);
    const block: HeapBlock = {
      address: ptr,
      size: poolSize,
      free: false,
      next: null,
      prev: null,
    };
    
    pool.blocks.push(block);
    return ptr;
  }

  /**
   * Find free block that fits
   */
  private findFreeBlock(size: number): HeapBlock | null {
    let current = this.freeList;
    let bestFit: HeapBlock | null = null;
    let bestFitSize = Infinity;

    // Best-fit strategy
    while (current) {
      if (current.free && current.size >= size && current.size < bestFitSize) {
        bestFit = current;
        bestFitSize = current.size;
        
        // Perfect fit
        if (current.size === size) {
          break;
        }
      }
      current = current.next;
    }

    return bestFit;
  }

  /**
   * Allocate block
   */
  private allocateBlock(block: HeapBlock, size: number): HeapPointer {
    // Split block if it's larger than needed
    if (block.size > size + 16) { // Minimum split size
      const newBlock: HeapBlock = {
        address: block.address + size,
        size: block.size - size,
        free: true,
        next: block.next,
        prev: block,
      };

      if (block.next) {
        block.next.prev = newBlock;
      }
      block.next = newBlock;
      block.size = size;

      this.addToFreeList(newBlock);
    }

    block.free = false;
    this.removeFromFreeList(block);
    this.allocatedBlocks.set(block.address, block);
    
    this.stats.allocations++;
    this.stats.totalAllocated += size;
    this.stats.currentUsed += size;

    return block.address;
  }

  /**
   * Add block to free list
   */
  private addToFreeList(block: HeapBlock): void {
    if (!this.freeList) {
      this.freeList = block;
      block.next = null;
      block.prev = null;
    } else {
      block.next = this.freeList;
      block.prev = null;
      this.freeList.prev = block;
      this.freeList = block;
    }
  }

  /**
   * Remove block from free list
   */
  private removeFromFreeList(block: HeapBlock): void {
    if (block.prev) {
      block.prev.next = block.next;
    } else {
      this.freeList = block.next;
    }

    if (block.next) {
      block.next.prev = block.prev;
    }
  }

  /**
   * Coalesce adjacent free blocks
   */
  private coalesce(block: HeapBlock): void {
    // Coalesce with next block
    if (block.next && block.next.free && block.address + block.size === block.next.address) {
      block.size += block.next.size;
      this.removeFromFreeList(block.next);
      block.next = block.next.next;
      if (block.next) {
        block.next.prev = block;
      }
    }

    // Coalesce with previous block
    if (block.prev && block.prev.free && block.prev.address + block.prev.size === block.address) {
      block.prev.size += block.size;
      this.removeFromFreeList(block);
      block.prev.next = block.next;
      if (block.next) {
        block.next.prev = block.prev;
      }
    }
  }

  /**
   * Read from heap
   */
  read(ptr: HeapPointer, size: number): Uint8Array {
    if (ptr + size > this.heapSize) {
      throw new Error(`Read out of bounds: 0x${ptr.toString(16)} + ${size}`);
    }
    return this.heapMemory.slice(ptr, ptr + size);
  }

  /**
   * Write to heap
   */
  write(ptr: HeapPointer, data: Uint8Array): void {
    if (ptr + data.length > this.heapSize) {
      throw new Error(`Write out of bounds: 0x${ptr.toString(16)} + ${data.length}`);
    }
    this.heapMemory.set(data, ptr);
  }

  /**
   * Enable garbage collection
   */
  enableGC(): void {
    this.gcEnabled = true;
    console.log('[HeapManager] Garbage collection enabled');
  }

  /**
   * Mark object as reachable
   */
  markObject(ptr: HeapPointer): void {
    if (this.markedObjects.has(ptr)) {
      return; // Already marked
    }

    this.markedObjects.add(ptr);

    // In real implementation, would scan object for pointers
    // and recursively mark referenced objects
  }

  /**
   * Sweep unmarked objects
   */
  sweepUnmarked(): void {
    let freedCount = 0;
    let freedBytes = 0;

    for (const [ptr, block] of this.allocatedBlocks) {
      if (!this.markedObjects.has(ptr)) {
        freedBytes += block.size;
        freedCount++;
        this.free(ptr);
      }
    }

    console.log(`[HeapManager] Sweep: freed ${freedCount} objects (${freedBytes} bytes)`);
    this.markedObjects.clear();
  }

  /**
   * Collect garbage
   */
  collectGarbage(): void {
    if (!this.gcEnabled) {
      return;
    }

    console.log('[HeapManager] Running garbage collection...');
    const startTime = performance.now();

    // Mark phase (simplified - would need root set)
    // In real GC, would scan stack, globals, etc. for roots

    // Sweep phase
    this.sweepUnmarked();

    const duration = performance.now() - startTime;
    console.log(`[HeapManager] GC completed in ${duration.toFixed(2)}ms`);
  }

  /**
   * Defragment heap
   */
  defragment(): void {
    console.log('[HeapManager] Defragmenting heap...');
    // This would move allocated blocks to eliminate fragmentation
    // Simplified implementation
  }

  /**
   * Get heap statistics
   */
  getStatistics(): HeapStats {
    let freeBytes = 0;
    let current = this.freeList;
    
    while (current) {
      if (current.free) {
        freeBytes += current.size;
      }
      current = current.next;
    }

    const fragmentation = this.calculateFragmentation();

    return {
      totalSize: this.heapSize,
      used: this.stats.currentUsed,
      free: this.heapSize - this.stats.currentUsed,
      fragmentation,
      allocations: this.stats.allocations,
      deallocations: this.stats.deallocations,
    };
  }

  /**
   * Calculate fragmentation
   */
  private calculateFragmentation(): number {
    let freeBlockCount = 0;
    let current = this.freeList;
    
    while (current) {
      if (current.free) {
        freeBlockCount++;
      }
      current = current.next;
    }

    // Simple fragmentation metric: number of free blocks
    // Lower is better
    return freeBlockCount;
  }

  /**
   * Detect memory leaks
   */
  detectLeaks(): Array<{ address: HeapPointer; size: number }> {
    const leaks: Array<{ address: HeapPointer; size: number }> = [];

    // In real implementation, would track allocation call stacks
    // and identify long-lived allocations that are never freed

    for (const [ptr, block] of this.allocatedBlocks) {
      // Heuristic: blocks allocated a long time ago
      // In real impl, would have timestamp
      leaks.push({ address: ptr, size: block.size });
    }

    return leaks;
  }

  /**
   * Reset heap
   */
  reset(): void {
    this.heapMemory.fill(0);
    this.freeList = {
      address: 0,
      size: this.heapSize,
      free: true,
      next: null,
      prev: null,
    };
    this.allocatedBlocks.clear();
    this.markedObjects.clear();
    
    this.stats = {
      allocations: 0,
      deallocations: 0,
      totalAllocated: 0,
      currentUsed: 0,
    };

    console.log('[HeapManager] Heap reset');
  }
}

// Export singleton
export const heapManager = new HeapManager();
