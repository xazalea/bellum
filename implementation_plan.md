# Implementation Plan

## Overview

Complete the APK and EXE runner emulation layers to enable full Android and Windows application execution in the browser, enhance the UI with Magic UI components, and achieve 40+ FPS performance through WebGPU acceleration.

This implementation builds upon the existing solid foundation of interpreters, loaders, and runtime components. The current codebase has partial implementations that need to be completed and connected end-to-end. The ART interpreter has all 218 Dalvik opcodes defined but many are simplified stubs. The x86 interpreter has ~50 opcodes implemented. Both need completion, proper memory management, and WebGPU-accelerated rendering pipelines.

## [Types]

New and enhanced type definitions for the emulation layer.

### Core Runtime Types

```typescript
// Execution State
interface ExecutionState {
  status: 'idle' | 'loading' | 'booting' | 'running' | 'paused' | 'error' | 'stopped';
  fps: number;
  frameTime: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
}

// Performance Metrics
interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  cpuTimeMs: number;
  gpuTimeMs: number;
  instructionsPerFrame: number;
  jitCompilations: number;
  cacheHits: number;
  cacheMisses: number;
}

// Memory Regions
interface MemoryRegion {
  base: number;
  size: number;
  protection: 'r' | 'rw' | 'rx' | 'rwx';
  type: 'code' | 'data' | 'stack' | 'heap' | 'mapped';
}

// Android-specific
interface AndroidProcess {
  pid: number;
  uid: number;
  packageName: string;
  dexFiles: DEXFile[];
  nativeLibs: ArrayBuffer[];
  activities: ActivityInfo[];
  services: ServiceInfo[];
}

interface DEXFile {
  header: DEXHeader;
  classes: Map<string, DalvikClass>;
  strings: string[];
  types: string[];
  methods: MethodInfo[];
  fields: FieldInfo[];
}

// Windows-specific
interface WindowsProcess {
  pid: number;
  peImage: PEImage;
  modules: Map<string, LoadedModule>;
  threads: Map<number, ThreadContext>;
  handles: Map<number, Handle>;
}

interface ThreadContext {
  id: number;
  registers: CPURegisters;
  stackBase: number;
  stackLimit: number;
  teb: number;
  state: 'running' | 'suspended' | 'waiting';
}

// GPU Resources
interface GPUResources {
  device: GPUDevice;
  context: GPUCanvasContext;
  renderPipeline: GPURenderPipeline;
  computePipelines: Map<string, GPUComputePipeline>;
  buffers: Map<string, GPUBuffer>;
  textures: Map<string, GPUTexture>;
}
```

## [Files]

### New Files to Create

1. **`lib/engine/gpu-renderer.ts`**
   - WebGPU-accelerated display renderer
   - Handles both Android SurfaceFlinger and Windows GDI/DirectX output
   - Implements frame timing and vsync

2. **`lib/engine/frame-scheduler.ts`**
   - Manages execution timing for 40+ FPS target
   - Implements frame skipping and adaptive quality
   - Coordinates CPU/GPU work

3. **`lib/challenger/android/dex-parser.ts`**
   - Complete DEX file format parser
   - Extracts classes, methods, fields, and code
   - Handles multi-dex files

4. **`lib/challenger/android/android-framework-services.ts`**
   - ActivityManagerService implementation
   - PackageManagerService implementation
   - WindowManagerService implementation
   - SurfaceFlinger implementation

5. **`lib/challenger/android/opengl-es-renderer.ts`**
   - OpenGL ES 3.0 to WebGPU translation
   - Shader compilation (GLSL to WGSL)
   - Texture and buffer management

6. **`lib/challenger/windows/win32-api.ts`**
   - Complete Kernel32 API implementation
   - Complete User32 API implementation
   - Complete GDI32 API implementation
   - Common DirectX 9/11 APIs

7. **`lib/challenger/windows/x86-full.ts`**
   - Complete x86/x64 instruction decoder
   - Full instruction set implementation
   - SSE/AVX support

