# Developer Tools Documentation

## Overview

Challenger Deep includes a comprehensive set of developer tools for debugging, profiling, and monitoring application performance.

## Enabling Developer Mode

Developer tools are disabled by default. Enable them in settings:

```tsx
import { useDeveloperMode } from '@/lib/dev-tools/debugger';

function SettingsPage() {
  const { enabled, toggle } = useDeveloperMode();
  
  return (
    <button onClick={toggle}>
      Developer Mode: {enabled ? 'ON' : 'OFF'}
    </button>
  );
}
```

## Debug Console

### Accessing the Debug Console

The debug console provides a browser-based terminal for executing JavaScript and viewing logs.

```tsx
import { DebugConsole } from '@/components/ui/debug-console';

function DevPanel() {
  return <DebugConsole className="h-96" />;
}
```

### Features

- **Console Logging**: Intercepts `console.log`, `console.warn`, `console.error`
- **Command Execution**: Execute arbitrary JavaScript
- **History Navigation**: Use arrow keys to navigate command history
- **Filtering**: Filter logs by type or content

### Network Inspection

The debug console includes a network panel for inspecting HTTP requests:

```tsx
// Network requests are automatically captured
fetch('/api/games')
  .then(res => res.json())
  .then(data => console.log(data));

// View in Network tab:
// - Request URL, method, headers
// - Response status, headers, body
// - Timing information
```

## Debugger

### Setting Breakpoints

```tsx
import { debugger } from '@/lib/dev-tools/debugger';

// Set a breakpoint
debugger.setBreakpoint('game-loop', 42);

// Conditional breakpoint
debugger.setBreakpoint('render', 100, { condition: 'fps < 30' });

// Remove breakpoint
debugger.removeBreakpoint('game-loop', 42);
```

### Execution Control

```tsx
// Pause execution
debugger.pause();

// Resume execution
debugger.resume();

// Step over
debugger.stepOver();

// Step into
debugger.stepInto();

// Step out
debugger.stepOut();
```

### Variable Inspection

```tsx
// Inspect a variable
const value = debugger.inspect('gameState');
console.log(value);

// Watch an expression
debugger.watch('player.position.x');

// Get all watched values
const watches = debugger.getWatches();
```

### Call Stack

```tsx
// Get current call stack
const stack = debugger.getCallStack();
// Returns: [{ function: 'render', line: 42, file: 'game.ts' }, ...]
```

## Performance Profiler

### CPU Profiling

```tsx
import { profiler } from '@/lib/dev-tools/debugger';

// Start CPU profiling
profiler.startCPUProfile('game-loop');

// ... run code ...

// Stop and get results
const profile = profiler.stopCPUProfile('game-loop');
// Returns flame graph data
```

### Memory Profiling

```tsx
// Take a heap snapshot
const snapshot = profiler.takeHeapSnapshot();
console.log(`Total size: ${snapshot.totalSize}`);
console.log(`Object count: ${snapshot.objectCount}`);

// Compare snapshots
const snapshot2 = profiler.takeHeapSnapshot();
const diff = profiler.compareSnapshots(snapshot, snapshot2);
console.log(`Memory delta: ${diff.delta}`);
```

### Frame Timing

```tsx
// Get frame timing data
const frames = profiler.getFrameTimings();
// Returns: [{ startTime: 0, duration: 16.67, dropped: false }, ...]

// Detect dropped frames
const dropped = frames.filter(f => f.duration > 33);
console.log(`Dropped frames: ${dropped.length}`);
```

## Performance Dashboard

### Opening the Dashboard

```tsx
import { PerformanceDashboard } from '@/components/ui/performance-dashboard';

function DevTools() {
  return <PerformanceDashboard />;
}
```

### Metrics Available

| Metric | Description |
|--------|-------------|
| FPS | Frames per second |
| Frame Time | Time per frame in ms |
| JIT Time | Time spent in JIT compilation |
| Heap Used | JavaScript heap usage |
| Heap Total | Total heap size |
| GC Pause | Garbage collection pause time |
| Network Latency | Request latency in ms |
| Cache Hit Rate | Percentage of cache hits |
| Mesh Peers | Number of connected peers |
| Offload Success | Mesh offload success rate |

### Exporting Metrics

```tsx
import { exportMetricsJSON, generateDebugReport } from '@/lib/performance/metrics-collector';

// Export as JSON
const json = exportMetricsJSON();
downloadFile('metrics.json', json);

// Generate text report
const report = generateDebugReport();
console.log(report);
```

## Cache Inspector

### Viewing Cache Contents

```tsx
import { CacheManager } from '@/components/ui/cache-manager';

function DevPanel() {
  return <CacheManager />;
}
```

### Cache Operations

```tsx
import { cacheCoordinator } from '@/lib/cache/cache-coordinator';

// View all entries
const entries = await cacheCoordinator.getL2Entries();

// Get statistics
const stats = cacheCoordinator.getStats();

// Clear specific entries
await cacheCoordinator.invalidateExpired();

// Clear all
await cacheCoordinator.clear();
```

