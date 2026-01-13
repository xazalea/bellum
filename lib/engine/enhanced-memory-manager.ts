/**
 * Enhanced Memory Manager with MMU
 * Proper virtual memory management, page tables, memory protection
 */

export enum MemoryProtection {
    NONE = 0,
    READ = 1,
    WRITE = 2,
    EXECUTE = 4,
    READ_WRITE = 3,
    READ_EXECUTE = 5,
    READ_WRITE_EXECUTE = 7,
}

export interface MemoryRegion {
    start: number;
    size: number;
    protection: MemoryProtection;
    name: string;
    mapped: boolean;
}

export interface PageTableEntry {
    physicalPage: number;
    present: boolean;
    writable: boolean;
    executable: boolean;
    accessed: boolean;
    dirty: boolean;
}

export class EnhancedMemoryManager {
    private memory: ArrayBuffer;
    private memoryView: Uint8Array;
    private regions: Map<number, MemoryRegion> = new Map();
    private pageTable: Map<number, PageTableEntry> = new Map();
    
    private readonly PAGE_SIZE = 4096; // 4KB pages
    private readonly TOTAL_SIZE: number;
    
    // Memory layout
    private readonly CODE_START = 0x00400000;
    private readonly STACK_START = 0x7FFFFFFF;
    private readonly HEAP_START = 0x10000000;
    
    private heapBrk: number;
    private stackPointer: number;
    
    constructor(totalSize: number = 2 * 1024 * 1024 * 1024) { // 2GB
        this.TOTAL_SIZE = totalSize;
        this.memory = new ArrayBuffer(totalSize);
        this.memoryView = new Uint8Array(this.memory);
        this.heapBrk = this.HEAP_START;
        this.stackPointer = this.STACK_START;
        
        this.initializePageTable();
        this.setupDefaultRegions();
    }
    
    /**
     * Initialize page table
     */
    private initializePageTable(): void {
        const numPages = Math.floor(this.TOTAL_SIZE / this.PAGE_SIZE);
        
        for (let i = 0; i < numPages; i++) {
            this.pageTable.set(i, {
                physicalPage: i,
                present: false,
                writable: false,
                executable: false,
                accessed: false,
                dirty: false,
            });
        }
    }
    
    /**
     * Setup default memory regions
     */
    private setupDefaultRegions(): void {
        // Code section
        this.regions.set(this.CODE_START, {
            start: this.CODE_START,
            size: 16 * 1024 * 1024, // 16MB
            protection: MemoryProtection.READ_EXECUTE,
            name: '.text',
            mapped: true,
        });
        
        // Heap
        this.regions.set(this.HEAP_START, {
            start: this.HEAP_START,
            size: 512 * 1024 * 1024, // 512MB
            protection: MemoryProtection.READ_WRITE,
            name: 'heap',
            mapped: true,
        });
        
        // Stack
        this.regions.set(this.STACK_START - 8 * 1024 * 1024, {
            start: this.STACK_START - 8 * 1024 * 1024,
            size: 8 * 1024 * 1024, // 8MB
            protection: MemoryProtection.READ_WRITE,
            name: 'stack',
            mapped: true,
        });
    }
    
    /**
     * Allocate memory with protection
     */
    allocate(size: number, protection: MemoryProtection = MemoryProtection.READ_WRITE): number {
        // Align to page boundary
        const alignedSize = this.alignToPage(size);
        const address = this.heapBrk;
        
        // Check if we have space
        if (address + alignedSize > this.STACK_START) {
            throw new Error('Out of memory');
        }
        
        // Map pages
        this.mapPages(address, alignedSize, protection);
        
        // Create region
        this.regions.set(address, {
            start: address,
            size: alignedSize,
            protection,
            name: `alloc_${address.toString(16)}`,
            mapped: true,
        });
        
        this.heapBrk += alignedSize;
        
        return address;
    }
    
    /**
     * Allocate at specific address
     */
    allocateAt(address: number, size: number, protection: MemoryProtection = MemoryProtection.READ_WRITE): number {
        const alignedAddr = this.alignToPage(address);
        const alignedSize = this.alignToPage(size);
        
        // Check if region overlaps with existing
        for (const region of this.regions.values()) {
            if (this.regionsOverlap(alignedAddr, alignedSize, region.start, region.size)) {
                throw new Error('Memory region overlaps with existing allocation');
            }
        }
        
        // Map pages
        this.mapPages(alignedAddr, alignedSize, protection);
        
        // Create region
        this.regions.set(alignedAddr, {
            start: alignedAddr,
            size: alignedSize,
            protection,
            name: `fixed_${alignedAddr.toString(16)}`,
            mapped: true,
        });
        
        return alignedAddr;
    }
    
    /**
     * Free memory
     */
    free(address: number, size: number): void {
        const region = this.regions.get(address);
        if (!region) {
            throw new Error('Invalid memory region');
        }
        
        // Unmap pages
        this.unmapPages(address, region.size);
        
        // Remove region
        this.regions.delete(address);
    }
    
    /**
     * Read memory with permission check
     */
    read(address: number, size: number): Uint8Array {
        this.checkPermission(address, size, MemoryProtection.READ);
        
        return new Uint8Array(this.memory, address, size);
    }
    
