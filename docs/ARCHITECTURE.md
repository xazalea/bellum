# Nacho System Architecture

Nacho is a distributed, local-first operating system running in the browser. It combines advanced emulation with a decentralized storage capabilities.

## High-Level Overview

```mermaid
graph TD
    User[User Device] -->|Runs| Browser[Web Browser]
    Browser -->|Host| Kernel[Nacho Kernel]
    
    subgraph "Nacho Runtime (Client-Side)"
        Kernel -->|Manages| FS[Virtual Filesystem]
        Kernel -->|Schedules| Execution[Custom JIT/Emulation Pipeline]
        Execution -->|Uses| JIT[GPU Parallel JIT Compiler]
        Execution -->|Uses| Interpreter[Fast Interpreter]
        FS -->|Persists| IDB[IndexedDB (LocalStore)]
        FS -->|Caches| OPFS[Origin Private FS]
    end
    
    subgraph "Nacho Cloud (Fabrik)"
        Browser -->|Syncs| Network[AetherNet]
        Network -->|Routes| Peers[Peer Nodes]
        Network -->|Backs up| Storage[Cloud Storage]
    end
```

## Core Components

### 1. The Kernel (`os`)
The heart of Nacho. It manages processes, memory, and the display subsystem. It creates a unified environment where different emulators (x86, ARM, DOS) appear as native applications.

### 2. File System (VFS)
Nacho uses a tiered file system:
*   **Layer 1: RAM Disk**: Fast, temporary storage for running apps.
*   **Layer 2: LocalStore**: Persistent storage using your browser's IndexedDB. This is where "installed" apps live.
*   **Layer 3: Cloud**: Network-attached storage for backup and syncing.
*   **Layer 4: Sync Engine**: Conflict-free synchronization with CRDT metadata and peer-to-peer replication.

### 3. Fabrik (Network)
A distributed computing layer that allows Nacho instances to discover each other. It powers:
*   **Multiplayer**: Direct peer-to-peer connections.
*   **Storage Sharing**: Fetching manifests and chunks from other nodes.
*   **Compute Mesh**: Intelligent task routing and offloading to peers.
*   **Mesh Scheduler**: Capability-based peer selection with latency/bandwidth awareness.

### 4. Graphics (WebGPU)
Nacho leverages WebGPU for high-performance rendering, allowing it to run 3D games and complex UIs directly in the browser with near-native speeds.

### 5. Performance Controller
Centralized performance management with adaptive tuning:
*   **Real-time Metrics**: Aggregates FPS, memory, JIT compilation stats.
*   **Adaptive Thresholds**: Dynamically adjusts optimization tiers based on performance.
*   **Backpressure Control**: Manages frame time budgets and throttling.
*   **Thermal Detection**: Monitors system health and adjusts accordingly.

### 6. Remote Execution
P2P compute offloading:
*   **Hot Path Offloading**: Automatically offloads frequently executed code blocks.
*   **Fallback Strategy**: Gracefully falls back to local execution on failure.
*   **Job Tracking**: Monitors remote execution performance and statistics.
