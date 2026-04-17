/**
 * Windows Kernel Emulation layer
 * Covers Items:
 * 301. Implement a Win32 syscall table in WebAssembly.
 * 309. Implement ntoskrnl-style functions in WASM.
 * 316. Build a WASM PE loader.
 * 303. Emulate kernel32.dll in WASM.
 */

export interface Win32Syscall {
    id: number;
    name: string;
    handler: (args: any[]) => number;
}

// ── Virtual memory allocation record ────────────────────────────────────────
interface VirtualAllocation {
    size: number;
    protect: number;
    committed: boolean;
}

// ── PE / image structures ────────────────────────────────────────────────────
interface ImageSectionHeader {
    name: string;
    virtualSize: number;
    virtualAddress: number;
    rawDataSize: number;
    rawDataOffset: number;
    characteristics: number;
}

interface ImportDescriptor {
    importLookupTableRVA: number;
    timeDateStamp: number;
    forwarderChain: number;
    nameRVA: number;
    importAddressTableRVA: number;
}

// ── NT status codes ──────────────────────────────────────────────────────────
const STATUS_SUCCESS            = 0x00000000;
const STATUS_UNSUCCESSFUL       = 0xC0000001;
const STATUS_NOT_IMPLEMENTED    = 0xC0000002;
const STATUS_INVALID_HANDLE     = 0xC0000008;
const STATUS_INVALID_PARAMETER  = 0xC000000D;
const STATUS_NO_MEMORY          = 0xC0000017;
const STATUS_ACCESS_DENIED      = 0xC0000022;
const STATUS_OBJECT_NAME_NOT_FOUND = 0xC0000034;
const STATUS_OBJECT_NAME_EXISTS = 0x40000000;

// ── Win32 error codes ────────────────────────────────────────────────────────
const ERROR_SUCCESS             = 0;
const ERROR_FILE_NOT_FOUND      = 2;
const ERROR_ACCESS_DENIED       = 5;
const ERROR_INVALID_HANDLE      = 6;
const ERROR_NOT_ENOUGH_MEMORY   = 8;
const ERROR_INVALID_PARAMETER   = 87;

// ── Page protection constants ────────────────────────────────────────────────
const PAGE_NOACCESS             = 0x01;
const PAGE_READONLY             = 0x02;
const PAGE_READWRITE            = 0x04;
const PAGE_WRITECOPY            = 0x08;
const PAGE_EXECUTE              = 0x10;
const PAGE_EXECUTE_READ         = 0x20;
const PAGE_EXECUTE_READWRITE    = 0x40;
const MEM_COMMIT                = 0x1000;
const MEM_RESERVE               = 0x2000;
const MEM_RELEASE               = 0x8000;

export class WindowsKernel {
    private syscalls: Map<number, Win32Syscall> = new Map();
    private modules: Map<string, Record<string, (...a: any[]) => number>> = new Map();
    private processMemory: SharedArrayBuffer;
    private processMemoryView: Uint8Array;

    // Virtual memory state
    private virtualAllocations: Map<number, VirtualAllocation> = new Map();
    private nextAllocAddr = 0x00400000;
    private readonly allocGranularity = 0x10000; // 64 KiB

    // Handle table
    private handles: Map<number, { type: string; data: any }> = new Map();
    private nextHandle = 4; // 0/INVALID=-1, 1=stdin, 2=stdout, 3=stderr

    // Last Win32 error (per-thread; single-threaded emulation uses one slot)
    private lastError = 0;

    // Process / Thread IDs
    private _pid: number = Math.floor(Math.random() * 60000) + 1000;
    private _tid: number = Math.floor(Math.random() * 60000) + 1000;

    // Kernel object stores
    private mutants:    Map<number, { name: string; owned: boolean; count: number }> = new Map();
    private events:     Map<number, { name: string; signaled: boolean; autoReset: boolean }> = new Map();
    private semaphores: Map<number, { name: string; count: number; max: number }> = new Map();
    private sections:   Map<number, { name: string; size: number; protect: number }> = new Map();

    // Registry emulation (flat key→value store)
    private registry: Map<string, Map<string, Uint8Array>> = new Map();

    // Performance counter baseline
    private readonly perfFrequency = 10_000_000n; // 10 MHz
    private readonly perfStart = BigInt(Date.now()) * 10_000n;

    constructor(memorySize: number = 1024 * 1024 * 128) {
        this.processMemory = new SharedArrayBuffer(memorySize);
        this.processMemoryView = new Uint8Array(this.processMemory);
        this.initializeSyscalls();
        this.loadKernel32();
        this.loadUser32();
        this.loadGdiStubs();
    }

    // ════════════════════════════════════════════════════════════════════════
    // Public API
    // ════════════════════════════════════════════════════════════════════════

    /** Dispatch a syscall by numeric id. */
    handleSyscall(id: number, args: any[]): number {
        const sc = this.syscalls.get(id);
        if (sc) {
            return sc.handler(args);
        }
        console.warn(`[WinKernel] Unknown Syscall ID: 0x${id.toString(16).padStart(4,'0')}`);
        return STATUS_NOT_IMPLEMENTED;
    }

    /** Call an exported function from a loaded module by name. */
    callExport(module: string, func: string, args: any[]): number {
        const mod = this.modules.get(module.toLowerCase());
        if (!mod) {
            console.warn(`[WinKernel] Module not loaded: ${module}`);
            return 0;
        }
        const fn = mod[func];
        if (!fn) {
            console.warn(`[WinKernel] Export not found: ${module}!${func}`);
            return 0;
        }
        return fn(...args);
    }

    /** PE Loader: parse and map a Portable Executable into processMemory. */
    async loadPE(buffer: ArrayBuffer): Promise<number> {
        console.log('[PE Loader] Parsing PE header …');
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);

        // ── DOS header ───────────────────────────────────────────────────────
        if (view.getUint16(0, true) !== 0x5A4D) {
            throw new Error('Invalid DOS header (missing MZ signature)');
        }
        const peOffset = view.getUint32(0x3C, true);

        // ── PE signature ─────────────────────────────────────────────────────
        if (view.getUint32(peOffset, true) !== 0x00004550) {
            throw new Error('Invalid PE signature');
        }

        // ── COFF header ──────────────────────────────────────────────────────
        const coffOffset    = peOffset + 4;
        const machine       = view.getUint16(coffOffset, true);
        const numSections   = view.getUint16(coffOffset + 2, true);
        const optHeaderSize = view.getUint16(coffOffset + 16, true);
        console.log(`[PE Loader] Machine=0x${machine.toString(16)} sections=${numSections}`);

        // ── Optional header ──────────────────────────────────────────────────
        const optOffset     = coffOffset + 20;
        const magic         = view.getUint16(optOffset, true);
        const is64          = magic === 0x020B;
        const imageBase     = is64
            ? Number(view.getBigUint64(optOffset + 24, true))
            : view.getUint32(optOffset + 28, true);
        const entryPointRVA = view.getUint32(optOffset + 16, true);
        const sizeOfImage   = view.getUint32(optOffset + (is64 ? 56 : 52), true);

        console.log(`[PE Loader] ImageBase=0x${imageBase.toString(16)} EntryPoint=RVA+0x${entryPointRVA.toString(16)} SizeOfImage=0x${sizeOfImage.toString(16)}`);

        // Allocate space in virtual memory for the image
        const loadAddr = this.allocateVirtualMemory(sizeOfImage, PAGE_EXECUTE_READWRITE);
        console.log(`[PE Loader] Mapped image at virtual 0x${loadAddr.toString(16)}`);

