## Context

Challenger Deep is a browser-based execution platform that runs Android APKs, Windows EXEs, and 20,000+ HTML5 games. The current architecture consists of:

- **Frontend**: Next.js 14 with React 18, deployed on Cloudflare Pages
- **Execution Layer**: Custom compilers and runtimes (ART for Android, NTR for Windows)
- **Mesh Network**: WebRTC-based P2P network using `lib/fabric/mesh.ts`
- **Storage**: Discord/Telegram for user files, Firebase for auth/data
- **Node.js in Browser**: AlmostNode enables server-side code execution client-side

The platform faces challenges with performance consistency across devices, underutilized mesh compute capabilities, and user experience gaps. This design addresses these challenges through architectural improvements.

## Goals / Non-Goals

**Goals:**
- Enable adaptive execution that scales from low-end mobile to high-end desktop
- Leverage mesh network for distributed compute offloading
- Provide real-time performance observability
- Support offline-first functionality for core features
- Improve security posture with defense-in-depth approach
- Enhance developer experience with debugging tools

**Non-Goals:**
- Native mobile apps (iOS/Android) - focus remains on browser
- Multiplayer game hosting (separate initiative)
- GPU rental marketplace (future phase)
- VR/XR support (future phase)

## Decisions

### D1: Adaptive Execution Pipeline

**Decision**: Implement a tiered execution strategy with runtime capability detection.

**Rationale**: Device capabilities vary dramatically. A low-end Chromebook needs different strategies than a gaming PC with WebGPU. Static compilation cannot optimize for all scenarios.

**Approach**:
```
┌─────────────────────────────────────────────────────────────┐
│                    Capability Detection                      │
│  - WebGPU support, memory, CPU cores, network bandwidth     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Strategy Selection                         │
│  Tier 1 (Low): Interpreter-only, no JIT, minimal caching    │
│  Tier 2 (Mid): Selective JIT, standard caching              │
│  Tier 3 (High): Full JIT, aggressive caching, WebGPU        │
│  Tier 4 (Mesh): Offload to mesh peers, thin client          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Execution Engine                           │
│  - Dynamic code generation based on tier                     │
│  - Memory budget enforcement                                  │
│  - Performance monitoring and tier adjustment                │
└─────────────────────────────────────────────────────────────┘
```

**Alternatives Considered**:
- Single optimized path: Cannot handle device diversity
- Server-side rendering: Defeats client-side execution goal
- WebAssembly-only: Limited optimization opportunities

### D2: Mesh Compute Offloading

**Decision**: Extend FabricMesh with compute task distribution and result aggregation.

**Rationale**: Low-end devices can participate in the platform by offloading heavy computation to capable peers. This democratizes access and leverages the existing P2P infrastructure.

**Approach**:
```
┌──────────────┐     Task Request      ┌──────────────┐
│  Low-End     │ ────────────────────► │  High-End    │
│  Client      │                       │  Peer        │
│              │ ◄──────────────────── │              │
└──────────────┘     Result Stream     └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  Task Queue  │
                                       │  Scheduler   │
                                       └──────────────┘
```

**Task Types**:
- `COMPILE_DEX`: DEX bytecode → WASM compilation
- `COMPILE_PE`: PE executable → x86 interpretation
- `RENDER_FRAME`: WebGPU frame rendering
- `DECOMPRESS`: Asset decompression

**Protocol**:
```typescript
interface ComputeTask {
  id: string;
  type: TaskType;
  input: Uint8Array;
  memoryBudget: number;
  timeoutMs: number;
  priority: 'low' | 'normal' | 'high';
}

interface ComputeResult {
  taskId: string;
  ok: boolean;
  output?: Uint8Array;
  error?: string;
  metrics: {
    computeTime: number;
    memoryUsed: number;
  };
}
```

**Alternatives Considered**:
- Centralized compute servers: Adds infrastructure cost, single point of failure
- WebAssembly threads: Limited by client resources
- No offloading: Excludes low-end devices

### D3: Progressive Loading Architecture

**Decision**: Implement priority-based streaming with background prefetch.

**Rationale**: Large APKs/EXEs cause long loading times. Progressive loading improves perceived performance and enables early interaction.

**Approach**:
```
Priority 1 (Critical): Manifest, entry point, first frame assets
Priority 2 (Interactive): Core gameplay assets, UI resources
Priority 3 (Enhancement): Background assets, alternative resolutions
Priority 4 (Prefetch): Likely-needed future assets
```

**Implementation**:
- Chunk assets during upload/processing
- Stream chunks by priority
- Background fetch for lower priorities
- Cancel pending fetches on navigation

### D4: Multi-Tier Caching

**Decision**: Implement coordinated caching across Service Worker, IndexedDB, and CDN.

**Rationale**: Reduces network requests, enables offline support, improves load times for repeat visits.

**Cache Layers**:
```
┌─────────────────────────────────────────────────────────────┐
│ L1: Memory Cache (in-process, fastest, smallest)            │
│     - Hot code, active assets, current session data         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ L2: IndexedDB (persistent, large capacity)                  │
│     - Compiled code, game assets, user preferences          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ L3: Service Worker Cache (offline-capable)                  │
│     - App shell, static assets, cached API responses        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ L4: CDN (global, shared)                                    │
│     - Games catalog, common assets, compiled libraries      │
└─────────────────────────────────────────────────────────────┘
```

