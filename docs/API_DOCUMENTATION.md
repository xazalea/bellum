# Challenger Deep API Documentation

## Overview

This document describes the public APIs for the Challenger Deep platform enhancement features.

## Table of Contents

1. [Capability Detection](#capability-detection)
2. [Cache Coordinator](#cache-coordinator)
3. [Mesh Compute Protocol](#mesh-compute-protocol)
4. [Performance Metrics](#performance-metrics)
5. [Feature Flags](#feature-flags)
6. [Security](#security)

---

## Capability Detection

### `lib/runtime/capability-detector.ts`

The capability detection module provides device capability analysis for adaptive execution.

### Methods

#### `detectCapabilities(): Promise<DeviceCapabilities>`

Detects the current device's capabilities.

```typescript
import { detectCapabilities } from '@/lib/runtime/capability-detector';

const capabilities = await detectCapabilities();
// Returns:
// {
//   cpuCores: 8,
//   memory: 16,
//   webgpu: true,
//   webgpuFeatures: ['shader-f16', 'compute-shader'],
//   connectionType: '4g',
//   downlink: 10,
//   tier: 3
// }
```

#### `classifyDeviceTier(capabilities: DeviceCapabilities): number`

Classifies the device into a performance tier (1-4).

```typescript
import { classifyDeviceTier } from '@/lib/runtime/capability-detector';

const tier = classifyDeviceTier(capabilities);
// Returns: 1 (Low), 2 (Mid), 3 (High), or 4 (Mesh)
```

#### `onTierChange(callback: (tier: number) => void): () => void`

Subscribes to tier change events.

```typescript
const unsubscribe = onTierChange((newTier) => {
  console.log(`Tier changed to ${newTier}`);
});

// Later: unsubscribe()
```

### Types

```typescript
interface DeviceCapabilities {
  cpuCores: number;
  memory: number;
  webgpu: boolean;
  webgpuFeatures?: string[];
  connectionType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number;
  tier: number;
}
```

---

## Cache Coordinator

### `lib/cache/cache-coordinator.ts`

The cache coordinator manages multi-tier caching with L1 (memory) and L2 (IndexedDB) layers.

### Methods

#### `cacheGet<T>(key: string): Promise<T | null>`

Retrieves a value from the cache.

```typescript
import { cacheGet, cacheSet } from '@/lib/cache/cache-coordinator';

await cacheSet('user-preferences', { theme: 'dark' });
const prefs = await cacheGet<{ theme: string }>('user-preferences');
```

#### `cacheSet<T>(key: string, value: T, options?: CacheOptions): Promise<void>`

Stores a value in the cache.

```typescript
await cacheSet('game-state', gameState, {
  ttl: 3600000, // 1 hour
  tier: 'l2',   // Persist to IndexedDB
});
```

#### `cacheDelete(key: string): Promise<boolean>`

Deletes a value from the cache.

```typescript
await cacheDelete('old-data');
```

#### `cacheClear(): Promise<void>`

Clears all cache entries.

```typescript
await cacheClear();
```

#### `getCacheStats(): CacheStats`

Returns cache statistics.

```typescript
const stats = getCacheStats();
// Returns:
// {
//   l1Size: 1024000,
//   l1Count: 50,
//   l1HitRate: 0.85,
//   l2Size: 50000000,
//   l2Count: 200,
//   l2HitRate: 0.92,
//   totalHits: 1000,
//   totalMisses: 100
// }
```

### Types

```typescript
interface CacheOptions {
  ttl?: number;        // Time to live in milliseconds
  tier?: 'l1' | 'l2';  // Cache tier
  version?: string;    // Version for invalidation
}

interface CacheStats {
  l1Size: number;
  l1Count: number;
  l1HitRate: number;
  l2Size: number;
  l2Count: number;
  l2HitRate: number;
  totalHits: number;
  totalMisses: number;
}
```

---

## Mesh Compute Protocol

### `lib/fabric/compute-protocol.ts`

The mesh compute protocol enables distributed task execution across peers.

### Methods

#### `submitComputeTask(task: ComputeTask): Promise<ComputeResult>`

Submits a compute task to the mesh network.

```typescript
import { submitComputeTask } from '@/lib/fabric/compute-protocol';

const result = await submitComputeTask({
  type: 'COMPILE_DEX',
  input: dexBytes,
  priority: 'normal',
  timeoutMs: 30000,
});
```

#### `getTaskStatus(taskId: string): Promise<TaskStatus>`

Gets the status of a submitted task.

```typescript
const status = await getTaskStatus('task-123');
// Returns: 'pending' | 'running' | 'completed' | 'failed'
```

#### `cancelTask(taskId: string): Promise<boolean>`

Cancels a pending or running task.

```typescript
await cancelTask('task-123');
```

#### `onTaskProgress(taskId: string, callback: (progress: number) => void): () => void`

Subscribes to task progress updates.

```typescript
const unsubscribe = onTaskProgress('task-123', (progress) => {
  console.log(`Task progress: ${progress}%`);
});
```

### Types

```typescript
interface ComputeTask {
  type: 'COMPILE_DEX' | 'COMPILE_PE' | 'RENDER_FRAME' | 'DECOMPRESS';
  input: Uint8Array;
  priority?: 'low' | 'normal' | 'high';
  memoryBudget?: number;
  timeoutMs?: number;
}

interface ComputeResult {
  taskId: string;
  ok: boolean;
  output?: Uint8Array;
  error?: string;
  metrics: {
    computeTime: number;
    memoryUsed: number;
    peerId?: string;
  };
}
```

---

## Performance Metrics

### `lib/performance/metrics-collector.ts`

The metrics collector provides real-time performance monitoring.

### Methods

#### `startCollection(intervalMs?: number): void`

Starts collecting performance metrics.

```typescript
import { metricsCollector } from '@/lib/performance/metrics-collector';

metricsCollector.startCollection(1000); // Collect every second
```

#### `stopCollection(): void`

Stops metrics collection.

```typescript
metricsCollector.stopCollection();
```

#### `getCurrentMetrics(): PerformanceMetricsSnapshot`

Gets the current metrics snapshot.

```typescript
const metrics = getCurrentMetrics();
// Returns:
// {
//   timestamp: 1234567890,
//   execution: { fps: 60, frameTimeMs: 16.67, jitTimeMs: 5, ... },
//   memory: { heapUsed: 50000000, heapTotal: 100000000, ... },
//   network: { latencyMs: 50, cacheHitRate: 0.9, ... },
//   mesh: { peerCount: 5, avgRttMs: 100, ... },
//   tier: 3
// }
```

#### `subscribeToMetrics(callback: MetricsCallback): () => void`

Subscribes to metrics updates.

```typescript
const unsubscribe = subscribeToMetrics((event, data) => {
  if (event === 'metrics') {
    console.log('FPS:', data.execution.fps);
  } else if (event === 'alert') {
    console.warn('Performance alert:', data.message);
  }
});
```

#### `exportMetricsJSON(): string`

Exports metrics as JSON.

```typescript
const json = exportMetricsJSON();
// Download or send to server
```

### Types

```typescript
interface PerformanceMetricsSnapshot {
  timestamp: number;
  execution: {
    fps: number;
    frameTimeMs: number;
    jitTimeMs: number;
    compileTimeMs: number;
    instructionCount: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapLimit: number;
    gcPauseMs: number;
    externalMemory: number;
  };
  network: {
    latencyMs: number;
    bandwidthBps: number;
    cacheHitRate: number;
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
  };
  mesh: {
    peerCount: number;
    avgRttMs: number;
    activeTasks: number;
    offloadSuccessRate: number;
  };
  tier: number;
}
```

---

## Feature Flags

### `lib/runtime/feature-flags.ts`

Feature flags control the rollout of new features.

### Methods

#### `isFeatureEnabled(feature: string): boolean`

Checks if a feature is enabled.

```typescript
import { isFeatureEnabled } from '@/lib/runtime/feature-flags';

if (isFeatureEnabled('mesh-offload')) {
  // Use mesh offloading
}
```

#### `getFeatureValue<T>(feature: string, defaultValue: T): T`

Gets a feature's configuration value.

```typescript
const maxPeers = getFeatureValue('mesh-max-peers', 10);
```

#### `onFeatureChange(feature: string, callback: (enabled: boolean) => void): () => void`

Subscribes to feature flag changes.

```typescript
const unsubscribe = onFeatureChange('mesh-offload', (enabled) => {
  console.log(`Mesh offload is now ${enabled ? 'enabled' : 'disabled'}`);
});
```

### Available Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `adaptive-execution` | Enable adaptive execution pipeline | `true` |
| `mesh-offload` | Enable mesh compute offloading | `false` |
| `progressive-loading` | Enable progressive asset loading | `true` |
| `offline-mode` | Enable offline support | `true` |
| `performance-dashboard` | Show performance dashboard | `false` |
| `developer-tools` | Enable developer tools | `false` |

---

## Security

### `lib/security/input-validator.ts`

Input validation utilities using Joi schemas.

### Methods

#### `validateInput<T>(input: unknown, schema: Joi.Schema): ValidationResult<T>`

Validates input against a Joi schema.

```typescript
import { validateInput, schemas } from '@/lib/security/input-validator';

const result = validateInput(userInput, schemas.gameId);
if (result.valid) {
  // Use result.value
} else {
  // Handle result.errors
}
```

### `lib/security/rate-limiter.ts`

Rate limiting middleware.

### Methods

#### `checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>`

Checks if a request should be rate limited.

```typescript
import { checkRateLimit } from '@/lib/security/rate-limiter';

const result = await checkRateLimit('ip:192.168.1.1', 100, 60000);
if (result.limited) {
  // Return 429 Too Many Requests
}
```

### `lib/security/audit-log.ts`

Security audit logging.

### Methods

#### `logSecurityEvent(event: SecurityEvent): Promise<void>`

Logs a security event.

```typescript
import { logSecurityEvent } from '@/lib/security/audit-log';

await logSecurityEvent({
  type: 'AUTH_FAILURE',
  userId: 'user-123',
  ip: '192.168.1.1',
  details: { reason: 'Invalid password' },
});
```

---

## React Components

### UI Components

All UI components are available from `@/components/ui/`:

- `LoadingProgress` - Loading progress indicator
- `LoadingBreakdown` - Detailed loading breakdown
- `CacheManager` - Cache management UI
- `OfflineIndicator` - Offline status indicator
- `PerformanceDashboard` - Performance metrics dashboard
- `DebugConsole` - Developer debug console
- `UploadComponent` - File upload with progress
- `AccessibilityProvider` - Accessibility settings provider

### Example Usage

```tsx
import { PerformanceDashboard } from '@/components/ui/performance-dashboard';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { CacheManager } from '@/components/ui/cache-manager';

function App() {
  return (
    <>
      <OfflineIndicator />
      <PerformanceDashboard />
      <CacheManager />
    </>
  );
}
```

---

## Error Handling

All API methods follow consistent error handling:

```typescript
try {
  const result = await someApiMethod();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error [${error.code}]: ${error.message}`);
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `CACHE_MISS` | Key not found in cache |
| `TASK_TIMEOUT` | Compute task timed out |
| `TASK_FAILED` | Compute task failed |
| `RATE_LIMITED` | Rate limit exceeded |
| `VALIDATION_ERROR` | Input validation failed |
| `NETWORK_ERROR` | Network request failed |
| `STORAGE_QUOTA` | Storage quota exceeded |

---

## Versioning

The API follows semantic versioning. Breaking changes will be announced in release notes.

Current version: **1.0.0**