## Feature Flags

### Viewing Feature Flags

```tsx
import { getAllFeatures } from '@/lib/runtime/feature-flags';

const features = getAllFeatures();
// Returns: [{ name: 'mesh-offload', enabled: false, rollout: 0 }, ...]
```

### Toggling Features (Dev Mode Only)

```tsx
import { setFeatureOverride } from '@/lib/runtime/feature-flags';

// Override a feature
setFeatureOverride('mesh-offload', true);

// Clear override
clearFeatureOverride('mesh-offload');
```

## Debug Overlays

### Performance Overlay

Show a minimal FPS/memory overlay during gameplay:

```tsx
import { PerformanceOverlay } from '@/components/ui/performance-dashboard';

function Game() {
  return (
    <div>
      <GameCanvas />
      <PerformanceOverlay className="absolute top-2 right-2" />
    </div>
  );
}
```

### Tier Indicator

Show the current execution tier:

```tsx
import { TierIndicator } from '@/components/ui/performance-dashboard';

<TierIndicator />
// Shows: "TIER 3" with color coding
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle developer mode |
| `Ctrl+Shift+P` | Open performance dashboard |
| `Ctrl+Shift+C` | Open debug console |
| `F8` | Pause/Resume execution |
| `F10` | Step over |
| `F11` | Step into |
| `Shift+F11` | Step out |

## Debug API Reference

### `debugger` Object

```typescript
interface Debugger {
  // Breakpoints
  setBreakpoint(file: string, line: number, options?: BreakpointOptions): void;
  removeBreakpoint(file: string, line: number): void;
  removeAllBreakpoints(): void;
  getBreakpoints(): Breakpoint[];
  
  // Execution
  pause(): void;
  resume(): void;
  stepOver(): void;
  stepInto(): void;
  stepOut(): void;
  
  // Inspection
  inspect(variable: string): any;
  watch(expression: string): void;
  unwatch(expression: string): void;
  getWatches(): Watch[];
  
  // Call Stack
  getCallStack(): CallFrame[];
}
```

### `profiler` Object

```typescript
interface Profiler {
  // CPU
  startCPUProfile(name: string): void;
  stopCPUProfile(name: string): CPUProfile;
  
  // Memory
  takeHeapSnapshot(): HeapSnapshot;
  compareSnapshots(a: HeapSnapshot, b: HeapSnapshot): SnapshotDiff;
  
  // Frames
  getFrameTimings(): FrameTiming[];
  getDroppedFrames(): FrameTiming[];
}
```

## Best Practices

### 1. Use Console Methods Appropriately

```typescript
// Good: Use appropriate log levels
console.log('Info message');
console.warn('Warning message');
console.error('Error message');
console.debug('Debug message (only in dev mode)');

// Avoid: Excessive logging in production
if (process.env.NODE_ENV === 'development') {
  console.log('Detailed debug info');
}
```

### 2. Profile Before Optimizing

```typescript
// Start profiling
profiler.startCPUProfile('operation');

// Run the code
performOperation();

// Stop and analyze
const profile = profiler.stopCPUProfile('operation');
analyzeHotspots(profile);
```

### 3. Monitor Memory Trends

```typescript
// Take baseline snapshot
const baseline = profiler.takeHeapSnapshot();

// Perform operations
for (let i = 0; i < 100; i++) {
  performOperation();
}

// Check for leaks
const after = profiler.takeHeapSnapshot();
const diff = profiler.compareSnapshots(baseline, after);

if (diff.delta > 10 * 1024 * 1024) {
  console.warn('Potential memory leak detected');
}
```

### 4. Use Breakpoints Strategically

```typescript
// Conditional breakpoints for specific scenarios
debugger.setBreakpoint('game.ts', 100, {
  condition: 'score > 1000'
});

// Log points (non-breaking breakpoints)
debugger.setLogpoint('game.ts', 50, 'Player position: ${player.x}, ${player.y}');
```

## Troubleshooting

### Developer Tools Not Showing

1. Ensure developer mode is enabled
2. Check that `developer-tools` feature flag is on
3. Verify you're not in production mode

### Performance Overhead

Developer tools add minimal overhead when disabled. When enabled:
- Console interception: ~1% overhead
- Performance monitoring: ~2% overhead
- Profiling (active): ~5-10% overhead

### Memory Usage

The debug console retains up to 500 log entries. Clear periodically:

```typescript
debugger.clearConsole();
```

## Integration with External Tools

### Chrome DevTools

The debug console integrates with Chrome DevTools:
- Console messages appear in both
- Breakpoints sync with Chrome DevTools
- Performance profiles can be imported

### Export for Bug Reports

```typescript
const report = {
  metrics: exportMetricsJSON(),
  heap: profiler.takeHeapSnapshot(),
  logs: debugger.getConsoleHistory(),
  features: getAllFeatures(),
  timestamp: Date.now(),
};

// Upload or download
downloadFile('debug-report.json', JSON.stringify(report));