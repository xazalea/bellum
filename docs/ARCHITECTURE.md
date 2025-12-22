# Nacho System Architecture

Nacho is a distributed, local-first operating system running in the browser. It combines advanced emulation with a decentralized storage capabilities.

## High-Level Overview

```mermaid
graph TD
    User[User Device] -->|Runs| Browser[Web Browser]
    Browser -->|Host| Kernel[Nacho Kernel]
    
    subgraph "Nacho Runtime (Client-Side)"
        Kernel -->|Manages| FS[Virtual Filesystem]
        Kernel -->|Schedules| Emulators[Emulators (v86, Box86, DOS)]
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

### 3. Fabrik (Network)
A distributed computing layer that allows Nacho instances to discover each other. It powers:
*   **Multiplayer**: Direct peer-to-peer connections.
*   **Storage Sharing**: Fetching manifests and chunks from other nodes.

### 4. Graphics (WebGPU)
Nacho leverages WebGPU for high-performance rendering, allowing it to run 3D games and complex UIs directly in the browser with near-native speeds.
