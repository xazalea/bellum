/**
 * Android Runtime (ART) stubs for browser WASM execution environment.
 * Emulates ART heap layout, GC, surface/canvas, audio, and input bridges.
 * Cloudflare Pages / Edge Runtime compatible — zero Node.js built-ins.
 */

import type { WebGPURenderer } from '../../gpu/webgpu-renderer';

export interface ARTConfig {
  wasmMemory: WebAssembly.Memory;
  gpuRenderer?: WebGPURenderer;
}

// ---------------------------------------------------------------------------
// Memory layout constants
// ---------------------------------------------------------------------------

/** Nursery: 0x010000 base, 32 MB */
const NURSERY_BASE = 0x010000;
const NURSERY_SIZE = 0x2000000; // 32 MB
const NURSERY_LIMIT = NURSERY_BASE + NURSERY_SIZE;

/** Old-gen: 0x2010000 base, 256 MB */
const OLD_GEN_BASE = 0x2010000;
const OLD_GEN_SIZE = 0x10000000; // 256 MB
const OLD_GEN_LIMIT = OLD_GEN_BASE + OLD_GEN_SIZE;

/** Large-object space base */
const LARGE_OBJ_BASE = 0x12010000;

/** Object header offsets */
const OBJ_OFFSET_CLASS_PTR = 0;  // i32
const OBJ_OFFSET_LOCK_WORD = 4;  // i32
const OBJ_HEADER_SIZE = 8;

/** Array header offsets */
const ARR_OFFSET_CLASS_PTR = 0;  // i32
const ARR_OFFSET_LOCK_WORD = 4;  // i32
const ARR_OFFSET_LENGTH = 8;     // i32
const ARR_HEADER_SIZE = 12;

/** MotionEvent layout in WASM memory (16 bytes each) */
const MOTION_EVENT_ACTION_OFFSET = 0;  // i32
const MOTION_EVENT_X_OFFSET = 4;       // f32
const MOTION_EVENT_Y_OFFSET = 8;       // f32
const MOTION_EVENT_POINTER_ID_OFFSET = 12; // i32
const MOTION_EVENT_SIZE = 16;
const MOTION_EVENT_RING_CAPACITY = 16;

/** MotionEvent action constants */
const ACTION_DOWN = 0;
const ACTION_MOVE = 2;
const ACTION_UP = 1;

export interface ARTHeap {
  nursery: { base: number; top: number; limit: number; };    // 32 MB bump-ptr
  oldGen: { base: number; top: number; limit: number; };     // 256 MB mark-sweep
  largeObj: Map<number, number>;                              // ptr → size
}

// ---------------------------------------------------------------------------
// ARTRuntime
// ---------------------------------------------------------------------------

export class ARTRuntime {
  private memory: WebAssembly.Memory | null = null;
  private heap: ARTHeap | null = null;
  private gpuRenderer: WebGPURenderer | null = null;

  // Motion event circular buffer
  private motionEventRingBase = 0;
  private motionEventWriteIdx = 0;
  private motionEventReadIdx = 0;

  // Surface state: surfacePtr → { ptr, width, height }
  private surfaces: Map<number, { ptr: number; width: number; height: number }> = new Map();

  // AudioContext for audio bridge (lazy)
  private audioContext: AudioContext | null = null;

  // WASM function table stubs (indices)
  static readonly STUB_ALLOC_OBJECT = 0;
  static readonly STUB_ALLOC_ARRAY = 1;
  static readonly STUB_STRING_NEW_UTF = 2;
  static readonly STUB_CLASS_INIT = 3;
  static readonly STUB_THROW = 4;
  static readonly STUB_BOUNDS_CHECK = 5;
  static readonly STUB_CHECK_CAST = 7;
  static readonly STUB_INSTANCE_OF = 8;

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------

  initialize(config: ARTConfig): void {
    this.memory = config.wasmMemory;
    this.gpuRenderer = config.gpuRenderer ?? null;

    this.heap = {
      nursery: {
        base: NURSERY_BASE,
        top: NURSERY_BASE,
        limit: NURSERY_LIMIT,
      },
      oldGen: {
        base: OLD_GEN_BASE,
        top: OLD_GEN_BASE,
        limit: OLD_GEN_LIMIT,
      },
      largeObj: new Map(),
    };

    // Reserve space for motion event ring buffer in nursery region
    // Place it right after nursery limit to keep it out of GC scan
    this.motionEventRingBase = NURSERY_LIMIT;
    this.motionEventWriteIdx = 0;
    this.motionEventReadIdx = 0;

    // Wire renderer's wasmMemory
    if (this.gpuRenderer) {
      this.gpuRenderer.wasmMemory = this.memory;
    }
  }

