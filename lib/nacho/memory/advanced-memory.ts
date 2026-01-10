/**
 * Advanced Memory Management System
 * Implements virtual memory with paging, memory protection, and heap allocation
 */

// Memory protection flags
export enum MemoryProtection {
  NONE = 0,
  READ = 1 << 0,
  WRITE = 1 << 1,
  EXECUTE = 1 << 2,
  READ_WRITE = READ | WRITE,
  READ_EXECUTE = READ | EXECUTE,
  READ_WRITE_EXECUTE = READ | WRITE | EXECUTE,
}

// Page size constants
export const PAGE_SIZE = 4096; // 4KB pages
export const PAGE_SHIFT = 12; // log2(4096)
export const PAGE_MASK = PAGE_SIZE - 1;

// Memory allocation types
export enum AllocationType {
  RESERVE = 0x00002000,
  COMMIT = 0x00001000,
  RESET = 0x00080000,
  LARGE_PAGES = 0x20000000,
  PHYSICAL = 0x00400000,
  TOP_DOWN = 0x00100000,
}

// Memory regions
interface MemoryRegion {
  baseAddress: number;
  size: number;
  protection: MemoryProtection;
  allocated: boolean;
  committed: boolean;
  data: Uint8Array | null;
}

// Page table entry
interface PageTableEntry {
  physicalAddress: number;
  protection: MemoryProtection;
  present: boolean;
  dirty: boolean;
  accessed: boolean;
}

/**
 * Virtual Memory Manager
 * Manages virtual address space with page tables and memory protection
 */
export class VirtualMemoryManager {
  private pageTable: Map<number, PageTableEntry> = new Map();
  private physicalMemory: Uint8Array;
  private regions: MemoryRegion[] = [];
  private heapStart: number;
  private heapEnd: number;
  private nextAllocationAddress: number;
  
  // Memory limits
  private readonly VIRTUAL_ADDRESS_SPACE = 0x100000000; // 4GB for 32-bit
  private readonly PHYSICAL_MEMORY_SIZE = 512 * 1024 * 1024; // 512MB physical
  private physicalMemoryUsed = 0;

  constructor(heapStart = 0x10000000, heapSize = 256 * 1024 * 1024) {
    this.physicalMemory = new Uint8Array(this.PHYSICAL_MEMORY_SIZE);
    this.heapStart = heapStart;
    this.heapEnd = heapStart + heapSize;
    this.nextAllocationAddress = heapStart;
    
    console.log(`[VMM] Initialized: Heap ${heapStart.toString(16)} - ${this.heapEnd.toString(16)}`);
  }

  /**
   * Allocate virtual memory
   */
  allocate(
    address: number,
    size: number,
    allocationType: AllocationType,
    protection: MemoryProtection
  ): number {
    // Align address and size to page boundaries
    const alignedAddress = address ? this.alignToPage(address) : this.findFreeRegion(size);
    const alignedSize = this.alignToPage(size);
    const numPages = alignedSize / PAGE_SIZE;

    console.log(`[VMM] Allocate: addr=0x${alignedAddress.toString(16)}, size=${alignedSize}, pages=${numPages}`);

    // Check if region is available
    if (!this.isRegionFree(alignedAddress, alignedSize)) {
      console.error(`[VMM] Region already allocated: 0x${alignedAddress.toString(16)}`);
      return 0;
    }

    // Create memory region
    const region: MemoryRegion = {
      baseAddress: alignedAddress,
      size: alignedSize,
      protection,
      allocated: true,
      committed: (allocationType & AllocationType.COMMIT) !== 0,
      data: null,
    };

    // Allocate physical memory if committed
    if (region.committed) {
      if (this.physicalMemoryUsed + alignedSize > this.PHYSICAL_MEMORY_SIZE) {
        console.error('[VMM] Out of physical memory');
        return 0;
      }
      
      region.data = new Uint8Array(this.physicalMemory.buffer, this.physicalMemoryUsed, alignedSize);
      this.physicalMemoryUsed += alignedSize;

      // Map pages
      for (let i = 0; i < numPages; i++) {
        const virtualPage = (alignedAddress >> PAGE_SHIFT) + i;
        const physicalAddress = this.physicalMemoryUsed - alignedSize + (i * PAGE_SIZE);
        
        this.pageTable.set(virtualPage, {
          physicalAddress,
          protection,
          present: true,
          dirty: false,
          accessed: false,
        });
      }
    }

    this.regions.push(region);
    return alignedAddress;
  }