8. **`lib/challenger/windows/directx-renderer.ts`**
   - DirectX 9/11 to WebGPU translation
   - HLSL to WGSL shader compiler
   - State management

9. **`lib/engine/jit-compiler.ts`**
   - Hot path detection
   - WebAssembly JIT compilation
   - GPU compute shader generation

10. **`components/runner/RunnerDisplay.tsx`**
    - Unified display component for both APK and EXE
    - WebGPU canvas management
    - Input handling (keyboard, mouse, touch)

11. **`components/runner/PerformanceOverlay.tsx`**
    - Real-time FPS, CPU, memory display
    - Frame timing graph
    - Debug information

12. **`components/runner/ControlBar.tsx`**
    - Play/Pause/Stop/Restart controls
    - Settings panel
    - Screenshot/Recording

### Existing Files to Modify

1. **`app/android/page.tsx`**
   - Integrate complete Android runtime
   - Add Magic UI components (GlowingEffect, ShimmerButton)
   - Add PerformanceOverlay component
   - Improve error handling and loading states

2. **`app/windows/page.tsx`**
   - Integrate complete Windows runtime
   - Add Magic UI components
   - Add PerformanceOverlay component
   - Improve error handling and loading states

3. **`lib/engine/loaders/apk-loader.ts`**
   - Connect to complete DEX parser
   - Implement real app execution
   - Add proper lifecycle management

4. **`lib/challenger/windows/runtime.ts`**
   - Complete Win32 API implementations
   - Add proper memory management
   - Implement threading

5. **`lib/challenger/core/interpreter.ts`**
   - Add missing x86 opcodes (200+ remaining)
   - Implement proper memory addressing modes
   - Add SSE/AVX support

6. **`lib/challenger/android/art-interpreter.ts`**
   - Complete all 218 opcode implementations
   - Add proper method invocation
   - Implement exception handling

7. **`lib/challenger/gpu/webgpu.ts`**
   - Add texture management
   - Add render pipeline creation
   - Add compute shader support

8. **`lib/engine/execution-pipeline.ts`**
   - Connect to real interpreters
   - Implement proper frame timing
   - Add JIT compilation triggers

9. **`lib/nexus/os/android-boot.ts`**
   - Complete boot sequence
   - Initialize all framework services
   - Connect to real display

10. **`components/ui/glowing-effect.tsx`**
    - Already exists, use in runner pages

11. **`components/ui/shimmer-button.tsx`**
    - Already exists, use in runner pages

## [Functions]

### New Functions

1. **`lib/engine/gpu-renderer.ts`**
   - `createGPURenderer(device: GPUDevice, canvas: HTMLCanvasElement): GPURenderer`
   - `renderFrame(texture: GPUTexture): Promise<void>`
   - `createTextureFromBuffer(data: ArrayBuffer, width: number, height: number): GPUTexture`
   - `present(): void`

2. **`lib/engine/frame-scheduler.ts`**
   - `createFrameScheduler(targetFPS: number): FrameScheduler`
   - `scheduleFrame(callback: FrameCallback): void`
   - `getFrameBudget(): number`
   - `adjustQuality(currentFPS: number): void`

3. **`lib/challenger/android/dex-parser.ts`**
   - `parseDEX(buffer: ArrayBuffer): DEXFile`
   - `parseMultiDEX(buffers: ArrayBuffer[]): DEXFile[]`
   - `resolveMethod(dex: DEXFile, methodIdx: number): MethodInfo`
   - `resolveField(dex: DEXFile, fieldIdx: number): FieldInfo`

4. **`lib/challenger/android/android-framework-services.ts`**
   - `startActivity(intent: Intent): Promise<void>`
   - `installPackage(apk: ArrayBuffer): Promise<PackageInfo>`
   - `createSurface(window: Window): Surface`
   - `composeSurfaces(): void`

