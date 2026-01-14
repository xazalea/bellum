/**
 * Virtual Memory Manager
 * Page-based virtual memory system with GPU integration
 * 
 * Features:
 * - 4KB page-based allocation
 * - Virtual to physical address translation
 * - Memory protection (read/write/execute)
 * - Copy-on-write support
 * - Shared memory regions
 * - GPU-accessible memory pools
 * - Memory-mapped files
 */

import { zeroCopyMemory } from '../nexus/zero-copy/shared-memory';

// ============================================================================
// Types
// ============================================================================

export type VirtualAddress = number;
export type PhysicalAddress = number;

export enum MemoryProtection {
  NONE = 0,
  READ = 1 << 0,
  WRITE = 1 << 1,
  EXECUTE = 1 << 2,
  GUARD = 1 << 3,
}

export interface Page {
  virtualAddress: VirtualAddress;
  physicalAddress: PhysicalAddress;
  size: number;
  protection: MemoryProtection;
  present: boolean;
  dirty: boolean;
  accessed: boolean;
  copyOnWrite: boolean;
  shared: boolean;
  gpuMapped: boolean;
  gpuBuffer?: GPUBuffer;
}

export interface MemoryRegion {
  startAddress: VirtualAddress;
  size: number;
  protection: MemoryProtection;
  pages: Page[];
  name: string;
}

export interface MemoryStats {
  totalAllocated: number;
  totalUsed: number;
  pageCount: number;
  gpuMappedPages: number;
  sharedPages: number;
}

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 4096; // 4KB pages
const PAGE_SHIFT = 12;
const PAGE_MASK = 0xFFFFF000;

// ============================================================================
// Virtual Memory Manager
// ============================================================================

export class VirtualMemoryManager {
  private device: GPUDevice | null = null;
  private pageTable: Map<VirtualAddress, Page> = new Map();
  private physicalMemory: Map<PhysicalAddress, Uint8Array> = new Map();
  private regions: MemoryRegion[] = [];
  
  private nextPhysicalAddress: PhysicalAddress = 0x10000000; // Start at 256MB
  private totalAllocated: number = 0;
  private totalUsed: number = 0;

  /**
   * Initialize memory manager
   */
  async initialize(device: GPUDevice): Promise<void> {
    this.device = device;
    await zeroCopyMemory.initialize(device);
    console.log('[MemoryManager] Initialized');
  }

  /**
   * Allocate virtual memory
   */
  allocate(size: number, protection: MemoryProtection, name: string = 'unnamed'): VirtualAddress {
    // Align size to page boundary
    const alignedSize = this.alignToPage(size);
    const pageCount = alignedSize / PAGE_SIZE;

    console.log(`[MemoryManager] Allocating ${alignedSize} bytes (${pageCount} pages) for ${name}`);

    // Find free virtual address space
    const startAddress = this.findFreeVirtualSpace(alignedSize);

    // Create pages
    const pages: Page[] = [];
    for (let i = 0; i < pageCount; i++) {
      const virtualAddress = startAddress + i * PAGE_SIZE;
      const physicalAddress = this.allocatePhysicalPage();

      const page: Page = {
        virtualAddress,
        physicalAddress,
        size: PAGE_SIZE,
        protection,
        present: true,
        dirty: false,
        accessed: false,
        copyOnWrite: false,
        shared: false,
        gpuMapped: false,
      };

      this.pageTable.set(virtualAddress, page);
      pages.push(page);
    }

    // Create memory region
    const region: MemoryRegion = {
      startAddress,
      size: alignedSize,
      protection,
      pages,
      name,
    };
    
    this.regions.push(region);
    this.totalAllocated += alignedSize;

    return startAddress;
  }

  /**
   * Free virtual memory
   */
  free(address: VirtualAddress): void {
    const region = this.findRegion(address);
    if (!region) {
      throw new Error(`Invalid address: 0x${address.toString(16)}`);
    }

    console.log(`[MemoryManager] Freeing ${region.size} bytes at 0x${address.toString(16)}`);

    // Free all pages in region
    for (const page of region.pages) {
      this.pageTable.delete(page.virtualAddress);
      this.freePhysicalPage(page.physicalAddress);
      
      if (page.gpuBuffer) {
        page.gpuBuffer.destroy();
      }
    }

    // Remove region
    this.regions = this.regions.filter(r => r !== region);
    this.totalAllocated -= region.size;
  }

  /**
   * Change memory protection
   */
  protect(address: VirtualAddress, size: number, protection: MemoryProtection): void {
    const startPage = this.pageAddress(address);
    const endPage = this.pageAddress(address + size - 1);

    for (let pageAddr = startPage; pageAddr <= endPage; pageAddr += PAGE_SIZE) {
      const page = this.pageTable.get(pageAddr);
      if (page) {
        page.protection = protection;
      }
    }

    console.log(`[MemoryManager] Changed protection: 0x${address.toString(16)} (${size} bytes) -> ${protection}`);
  }