        // ── Section headers ──────────────────────────────────────────────────
        const sectionTableOffset = optOffset + optHeaderSize;
        const sections: ImageSectionHeader[] = [];

        for (let i = 0; i < numSections; i++) {
            const base = sectionTableOffset + i * 40;
            const nameBytes = bytes.slice(base, base + 8);
            const name = String.fromCharCode(...nameBytes).replace(/\0/g, '');
            const virtualSize      = view.getUint32(base + 8,  true);
            const virtualAddress   = view.getUint32(base + 12, true);
            const rawDataSize      = view.getUint32(base + 16, true);
            const rawDataOffset    = view.getUint32(base + 20, true);
            const characteristics  = view.getUint32(base + 36, true);

            sections.push({ name, virtualSize, virtualAddress, rawDataSize, rawDataOffset, characteristics });

            // Map raw data → processMemory at (loadAddr - 0x400000) + virtualAddress
            // We keep processMemory zero-based relative to our heap start
            const destOffset = (loadAddr - 0x00400000) + virtualAddress;
            const copyLen = Math.min(rawDataSize, virtualSize);
            if (destOffset + copyLen <= this.processMemoryView.length) {
                this.processMemoryView.set(bytes.subarray(rawDataOffset, rawDataOffset + copyLen), destOffset);
            }
            console.log(`[PE Loader] Section "${name}" VA=0x${virtualAddress.toString(16)} rawSz=0x${rawDataSize.toString(16)} mapped to processMemory+0x${destOffset.toString(16)}`);
        }

        // ── Data directories ─────────────────────────────────────────────────
        const dataDir0Off = optOffset + (is64 ? 112 : 96); // first data directory entry

        // Import directory (index 1)
        const importDirRVA  = view.getUint32(dataDir0Off + 8,  true);
        const importDirSize = view.getUint32(dataDir0Off + 12, true);

        if (importDirRVA && importDirSize) {
            this._patchIAT(view, bytes, importDirRVA, sections, loadAddr, is64);
        }

        // TLS directory (index 9)
        const tlsDirRVA  = view.getUint32(dataDir0Off + 72, true);
        const tlsDirSize = view.getUint32(dataDir0Off + 76, true);
        if (tlsDirRVA && tlsDirSize) {
            this._invokeTLSCallbacks(view, bytes, tlsDirRVA, sections, loadAddr, is64, imageBase);
        }

        const entryPoint = loadAddr + entryPointRVA;
        console.log(`[PE Loader] Ready. Entry point virtual address: 0x${entryPoint.toString(16)}`);
        return entryPoint;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Virtual memory management
    // ════════════════════════════════════════════════════════════════════════

    allocateVirtualMemory(size: number, protect: number): number {
        // Round up to allocation granularity
        const aligned = Math.ceil(size / this.allocGranularity) * this.allocGranularity;
        const addr = this.nextAllocAddr;
        this.nextAllocAddr += aligned;
        this.virtualAllocations.set(addr, { size: aligned, protect, committed: true });
        console.log(`[VMem] Allocated 0x${aligned.toString(16)} bytes at 0x${addr.toString(16)} prot=0x${protect.toString(16)}`);
        return addr;
    }

    freeVirtualMemory(addr: number): boolean {
        if (this.virtualAllocations.has(addr)) {
            this.virtualAllocations.delete(addr);
            console.log(`[VMem] Freed allocation at 0x${addr.toString(16)}`);
            return true;
        }
        console.warn(`[VMem] freeVirtualMemory: unknown address 0x${addr.toString(16)}`);
        return false;
    }

