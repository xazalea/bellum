# Bellum - Browser Runtime Platform

[![Discord](https://img.shields.io/discord/YOUR_SERVER_ID?color=5865F2&label=Discord&logo=discord&logoColor=white)](https://discord.gg/ADauzE32J7)

> 💬 Join our [Discord community](https://discord.gg/ADauzE32J7) for bugs, suggestions, or just chatting!

Browser-based runtime for games and applications using emulation and virtualization.

## Overview

Bellum enables running retro games and applications directly in the browser:

- **HTML5 Games** - 20,000+ games from GameDistribution
- **Windows Emulation** - Windows 98 via v86 emulator
- **Android Emulation** - Experimental Android support
- **Cloud Storage** - Distributed storage via Discord/Telegram
- **P2P Clustering** - Distributed computing across browser instances

## Architecture

```
┌─────────────────────────────────────────────┐
│            Bellum Frontend (Next.js)        │
└─────────────────────────────────────────────┘
           │                 │                │
           ▼                 ▼                ▼
    ┌──────────┐      ┌──────────┐    ┌──────────┐
    │  Games   │      │   v86    │    │  Cloud   │
    │  System  │      │ Emulator │    │ Storage  │
    └──────────┘      └──────────┘    └──────────┘
           │                 │                │
           └─────────────────┴────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  IndexedDB/OPFS  │
              └──────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
# Navigate to http://localhost:3000
```

### Features

- **Games Page** (`/games`) - Browse and play 20,000+ HTML5 games
- **Windows Page** (`/windows`) - Run Windows 98 in browser via v86
- **Android Page** (`/android`) - Experimental Android emulation
- **Library Page** (`/library`) - Upload and run APK/EXE files
- **Storage Page** (`/storage`) - Cloud file storage via Discord

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Storage**: IndexedDB (via HiberFile), Discord/Telegram webhooks
- **Emulation**: v86 (x86 emulator)
- **Compression**: fflate (gzip), optional WASM
- **Auth**: Firebase Authentication
- **Deployment**: Vercel

## Features

### Currently Working

- ✅ **HTML5 Games**: Browse and play 20,000+ games
- ✅ **Windows Emulation**: Windows 98 via v86
- ✅ **Cloud Storage**: File storage using Discord/Telegram
- ✅ **Authentication**: Firebase auth with device fingerprinting
- ✅ **Compression**: Automatic file compression (gzip/zstd)

### Experimental

- ⚠️ **Android Emulation**: Basic Android support via v86
- ⚠️ **APK/EXE Upload**: File upload with basic execution
- ⚠️ **P2P Clustering**: Distributed computing (in development)

### Not Yet Implemented

- ❌ **Native Binary Execution**: JIT/GPU runtime are stubs
- ❌ **High Performance**: No actual GPU compute or JIT
- ❌ **Full OS Support**: Limited to what v86 can emulate

## Core Components

### Games System
- XML parser for 20,000+ game catalog
- Service worker for CORS proxy
- Virtual scrolling for performance
- Game install/save to library

### v86 Emulator Integration
- x86 emulation for Windows/DOS
- Disk image loading from storage
- Screen rendering to canvas
- Input handling (keyboard/mouse)

### Storage System (HiberFile)
- IndexedDB for local storage
- Chunked file storage (4MB chunks)
- Compression support (gzip/zstd)
- Cloud archival to Discord/Telegram
- Hot/cold storage tiers

### Experimental Features
- **GPU Benchmarking**: WebGPU matrix multiply benchmark
- **JIT Stubs**: Architecture for future JIT (not functional)
- **Binary Parser**: PE/DEX format detection (basic)

## Browser Requirements

- **Minimum**: Chrome 90+, Firefox 90+, Safari 14+
- **Recommended**: Chrome 113+ or Edge 113+ for WebGPU features
- **Required**: IndexedDB support, JavaScript enabled
- **Optional**: SharedArrayBuffer for better performance (requires HTTPS)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Build WASM modules (optional)
npm run build:wasm
```

## Known Limitations

- **Emulation Speed**: v86 is significantly slower than native
- **Binary Execution**: Limited to what v86 can emulate
- **WebGPU**: Only available in Chrome/Edge 113+
- **CORS**: Some games may fail to load due to CORS restrictions
- **Storage**: Discord/Telegram have file size limits (25MB)

## License

MIT License - See LICENSE file for details