  /**
   * Map physical to virtual address
   */
  map(physicalAddress: PhysicalAddress, virtualAddress: VirtualAddress, size: number, protection: MemoryProtection = MemoryProtection.READ | MemoryProtection.WRITE): void {
    const pageCount = Math.ceil(size / PAGE_SIZE);

    for (let i = 0; i < pageCount; i++) {
      const vAddr = virtualAddress + i * PAGE_SIZE;
      const pAddr = physicalAddress + i * PAGE_SIZE;

      const page: Page = {
        virtualAddress: vAddr,
        physicalAddress: pAddr,
        size: PAGE_SIZE,
        protection,
        present: true,
        dirty: false,
        accessed: false,
        copyOnWrite: false,
        shared: false,
        gpuMapped: false,
      };

      this.pageTable.set(vAddr, page);
    }

    console.log(`[MemoryManager] Mapped: P:0x${physicalAddress.toString(16)} -> V:0x${virtualAddress.toString(16)} (${size} bytes)`);
  }

  /**
   * Unmap virtual address
   */
  unmap(virtualAddress: VirtualAddress, size: number): void {
    const startPage = this.pageAddress(virtualAddress);
    const endPage = this.pageAddress(virtualAddress + size - 1);

    for (let pageAddr = startPage; pageAddr <= endPage; pageAddr += PAGE_SIZE) {
      this.pageTable.delete(pageAddr);
    }

    console.log(`[MemoryManager] Unmapped: 0x${virtualAddress.toString(16)} (${size} bytes)`);
  }

  /**
   * Translate virtual to physical address
   */
  translateAddress(virtualAddress: VirtualAddress): PhysicalAddress {
    const pageAddr = this.pageAddress(virtualAddress);
    const pageOffset = virtualAddress & (PAGE_SIZE - 1);

    const page = this.pageTable.get(pageAddr);
    if (!page || !page.present) {
      throw new Error(`Page fault at 0x${virtualAddress.toString(16)}`);
    }

    page.accessed = true;
    return page.physicalAddress + pageOffset;
  }

  /**
   * Read from virtual memory
   */
  read(address: VirtualAddress, size: number): Uint8Array {
    this.checkProtection(address, MemoryProtection.READ);
    
    const result = new Uint8Array(size);
    let offset = 0;

    while (offset < size) {
      const currentAddr = address + offset;
      const pageAddr = this.pageAddress(currentAddr);
      const pageOffset = currentAddr & (PAGE_SIZE - 1);
      const bytesInPage = Math.min(PAGE_SIZE - pageOffset, size - offset);

      const physicalAddr = this.translateAddress(currentAddr);
      const physicalPage = this.getPhysicalPage(physicalAddr & PAGE_MASK);
      
      if (physicalPage) {
        result.set(physicalPage.slice(pageOffset, pageOffset + bytesInPage), offset);
      }

      offset += bytesInPage;
    }

    return result;
  }

  /**
   * Write to virtual memory
   */
  write(address: VirtualAddress, data: Uint8Array): void {
    this.checkProtection(address, MemoryProtection.WRITE);

    let offset = 0;

    while (offset < data.length) {
      const currentAddr = address + offset;
      const pageAddr = this.pageAddress(currentAddr);
      const pageOffset = currentAddr & (PAGE_SIZE - 1);
      const bytesInPage = Math.min(PAGE_SIZE - pageOffset, data.length - offset);

      const page = this.pageTable.get(pageAddr);
      if (!page) {
        throw new Error(`No page at 0x${currentAddr.toString(16)}`);
      }

      // Handle copy-on-write
      if (page.copyOnWrite) {
        this.handleCopyOnWrite(page);
      }

      const physicalAddr = page.physicalAddress;
      const physicalPage = this.getPhysicalPage(physicalAddr);
      
      if (physicalPage) {
        physicalPage.set(data.slice(offset, offset + bytesInPage), pageOffset);
        page.dirty = true;
      }

      offset += bytesInPage;
    }
  }

  /**
   * Sync memory region to GPU
   */
  async syncToGPU(address: VirtualAddress, size: number): Promise<GPUBuffer> {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    const data = this.read(address, size);
    
    const gpuBuffer = this.device.createBuffer({
      size: this.alignToPage(size),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });

    // Ensure we have a proper ArrayBuffer (not SharedArrayBuffer) for writeBuffer
    const bufferData = new Uint8Array(data);
    this.device.queue.writeBuffer(gpuBuffer, 0, bufferData);

    // Mark pages as GPU-mapped
    const startPage = this.pageAddress(address);
    const endPage = this.pageAddress(address + size - 1);

    for (let pageAddr = startPage; pageAddr <= endPage; pageAddr += PAGE_SIZE) {
      const page = this.pageTable.get(pageAddr);
      if (page) {
        page.gpuMapped = true;
        page.gpuBuffer = gpuBuffer;
      }
    }

    console.log(`[MemoryManager] Synced to GPU: 0x${address.toString(16)} (${size} bytes)`);

    return gpuBuffer;
  }