5. **`lib/challenger/windows/win32-api.ts`**
   - `CreateFile(filename: string, access: number, share: number): Handle`
   - `CreateProcess(executable: string, args: string): Process`
   - `VirtualAlloc(size: number, type: number, protect: number): number`
   - `CreateWindowEx(className: string, windowName: string, style: number): HWND`

6. **`lib/challenger/windows/x86-full.ts`**
   - `decodeInstruction(memory: Memory, pc: number): DecodedInstruction`
   - `executeInstruction(cpu: CPU, inst: DecodedInstruction): void`
   - `handleInterrupt(cpu: CPU, vector: number): void`

7. **`lib/engine/jit-compiler.ts`**
   - `compileHotPath(code: Uint8Array, type: 'x86' | 'dalvik'): Promise<WebAssembly.Module>`
   - `shouldCompile(address: number, count: number): boolean`
   - `getCachedModule(address: number): WebAssembly.Module | null`

### Modified Functions

1. **`lib/engine/loaders/apk-loader.ts`**
   - `loadFromBuffer()` - Connect to real DEX parser and ART interpreter
   - `runSimulation()` - Replace with actual execution

2. **`lib/challenger/windows/runtime.ts`**
   - `boot()` - Complete initialization sequence
   - `loadPE()` - Connect to full x86 interpreter

3. **`lib/challenger/core/interpreter.ts`**
   - `step()` - Handle all instruction formats
   - `run()` - Add cycle-accurate timing

4. **`lib/challenger/android/art-interpreter.ts`**
   - `executeInstruction()` - Complete all 218 opcodes
   - `invokeVirtual()` - Implement method dispatch

## [Classes]

### New Classes

1. **`GPURenderer`** (`lib/engine/gpu-renderer.ts`)
   - Manages WebGPU rendering pipeline
   - Methods: `initialize()`, `renderFrame()`, `present()`, `resize()`

2. **`FrameScheduler`** (`lib/engine/frame-scheduler.ts`)
   - Manages frame timing for consistent FPS
   - Methods: `start()`, `stop()`, `scheduleFrame()`, `getMetrics()`

3. **`DEXParser`** (`lib/challenger/android/dex-parser.ts`)
   - Parses DEX file format
   - Methods: `parse()`, `getClass()`, `getMethod()`, `getString()`

4. **`AndroidFrameworkServices`** (`lib/challenger/android/android-framework-services.ts`)
   - Implements Android system services
   - Methods: `startActivity()`, `installPackage()`, `getSystemService()`

5. **`OpenGLESRenderer`** (`lib/challenger/android/opengl-es-renderer.ts`)
   - Translates OpenGL ES to WebGPU
   - Methods: `glDrawArrays()`, `glDrawElements()`, `glCompileShader()`

6. **`Win32API`** (`lib/challenger/windows/win32-api.ts`)
   - Implements Win32 API functions
   - Methods: All Kernel32, User32, GDI32 functions

7. **`X86FullInterpreter`** (`lib/challenger/windows/x86-full.ts`)
   - Complete x86/x64 interpreter
   - Methods: `step()`, `run()`, `handleInterrupt()`

8. **`DirectXRenderer`** (`lib/challenger/windows/directx-renderer.ts`)
   - Translates DirectX to WebGPU
   - Methods: `CreateDevice()`, `CreateSwapChain()`, `Draw()`

9. **`JITCompiler`** (`lib/engine/jit-compiler.ts`)
   - JIT compiles hot paths to WASM
   - Methods: `compile()`, `shouldCompile()`, `getCached()`

### Modified Classes

1. **`APKLoader`** (`lib/engine/loaders/apk-loader.ts`)
   - Add real execution pipeline
   - Connect to AndroidFrameworkServices
   - Implement proper lifecycle

2. **`WindowsRuntime`** (`lib/challenger/windows/runtime.ts`)
   - Complete Win32 API integration
   - Add threading support
   - Implement proper memory management