**Cache Invalidation**:
- Version-based for code
- TTL for API responses
- LRU for asset cache
- Manual invalidation for user content

### D5: Performance Observability

**Decision**: Implement comprehensive metrics collection with real-time visualization.

**Rationale**: Users and developers need visibility into performance. Metrics enable optimization and troubleshooting.

**Metrics Collected**:
- **Execution**: FPS, frame time, JIT compilation time, instruction count
- **Memory**: Heap size, GC pauses, memory pressure events
- **Network**: Request latency, bandwidth usage, cache hit rate
- **Mesh**: Peer count, RTT, offload success rate, throughput

**Architecture**:
```typescript
interface PerformanceMetrics {
  timestamp: number;
  execution: {
    fps: number;
    frameTimeMs: number;
    jitTimeMs: number;
    instructionCount: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    gcPauseMs: number;
  };
  network: {
    latencyMs: number;
    bandwidthBps: number;
    cacheHitRate: number;
  };
  mesh: {
    peerCount: number;
    avgRttMs: number;
    offloadQueueSize: number;
  };
}
```

### D6: Security Hardening

**Decision**: Implement defense-in-depth with sandboxing, CSP, and audit logging.

**Layers**:
1. **Content Security Policy**: Strict CSP on all routes
2. **Sandbox Isolation**: Web Workers for untrusted code
3. **Input Validation**: Joi schemas on all API inputs
4. **Rate Limiting**: Token bucket per IP/user
5. **Audit Logging**: Security event logging with retention

**Sandbox Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│ Main Thread                                                  │
│ - UI, user interaction, coordination                        │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Worker 1    │    │ Worker 2    │    │ Worker N    │
│ (APK Run)   │    │ (EXE Run)   │    │ (Game)      │
│ Isolated    │    │ Isolated    │    │ Isolated    │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Risks / Trade-offs

### R1: Mesh Offload Latency
**Risk**: Offloading to mesh peers may introduce latency that exceeds local execution time.
**Mitigation**: 
- Benchmark offload vs local before committing
- Set aggressive timeouts
- Fall back to local execution on timeout
- Prefer offload only for compute-intensive tasks

### R2: Memory Pressure on Low-End Devices
**Risk**: Caching and background operations may exhaust memory on constrained devices.
**Mitigation**:
- Monitor memory pressure via `performance.memory`
- Reduce cache sizes dynamically
- Cancel background operations under pressure
- Aggressive garbage collection hints

### R3: Service Worker Complexity
**Risk**: Service worker caching introduces complexity and potential stale data issues.
**Mitigation**:
- Version all cached resources
- Implement update notification UI
- Provide manual cache clear option
- Extensive testing of cache scenarios

### R4: Mesh Network Reliability
**Risk**: P2P connections may be unstable, causing task failures.
**Mitigation**:
- Implement task checkpointing
- Support task resumption on different peer
- Heartbeat monitoring with automatic failover
- Local fallback always available

### R5: Security Sandbox Escape
**Risk**: Sophisticated attacks may escape Web Worker sandbox.
**Mitigation**:
- Stay updated on browser security patches
- Additional validation at worker boundaries
- No shared memory between workers
- Regular security audits

## Migration Plan

### Phase 1: Foundation (Week 1-2)
1. Implement capability detection
2. Add performance metrics collection
3. Set up service worker with basic caching
4. No user-facing changes

### Phase 2: Adaptive Execution (Week 3-4)
1. Implement tiered execution strategies
2. Add memory pressure monitoring
3. Enable dynamic tier adjustment
4. Feature flag for gradual rollout

### Phase 3: Mesh Compute (Week 5-6)
1. Extend FabricMesh with compute protocol
2. Implement task scheduler
3. Add offload decision logic
4. Beta testing with power users

### Phase 4: Progressive Loading (Week 7-8)
1. Implement asset chunking
2. Add priority-based streaming
3. Enable background prefetch
4. Performance benchmarking

### Phase 5: Polish & Launch (Week 9-10)
1. Performance dashboard UI
2. Offline support finalization
3. Security audit
4. Documentation
5. Full rollout

### Rollback Strategy
- Feature flags for all new capabilities
- Gradual rollout (10% → 25% → 50% → 100%)
- Automated rollback on error rate spike
- Manual rollback via config change

## Open Questions

1. **Mesh Incentives**: Should we implement a token/credit system for mesh compute contributors?
   - *Resolution needed before Phase 3*

2. **Cache Size Limits**: What are optimal cache size limits for different device tiers?
   - *Resolve through testing in Phase 1*

3. **Offline Scope**: Which features must work offline vs. degrade gracefully?
   - *Initial: Games library, saved apps, settings. Needs validation.*

4. **Metrics Retention**: How long should detailed performance metrics be retained?
   - *Proposed: 7 days detailed, 30 days aggregated*

5. **Multi-Worker Coordination**: How to handle resource contention between multiple execution workers?
   - *Design needed in Phase 2*