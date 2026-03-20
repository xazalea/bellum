/**
 * Win32 Runtime Stubs
 * Part of Project BELLUM NEXUS
 *
 * Aggregates Win32 API stubs by DLL, implemented as WASM function table indices
 * for use with CALL_INDIRECT during PE execution in the browser.
 */

import { webGPURenderer } from '../../gpu/webgpu-renderer';
import type { LoadedPE } from '../../transpiler/pe_parser';

export interface Win32Import {
  dll: string;
  name: string;
  /** WASM function table index for CALL_INDIRECT */
  tableIndex: number;
  handler: (...args: number[]) => number;
}

export class Win32Runtime {
  private stubs: Map<string, Map<string, Win32Import>> = new Map();
  private nextTableIndex = 1000; // Reserve 0-999 for ART stubs
  private handles: Map<number, any> = new Map();
  private nextHandle = 0x10001;
  private heapBase = 0x12010000;
  private heapTop = 0x12010000;

  /** Shared memory view — must be set by the executor after WASM memory is created */
  private mem: DataView | null = null;

  private callCount = 0;

  /** Attach a DataView over the WASM linear memory so stubs can write to guest pointers */
  attachMemory(view: DataView): void {
    this.mem = view;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private allocHeap(size: number): number {
    const aligned = (size + 7) & ~7;
    const ptr = this.heapTop;
    this.heapTop += aligned;
    return ptr;
  }

  private writeI32(ptr: number, value: number): void {
    if (this.mem && ptr + 4 <= this.mem.byteLength) {
      this.mem.setInt32(ptr, value, true);
    }
  }

  private writeI64(ptr: number, value: number): void {
    if (this.mem && ptr + 8 <= this.mem.byteLength) {
      // Write as two 32-bit halves (lo, hi)
      this.mem.setInt32(ptr, value | 0, true);
      this.mem.setInt32(ptr + 4, 0, true);
    }
  }

  private alloc(): number {
    const h = this.nextHandle;
    this.nextHandle += 1;
    return h;
  }

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  private registerStub(dll: string, name: string, handler: (...args: number[]) => number): void {
    const dllKey = dll.toLowerCase();
    if (!this.stubs.has(dllKey)) {
      this.stubs.set(dllKey, new Map());
    }
    const tableIndex = this.nextTableIndex++;
    const stub: Win32Import = { dll: dllKey, name, tableIndex, handler };
    this.stubs.get(dllKey)!.set(name.toLowerCase(), stub);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  initialize(): void {
    this.registerKernel32();
    this.registerUser32();
    this.registerGdi32();
    this.registerOpenGL32();
  }

  resolveImport(dll: string, name: string): number {
    const dllMap = this.stubs.get(dll.toLowerCase());
    if (!dllMap) return -1;
    const stub = dllMap.get(name.toLowerCase());
    return stub ? stub.tableIndex : -1;
  }

  resolveImports(pe: { imports: Array<{ dll: string; functions: string[] }> }): Map<string, number> {
    const result = new Map<string, number>();
    for (const entry of pe.imports) {
      for (const fn of entry.functions) {
        const idx = this.resolveImport(entry.dll, fn);
        result.set(`${entry.dll}!${fn}`, idx);
      }
    }
    return result;
  }

  getStats(): { stubsRegistered: number; callCount: number } {
    let count = 0;
    for (const dllMap of this.stubs.values()) {
      count += dllMap.size;
    }
    return { stubsRegistered: count, callCount: this.callCount };
  }

  // -------------------------------------------------------------------------
  // kernel32.dll
  // -------------------------------------------------------------------------

  private registerKernel32(): void {
    const dll = 'kernel32.dll';

    this.registerStub(dll, 'VirtualAlloc', (addr, size, type, protect) => {
      this.callCount++;
      return this.allocHeap(size);
    });

    this.registerStub(dll, 'VirtualFree', (addr, size, type) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'VirtualProtect', (addr, size, newProt, oldProtPtr) => {
      this.callCount++;
      if (oldProtPtr) this.writeI32(oldProtPtr, 0x04); // PAGE_READWRITE
      return 1;
    });

    this.registerStub(dll, 'HeapCreate', (opts, initSize, maxSize) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'HeapAlloc', (heap, flags, size) => {
      this.callCount++;
      return this.allocHeap(size);
    });

    this.registerStub(dll, 'HeapFree', (heap, flags, ptr) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'CreateFileA', (name, access, share, sa, disp, attr, tmpl) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'ReadFile', (handle, buf, nBytes, bytesRead, overlapped) => {
      this.callCount++;
      if (bytesRead) this.writeI32(bytesRead, 0);
      return 0;
    });

    this.registerStub(dll, 'WriteFile', (handle, buf, nBytes, bytesWritten, overlapped) => {
      this.callCount++;
      if (bytesWritten) this.writeI32(bytesWritten, nBytes);
      return 1;
    });

    this.registerStub(dll, 'CloseHandle', (handle) => {
      this.callCount++;
      this.handles.delete(handle);
      return 1;
    });

    this.registerStub(dll, 'GetLastError', () => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'SetLastError', (code) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'GetTickCount64', () => {
      this.callCount++;
      return performance.now() | 0;
    });

    this.registerStub(dll, 'QueryPerformanceCounter', (lpPerf) => {
      this.callCount++;
      const now = performance.now() * 1000;
      if (lpPerf) this.writeI64(lpPerf, now | 0);
      return 1;
    });

    this.registerStub(dll, 'QueryPerformanceFrequency', (lpFreq) => {
      this.callCount++;
      if (lpFreq) this.writeI64(lpFreq, 1000000);
      return 1;
    });

    this.registerStub(dll, 'LoadLibraryA', (name) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'GetProcAddress', (module, name) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'GetSystemInfo', (lpSystemInfo) => {
      this.callCount++;
      if (lpSystemInfo && this.mem) {
        // SYSTEM_INFO: wProcessorArchitecture=9 (x64), dwPageSize=4096, etc.
        this.writeI32(lpSystemInfo,      0x00090000); // arch (x64) + reserved
        this.writeI32(lpSystemInfo + 4,  0x1000);     // dwPageSize
        this.writeI32(lpSystemInfo + 8,  0x10000);    // lpMinimumApplicationAddress (lo)
        this.writeI32(lpSystemInfo + 12, 0);          // lpMinimumApplicationAddress (hi)
        this.writeI32(lpSystemInfo + 16, 0x7FFEFFFF); // lpMaximumApplicationAddress (lo)
        this.writeI32(lpSystemInfo + 20, 0x7FFF);     // lpMaximumApplicationAddress (hi)
        this.writeI32(lpSystemInfo + 24, 0x0F);       // dwActiveProcessorMask
        this.writeI32(lpSystemInfo + 28, 4);          // dwNumberOfProcessors
        this.writeI32(lpSystemInfo + 32, 0);          // dwProcessorType (obsolete)
        this.writeI32(lpSystemInfo + 36, 0x10000);    // dwAllocationGranularity
        this.writeI32(lpSystemInfo + 40, 0);          // wProcessorLevel + wProcessorRevision
      }
      return 0;
    });

    this.registerStub(dll, 'ExitProcess', (code) => {
      this.callCount++;
      throw { type: 'exit', code };
    });

    this.registerStub(dll, 'CreateThread', (sa, stackSize, fnPtr, param, flags, threadId) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'WaitForSingleObject', (handle, timeout) => {
      this.callCount++;
      return 0; // WAIT_OBJECT_0
    });

    this.registerStub(dll, 'WaitForMultipleObjects', (count, handles, waitAll, timeout) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'Sleep', (ms) => {
      this.callCount++;
      return 0; // Browser can't sleep synchronously
    });

    this.registerStub(dll, 'GetCurrentThreadId', () => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'GetCurrentProcessId', () => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'IsDebuggerPresent', () => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'TlsAlloc', () => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'TlsGetValue', (idx) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'TlsSetValue', (idx, val) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'InitializeCriticalSection', (ptr) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'EnterCriticalSection', (ptr) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'LeaveCriticalSection', (ptr) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'DeleteCriticalSection', (ptr) => {
      this.callCount++;
      return 0;
    });
  }

  // -------------------------------------------------------------------------
  // user32.dll
  // -------------------------------------------------------------------------

  private registerUser32(): void {
    const dll = 'user32.dll';

    this.registerStub(dll, 'CreateWindowExA', (...args) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'ShowWindow', (hwnd, cmd) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'DestroyWindow', (hwnd) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'PeekMessageA', (lpMsg, hwnd, min, max, remove) => {
      this.callCount++;
      return 0; // No messages
    });

    this.registerStub(dll, 'TranslateMessage', (msg) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'DispatchMessageA', (msg) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'PostQuitMessage', (code) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'GetClientRect', (hwnd, lpRect) => {
      this.callCount++;
      if (lpRect) {
        this.writeI32(lpRect,      0);   // left
        this.writeI32(lpRect + 4,  0);   // top
        this.writeI32(lpRect + 8,  800); // right
        this.writeI32(lpRect + 12, 600); // bottom
      }
      return 1;
    });

    this.registerStub(dll, 'GetWindowRect', (hwnd, lpRect) => {
      this.callCount++;
      if (lpRect) {
        this.writeI32(lpRect,      0);
        this.writeI32(lpRect + 4,  0);
        this.writeI32(lpRect + 8,  800);
        this.writeI32(lpRect + 12, 600);
      }
      return 1;
    });

    this.registerStub(dll, 'MapVirtualKeyA', (code, type) => {
      this.callCount++;
      return code;
    });

    this.registerStub(dll, 'GetAsyncKeyState', (vk) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'SetCapture', (hwnd) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'ReleaseCapture', () => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'LoadCursorA', (inst, name) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'SetCursor', (cursor) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'ShowCursor', (show) => {
      this.callCount++;
      return show;
    });

    this.registerStub(dll, 'MessageBoxA', (hwnd, text, caption, type) => {
      this.callCount++;
      return 1; // IDOK
    });

    this.registerStub(dll, 'RegisterClassExA', (lpWndClass) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'DefWindowProcA', (hwnd, msg, wp, lp) => {
      this.callCount++;
      return 0;
    });
  }

  // -------------------------------------------------------------------------
  // gdi32.dll
  // -------------------------------------------------------------------------

  private registerGdi32(): void {
    const dll = 'gdi32.dll';

    this.registerStub(dll, 'CreateCompatibleDC', (hdc) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'SelectObject', (hdc, obj) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'DeleteDC', (hdc) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'DeleteObject', (obj) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'StretchBlt', (...args) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'BitBlt', (...args) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'CreateBitmap', (w, h, planes, bpp, bits) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'CreateCompatibleBitmap', (hdc, w, h) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'GetDC', (hwnd) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'ReleaseDC', (hwnd, hdc) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'SwapBuffers', (hdc) => {
      this.callCount++;
      return 1;
    });
  }

  // -------------------------------------------------------------------------
  // opengl32.dll — legacy OpenGL games
  // -------------------------------------------------------------------------

  private registerOpenGL32(): void {
    const dll = 'opengl32.dll';

    this.registerStub(dll, 'wglCreateContext', (hdc) => {
      this.callCount++;
      return this.alloc();
    });

    this.registerStub(dll, 'wglMakeCurrent', (hdc, ctx) => {
      this.callCount++;
      return 1;
    });

    this.registerStub(dll, 'wglGetProcAddress', (name) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'glClear', (mask) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'glClearColor', (r, g, b, a) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'glViewport', (x, y, w, h) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'glEnable', (cap) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'glDisable', (cap) => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'glFlush', () => {
      this.callCount++;
      return 0;
    });

    this.registerStub(dll, 'glFinish', () => {
      this.callCount++;
      return 0;
    });
  }
}

export const win32Runtime = new Win32Runtime();
