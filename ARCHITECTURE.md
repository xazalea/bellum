# Bellum Operating System Architecture & Roadmap

## 1. System Architecture
To support the 500+ items requested, the system will be architected into four distinct layers:

### Layer 1: The Nacho Microkernel (Typescript/WASM)
- **Role**: Process scheduling, memory management, syscall routing.
- **Key Components**:
  - `KernelHost`: Main thread coordinator.
  - `SyscallBridge`: Routes syscalls from WASM to JS/WebGPU handlers.
  - `VirtualFS`: OPFS-backed filesystem emulation (Items 30, 311).
  - `MemoryManager`: SharedArrayBuffer-based RAM (Items 34, 308).

### Layer 2: Execution Engine (Hyperion)
- **Role**: JIT compilation and bytecode execution.
- **Key Components**:
  - `UniversalLoader`: Parses DEX/APK and PE/EXE (Items 1, 316).
  - `WasmTranspiler`: Converts Dalvik/x86 instructions to WASM/WGSL (Items 3, 341).
  - `JitCompiler`: WebGPU-accelerated compilation pipeline (Items 11, 44).

### Layer 3: Graphics & Input (Helios)
- **Role**: High-performance rendering and user interaction.
- **Key Components**:
  - `WebGpuBackend`: Maps OpenGL ES / DirectX commands to WebGPU (Items 16, 321, 411).
  - `InputMapper`: Maps Touch/Mouse/Keyboard to Android/Windows events (Items 20, 324).
  - `Compositor`: Manages windows and surfaces (Items 23, 381).

### Layer 4: AetherNet (Distributed Mesh)
- **Role**: Offloading compute and sharing resources.
- **Key Components**:
  - `P2PNode`: WebRTC data channel manager (Items 113, 114).
  - `DistributedCache`: Shares compiled WASM and assets (Items 112, 126).
  - `ComputeCluster`: Distributes compilation and heavy math tasks (Items 124, 459).

## 2. Implementation Roadmap

### Phase 1: Android Foundation (Section A)
**Goal**: Boot a minimal Android userspace.
- [ ] Verify `IMPLEMENTATION_CHECKLIST.md` matches the master list.
- [ ] Implement `AndroidRuntime` (Item 4) with real syscalls (log, mmap, open, read).
- [ ] Build `ApkLoader` (Item 1) to parse DEX files into memory.
- [ ] Create `DalvikInterpreter` (Item 3) skeleton for basic opcodes.

### Phase 2: WebGPU Acceleration (Section A & J)
**Goal**: Hardware-accelerated graphics.
- [ ] Implement `WebGpuContext` for surface management (Item 16).
- [ ] Map basic OpenGL ES draw calls to WebGPU pipelines (Item 22).

### Phase 3: Distributed Systems (Section D & K)
**Goal**: P2P Resource Sharing.
- [ ] Implement `P2PNode` for discovering peers.
- [ ] Create `WasmCache` for sharing compiled modules.