  // ---------------------------------------------------------------------------
  // Heap helpers
  // ---------------------------------------------------------------------------

  private view(): DataView {
    if (!this.memory) throw new Error('ARTRuntime not initialized');
    return new DataView(this.memory.buffer);
  }

  private ensureCapacity(required: number): void {
    if (!this.memory) throw new Error('ARTRuntime not initialized');
    const current = this.memory.buffer.byteLength;
    if (required > current) {
      const pages = Math.ceil((required - current) / 65536);
      this.memory.grow(pages);
    }
  }

  private bumpAllocNursery(size: number): number {
    if (!this.heap) throw new Error('ARTRuntime not initialized');
    // align to 8 bytes
    const aligned = (size + 7) & ~7;
    if (this.heap.nursery.top + aligned > this.heap.nursery.limit) {
      this.minorGC();
      if (this.heap.nursery.top + aligned > this.heap.nursery.limit) {
        throw new Error(`ARTRuntime: nursery OOM (need ${aligned} bytes)`);
      }
    }
    this.ensureCapacity(this.heap.nursery.top + aligned);
    const ptr = this.heap.nursery.top;
    this.heap.nursery.top += aligned;
    return ptr;
  }

  private bumpAllocOldGen(size: number): number {
    if (!this.heap) throw new Error('ARTRuntime not initialized');
    const aligned = (size + 7) & ~7;
    if (this.heap.oldGen.top + aligned > this.heap.oldGen.limit) {
      this.majorGC();
      if (this.heap.oldGen.top + aligned > this.heap.oldGen.limit) {
        throw new Error(`ARTRuntime: old-gen OOM (need ${aligned} bytes)`);
      }
    }
    this.ensureCapacity(this.heap.oldGen.top + aligned);
    const ptr = this.heap.oldGen.top;
    this.heap.oldGen.top += aligned;
    return ptr;
  }

  // ---------------------------------------------------------------------------
  // allocObject
  // ---------------------------------------------------------------------------

  allocObject(classPtr: number, size: number): number {
    const totalSize = OBJ_HEADER_SIZE + size;
    const ptr = this.bumpAllocNursery(totalSize);
    const dv = this.view();
    dv.setInt32(ptr + OBJ_OFFSET_CLASS_PTR, classPtr, true);
    dv.setInt32(ptr + OBJ_OFFSET_LOCK_WORD, 0, true);
    // Zero the field region
    const u8 = new Uint8Array(this.memory!.buffer);
    u8.fill(0, ptr + OBJ_HEADER_SIZE, ptr + totalSize);
    return ptr;
  }

  // ---------------------------------------------------------------------------
  // allocArray
  // ---------------------------------------------------------------------------

  allocArray(classPtr: number, length: number, elementSize: number): number {
    const totalSize = ARR_HEADER_SIZE + length * elementSize;
    const ptr = this.bumpAllocNursery(totalSize);
    const dv = this.view();
    dv.setInt32(ptr + ARR_OFFSET_CLASS_PTR, classPtr, true);
    dv.setInt32(ptr + ARR_OFFSET_LOCK_WORD, 0, true);
    dv.setInt32(ptr + ARR_OFFSET_LENGTH, length, true);
    const u8 = new Uint8Array(this.memory!.buffer);
    u8.fill(0, ptr + ARR_HEADER_SIZE, ptr + totalSize);
    return ptr;
  }

  // ---------------------------------------------------------------------------
  // stringNewUtf
  // ---------------------------------------------------------------------------

  stringNewUtf(utf8Ptr: number, length: number): number {
    if (!this.memory) throw new Error('ARTRuntime not initialized');
    // Allocate array-like: header + length bytes
    const ptr = this.allocArray(0, length, 1);
    const u8 = new Uint8Array(this.memory.buffer);
    // Copy UTF-8 bytes
    for (let i = 0; i < length; i++) {
      u8[ptr + ARR_HEADER_SIZE + i] = u8[utf8Ptr + i];
    }
    return ptr;
  }