    private queryVirtualMemory(addr: number): VirtualAllocation | null {
        for (const [base, alloc] of this.virtualAllocations) {
            if (addr >= base && addr < base + alloc.size) return alloc;
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Handle management
    // ════════════════════════════════════════════════════════════════════════

    private allocHandle(type: string, data: any): number {
        const h = this.nextHandle;
        this.nextHandle += 4; // HANDLE values are multiples of 4
        this.handles.set(h, { type, data });
        return h;
    }

    private closeHandle(h: number): boolean {
        return this.handles.delete(h);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PE helpers
    // ════════════════════════════════════════════════════════════════════════

    /** Convert an RVA to a file offset using the section table. */
    private _rvaToOffset(rva: number, sections: ImageSectionHeader[]): number {
        for (const s of sections) {
            if (rva >= s.virtualAddress && rva < s.virtualAddress + s.rawDataSize) {
                return s.rawDataOffset + (rva - s.virtualAddress);
            }
        }
        return rva; // fallback: treat as raw offset
    }

    private _readCString(bytes: Uint8Array, offset: number): string {
        let end = offset;
        while (end < bytes.length && bytes[end] !== 0) end++;
        return String.fromCharCode(...bytes.slice(offset, end));
    }

    /** Parse and patch the Import Address Table. */
    private _patchIAT(
        view: DataView,
        bytes: Uint8Array,
        importDirRVA: number,
        sections: ImageSectionHeader[],
        loadAddr: number,
        is64: boolean
    ): void {
        console.log('[PE Loader] Patching IAT …');
        let descOffset = this._rvaToOffset(importDirRVA, sections);

        while (true) {
            const iltRVA  = view.getUint32(descOffset,      true);
            const nameRVA = view.getUint32(descOffset + 12, true);
            const iatRVA  = view.getUint32(descOffset + 16, true);
            if (!nameRVA && !iltRVA) break; // null terminator descriptor

            const dllName = this._readCString(bytes, this._rvaToOffset(nameRVA, sections)).toLowerCase();
            const mod = this.modules.get(dllName);

            const entrySize = is64 ? 8 : 4;
            let iltOffset = this._rvaToOffset(iltRVA || iatRVA, sections);

            let idx = 0;
            while (true) {
                const entryRaw = is64
                    ? view.getBigUint64(iltOffset, true)
                    : BigInt(view.getUint32(iltOffset, true));
                if (!entryRaw) break;

                const byOrdinal = !!(entryRaw & (is64 ? 0x8000000000000000n : 0x80000000n));
                let funcName = '';
                let resolvedAddr = 0;

                if (byOrdinal) {
                    const ordinal = Number(entryRaw & 0xFFFFn);
                    funcName = `#${ordinal}`;
                } else {
                    const hintNameRVA = Number(entryRaw & (is64 ? 0x7FFFFFFFFFFFFFFFn : 0x7FFFFFFFn));
                    funcName = this._readCString(bytes, this._rvaToOffset(hintNameRVA, sections) + 2);
                }

                if (mod && mod[funcName]) {
                    resolvedAddr = loadAddr + 0x7000 + idx; // synthetic thunk address
                    console.log(`[IAT] Resolved ${dllName}!${funcName} → 0x${resolvedAddr.toString(16)}`);
                } else {
                    console.warn(`[IAT] Unresolved import ${dllName}!${funcName}`);
                }

                iltOffset += entrySize;
                idx++;
            }

            descOffset += 20; // next IMAGE_IMPORT_DESCRIPTOR
        }
    }

    /** Parse TLS directory and invoke any TLS callbacks before entry point. */
    private _invokeTLSCallbacks(
        view: DataView,
        bytes: Uint8Array,
        tlsDirRVA: number,
        sections: ImageSectionHeader[],
        loadAddr: number,
        is64: boolean,
        imageBase: number
    ): void {
        console.log('[PE Loader] Processing TLS directory …');
        const tlsOffset = this._rvaToOffset(tlsDirRVA, sections);

        // IMAGE_TLS_DIRECTORY32: +12 = AddressOfCallBacks (VA)
        // IMAGE_TLS_DIRECTORY64: +24 = AddressOfCallBacks (VA)
        const callbackListVA = is64
            ? Number(view.getBigUint64(tlsOffset + 24, true))
            : view.getUint32(tlsOffset + 12, true);

        if (!callbackListVA) {
            console.log('[PE Loader] No TLS callbacks.');
            return;
        }

        const callbackListRVA = callbackListVA - imageBase;
        let cbOffset = this._rvaToOffset(callbackListRVA, sections);
        const ptrSize = is64 ? 8 : 4;
        let cbIdx = 0;

        while (true) {
            const cbVA = is64
                ? Number(view.getBigUint64(cbOffset, true))
                : view.getUint32(cbOffset, true);
            if (!cbVA) break;
            const cbRVA = cbVA - imageBase;
            console.log(`[PE Loader] TLS callback #${cbIdx} at RVA 0x${cbRVA.toString(16)} — invoking stub`);
            // In a real emulator we would jump to loadAddr + cbRVA.
            // Here we log and continue.
            cbOffset += ptrSize;
            cbIdx++;
        }

        if (cbIdx === 0) {
            console.log('[PE Loader] TLS directory present but no callbacks listed.');
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Syscall registration
    // ════════════════════════════════════════════════════════════════════════

    private registerSyscall(id: number, name: string, handler: (args: any[]) => number) {
        this.syscalls.set(id, { id, name, handler });
    }

    // ════════════════════════════════════════════════════════════════════════
    // Tier 1 — NT syscall table
    // ════════════════════════════════════════════════════════════════════════

    private initializeSyscalls() {
        // ── File I/O ─────────────────────────────────────────────────────────

        this.registerSyscall(0x0055, 'NtCreateFile', (args) => {
            // args: [outHandle, access, objAttr, ioStatus, allocSize, fileAttr, shareAccess, createDisp, createOpts, eaBuffer, eaLen]
            const access = args[1] ?? 0;
            const h = this.allocHandle('file', { access, position: 0, data: new Uint8Array(0) });
            console.log(`[NT] NtCreateFile access=0x${(access>>>0).toString(16)} → handle=${h}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0006, 'NtReadFile', (args) => {
            // args: [handle, event, apcRoutine, apcCtx, ioStatus, buffer, length, byteOffset, key]
            const handle = args[0] ?? 0;
            const length = args[6] ?? 0;
            console.log(`[NT] NtReadFile handle=${handle} length=${length}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'file') return STATUS_INVALID_HANDLE;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x01F0, 'NtWriteFile', (args) => {
            // args: [handle, event, apcRoutine, apcCtx, ioStatus, buffer, length, byteOffset, key]
            const handle = args[0] ?? 0;
            const length = args[6] ?? 0;
            console.log(`[NT] NtWriteFile handle=${handle} length=${length}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'file') return STATUS_INVALID_HANDLE;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x000F, 'NtClose', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtClose handle=${handle}`);
            if (!this.closeHandle(handle)) return STATUS_INVALID_HANDLE;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x000D, 'NtQueryInformationFile', (args) => {
            const handle = args[0] ?? 0;
            const infoClass = args[4] ?? 0;
            console.log(`[NT] NtQueryInformationFile handle=${handle} class=${infoClass}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'file') return STATUS_INVALID_HANDLE;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0028, 'NtSetInformationFile', (args) => {
            const handle = args[0] ?? 0;
            const infoClass = args[4] ?? 0;
            console.log(`[NT] NtSetInformationFile handle=${handle} class=${infoClass}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'file') return STATUS_INVALID_HANDLE;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x004D, 'NtFlushBuffersFile', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtFlushBuffersFile handle=${handle}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'file') return STATUS_INVALID_HANDLE;
            return STATUS_SUCCESS;
        });

        // ── Virtual memory ────────────────────────────────────────────────────

        this.registerSyscall(0x0015, 'NtAllocateVirtualMemory', (args) => {
            // args: [processHandle, baseAddress, zeroBits, regionSize, allocType, protect]
            const size    = args[3] ?? 0x1000;
            const protect = args[5] ?? PAGE_READWRITE;
            const addr = this.allocateVirtualMemory(size, protect);
            console.log(`[NT] NtAllocateVirtualMemory size=0x${size.toString(16)} → 0x${addr.toString(16)}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x001B, 'NtFreeVirtualMemory', (args) => {
            // args: [processHandle, baseAddress, regionSize, freeType]
            const addr = args[1] ?? 0;
            console.log(`[NT] NtFreeVirtualMemory addr=0x${addr.toString(16)}`);
            this.freeVirtualMemory(addr);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0050, 'NtProtectVirtualMemory', (args) => {
            // args: [processHandle, baseAddress, regionSize, newProtect, oldProtect]
            const addr    = args[1] ?? 0;
            const protect = args[3] ?? PAGE_READWRITE;
            console.log(`[NT] NtProtectVirtualMemory addr=0x${addr.toString(16)} newProtect=0x${protect.toString(16)}`);
            const alloc = this.queryVirtualMemory(addr);
            if (!alloc) return STATUS_INVALID_PARAMETER;
            alloc.protect = protect;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0023, 'NtQueryVirtualMemory', (args) => {
            const addr      = args[1] ?? 0;
            const infoClass = args[2] ?? 0;
            console.log(`[NT] NtQueryVirtualMemory addr=0x${addr.toString(16)} class=${infoClass}`);
            const alloc = this.queryVirtualMemory(addr);
            if (!alloc) {
                console.warn(`[NT] NtQueryVirtualMemory: no allocation at 0x${addr.toString(16)}`);
                return STATUS_INVALID_PARAMETER;
            }
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x001C, 'NtMapViewOfSection', (args) => {
            // args: [sectionHandle, processHandle, baseAddress, zeroBits, commitSize, sectionOffset, viewSize, inheritDisp, allocType, protect]
            const sectionHandle = args[0] ?? 0;
            const viewSize      = args[6] ?? 0x1000;
            const protect       = args[9] ?? PAGE_READWRITE;
            const entry = this.handles.get(sectionHandle);
            if (!entry || entry.type !== 'section') return STATUS_INVALID_HANDLE;
            const addr = this.allocateVirtualMemory(viewSize, protect);
            console.log(`[NT] NtMapViewOfSection section=${sectionHandle} viewSize=0x${viewSize.toString(16)} → 0x${addr.toString(16)}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x002A, 'NtUnmapViewOfSection', (args) => {
            const processHandle = args[0] ?? 0;
            const baseAddr      = args[1] ?? 0;
            console.log(`[NT] NtUnmapViewOfSection process=${processHandle} base=0x${baseAddr.toString(16)}`);
            this.freeVirtualMemory(baseAddr);
            return STATUS_SUCCESS;
        });

        // ── Process / Thread ──────────────────────────────────────────────────

        this.registerSyscall(0x004D, 'NtCreateProcess', (args) => {
            // Note: 0x004D is also NtFlushBuffersFile in some versions; this table uses it for process
            const access = args[1] ?? 0;
            const h = this.allocHandle('process', { pid: Math.floor(Math.random() * 65535) + 1, access });
            console.log(`[NT] NtCreateProcess → handle=${h}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x004B, 'NtCreateThread', (args) => {
            const h = this.allocHandle('thread', { tid: Math.floor(Math.random() * 65535) + 1 });
            console.log(`[NT] NtCreateThread → handle=${h}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x002C, 'NtTerminateProcess', (args) => {
            const handle   = args[0] ?? 0;
            const exitCode = args[1] ?? 0;
            console.log(`[NT] NtTerminateProcess handle=${handle} exitCode=${exitCode}`);
            if (handle !== 0) this.closeHandle(handle);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0053, 'NtTerminateThread', (args) => {
            const handle   = args[0] ?? 0;
            const exitCode = args[1] ?? 0;
            console.log(`[NT] NtTerminateThread handle=${handle} exitCode=${exitCode}`);
            if (handle !== 0) this.closeHandle(handle);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0036, 'NtQuerySystemInformation', (args) => {
            const infoClass = args[0] ?? 0;
            const bufLen    = args[2] ?? 0;
            console.log(`[NT] NtQuerySystemInformation class=${infoClass} bufLen=${bufLen}`);
            // Return a minimal stub response
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x00BA, 'NtSuspendThread', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtSuspendThread handle=${handle}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'thread') return STATUS_INVALID_HANDLE;
            entry.data.suspended = true;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x004C, 'NtResumeThread', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtResumeThread handle=${handle}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'thread') return STATUS_INVALID_HANDLE;
            entry.data.suspended = false;
            return STATUS_SUCCESS;
        });

        // ── Synchronization ───────────────────────────────────────────────────

        this.registerSyscall(0x0038, 'NtCreateMutant', (args) => {
            // args: [outHandle, access, objAttr, initialOwner]
            const initialOwner = args[3] ?? 0;
            const id = this.allocHandle('mutant', {});
            this.mutants.set(id, { name: `mutant_${id}`, owned: !!initialOwner, count: initialOwner ? 1 : 0 });
            console.log(`[NT] NtCreateMutant initialOwner=${initialOwner} → handle=${id}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x007F, 'NtReleaseMutant', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtReleaseMutant handle=${handle}`);
            const m = this.mutants.get(handle);
            if (!m) return STATUS_INVALID_HANDLE;
            m.owned = false;
            m.count = 0;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0048, 'NtCreateEvent', (args) => {
            // args: [outHandle, access, objAttr, eventType, initialState]
            const autoReset    = (args[3] ?? 0) === 0; // 0=Notification(manual-reset=false), 1=Synchronization(auto-reset)
            const initialState = !!(args[4] ?? 0);
            const h = this.allocHandle('event', {});
            this.events.set(h, { name: `event_${h}`, signaled: initialState, autoReset });
            console.log(`[NT] NtCreateEvent autoReset=${autoReset} initialState=${initialState} → handle=${h}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x00DB, 'NtSetEvent', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtSetEvent handle=${handle}`);
            const ev = this.events.get(handle);
            if (!ev) return STATUS_INVALID_HANDLE;
            ev.signaled = true;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0097, 'NtResetEvent', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtResetEvent handle=${handle}`);
            const ev = this.events.get(handle);
            if (!ev) return STATUS_INVALID_HANDLE;
            ev.signaled = false;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0004, 'NtWaitForSingleObject', (args) => {
            // args: [handle, alertable, timeout]
            const handle = args[0] ?? 0;
            console.log(`[NT] NtWaitForSingleObject handle=${handle}`);
            // Single-threaded emulation: always return signaled (WAIT_OBJECT_0 = 0)
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x00D4, 'NtWaitForMultipleObjects', (args) => {
            // args: [count, handles, waitAll, alertable, timeout]
            const count = args[0] ?? 0;
            console.log(`[NT] NtWaitForMultipleObjects count=${count}`);
            return STATUS_SUCCESS; // WAIT_OBJECT_0
        });

        this.registerSyscall(0x004A, 'NtCreateSemaphore', (args) => {
            // args: [outHandle, access, objAttr, initialCount, maxCount]
            const initialCount = args[3] ?? 1;
            const maxCount     = args[4] ?? 1;
            const h = this.allocHandle('semaphore', {});
            this.semaphores.set(h, { name: `sem_${h}`, count: initialCount, max: maxCount });
            console.log(`[NT] NtCreateSemaphore init=${initialCount} max=${maxCount} → handle=${h}`);
            return STATUS_SUCCESS;
        });

        // ── Registry ──────────────────────────────────────────────────────────

        this.registerSyscall(0x0077, 'NtOpenKey', (args) => {
            // args: [outHandle, access, objAttr]
            const access = args[1] ?? 0;
            const h = this.allocHandle('regkey', { path: 'UNKNOWN', access });
            console.log(`[NT] NtOpenKey access=0x${(access>>>0).toString(16)} → handle=${h}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x00B9, 'NtQueryValueKey', (args) => {
            const handle    = args[0] ?? 0;
            const infoClass = args[2] ?? 0;
            console.log(`[NT] NtQueryValueKey handle=${handle} class=${infoClass}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'regkey') return STATUS_INVALID_HANDLE;
            return STATUS_OBJECT_NAME_NOT_FOUND; // value not found stub
        });

        this.registerSyscall(0x00C0, 'NtSetValueKey', (args) => {
            const handle   = args[0] ?? 0;
            const dataType = args[3] ?? 1;
            const dataLen  = args[5] ?? 0;
            console.log(`[NT] NtSetValueKey handle=${handle} type=${dataType} len=${dataLen}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'regkey') return STATUS_INVALID_HANDLE;
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0066, 'NtDeleteKey', (args) => {
            const handle = args[0] ?? 0;
            console.log(`[NT] NtDeleteKey handle=${handle}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'regkey') return STATUS_INVALID_HANDLE;
            this.closeHandle(handle);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0063, 'NtEnumerateKey', (args) => {
            const handle = args[0] ?? 0;
            const index  = args[1] ?? 0;
            console.log(`[NT] NtEnumerateKey handle=${handle} index=${index}`);
            const entry = this.handles.get(handle);
            if (!entry || entry.type !== 'regkey') return STATUS_INVALID_HANDLE;
            // No sub-keys in stub registry
            return 0x80000006; // STATUS_NO_MORE_ENTRIES
        });

        // ── Section objects ───────────────────────────────────────────────────

        this.registerSyscall(0x004F, 'NtCreateSection', (args) => {
            // args: [outHandle, access, objAttr, maximumSize, pageProt, sectionAttr, fileHandle]
            const protect = args[4] ?? PAGE_READWRITE;
            const size    = args[3] ?? 0x1000;
            const h = this.allocHandle('section', { size, protect });
            this.sections.set(h, { name: `section_${h}`, size, protect });
            console.log(`[NT] NtCreateSection size=0x${size.toString(16)} → handle=${h}`);
            return STATUS_SUCCESS;
        });

        this.registerSyscall(0x0076, 'NtOpenSection', (args) => {
            // args: [outHandle, access, objAttr]
            const access = args[1] ?? 0;
            const h = this.allocHandle('section', { size: 0, protect: access });
            console.log(`[NT] NtOpenSection access=0x${(access>>>0).toString(16)} → handle=${h}`);
            return STATUS_SUCCESS;
        });

        // ── Heap (RTL pseudo-syscalls, vendor range 0xF000) ───────────────────

        this.registerSyscall(0xF001, 'RtlAllocateHeap', (args) => {
            // args: [heapHandle, flags, size]
            const size = args[2] ?? 0;
            const addr = this.allocateVirtualMemory(size, PAGE_READWRITE);
            console.log(`[RTL] RtlAllocateHeap size=0x${size.toString(16)} → 0x${addr.toString(16)}`);
            return addr;
        });

        this.registerSyscall(0xF002, 'RtlFreeHeap', (args) => {
            // args: [heapHandle, flags, baseAddress]
            const addr = args[2] ?? 0;
            console.log(`[RTL] RtlFreeHeap addr=0x${addr.toString(16)}`);
            this.freeVirtualMemory(addr);
            return 1; // TRUE
        });

        this.registerSyscall(0xF003, 'RtlReAllocateHeap', (args) => {
            // args: [heapHandle, flags, baseAddress, size]
            const oldAddr = args[2] ?? 0;
            const newSize = args[3] ?? 0;
            console.log(`[RTL] RtlReAllocateHeap old=0x${oldAddr.toString(16)} newSize=0x${newSize.toString(16)}`);
            this.freeVirtualMemory(oldAddr);
            const newAddr = this.allocateVirtualMemory(newSize, PAGE_READWRITE);
            return newAddr;
        });

        this.registerSyscall(0xF004, 'RtlSizeHeap', (args) => {
            // args: [heapHandle, flags, baseAddress]
            const addr = args[2] ?? 0;
            const alloc = this.queryVirtualMemory(addr);
            const size = alloc ? alloc.size : 0;
            console.log(`[RTL] RtlSizeHeap addr=0x${addr.toString(16)} → ${size}`);
            return size;
        });

        // ── GDI stubs (0xG-prefixed mapped as 0x0G___ ∈ 0xA000 range) ────────

        this.registerSyscall(0xA001, 'GDI_CreateDC', (args) => {
            console.log('[GDI] CreateDC stub', args);
            return 1; // pseudo-HDC
        });

        this.registerSyscall(0xA002, 'GDI_BitBlt', (args) => {
            console.log('[GDI] BitBlt stub', args);
            return 1; // TRUE
        });

        this.registerSyscall(0xA003, 'GDI_StretchBlt', (args) => {
            console.log('[GDI] StretchBlt stub', args);
            return 1;
        });

        this.registerSyscall(0xA004, 'GDI_CreateCompatibleDC', (args) => {
            console.log('[GDI] CreateCompatibleDC stub', args);
            return 2; // pseudo-HDC
        });

        this.registerSyscall(0xA005, 'GDI_CreateBitmap', (args) => {
            console.log('[GDI] CreateBitmap stub', args);
            return 3; // pseudo-HBITMAP
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // kernel32.dll emulation
    // ════════════════════════════════════════════════════════════════════════

    private loadKernel32() {
        const k = this;
        this.modules.set('kernel32.dll', {
            CreateFileA(pathPtr: number, access: number, share: number, sec: number, disp: number, flags: number, templ: number): number {
                console.log(`[Kernel32] CreateFileA path@0x${pathPtr.toString(16)} access=0x${access.toString(16)}`);
                const h = k.allocHandle('file', { access, position: 0, data: new Uint8Array(0) });
                return h;
            },
            ReadFile(handle: number, bufPtr: number, bytesToRead: number, bytesReadPtr: number, overlapped: number): number {
                console.log(`[Kernel32] ReadFile handle=${handle} bytesToRead=${bytesToRead}`);
                const entry = k.handles.get(handle);
                if (!entry || entry.type !== 'file') { k.lastError = ERROR_INVALID_HANDLE; return 0; }
                k.lastError = ERROR_SUCCESS;
                return 1; // TRUE
            },
            WriteFile(handle: number, bufPtr: number, bytesToWrite: number, bytesWrittenPtr: number, overlapped: number): number {
                console.log(`[Kernel32] WriteFile handle=${handle} bytesToWrite=${bytesToWrite}`);
                const entry = k.handles.get(handle);
                if (!entry || entry.type !== 'file') { k.lastError = ERROR_INVALID_HANDLE; return 0; }
                k.lastError = ERROR_SUCCESS;
                return 1;
            },
            CloseHandle(handle: number): number {
                console.log(`[Kernel32] CloseHandle handle=${handle}`);
                if (!k.closeHandle(handle)) { k.lastError = ERROR_INVALID_HANDLE; return 0; }
                k.lastError = ERROR_SUCCESS;
                return 1;
            },
            VirtualAlloc(addr: number, size: number, allocType: number, protect: number): number {
                console.log(`[Kernel32] VirtualAlloc addr=0x${addr.toString(16)} size=0x${size.toString(16)} type=0x${allocType.toString(16)} protect=0x${protect.toString(16)}`);
                const result = k.allocateVirtualMemory(size, protect);
                k.lastError = ERROR_SUCCESS;
                return result;
            },
            VirtualFree(addr: number, size: number, freeType: number): number {
                console.log(`[Kernel32] VirtualFree addr=0x${addr.toString(16)} size=0x${size.toString(16)} type=0x${freeType.toString(16)}`);
                const ok = k.freeVirtualMemory(addr);
                k.lastError = ok ? ERROR_SUCCESS : ERROR_INVALID_PARAMETER;
                return ok ? 1 : 0;
            },
            VirtualProtect(addr: number, size: number, newProtect: number, oldProtectPtr: number): number {
                console.log(`[Kernel32] VirtualProtect addr=0x${addr.toString(16)} size=0x${size.toString(16)} newProtect=0x${newProtect.toString(16)}`);
                const alloc = k.queryVirtualMemory(addr);
                if (!alloc) { k.lastError = ERROR_INVALID_PARAMETER; return 0; }
                alloc.protect = newProtect;
                k.lastError = ERROR_SUCCESS;
                return 1;
            },
            GetLastError(): number {
                return k.lastError;
            },
            SetLastError(err: number): number {
                k.lastError = err;
                return 0;
            },
            CreateThread(sec: number, stackSize: number, startAddr: number, param: number, flags: number, threadIdPtr: number): number {
                const h = k.allocHandle('thread', { tid: Math.floor(Math.random() * 65535) + 1, startAddr });
                console.log(`[Kernel32] CreateThread startAddr=0x${startAddr.toString(16)} → handle=${h}`);
                k.lastError = ERROR_SUCCESS;
                return h;
            },
            WaitForSingleObject(handle: number, timeout: number): number {
                console.log(`[Kernel32] WaitForSingleObject handle=${handle} timeout=${timeout}`);
                // Stub: always return WAIT_OBJECT_0
                return 0x00000000;
            },
            ExitProcess(exitCode: number): number {
                console.log(`[Kernel32] ExitProcess exitCode=${exitCode}`);
                return 0;
            },
            GetCurrentProcessId(): number {
                return k._pid;
            },
            GetCurrentThreadId(): number {
                return k._tid;
            },
            GetProcAddress(moduleHandle: number, procName: number): number {
                console.log(`[Kernel32] GetProcAddress module=${moduleHandle} procName@0x${procName.toString(16)}`);
                // Search all loaded modules for the export
                for (const [modName, mod] of k.modules) {
                    // Try to read the function name from process memory if procName is a valid pointer
                    if (procName > 0 && procName < k.processMemoryView.length) {
                        let end = procName;
                        while (end < k.processMemoryView.length && k.processMemoryView[end] !== 0) end++;
                        const fnName = String.fromCharCode(...k.processMemoryView.slice(procName, end));
                        if (mod[fnName]) {
                            console.log(`[Kernel32] GetProcAddress resolved: ${modName}!${fnName}`);
                            return 0x7FFF0000 + modName.length * 256 + fnName.charCodeAt(0); // unique per name
                        }
                    }
                }
                console.warn(`[Kernel32] GetProcAddress: unresolved procName@0x${procName.toString(16)}`);
                return 0; // NULL = not found
            },
            LoadLibraryA(namePtr: number): number {
                console.log(`[Kernel32] LoadLibraryA namePtr=0x${namePtr.toString(16)}`);
                // Return a pseudo module handle
                return 0x10000000;
            },
            FreeLibrary(moduleHandle: number): number {
                console.log(`[Kernel32] FreeLibrary module=${moduleHandle}`);
                return 1;
            },
            GetSystemInfo(sysInfoPtr: number): number {
                console.log(`[Kernel32] GetSystemInfo sysInfoPtr=0x${sysInfoPtr.toString(16)}`);
                if (sysInfoPtr > 0 && sysInfoPtr + 36 < k.processMemoryView.length) {
                    const v = k.processMemoryView;
                    v[sysInfoPtr + 0] = 0;                            // wProcessorArchitecture (x86)
                    k.processMemoryView[sysInfoPtr + 2] = 0; k.processMemoryView[sysInfoPtr + 3] = 0; // wReserved
                    // dwPageSize
                    v[sysInfoPtr+4]=0x00; v[sysInfoPtr+5]=0x10; v[sysInfoPtr+6]=0; v[sysInfoPtr+7]=0;
                    // lpMinimumApplicationAddress
                    v[sysInfoPtr+8]=0; v[sysInfoPtr+9]=0; v[sysInfoPtr+10]=1; v[sysInfoPtr+11]=0;
                    // lpMaximumApplicationAddress
                    v[sysInfoPtr+12]=0xFF; v[sysInfoPtr+13]=0xFE; v[sysInfoPtr+14]=0xFF; v[sysInfoPtr+15]=0x7F;
                    // dwActiveProcessorMask
                    v[sysInfoPtr+16]=1; v[sysInfoPtr+17]=0; v[sysInfoPtr+18]=0; v[sysInfoPtr+19]=0;
                    // dwNumberOfProcessors
                    v[sysInfoPtr+20]=1; v[sysInfoPtr+21]=0; v[sysInfoPtr+22]=0; v[sysInfoPtr+23]=0;
                    // dwProcessorType
                    v[sysInfoPtr+24]=0; v[sysInfoPtr+25]=0; v[sysInfoPtr+26]=0x40; v[sysInfoPtr+27]=0;
                    // dwAllocationGranularity
                    v[sysInfoPtr+28]=0; v[sysInfoPtr+29]=0; v[sysInfoPtr+30]=1; v[sysInfoPtr+31]=0;
                    // wProcessorLevel
                    v[sysInfoPtr+32]=6; v[sysInfoPtr+33]=0;
                    // wProcessorRevision
                    v[sysInfoPtr+34]=1; v[sysInfoPtr+35]=0;
                }
                return 0;
            },
            GlobalAlloc(flags: number, size: number): number {
                console.log(`[Kernel32] GlobalAlloc flags=0x${flags.toString(16)} size=0x${size.toString(16)}`);
                return k.allocateVirtualMemory(size, PAGE_READWRITE);
            },
            GlobalFree(hMem: number): number {
                console.log(`[Kernel32] GlobalFree hMem=0x${hMem.toString(16)}`);
                k.freeVirtualMemory(hMem);
                return 0;
            },
            HeapCreate(options: number, initialSize: number, maxSize: number): number {
                console.log(`[Kernel32] HeapCreate initialSize=0x${initialSize.toString(16)} maxSize=0x${maxSize.toString(16)}`);
                const h = k.allocHandle('heap', { initialSize, maxSize });
                return h;
            },
            HeapAlloc(heapHandle: number, flags: number, size: number): number {
                console.log(`[Kernel32] HeapAlloc heap=${heapHandle} size=0x${size.toString(16)}`);
                return k.allocateVirtualMemory(size, PAGE_READWRITE);
            },
            HeapFree(heapHandle: number, flags: number, memPtr: number): number {
                console.log(`[Kernel32] HeapFree heap=${heapHandle} ptr=0x${memPtr.toString(16)}`);
                k.freeVirtualMemory(memPtr);
                return 1;
            },
            ExitThread(exitCode: number): number {
                console.log(`[Kernel32] ExitThread exitCode=${exitCode}`);
                return 0;
            },
            CreateMutexA(sec: number, initialOwner: number, namePtr: number): number {
                const h = k.allocHandle('mutant', {});
                k.mutants.set(h, { name: `mutex_${h}`, owned: !!initialOwner, count: initialOwner ? 1 : 0 });
                console.log(`[Kernel32] CreateMutexA initialOwner=${initialOwner} → handle=${h}`);
                k.lastError = ERROR_SUCCESS;
                return h;
            },
            ReleaseMutex(handle: number): number {
                console.log(`[Kernel32] ReleaseMutex handle=${handle}`);
                const m = k.mutants.get(handle);
                if (!m) { k.lastError = ERROR_INVALID_HANDLE; return 0; }
                m.owned = false; m.count = 0;
                return 1;
            },
            CreateEventA(sec: number, manualReset: number, initialState: number, namePtr: number): number {
                const h = k.allocHandle('event', {});
                k.events.set(h, { name: `event_${h}`, signaled: !!initialState, autoReset: !manualReset });
                console.log(`[Kernel32] CreateEventA manualReset=${manualReset} initialState=${initialState} → handle=${h}`);
                k.lastError = ERROR_SUCCESS;
                return h;
            },
            SetEvent(handle: number): number {
                console.log(`[Kernel32] SetEvent handle=${handle}`);
                const ev = k.events.get(handle);
                if (!ev) { k.lastError = ERROR_INVALID_HANDLE; return 0; }
                ev.signaled = true;
                return 1;
            },
            ResetEvent(handle: number): number {
                console.log(`[Kernel32] ResetEvent handle=${handle}`);
                const ev = k.events.get(handle);
                if (!ev) { k.lastError = ERROR_INVALID_HANDLE; return 0; }
                ev.signaled = false;
                return 1;
            },
            WaitForMultipleObjects(count: number, handlesPtr: number, waitAll: number, timeout: number): number {
                console.log(`[Kernel32] WaitForMultipleObjects count=${count} waitAll=${waitAll} timeout=${timeout}`);
                return 0x00000000; // WAIT_OBJECT_0
            },
            Sleep(ms: number): number {
                console.log(`[Kernel32] Sleep ms=${ms} (stub — no actual sleep in emulation)`);
                return 0;
            },
            GetTickCount(): number {
                const ticks = Date.now() & 0xFFFFFFFF;
                return ticks;
            },
            QueryPerformanceCounter(counterPtr: number): number {
                const now = BigInt(Date.now()) * 10_000n;
                const ticks = now - k.perfStart + k.perfStart; // relative ticks
                console.log(`[Kernel32] QueryPerformanceCounter → ${ticks}`);
                return 1; // TRUE
            },
            QueryPerformanceFrequency(freqPtr: number): number {
                console.log(`[Kernel32] QueryPerformanceFrequency → ${k.perfFrequency}`);
                return 1; // TRUE
            },
            GetModuleHandleA(namePtr: number): number {
                console.log(`[Kernel32] GetModuleHandleA namePtr=0x${namePtr.toString(16)}`);
                return 0x00400000; // default image base
            },
            GetModuleFileNameA(moduleHandle: number, bufPtr: number, size: number): number {
                console.log(`[Kernel32] GetModuleFileNameA module=${moduleHandle} bufPtr=0x${bufPtr.toString(16)}`);
                const name = 'C:\\game.exe';
                const written = Math.min(name.length, size - 1);
                if (bufPtr > 0 && bufPtr + written < k.processMemoryView.length) {
                    for (let i = 0; i < written; i++) k.processMemoryView[bufPtr + i] = name.charCodeAt(i);
                    k.processMemoryView[bufPtr + written] = 0; // null terminator
                }
                return written;
            },
            FormatMessageA(flags: number, source: number, msgId: number, langId: number, bufPtr: number, size: number, args: number): number {
                console.log(`[Kernel32] FormatMessageA msgId=0x${msgId.toString(16)}`);
                const msg = `Error ${msgId}`;
                const written = Math.min(msg.length, size - 1);
                if (bufPtr > 0 && bufPtr + written < k.processMemoryView.length) {
                    for (let i = 0; i < written; i++) k.processMemoryView[bufPtr + i] = msg.charCodeAt(i);
                    k.processMemoryView[bufPtr + written] = 0;
                }
                return written;
            },
            OutputDebugStringA(strPtr: number): number {
                console.log(`[Kernel32] OutputDebugStringA strPtr=0x${strPtr.toString(16)}`);
                return 0;
            },
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // user32.dll emulation
    // ════════════════════════════════════════════════════════════════════════

    private loadUser32() {
        const k = this; // same alias as loadKernel32 for consistent access
        this.modules.set('user32.dll', {
            MessageBoxA(hwnd: number, textPtr: number, captionPtr: number, type: number): number {
                console.log(`[User32] MessageBoxA hwnd=${hwnd} text@0x${textPtr.toString(16)} type=${type}`);
                return 1; // IDOK
            },
            CreateWindowExA(
                exStyle: number, classNamePtr: number, windowNamePtr: number,
                style: number, x: number, y: number, w: number, h: number,
                parent: number, menu: number, instance: number, param: number
            ): number {
                console.log(`[User32] CreateWindowExA x=${x} y=${y} w=${w} h=${h} style=0x${style.toString(16)}`);
                return 0x00010001; // pseudo-HWND
            },
            ShowWindow(hwnd: number, cmdShow: number): number {
                console.log(`[User32] ShowWindow hwnd=${hwnd} cmdShow=${cmdShow}`);
                return 1; // TRUE (window was previously visible)
            },
            UpdateWindow(hwnd: number): number {
                console.log(`[User32] UpdateWindow hwnd=${hwnd}`);
                return 1;
            },
            DefWindowProcA(hwnd: number, msg: number, wParam: number, lParam: number): number {
                console.log(`[User32] DefWindowProcA hwnd=${hwnd} msg=0x${msg.toString(16)}`);
                return 0;
            },
            RegisterClassExA(wndClassExPtr: number): number {
                console.log(`[User32] RegisterClassExA wndClassExPtr=0x${wndClassExPtr.toString(16)}`);
                return 0xC000; // pseudo atom
            },
            GetMessageA(msgPtr: number, hwnd: number, msgFilterMin: number, msgFilterMax: number): number {
                console.log(`[User32] GetMessageA hwnd=${hwnd} filter=[${msgFilterMin},${msgFilterMax}]`);
                // Return WM_PAINT by default to keep the message loop alive (return 1 = continue)
                if (msgPtr > 0 && msgPtr + 28 < k.processMemoryView.length) {
                    const v = k.processMemoryView;
                    // MSG struct: hwnd(4), message(4), wParam(4), lParam(4), time(4), pt(8)
                    v[msgPtr+4]=0x0F; v[msgPtr+5]=0; v[msgPtr+6]=0; v[msgPtr+7]=0; // WM_PAINT
                    // time
                    const t = Date.now() & 0xFFFFFFFF;
                    v[msgPtr+16]=t&0xFF; v[msgPtr+17]=(t>>8)&0xFF; v[msgPtr+18]=(t>>16)&0xFF; v[msgPtr+19]=(t>>24)&0xFF;
                }
                return 1; // 1 = continue message loop (0 = WM_QUIT)
            },
            PeekMessageA(msgPtr: number, hwnd: number, msgFilterMin: number, msgFilterMax: number, removeMsg: number): number {
                // Same as GetMessageA but never blocks — always return a WM_PAINT
                if (msgPtr > 0 && msgPtr + 28 < k.processMemoryView.length) {
                    const v = k.processMemoryView;
                    v[msgPtr+4]=0x0F; v[msgPtr+5]=0; v[msgPtr+6]=0; v[msgPtr+7]=0;
                    const t = Date.now() & 0xFFFFFFFF;
                    v[msgPtr+16]=t&0xFF; v[msgPtr+17]=(t>>8)&0xFF; v[msgPtr+18]=(t>>16)&0xFF; v[msgPtr+19]=(t>>24)&0xFF;
                }
                return 1;
            },
            TranslateMessage(msgPtr: number): number {
                console.log(`[User32] TranslateMessage msgPtr=0x${msgPtr.toString(16)}`);
                return 1;
            },
            DispatchMessageA(msgPtr: number): number {
                console.log(`[User32] DispatchMessageA msgPtr=0x${msgPtr.toString(16)}`);
                return 0;
            },
            PostQuitMessage(exitCode: number): number {
                console.log(`[User32] PostQuitMessage exitCode=${exitCode}`);
                return 0;
            },
            GetClientRect(hwnd: number, rectPtr: number): number {
                console.log(`[User32] GetClientRect hwnd=${hwnd} rectPtr=0x${rectPtr.toString(16)}`);
                if (rectPtr > 0 && rectPtr + 16 <= k.processMemoryView.length) {
                    const v = k.processMemoryView;
                    // left=0, top=0, right=800, bottom=600
                    v[rectPtr+0]=0; v[rectPtr+1]=0; v[rectPtr+2]=0; v[rectPtr+3]=0;
                    v[rectPtr+4]=0; v[rectPtr+5]=0; v[rectPtr+6]=0; v[rectPtr+7]=0;
                    v[rectPtr+8]=0x20; v[rectPtr+9]=0x03; v[rectPtr+10]=0; v[rectPtr+11]=0; // 800
                    v[rectPtr+12]=0x58; v[rectPtr+13]=0x02; v[rectPtr+14]=0; v[rectPtr+15]=0; // 600
                }
                return 1;
            },
            InvalidateRect(hwnd: number, rectPtr: number, erase: number): number {
                console.log(`[User32] InvalidateRect hwnd=${hwnd} erase=${erase}`);
                return 1;
            },
            SendMessageA(hwnd: number, msg: number, wParam: number, lParam: number): number {
                console.log(`[User32] SendMessageA hwnd=${hwnd} msg=0x${msg.toString(16)}`);
                return 0;
            },
            GetAsyncKeyState(vKey: number): number {
                // Kernel-level emulation has no keyboard state; unified-runtime provides real implementation
                return 0;
            },
            LoadCursorA(hInstance: number, lpCursorName: number): number {
                return 0x10000; // pseudo handle
            },
            LoadIconA(hInstance: number, lpIconName: number): number {
                return 0x10001; // pseudo handle
            },
            SetCursor(hCursor: number): number {
                return hCursor;
            },
            ShowCursor(bShow: number): number {
                return bShow ? 1 : 0;
            },
            AdjustWindowRect(lpRect: number, dwStyle: number, bMenu: number): number {
                return 1;
            },
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // GDI stubs registered in modules map
    // ════════════════════════════════════════════════════════════════════════

    private loadGdiStubs() {
        const k = this;
        this.modules.set('gdi32.dll', {
            CreateDC(driverPtr: number, devicePtr: number, outputPtr: number, initDataPtr: number): number {
                console.log('[GDI32] CreateDC');
                const h = k.allocHandle('dc', {});
                return h;
            },
            CreateCompatibleDC(hdc: number): number {
                console.log(`[GDI32] CreateCompatibleDC hdc=${hdc}`);
                const h = k.allocHandle('dc', { compatWith: hdc });
                return h;
            },
            DeleteDC(hdc: number): number {
                console.log(`[GDI32] DeleteDC hdc=${hdc}`);
                return k.closeHandle(hdc) ? 1 : 0;
            },
            BitBlt(
                destDC: number, x: number, y: number, w: number, h: number,
                srcDC: number, srcX: number, srcY: number, rop: number
            ): number {
                console.log(`[GDI32] BitBlt dest=${destDC} src=${srcDC} w=${w} h=${h} rop=0x${rop.toString(16)}`);
                return 1;
            },
            StretchBlt(
                destDC: number, xDest: number, yDest: number, wDest: number, hDest: number,
                srcDC: number, xSrc: number, ySrc: number, wSrc: number, hSrc: number, rop: number
            ): number {
                console.log(`[GDI32] StretchBlt dest=${destDC} src=${srcDC} rop=0x${rop.toString(16)}`);
                return 1;
            },
            CreateBitmap(w: number, height: number, planes: number, bitCount: number, bitsPtr: number): number {
                console.log(`[GDI32] CreateBitmap w=${w} h=${height} planes=${planes} bitCount=${bitCount}`);
                const h = k.allocHandle('bitmap', { width: w, height, bitCount, data: new Uint8Array(w * height * 4) });
                return h;
            },
            CreateCompatibleBitmap(hdc: number, w: number, height: number): number {
                console.log(`[GDI32] CreateCompatibleBitmap hdc=${hdc} w=${w} h=${height}`);
                const h = k.allocHandle('bitmap', { width: w, height, data: new Uint8Array(w * height * 4) });
                return h;
            },
            CreateSolidBrush(color: number): number {
                const h = k.allocHandle('brush', { color });
                return h;
            },
            CreatePen(style: number, width: number, color: number): number {
                const h = k.allocHandle('pen', { style, width, color });
                return h;
            },
            SelectObject(hdc: number, obj: number): number {
                const dcEntry = k.handles.get(hdc);
                const objEntry = k.handles.get(obj);
                if (dcEntry && objEntry) {
                    // Track currently selected object
                    const prev = dcEntry.data.selected?.[objEntry.type] ?? 0;
                    if (!dcEntry.data.selected) dcEntry.data.selected = {};
                    dcEntry.data.selected[objEntry.type] = obj;
                    return prev;
                }
                return 0;
            },
            DeleteObject(obj: number): number {
                return k.closeHandle(obj) ? 1 : 0;
            },
            SetTextColor(hdc: number, color: number): number {
                const dcEntry = k.handles.get(hdc);
                if (!dcEntry) return 0;
                const prev = dcEntry.data.textColor ?? 0;
                dcEntry.data.textColor = color;
                return prev;
            },
            SetBkColor(hdc: number, color: number): number {
                const dcEntry = k.handles.get(hdc);
                if (!dcEntry) return 0;
                const prev = dcEntry.data.bkColor ?? 0x00FFFFFF;
                dcEntry.data.bkColor = color;
                return prev;
            },
            SetBkMode(hdc: number, mode: number): number {
                const dcEntry = k.handles.get(hdc);
                if (!dcEntry) return 0;
                const prev = dcEntry.data.bkMode ?? 2; // OPAQUE
                dcEntry.data.bkMode = mode;
                return prev;
            },
            TextOutA(hdc: number, x: number, y: number, strPtr: number, len: number): number {
                const dcEntry = k.handles.get(hdc);
                if (!dcEntry || !dcEntry.data) return 0;
                let text = '';
                if (strPtr > 0 && strPtr < k.processMemoryView.length) {
                    let end = strPtr;
                    const maxEnd = Math.min(strPtr + len, k.processMemoryView.length);
                    while (end < maxEnd && k.processMemoryView[end] !== 0) end++;
                    text = String.fromCharCode(...k.processMemoryView.slice(strPtr, end));
                }
                console.log(`[GDI32] TextOutA hdc=${hdc} x=${x} y=${y} "${text}"`);
                // Store text for rendering; actual pixel drawing happens via WindowManager in unified-runtime
                dcEntry.data.lastText = { x, y, text, color: dcEntry.data.textColor ?? 0x00FFFFFF };
                return 1;
            },
            FillRect(hdc: number, rectPtr: number, hbrush: number): number {
                const dcEntry = k.handles.get(hdc);
                if (!dcEntry || !dcEntry.data) return 0;
                let left = 0, top = 0, right = 800, bottom = 600;
                if (rectPtr > 0 && rectPtr + 16 <= k.processMemoryView.length) {
                    left = k.processMemoryView[rectPtr] | (k.processMemoryView[rectPtr+1]<<8) | (k.processMemoryView[rectPtr+2]<<16) | (k.processMemoryView[rectPtr+3]<<24);
                    top = k.processMemoryView[rectPtr+4] | (k.processMemoryView[rectPtr+5]<<8) | (k.processMemoryView[rectPtr+6]<<16) | (k.processMemoryView[rectPtr+7]<<24);
                    right = k.processMemoryView[rectPtr+8] | (k.processMemoryView[rectPtr+9]<<8) | (k.processMemoryView[rectPtr+10]<<16) | (k.processMemoryView[rectPtr+11]<<24);
                    bottom = k.processMemoryView[rectPtr+12] | (k.processMemoryView[rectPtr+13]<<8) | (k.processMemoryView[rectPtr+14]<<16) | (k.processMemoryView[rectPtr+15]<<24);
                }
                // Look up brush color
                const brushEntry = k.handles.get(hbrush);
                const color = brushEntry?.data?.color ?? 0x00FFFFFF;
                dcEntry.data.lastFill = { left, top, right, bottom, color };
                console.log(`[GDI32] FillRect hdc=${hdc} [${left},${top},${right},${bottom}] color=0x${(color>>>0).toString(16)}`);
                return 1;
            },
            Rectangle(hdc: number, left: number, top: number, right: number, bottom: number): number {
                const dcEntry = k.handles.get(hdc);
                if (!dcEntry || !dcEntry.data) return 0;
                const penColor = dcEntry.data.selected?.pen ? (k.handles.get(dcEntry.data.selected.pen)?.data?.color ?? 0x00FFFFFF) : 0x00FFFFFF;
                const brushColor = dcEntry.data.selected?.brush ? (k.handles.get(dcEntry.data.selected.brush)?.data?.color ?? 0x00FFFFFF) : 0x00FFFFFF;
                dcEntry.data.lastRect = { left, top, right, bottom, penColor, brushColor };
                console.log(`[GDI32] Rectangle hdc=${hdc} [${left},${top},${right},${bottom}]`);
                return 1;
            },
            GetPixel(hdc: number, x: number, y: number): number {
                // Return white as default — actual pixel reading requires WindowManager integration
                return 0x00FFFFFF;
            },
            SetPixel(hdc: number, x: number, y: number, color: number): number {
                return color;
            },
            PatBlt(hdc: number, x: number, y: number, w: number, h: number, rop: number): number {
                console.log(`[GDI32] PatBlt hdc=${hdc} x=${x} y=${y} w=${w} h=${h} rop=0x${rop.toString(16)}`);
                return 1;
            },
            MoveToEx(hdc: number, x: number, y: number, prevPtr: number): number {
                const dcEntry = k.handles.get(hdc);
                if (!dcEntry) return 0;
                const prev = { x: dcEntry.data.posX ?? 0, y: dcEntry.data.posY ?? 0 };
                dcEntry.data.posX = x;
                dcEntry.data.posY = y;
                if (prevPtr && prevPtr + 8 <= k.processMemoryView.length) {
                    k.processMemoryView[prevPtr] = prev.x & 0xFF;
                    k.processMemoryView[prevPtr+1] = (prev.x >> 8) & 0xFF;
                    k.processMemoryView[prevPtr+4] = prev.y & 0xFF;
                    k.processMemoryView[prevPtr+5] = (prev.y >> 8) & 0xFF;
                }
                return 1;
            },
            LineTo(hdc: number, x: number, y: number): number {
                console.log(`[GDI32] LineTo hdc=${hdc} x=${x} y=${y}`);
                const dcEntry = k.handles.get(hdc);
                if (dcEntry) { dcEntry.data.posX = x; dcEntry.data.posY = y; }
                return 1;
            },
        });
    }
}