  /**
   * Sync memory region from GPU
   */
  async syncFromGPU(gpuBuffer: GPUBuffer, address: VirtualAddress, size: number): Promise<void> {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    const stagingBuffer = this.device.createBuffer({
      size: this.alignToPage(size),
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(gpuBuffer, 0, stagingBuffer, 0, this.alignToPage(size));
    this.device.queue.submit([commandEncoder.finish()]);

    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const data = new Uint8Array(stagingBuffer.getMappedRange()).slice(0, size);
    stagingBuffer.unmap();
    stagingBuffer.destroy();

    this.write(address, data);

    console.log(`[MemoryManager] Synced from GPU: 0x${address.toString(16)} (${size} bytes)`);
  }

  /**
   * Create shared memory region
   */
  createSharedRegion(size: number, name: string): VirtualAddress {
    const address = this.allocate(size, MemoryProtection.READ | MemoryProtection.WRITE, `shared:${name}`);
    
    // Mark all pages as shared
    const region = this.findRegion(address);
    if (region) {
      for (const page of region.pages) {
        page.shared = true;
      }
    }

    // Create SharedArrayBuffer for zero-copy access
    zeroCopyMemory.createSharedBuffer(name, size);

    return address;
  }

  /**
   * Get memory statistics
   */
  getStatistics(): MemoryStats {
    let gpuMappedPages = 0;
    let sharedPages = 0;

    for (const page of this.pageTable.values()) {
      if (page.gpuMapped) gpuMappedPages++;
      if (page.shared) sharedPages++;
    }

    return {
      totalAllocated: this.totalAllocated,
      totalUsed: this.totalUsed,
      pageCount: this.pageTable.size,
      gpuMappedPages,
      sharedPages,
    };
  }

  /**
   * Find free virtual address space
   */
  private findFreeVirtualSpace(size: number): VirtualAddress {
    // Simple strategy: find gap between regions
    if (this.regions.length === 0) {
      return 0x10000; // Start at 64KB
    }

    // Sort regions by start address
    const sorted = [...this.regions].sort((a, b) => a.startAddress - b.startAddress);

    // Check gap before first region
    if (sorted[0].startAddress >= size) {
      return 0x10000;
    }

    // Check gaps between regions
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].startAddress - (sorted[i].startAddress + sorted[i].size);
      if (gap >= size) {
        return sorted[i].startAddress + sorted[i].size;
      }
    }

    // Allocate after last region
    const lastRegion = sorted[sorted.length - 1];
    return lastRegion.startAddress + lastRegion.size;
  }

  /**
   * Find memory region containing address
   */
  private findRegion(address: VirtualAddress): MemoryRegion | null {
    for (const region of this.regions) {
      if (address >= region.startAddress && address < region.startAddress + region.size) {
        return region;
      }
    }
    return null;
  }

  /**
   * Allocate physical page
   */
  private allocatePhysicalPage(): PhysicalAddress {
    const address = this.nextPhysicalAddress;
    this.nextPhysicalAddress += PAGE_SIZE;
    
    // Allocate physical memory
    this.physicalMemory.set(address, new Uint8Array(PAGE_SIZE));
    
    return address;
  }

  /**
   * Free physical page
   */
  private freePhysicalPage(address: PhysicalAddress): void {
    this.physicalMemory.delete(address);
  }

  /**
   * Get physical page
   */
  private getPhysicalPage(address: PhysicalAddress): Uint8Array | null {
    return this.physicalMemory.get(address) || null;
  }

  /**
   * Get page address
   */
  private pageAddress(address: VirtualAddress): VirtualAddress {
    return address & PAGE_MASK;
  }

  /**
   * Align to page boundary
   */
  private alignToPage(size: number): number {
    return (size + PAGE_SIZE - 1) & PAGE_MASK;
  }

  /**
   * Check memory protection
   */
  private checkProtection(address: VirtualAddress, required: MemoryProtection): void {
    const pageAddr = this.pageAddress(address);
    const page = this.pageTable.get(pageAddr);

    if (!page) {
      throw new Error(`Access violation at 0x${address.toString(16)}: no page mapped`);
    }

    if (!(page.protection & required)) {
      throw new Error(`Access violation at 0x${address.toString(16)}: insufficient protection`);
    }
  }

  /**
   * Handle copy-on-write
   */
  private handleCopyOnWrite(page: Page): void {
    const newPhysicalAddr = this.allocatePhysicalPage();
    const oldData = this.getPhysicalPage(page.physicalAddress);
    const newData = this.getPhysicalPage(newPhysicalAddr);

    if (oldData && newData) {
      newData.set(oldData);
    }

    page.physicalAddress = newPhysicalAddr;
    page.copyOnWrite = false;

    console.log(`[MemoryManager] Copy-on-write: 0x${page.virtualAddress.toString(16)}`);
  }

  /**
   * Shutdown memory manager
   */
  shutdown(): void {
    console.log('[MemoryManager] Shutting down...');

    // Free all regions
    for (const region of [...this.regions]) {
      this.free(region.startAddress);
    }

    this.pageTable.clear();
    this.physicalMemory.clear();
    this.regions = [];

    console.log('[MemoryManager] Shutdown complete');
  }
}

// Export singleton
export const virtualMemoryManager = new VirtualMemoryManager();