  /**
   * Free virtual memory
   */
  free(address: number): boolean {
    const alignedAddress = this.alignToPage(address);
    const regionIndex = this.regions.findIndex(r => r.baseAddress === alignedAddress);
    
    if (regionIndex === -1) {
      console.error(`[VMM] Free failed: Invalid address 0x${alignedAddress.toString(16)}`);
      return false;
    }

    const region = this.regions[regionIndex];
    const numPages = region.size / PAGE_SIZE;

    // Unmap pages
    for (let i = 0; i < numPages; i++) {
      const virtualPage = (alignedAddress >> PAGE_SHIFT) + i;
      this.pageTable.delete(virtualPage);
    }

    this.regions.splice(regionIndex, 1);
    console.log(`[VMM] Freed: addr=0x${alignedAddress.toString(16)}, size=${region.size}`);
    return true;
  }

  /**
   * Change memory protection
   */
  protect(address: number, size: number, newProtection: MemoryProtection): boolean {
    const alignedAddress = this.alignToPage(address);
    const alignedSize = this.alignToPage(size);
    const numPages = alignedSize / PAGE_SIZE;

    for (let i = 0; i < numPages; i++) {
      const virtualPage = (alignedAddress >> PAGE_SHIFT) + i;
      const pte = this.pageTable.get(virtualPage);
      
      if (!pte) {
        console.error(`[VMM] Protect failed: Page not mapped 0x${(virtualPage << PAGE_SHIFT).toString(16)}`);
        return false;
      }
      
      pte.protection = newProtection;
    }

    // Update region protection
    const region = this.regions.find(r => 
      alignedAddress >= r.baseAddress && 
      alignedAddress < r.baseAddress + r.size
    );
    
    if (region) {
      region.protection = newProtection;
    }

    console.log(`[VMM] Protected: addr=0x${alignedAddress.toString(16)}, size=${alignedSize}, prot=${newProtection}`);
    return true;
  }

  /**
   * Read memory with protection check
   */
  read(address: number, size: number): Uint8Array | null {
    const virtualPage = address >> PAGE_SHIFT;
    const pte = this.pageTable.get(virtualPage);

    if (!pte || !pte.present) {
      console.error(`[VMM] Page fault (read): 0x${address.toString(16)}`);
      return null;
    }

    if (!(pte.protection & MemoryProtection.READ)) {
      console.error(`[VMM] Access violation (read): 0x${address.toString(16)}`);
      return null;
    }

    pte.accessed = true;
    
    const offset = address & PAGE_MASK;
    const physicalAddress = pte.physicalAddress + offset;
    
    return new Uint8Array(this.physicalMemory.buffer, physicalAddress, Math.min(size, PAGE_SIZE - offset));
  }

  /**
   * Write memory with protection check
   */
  write(address: number, data: Uint8Array): boolean {
    const virtualPage = address >> PAGE_SHIFT;
    const pte = this.pageTable.get(virtualPage);

    if (!pte || !pte.present) {
      console.error(`[VMM] Page fault (write): 0x${address.toString(16)}`);
      return false;
    }

    if (!(pte.protection & MemoryProtection.WRITE)) {
      console.error(`[VMM] Access violation (write): 0x${address.toString(16)}`);
      return false;
    }

    pte.accessed = true;
    pte.dirty = true;
    
    const offset = address & PAGE_MASK;
    const physicalAddress = pte.physicalAddress + offset;
    const writeSize = Math.min(data.length, PAGE_SIZE - offset);
    
    this.physicalMemory.set(data.subarray(0, writeSize), physicalAddress);
    return true;
  }

  /**
   * Check if memory is executable
   */
  isExecutable(address: number): boolean {
    const virtualPage = address >> PAGE_SHIFT;
    const pte = this.pageTable.get(virtualPage);
    return pte ? (pte.protection & MemoryProtection.EXECUTE) !== 0 : false;
  }

  /**
   * Helper: Align address to page boundary
   */
  private alignToPage(address: number): number {
    return (address + PAGE_SIZE - 1) & ~PAGE_MASK;
  }