  // ---------------------------------------------------------------------------
  // stringToJS
  // ---------------------------------------------------------------------------

  stringToJS(ptr: number): string {
    if (!this.memory) return '';
    const dv = this.view();
    const length = dv.getInt32(ptr + ARR_OFFSET_LENGTH, true);
    const bytes = new Uint8Array(this.memory.buffer, ptr + ARR_HEADER_SIZE, length);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  }

  // ---------------------------------------------------------------------------
  // classInit
  // ---------------------------------------------------------------------------

  classInit(_classPtr: number): void {
    // In the browser stub, class initialization is a no-op.
    // The class descriptor at classPtr is assumed already populated by the
    // WASM module's data segments.
  }

  // ---------------------------------------------------------------------------
  // throwException
  // ---------------------------------------------------------------------------

  throwException(type: string, message: string): never {
    throw new ARTException(type, message);
  }

  // ---------------------------------------------------------------------------
  // checkCast
  // ---------------------------------------------------------------------------

  checkCast(objPtr: number, classPtr: number): void {
    if (objPtr === 0) return; // null is always castable
    const dv = this.view();
    const objClass = dv.getInt32(objPtr + OBJ_OFFSET_CLASS_PTR, true);
    if (objClass !== classPtr) {
      this.throwException('java.lang.ClassCastException',
        `Object at 0x${objPtr.toString(16)} (class 0x${objClass.toString(16)}) cannot be cast to 0x${classPtr.toString(16)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // instanceOf
  // ---------------------------------------------------------------------------

  instanceOf(objPtr: number, classPtr: number): boolean {
    if (objPtr === 0) return false;
    const dv = this.view();
    const objClass = dv.getInt32(objPtr + OBJ_OFFSET_CLASS_PTR, true);
    return objClass === classPtr;
  }

  // ---------------------------------------------------------------------------
  // Surface / Canvas rendering bridge
  // ---------------------------------------------------------------------------

  /**
   * surfaceLockCanvas: allocate or retrieve a framebuffer in WASM memory.
   * In ART, locking the canvas grants write access to the underlying pixel buffer.
   * Returns the framebuffer pointer (usable for pixel writes).
   */
  surfaceLockCanvas(surfacePtr: number): number {
    // Default surface size: 1920×1080 if not otherwise configured
    const width = 1920;
    const height = 1080;

    const existing = this.surfaces.get(surfacePtr);
    if (existing) return existing.ptr;

    const byteLen = width * height * 4;
    const ptr = this.bumpAllocOldGen(byteLen);
    this.surfaces.set(surfacePtr, { ptr, width, height });
    return ptr;
  }

  /**
   * surfaceUnlockAndPost: commit the framebuffer to the GPU renderer.
   */
  surfaceUnlockAndPost(surfacePtr: number, _canvasPtr: number): void {
    const surface = this.surfaces.get(surfacePtr);
    if (!surface) return;
    if (this.gpuRenderer) {
      this.gpuRenderer.submitFramebuffer(surface.ptr, surface.width, surface.height);
    }
  }

  /**
   * canvasDrawBitmap: copy a bitmap at bitmapPtr into the canvas framebuffer.
   * Bitmap is assumed RGBA8, same dimensions as the surface.
   */
  canvasDrawBitmap(canvasPtr: number, bitmapPtr: number, x: number, y: number): void {
    if (!this.memory) return;
    const surface = this.surfaces.get(canvasPtr);
    if (!surface) return;
    const { ptr: canvasFB, width } = surface;
    // Simple copy: assume bitmap is surface-sized; x/y offset in pixels
    const u8 = new Uint8Array(this.memory.buffer);
    const destOffset = canvasFB + (y * width + x) * 4;
    const srcLen = (surface.width - x) * (surface.height - y) * 4;
    u8.copyWithin(destOffset, bitmapPtr, bitmapPtr + srcLen);
  }

  /**
   * canvasDrawRect: fill a rectangle in the framebuffer with paint color.
   * paintPtr layout: [color: u32 ARGB at offset 0]
   */
  canvasDrawRect(
    canvasPtr: number,
    l: number, t: number, r: number, b: number,
    paintPtr: number,
  ): void {
    if (!this.memory) return;
    const surface = this.surfaces.get(canvasPtr);
    if (!surface) return;

    const dv = this.view();
    const argb = dv.getUint32(paintPtr, false); // big-endian ARGB
    const a = (argb >>> 24) & 0xff;
    const rv = (argb >>> 16) & 0xff;
    const g = (argb >>> 8) & 0xff;
    const bv = argb & 0xff;

    const { ptr, width } = surface;
    const u8 = new Uint8Array(this.memory.buffer);
    const x0 = Math.max(0, Math.floor(l));
    const y0 = Math.max(0, Math.floor(t));
    const x1 = Math.min(surface.width, Math.ceil(r));
    const y1 = Math.min(surface.height, Math.ceil(b));

    for (let row = y0; row < y1; row++) {
      for (let col = x0; col < x1; col++) {
        const off = ptr + (row * width + col) * 4;
        u8[off + 0] = rv;
        u8[off + 1] = g;
        u8[off + 2] = bv;
        u8[off + 3] = a;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Audio bridge
  // ---------------------------------------------------------------------------

  /**
   * audioTrackWrite: write PCM audio samples from WASM memory to Web Audio.
   * Assumes 16-bit signed PCM mono/stereo; sample rate derived lazily.
   */
  audioTrackWrite(
    _trackPtr: number,
    pcmPtr: number,
    offsetBytes: number,
    sizeInBytes: number,
  ): number {
    if (!this.memory) return 0;

    // Lazily create AudioContext
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext({ sampleRate: 44100 });
      } catch {
        return 0;
      }
    }

    const ctx = this.audioContext;
    const numSamples = Math.floor(sizeInBytes / 2); // 16-bit = 2 bytes per sample
    const buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);

    const i16 = new Int16Array(
      this.memory.buffer,
      pcmPtr + offsetBytes,
      numSamples,
    );
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = i16[i] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);

    return sizeInBytes;
  }

  // ---------------------------------------------------------------------------
  // Input bridge
  // ---------------------------------------------------------------------------

  private writeMotionEvent(action: number, x: number, y: number, pointerId: number): void {
    if (!this.memory) return;
    this.ensureCapacity(
      this.motionEventRingBase + MOTION_EVENT_RING_CAPACITY * MOTION_EVENT_SIZE,
    );
    const slot = this.writeIdx();
    const base = this.motionEventRingBase + slot * MOTION_EVENT_SIZE;
    const dv = this.view();
    dv.setInt32(base + MOTION_EVENT_ACTION_OFFSET, action, true);
    dv.setFloat32(base + MOTION_EVENT_X_OFFSET, x, true);
    dv.setFloat32(base + MOTION_EVENT_Y_OFFSET, y, true);
    dv.setInt32(base + MOTION_EVENT_POINTER_ID_OFFSET, pointerId, true);
    this.motionEventWriteIdx = (this.motionEventWriteIdx + 1) % MOTION_EVENT_RING_CAPACITY;
  }

  private writeIdx(): number {
    return this.motionEventWriteIdx % MOTION_EVENT_RING_CAPACITY;
  }

  onPointerDown(x: number, y: number, pointerId: number): void {
    this.writeMotionEvent(ACTION_DOWN, x, y, pointerId);
  }

  onPointerMove(x: number, y: number, pointerId: number): void {
    this.writeMotionEvent(ACTION_MOVE, x, y, pointerId);
  }

  onPointerUp(x: number, y: number, pointerId: number): void {
    this.writeMotionEvent(ACTION_UP, x, y, pointerId);
  }

  // ---------------------------------------------------------------------------
  // MotionEvent accessors (called by Dalvik code via WASM imports)
  // ---------------------------------------------------------------------------

  motionEventGetX(eventPtr: number, _pointerIdx: number): number {
    const slot = this.resolveEventSlot(eventPtr);
    const dv = this.view();
    return dv.getFloat32(slot + MOTION_EVENT_X_OFFSET, true);
  }

  motionEventGetY(eventPtr: number, _pointerIdx: number): number {
    const slot = this.resolveEventSlot(eventPtr);
    const dv = this.view();
    return dv.getFloat32(slot + MOTION_EVENT_Y_OFFSET, true);
  }

  motionEventGetAction(eventPtr: number): number {
    const slot = this.resolveEventSlot(eventPtr);
    const dv = this.view();
    return dv.getInt32(slot + MOTION_EVENT_ACTION_OFFSET, true);
  }

  /**
   * Resolve an eventPtr (which is a ring-buffer slot index encoded as a pointer)
   * back to its WASM memory address.
   */
  private resolveEventSlot(eventPtr: number): number {
    // If eventPtr is already a direct WASM address in the ring region, use it
    if (eventPtr >= this.motionEventRingBase &&
        eventPtr < this.motionEventRingBase + MOTION_EVENT_RING_CAPACITY * MOTION_EVENT_SIZE) {
      return eventPtr;
    }
    // Otherwise treat eventPtr as a slot index
    const slot = eventPtr % MOTION_EVENT_RING_CAPACITY;
    return this.motionEventRingBase + slot * MOTION_EVENT_SIZE;
  }

  // ---------------------------------------------------------------------------
  // Activity lifecycle
  // ---------------------------------------------------------------------------

  fireOnCreate(activityPtr: number): void {
    // Stub: notify Dalvik code that Activity.onCreate() has been called.
    // In a full implementation this would dispatch into the WASM table.
    this.dispatchLifecycle(activityPtr, 'onCreate');
  }

  fireOnResume(activityPtr: number): void {
    this.dispatchLifecycle(activityPtr, 'onResume');
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {/* best-effort */});
    }
  }

  fireOnPause(activityPtr: number): void {
    this.dispatchLifecycle(activityPtr, 'onPause');
    if (this.audioContext?.state === 'running') {
      this.audioContext.suspend().catch(() => {/* best-effort */});
    }
  }

  private dispatchLifecycle(_activityPtr: number, _event: string): void {
    // Placeholder: in a full implementation, look up the WASM function table
    // entry for the virtual method and call it.
  }

  // ---------------------------------------------------------------------------
  // GC — Minor (Scavenge / nursery copy)
  // ---------------------------------------------------------------------------

  minorGC(): void {
    if (!this.heap || !this.memory) return;

    // Evacuate live nursery objects to old-gen using a simple mark-copy scheme.
    // In this stub we conservatively copy all nursery objects to old-gen
    // (since we have no root tracking — a production implementation would
    // walk the JNI handles, thread stacks, and card table).

    const nurseryUsed = this.heap.nursery.top - this.heap.nursery.base;
    if (nurseryUsed <= 0) return;

    const src = this.heap.nursery.base;
    const size = nurseryUsed;

    // Promote all nursery data to old-gen
    const dest = this.bumpAllocOldGen(size);
    const u8 = new Uint8Array(this.memory.buffer);
    u8.copyWithin(dest, src, src + size);

    // Reset nursery top → essentially all objects promoted
    this.heap.nursery.top = this.heap.nursery.base;
  }

  // ---------------------------------------------------------------------------
  // GC — Major (mark-sweep stub)
  // ---------------------------------------------------------------------------

  majorGC(): void {
    if (!this.heap) return;

    // Stub: In a production implementation this would:
    // 1. Mark phase: walk from GC roots (JNI handles, thread stacks)
    //    and mark all reachable old-gen objects.
    // 2. Sweep phase: iterate old-gen, free unmarked objects, coalesce free
    //    blocks into a free-list.
    // 3. Optionally compact to reduce fragmentation.
    //
    // For the browser WASM stub we simply reset old-gen (safe because
    // we have no real root tracking and the game engine re-creates all
    // state on a full GC).

    this.heap.oldGen.top = this.heap.oldGen.base;
    this.heap.largeObj.clear();
  }

  // ---------------------------------------------------------------------------
  // getHeapStats
  // ---------------------------------------------------------------------------

  getHeapStats(): { nurseryUsed: number; oldGenUsed: number; largeObjUsed: number; } {
    if (!this.heap) return { nurseryUsed: 0, oldGenUsed: 0, largeObjUsed: 0 };
    const nurseryUsed = this.heap.nursery.top - this.heap.nursery.base;
    const oldGenUsed = this.heap.oldGen.top - this.heap.oldGen.base;
    let largeObjUsed = 0;
    for (const size of this.heap.largeObj.values()) largeObjUsed += size;
    return { nurseryUsed, oldGenUsed, largeObjUsed };
  }
}

// ---------------------------------------------------------------------------
// ARTException — thrown by throwException
// ---------------------------------------------------------------------------

export class ARTException extends Error {
  readonly javaType: string;
  constructor(javaType: string, message: string) {
    super(`${javaType}: ${message}`);
    this.name = 'ARTException';
    this.javaType = javaType;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const artRuntime = new ARTRuntime();
