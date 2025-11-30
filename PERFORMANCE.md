# Performance Optimizations

This document outlines all the performance optimizations implemented in Bellum.

## 🚀 Build Pipeline Optimizations

### Code Splitting
- **Route-based splitting**: Each route loads only its required code
- **Component-based splitting**: Large components are lazy-loaded
- **Vendor splitting**: React, emulator code, and WASM modules are in separate chunks
- **Emulator isolation**: Emulator code is split into its own chunk for better caching

### Tree Shaking & Dead Code Elimination
- Automatic tree-shaking via Next.js and Webpack
- Unused exports are eliminated from the final bundle
- Dynamic imports for code that's not immediately needed

### Compression
- **Brotli + Gzip**: Automatic compression for all assets
- **WASM compression**: WebAssembly modules are compressed
- **Minification**: All JavaScript is minified in production

### Asset Optimization
- **Image optimization**: AVIF and WebP formats with Next.js Image component
- **Font optimization**: System fonts for zero font loading time
- **Static asset caching**: Aggressive caching for immutable assets

## ⚡ WebAssembly Integration

### WASM Modules
- **Emulator cores**: v86 emulator runs in WASM for near-native performance
- **Streaming compilation**: WASM modules compile as they download
- **SharedArrayBuffer**: Enabled for multi-threaded performance (where supported)

### WASM Loading Strategy
- Lazy-loaded on demand
- Cached after first load
- Streaming compilation for instant startup

## 🎮 Zero-Lag Emulator Architecture

### WebWorker Execution
- Emulator logic runs in a dedicated WebWorker
- Main UI thread never blocks
- Smooth 60 FPS even during heavy emulation

### Rendering Pipeline
- **WebGL acceleration**: Hardware-accelerated rendering
- **OffscreenCanvas**: Rendering can happen off main thread
- **Frame skipping**: Adaptive frame skipping for low-end devices

### Audio Processing
- **AudioWorklet**: Low-latency audio processing (when available)
- **Web Audio API**: High-quality audio rendering

### State Management
- **Structured clones**: Fast state serialization
- **IndexedDB caching**: Large state snapshots cached locally
- **Incremental saves**: Only changed state is saved

## 📦 Smart Asset Delivery

### Service Worker
- **Cache-first strategy**: Static assets served from cache
- **Stale-while-revalidate**: Background updates for dynamic content
- **Network-first**: API calls always try network first
- **Offline support**: Core functionality works offline

### IndexedDB Caching
- **ISO files**: Large ISO files cached in IndexedDB
- **State snapshots**: VM states cached for instant resume
- **Progressive loading**: Large files stream and cache incrementally

### Preloading & Prefetching
- **Critical resources**: Preloaded on page load
- **DNS prefetch**: External domains prefetched
- **Preconnect**: Connections established early
- **Idle-time loading**: Non-critical assets load during idle time

## 🧠 Client-Side Performance

### DOM Optimization
- **Virtual scrolling**: Large lists use virtualization
- **IntersectionObserver**: Lazy loading for off-screen content
- **RequestIdleCallback**: Non-critical work deferred to idle time

### GPU Acceleration
- **CSS transforms**: Hardware-accelerated animations
- **Will-change hints**: Browser optimization hints
- **Backface visibility**: 3D transform optimizations

### Memory Management
- **Object pooling**: Reuse objects to reduce GC pressure
- **Weak references**: Prevent memory leaks
- **Cleanup handlers**: Proper resource cleanup

## 🌐 Network Optimization

### HTTP/3 & QUIC
- Configured for HTTP/3 support (when available)
- QUIC protocol for faster connections
- Multiplexed streams for parallel requests

### CDN Configuration
- Static assets served from CDN
- Edge caching for global performance
- Immutable content with long cache times

### Caching Headers
- **Static assets**: `max-age=31536000, immutable`
- **WASM files**: Cached forever with versioning
- **API responses**: Appropriate cache-control headers
- **ETags**: Efficient cache validation

## 📊 Performance Monitoring

### Real-Time Metrics
- **FPS monitoring**: Real-time frame rate tracking
- **Frame time**: Per-frame rendering time
- **Main thread blocking**: Detection of UI blocking
- **Memory usage**: JavaScript heap monitoring

### Web Vitals
- **LCP**: Largest Contentful Paint tracking
- **FID**: First Input Delay monitoring
- **CLS**: Cumulative Layout Shift tracking
- **FCP**: First Contentful Paint

### Adaptive Performance
- **Automatic quality adjustment**: Reduces quality when FPS drops
- **Texture scaling**: Dynamic texture resolution
- **Render resolution**: Adaptive screen resolution
- **Frame skipping**: Automatic frame skip for low-end devices

## 🛠️ Usage

### Performance Dashboard
Press `Ctrl+Shift+P` to toggle the performance dashboard, showing:
- Current FPS
- Frame time
- Main thread blocking
- Adaptive quality settings

### Manual Quality Control
```typescript
import { adaptivePerformance } from '@/lib/performance/adaptive';

// Set custom quality
adaptivePerformance?.setConfig({
  textureScale: 0.75,
  renderResolution: 0.75,
  frameSkip: 0,
  audioQuality: 'medium',
});
```

### Performance Monitoring
```typescript
import { performanceMonitor } from '@/lib/performance/monitor';

// Subscribe to metrics
performanceMonitor?.on('metrics', (metrics) => {
  console.log('FPS:', metrics.fps);
  console.log('Frame time:', metrics.frameTime);
});
```

## 📈 Performance Targets

- **Initial Load**: < 2 seconds
- **Time to Interactive**: < 3 seconds
- **FPS**: 60 FPS on mid-range devices
- **Frame Time**: < 16.67ms per frame
- **Main Thread Blocking**: < 50ms
- **Memory Usage**: < 500MB for typical usage

## 🔧 Configuration

All performance settings can be adjusted in:
- `next.config.js`: Build optimizations
- `lib/performance/adaptive.ts`: Adaptive quality settings
- `lib/performance/monitor.ts`: Monitoring thresholds
- `public/sw.js`: Service worker caching strategy