    /**
     * Write memory with permission check
     */
    write(address: number, data: Uint8Array): void {
        this.checkPermission(address, data.length, MemoryProtection.WRITE);
        
        this.memoryView.set(data, address);
        
        // Mark pages as dirty
        const startPage = Math.floor(address / this.PAGE_SIZE);
        const endPage = Math.floor((address + data.length) / this.PAGE_SIZE);
        
        for (let page = startPage; page <= endPage; page++) {
            const entry = this.pageTable.get(page);
            if (entry) {
                entry.dirty = true;
            }
        }
    }
    
    /**
     * Change memory protection
     */
    protect(address: number, size: number, protection: MemoryProtection): void {
        const region = this.findRegion(address);
        if (!region) {
            throw new Error('Memory region not found');
        }
        
        region.protection = protection;
        
        // Update page table
        const startPage = Math.floor(address / this.PAGE_SIZE);
        const endPage = Math.floor((address + size) / this.PAGE_SIZE);
        
        for (let page = startPage; page <= endPage; page++) {
            const entry = this.pageTable.get(page);
            if (entry) {
                entry.writable = (protection & MemoryProtection.WRITE) !== 0;
                entry.executable = (protection & MemoryProtection.EXECUTE) !== 0;
            }
        }
    }
    
    /**
     * Copy memory
     */
    copy(dest: number, src: number, size: number): void {
        this.checkPermission(src, size, MemoryProtection.READ);
        this.checkPermission(dest, size, MemoryProtection.WRITE);
        
        const srcData = new Uint8Array(this.memory, src, size);
        const destData = new Uint8Array(this.memory, dest, size);
        destData.set(srcData);
    }
    
    /**
     * Zero memory
     */
    zero(address: number, size: number): void {
        this.checkPermission(address, size, MemoryProtection.WRITE);
        
        const data = new Uint8Array(this.memory, address, size);
        data.fill(0);
    }
    
    /**
     * Get memory statistics
     */
    getStatistics(): {
        totalSize: number;
        usedSize: number;
        freeSize: number;
        heapBrk: number;
        regionCount: number;
        pageCount: number;
    } {
        let usedSize = 0;
        
        for (const region of this.regions.values()) {
            if (region.mapped) {
                usedSize += region.size;
            }
        }
        
        return {
            totalSize: this.TOTAL_SIZE,
            usedSize,
            freeSize: this.TOTAL_SIZE - usedSize,
            heapBrk: this.heapBrk,
            regionCount: this.regions.size,
            pageCount: this.pageTable.size,
        };
    }
    
    /**
     * Get heap end
     */
    getHeapEnd(): number {
        return this.heapBrk;
    }
    
    /**
     * Internal: Map pages
     */
    private mapPages(address: number, size: number, protection: MemoryProtection): void {
        const startPage = Math.floor(address / this.PAGE_SIZE);
        const numPages = Math.ceil(size / this.PAGE_SIZE);
        
        for (let i = 0; i < numPages; i++) {
            const page = startPage + i;
            const entry = this.pageTable.get(page);
            
            if (entry) {
                entry.present = true;
                entry.writable = (protection & MemoryProtection.WRITE) !== 0;
                entry.executable = (protection & MemoryProtection.EXECUTE) !== 0;
            }
        }
    }
    
    /**
     * Internal: Unmap pages
     */
    private unmapPages(address: number, size: number): void {
        const startPage = Math.floor(address / this.PAGE_SIZE);
        const numPages = Math.ceil(size / this.PAGE_SIZE);
        
        for (let i = 0; i < numPages; i++) {
            const page = startPage + i;
            const entry = this.pageTable.get(page);
            
            if (entry) {
                entry.present = false;
                entry.writable = false;
                entry.executable = false;
                entry.accessed = false;
                entry.dirty = false;
            }
        }
    }
    
    /**
     * Internal: Check memory permission
     */
    private checkPermission(address: number, size: number, requiredPerm: MemoryProtection): void {
        const region = this.findRegion(address);
        
        if (!region) {
            throw new Error(`Memory access violation: address 0x${address.toString(16)} not mapped`);
        }
        
        if (!region.mapped) {
            throw new Error(`Memory access violation: region not mapped`);
        }
        
        if ((region.protection & requiredPerm) !== requiredPerm) {
            throw new Error(
                `Memory access violation: insufficient permissions at 0x${address.toString(16)} ` +
                `(have: ${region.protection}, need: ${requiredPerm})`
            );
        }
        
        // Check bounds
        if (address + size > region.start + region.size) {
            throw new Error(`Memory access violation: out of bounds`);
        }
    }
    
    /**
     * Internal: Find region containing address
     */
    private findRegion(address: number): MemoryRegion | undefined {
        for (const region of this.regions.values()) {
            if (address >= region.start && address < region.start + region.size) {
                return region;
            }
        }
        return undefined;
    }
    
    /**
     * Internal: Check if regions overlap
     */
    private regionsOverlap(addr1: number, size1: number, addr2: number, size2: number): boolean {
        return !(addr1 + size1 <= addr2 || addr2 + size2 <= addr1);
    }
    
    /**
     * Internal: Align to page boundary
     */
    private alignToPage(value: number): number {
        return Math.ceil(value / this.PAGE_SIZE) * this.PAGE_SIZE;
    }
}

// Export singleton
export const enhancedMemoryManager = new EnhancedMemoryManager();
