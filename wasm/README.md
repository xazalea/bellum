# Bellum WebAssembly Modules

This directory contains WebAssembly modules for high-performance computations.

## Setup

### Prerequisites

1. **Rust & wasm-pack** (for compression, fingerprint, storage, game-parser):
   ```bash
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

2. **AssemblyScript** (for animation physics):
   ```bash
   npm install
   ```

## Building

Build all WASM modules:
```bash
npm run build:wasm
```

Build specific modules:
```bash
# Rust modules
npm run build:wasm:rust

# AssemblyScript animation module
npm run build:wasm:as
```

## Modules

### compression (Rust)
Fast multi-algorithm compression (gzip, zstd, lz4) for file storage.
- **Speed**: 5-10x faster than native JavaScript
- **Algorithms**: gzip (compatibility), zstd (best ratio), lz4 (fastest)
- **Output**: `public/wasm/compression.wasm`

### fingerprint (Rust)
Accelerated SHA-256 hashing and fingerprint generation.
- **Speed**: 3-5x faster than SubtleCrypto
- **Features**: Canvas/audio fingerprinting, combined hashing
- **Output**: `public/wasm/fingerprint.wasm`

### storage (Rust)
Fast chunking and content-addressable storage hashing.
- **Speed**: 5x faster file chunking
- **Features**: Parallel chunk hashing, deduplication
- **Output**: `public/wasm/storage.wasm`

### game-parser (Rust)
Streaming XML parser for game library (187k+ lines).
- **Speed**: 10-20x faster than DOMParser
- **Features**: Zero-copy parsing, pagination, search
- **Output**: `public/wasm/game-parser.wasm`

### animation (AssemblyScript)
Physics engine for sea life animations.
- **Speed**: 60fps with 500+ creatures
- **Features**: SIMD optimizations, particle systems
- **Output**: `public/wasm/animation.wasm`

## Directory Structure

```
wasm/
├── compression/
│   ├── Cargo.toml
│   └── src/lib.rs
├── fingerprint/
│   ├── Cargo.toml
│   └── src/lib.rs
├── storage/
│   ├── Cargo.toml
│   └── src/lib.rs
├── game-parser/
│   ├── Cargo.toml
│   └── src/lib.rs
└── animation/
    ├── asconfig.json
    └── assembly/
        ├── index.ts
        └── tsconfig.json
```

## Usage

WASM modules are loaded dynamically via TypeScript wrappers in `lib/wasm/`.
See individual module documentation for usage examples.

## Fallbacks

All modules have JavaScript fallbacks if WASM fails to load or compile.
The application will work without WASM, just slower.