  /**
   * Helper: Find free region of specified size
   */
  private findFreeRegion(size: number): number {
    const alignedSize = this.alignToPage(size);
    
    // Simple allocation strategy: linear search from nextAllocationAddress
    let candidate = this.nextAllocationAddress;
    
    while (candidate + alignedSize < this.heapEnd) {
      if (this.isRegionFree(candidate, alignedSize)) {
        this.nextAllocationAddress = candidate + alignedSize;
        return candidate;
      }
      candidate += PAGE_SIZE;
    }
    
    console.error('[VMM] Out of virtual address space');
    return 0;
  }

  /**
   * Helper: Check if region is free
   */
  private isRegionFree(address: number, size: number): boolean {
    return !this.regions.some(r => 
      (address >= r.baseAddress && address < r.baseAddress + r.size) ||
      (address + size > r.baseAddress && address + size <= r.baseAddress + r.size) ||
      (address <= r.baseAddress && address + size >= r.baseAddress + r.size)
    );
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      totalPhysical: this.PHYSICAL_MEMORY_SIZE,
      usedPhysical: this.physicalMemoryUsed,
      freePhysical: this.PHYSICAL_MEMORY_SIZE - this.physicalMemoryUsed,
      totalVirtual: this.VIRTUAL_ADDRESS_SPACE,
      usedVirtual: this.regions.reduce((sum, r) => sum + r.size, 0),
      numRegions: this.regions.length,
      numPages: this.pageTable.size,
    };
  }
}

/**
 * Heap Allocator
 * Implements malloc/free with best-fit allocation strategy
 */
export class HeapAllocator {
  private vmm: VirtualMemoryManager;
  private heapBase: number;
  private heapSize: number;
  private freeBlocks: Array<{ address: number; size: number }> = [];
  private allocatedBlocks: Map<number, number> = new Map(); // address -> size

  constructor(vmm: VirtualMemoryManager, heapBase: number, heapSize: number) {
    this.vmm = vmm;
    this.heapBase = heapBase;
    this.heapSize = heapSize;
    
    // Allocate heap memory
    const heapAddr = vmm.allocate(
      heapBase,
      heapSize,
      AllocationType.COMMIT,
      MemoryProtection.READ_WRITE
    );
    
    if (heapAddr === 0) {
      throw new Error('Failed to allocate heap memory');
    }
    
    // Initialize with one large free block
    this.freeBlocks.push({ address: heapBase, size: heapSize });
    
    console.log(`[Heap] Initialized: base=0x${heapBase.toString(16)}, size=${heapSize}`);
  }

  /**
   * Allocate memory (malloc)
   */
  malloc(size: number): number {
    if (size === 0) return 0;
    
    // Align to 8 bytes
    const alignedSize = (size + 7) & ~7;
    
    // Find best-fit free block
    let bestIndex = -1;
    let bestSize = Infinity;
    
    for (let i = 0; i < this.freeBlocks.length; i++) {
      const block = this.freeBlocks[i];
      if (block.size >= alignedSize && block.size < bestSize) {
        bestIndex = i;
        bestSize = block.size;
      }
    }
    
    if (bestIndex === -1) {
      console.error(`[Heap] Out of memory: requested ${alignedSize} bytes`);
      return 0;
    }
    
    const block = this.freeBlocks[bestIndex];
    const address = block.address;
    
    // Split block if necessary
    if (block.size > alignedSize) {
      block.address += alignedSize;
      block.size -= alignedSize;
    } else {
      this.freeBlocks.splice(bestIndex, 1);
    }
    
    this.allocatedBlocks.set(address, alignedSize);
    console.log(`[Heap] malloc(${size}) = 0x${address.toString(16)}`);
    return address;
  }

  /**
   * Free memory (free)
   */
  free(address: number): boolean {
    const size = this.allocatedBlocks.get(address);
    
    if (!size) {
      console.error(`[Heap] Invalid free: 0x${address.toString(16)}`);
      return false;
    }
    
    this.allocatedBlocks.delete(address);
    
    // Add to free blocks
    this.freeBlocks.push({ address, size });
    
    // Coalesce adjacent free blocks
    this.coalesce();
    
    console.log(`[Heap] free(0x${address.toString(16)})`);
    return true;
  }