3. **`SimpleInterpreter`** → **`X86Interpreter`** (`lib/challenger/core/interpreter.ts`)
   - Rename and expand to full instruction set
   - Add SSE/AVX support
   - Implement all addressing modes

4. **`ARTInterpreter`** (`lib/challenger/android/art-interpreter.ts`)
   - Complete all opcode implementations
   - Add proper method dispatch
   - Implement exception handling

5. **`WebGPUContext`** (`lib/challenger/gpu/webgpu.ts`)
   - Add texture management
   - Add render pipeline methods
   - Add compute shader support

## [Dependencies]

### New Dependencies

```json
{
  "dependencies": {
    "@aspect-build/aspect-rules-js": "latest",
    "framer-motion": "^11.0.0"
  }
}
```

### Existing Dependencies to Update

- Ensure `@21st-dev/magic-ui` components are properly integrated
- Update WebGPU types if needed

## [Testing]

### Test Files to Create

1. **`tests/engine/gpu-renderer.test.ts`**
   - Test WebGPU initialization
   - Test frame rendering
   - Test texture creation

2. **`tests/challenger/dex-parser.test.ts`**
   - Test DEX file parsing
   - Test class/method resolution
   - Test multi-dex handling

3. **`tests/challenger/x86-interpreter.test.ts`**
   - Test all instruction implementations
   - Test memory addressing
   - Test interrupt handling

4. **`tests/challenger/art-interpreter.test.ts`**
   - Test all 218 Dalvik opcodes
   - Test method invocation
   - Test exception handling

5. **`tests/challenger/win32-api.test.ts`**
   - Test Kernel32 functions
   - Test User32 functions
   - Test GDI32 functions

### Validation Strategy

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test full execution pipeline
3. **Performance Tests**: Verify 40+ FPS target
4. **Compatibility Tests**: Test with real APK/EXE files

## [Implementation Order]

### Phase 1: Core Infrastructure (Priority: Critical)

1. Create `lib/engine/frame-scheduler.ts` - Frame timing for 40+ FPS
2. Create `lib/engine/gpu-renderer.ts` - WebGPU display rendering
3. Enhance `lib/challenger/gpu/webgpu.ts` - Add texture/pipeline support

### Phase 2: Android Runtime (Priority: High)

4. Create `lib/challenger/android/dex-parser.ts` - Complete DEX parsing
5. Complete `lib/challenger/android/art-interpreter.ts` - All 218 opcodes
6. Create `lib/challenger/android/android-framework-services.ts` - System services
7. Create `lib/challenger/android/opengl-es-renderer.ts` - GLES to WebGPU
8. Update `lib/engine/loaders/apk-loader.ts` - Connect all components

### Phase 3: Windows Runtime (Priority: High)

9. Create `lib/challenger/windows/x86-full.ts` - Complete x86 interpreter
10. Create `lib/challenger/windows/win32-api.ts` - Win32 API implementation
11. Create `lib/challenger/windows/directx-renderer.ts` - DirectX to WebGPU
12. Update `lib/challenger/windows/runtime.ts` - Connect all components

### Phase 4: JIT Compilation (Priority: Medium)

13. Create `lib/engine/jit-compiler.ts` - Hot path JIT compilation
14. Integrate JIT with interpreters

### Phase 5: UI Enhancement (Priority: Medium)

15. Create `components/runner/RunnerDisplay.tsx` - Unified display component
16. Create `components/runner/PerformanceOverlay.tsx` - FPS/metrics display
17. Create `components/runner/ControlBar.tsx` - Playback controls
18. Update `app/android/page.tsx` - Integrate all components + Magic UI
19. Update `app/windows/page.tsx` - Integrate all components + Magic UI

### Phase 6: Testing & Optimization (Priority: High)

20. Create test files for all components
21. Performance optimization for 40+ FPS
22. Memory optimization
23. End-to-end testing with real APK/EXE files