  /**
   * Reallocate memory (realloc)
   */
  realloc(address: number, newSize: number): number {
    if (address === 0) {
      return this.malloc(newSize);
    }
    
    if (newSize === 0) {
      this.free(address);
      return 0;
    }
    
    const oldSize = this.allocatedBlocks.get(address);
    if (!oldSize) {
      console.error(`[Heap] Invalid realloc: 0x${address.toString(16)}`);
      return 0;
    }
    
    // If new size fits in current block, just update size
    const alignedNewSize = (newSize + 7) & ~7;
    if (alignedNewSize <= oldSize) {
      this.allocatedBlocks.set(address, alignedNewSize);
      // Add remaining space to free blocks if significant
      if (oldSize - alignedNewSize > 16) {
        this.freeBlocks.push({ address: address + alignedNewSize, size: oldSize - alignedNewSize });
        this.coalesce();
      }
      return address;
    }
    
    // Allocate new block and copy data
    const newAddress = this.malloc(newSize);
    if (newAddress === 0) return 0;
    
    // Copy old data (simplified - would need proper memory copy in real impl)
    const oldData = this.vmm.read(address, oldSize);
    if (oldData) {
      this.vmm.write(newAddress, oldData);
    }
    
    this.free(address);
    return newAddress;
  }

  /**
   * Coalesce adjacent free blocks
   */
  private coalesce() {
    // Sort free blocks by address
    this.freeBlocks.sort((a, b) => a.address - b.address);
    
    // Merge adjacent blocks
    let i = 0;
    while (i < this.freeBlocks.length - 1) {
      const current = this.freeBlocks[i];
      const next = this.freeBlocks[i + 1];
      
      if (current.address + current.size === next.address) {
        current.size += next.size;
        this.freeBlocks.splice(i + 1, 1);
      } else {
        i++;
      }
    }
  }

  /**
   * Get heap statistics
   */
  getStats() {
    const totalFree = this.freeBlocks.reduce((sum, b) => sum + b.size, 0);
    const totalAllocated = Array.from(this.allocatedBlocks.values()).reduce((sum, s) => sum + s, 0);
    
    return {
      heapBase: this.heapBase,
      heapSize: this.heapSize,
      allocated: totalAllocated,
      free: totalFree,
      numAllocations: this.allocatedBlocks.size,
      numFreeBlocks: this.freeBlocks.length,
    };
  }
}

/**
 * Garbage Collector for Managed Code
 * Simple mark-and-sweep collector
 */
export class GarbageCollector {
  private heap: HeapAllocator;
  private roots: Set<number> = new Set();
  private objects: Map<number, { size: number; marked: boolean }> = new Map();

  constructor(heap: HeapAllocator) {
    this.heap = heap;
  }

  /**
   * Allocate managed object
   */
  allocObject(size: number): number {
    const address = this.heap.malloc(size);
    if (address !== 0) {
      this.objects.set(address, { size, marked: false });
    }
    return address;
  }

  /**
   * Add root reference
   */
  addRoot(address: number) {
    this.roots.add(address);
  }

  /**
   * Remove root reference
   */
  removeRoot(address: number) {
    this.roots.delete(address);
  }

  /**
   * Run garbage collection
   */
  collect() {
    console.log('[GC] Starting collection...');
    const startTime = performance.now();
    
    // Mark phase
    this.mark();
    
    // Sweep phase
    const freed = this.sweep();
    
    const endTime = performance.now();
    console.log(`[GC] Collected ${freed} objects in ${(endTime - startTime).toFixed(2)}ms`);
  }

  /**
   * Mark phase: mark all reachable objects
   */
  private mark() {
    // Reset marks
    for (const obj of this.objects.values()) {
      obj.marked = false;
    }
    
    // Mark from roots
    for (const root of this.roots) {
      this.markObject(root);
    }
  }

  /**
   * Mark object and its references
   */
  private markObject(address: number) {
    const obj = this.objects.get(address);
    if (!obj || obj.marked) return;
    
    obj.marked = true;
    
    // In a real implementation, would recursively mark referenced objects
    // This is simplified and would need object graph traversal
  }

  /**
   * Sweep phase: free unmarked objects
   */
  private sweep(): number {
    let freed = 0;
    
    for (const [address, obj] of this.objects.entries()) {
      if (!obj.marked) {
        this.heap.free(address);
        this.objects.delete(address);
        freed++;
      }
    }
    
    return freed;
  }

  /**
   * Get GC statistics
   */
  getStats() {
    const totalObjects = this.objects.size;
    const totalSize = Array.from(this.objects.values()).reduce((sum, obj) => sum + obj.size, 0);
    
    return {
      totalObjects,
      totalSize,
      numRoots: this.roots.size,
    };
  }
}
