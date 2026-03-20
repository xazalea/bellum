## Context

The Bellum platform is a Cloudflare Pages project that runs APK and EXE files online using a custom compiler. The current implementation has:
- A custom transpiler pipeline (`lib/transpiler/`) for DEX/PE parsing and WASM compilation
- GPU runtime (`lib/gpu/`, `src/engine/`) for rendering
- Client-side Node.js execution via almostnode
- Existing UI components in `components/` and `app/` directories

The platform currently achieves sub-optimal frame rates (well below 40 FPS target) due to inefficient compilation pipeline, memory management issues, and lack of GPU optimization.

## Goals / Non-Goals

**Goals:**
- Achieve 40+ FPS for APK/EXE compilation and execution
- Replace current proxy with boxcars-archived Go-based static web proxy
- Implement new UI with deep-sea tactical aesthetic (glass-morphism, gold accents, bento layouts)
- Support customizable themes via tweakcn integration
- Maintain Cloudflare Pages deployment compatibility
- Preserve client-side Node.js execution via almostnode

**Non-Goals:**
- Native mobile app development (web-only)
- Backend server migration (remain serverless on Cloudflare Pages)
- Multi-tenant architecture changes
- Authentication system overhaul

## Decisions

### 1. Compiler Performance Optimization

**Decision**: Implement tiered JIT compilation with GPU-accelerated rendering pipeline

**Rationale**: 
- Current interpreter-based approach is too slow for real-time execution
- Tiered JIT allows fast startup with baseline compilation, then optimizes hot paths
- GPU acceleration offloads rendering to WebGPU/WebGL, freeing CPU for compilation

**Alternatives Considered**:
- AOT compilation: Too slow startup, large binary sizes
- Pure interpreter: Cannot achieve 40 FPS target
- WebAssembly SIMD only: Limited improvement without GPU offload

### 2. Proxy Replacement with Boxcars

**Decision**: Integrate boxcars-archived as the static web proxy

**Rationale**:
- Go-based implementation provides better performance than current Node.js proxy
- Static nature aligns with Cloudflare Pages architecture
- Proven reliability in production environments

**Alternatives Considered**:
- Continue with current proxy: Unreliable, performance issues
- Custom proxy implementation: Time-consuming, reinventing the wheel
- Cloudflare Workers: Already using, but boxcars provides better caching

### 3. UI Architecture with Tweakcn Themes

**Decision**: Complete UI replacement using Tailwind CSS with tweakcn theme system

**Rationale**:
- Current UI lacks theming support and modern aesthetics
- Tweakcn provides runtime theme switching without rebuild
- Tailwind CSS already in project, minimal learning curve

**Design Tokens**:
```css
--primary: #d4af37 (gold)
--accent: #f2ca50 (amber)
--surface: #131313 (dark surface)
--obsidian: #0e0e0e (background)
--muted: #E5E2E1 (text)
```

**Alternatives Considered**:
- CSS-in-JS (styled-components): Runtime overhead, not ideal for performance
- CSS modules: No runtime theme switching
- Keep existing UI: Does not meet aesthetic requirements

### 4. Component Architecture

**Decision**: Bento-style grid layout with glass-morphism cards

**Components**:
- `GlassCard`: Reusable card with backdrop blur and border effects
- `Sidebar`: Fixed navigation with status indicators
- `TopNav`: Header with search, notifications, profile
- `BentoGrid`: Responsive grid for dashboard cards
- `SystemMonitor`: CPU/RAM/Latency display cards
- `ConsoleLog`: Real-time log streaming display
- `GameCard`: Library item with hover effects

## Risks / Trade-offs

### Risk: JIT Compilation Memory Usage
- **Risk**: Tiered JIT may consume significant memory, causing OOM on low-end devices
- **Mitigation**: Implement memory pressure detection and fallback to interpreter mode

### Risk: WebGPU Browser Support
- **Risk**: WebGPU not available in all browsers, limiting GPU acceleration
- **Mitigation**: Feature detection with WebGL fallback, graceful degradation

### Risk: Boxcars Integration Complexity
- **Risk**: Go-based proxy may require WASM compilation for Cloudflare Pages
- **Mitigation**: Compile boxcars to WASM, or use Cloudflare Workers for proxy logic

### Risk: Theme System Performance
- **Risk**: Runtime theme switching may cause layout thrashing
- **Mitigation**: CSS custom properties with transition suppression during theme change

### Trade-off: Binary Size vs Performance
- Optimized WASM binaries will be larger
- Accept trade-off for performance gain, implement lazy loading

## Migration Plan

### Phase 1: Compiler Optimization (Week 1-2)
1. Profile current compilation pipeline to identify bottlenecks
2. Implement tiered JIT in `lib/engine/wasm/tiered_jit.ts`
3. Add GPU acceleration to `lib/gpu/challenger-gpu-runtime.ts`
4. Benchmark and validate 40+ FPS target

### Phase 2: Proxy Integration (Week 2-3)
1. Clone and build boxcars-archived
2. Create WASM wrapper or Cloudflare Worker integration
3. Update asset routing in `middleware.ts`
4. Test proxy performance and reliability

### Phase 3: UI Replacement (Week 3-5)
1. Remove existing `components/` directory
2. Create new component library with theme support
3. Update `app/` pages with new layouts
4. Implement tweakcn theme provider
5. Test responsive design and accessibility

### Rollback Strategy
- Git branches for each phase allow quick rollback
- Feature flags for JIT compiler (fallback to interpreter)
- Proxy can be switched via environment variable
- UI can be toggled via feature flag during transition

## Open Questions

1. **Boxcars WASM Compilation**: Should we compile boxcars to WASM or use Cloudflare Workers? Need to evaluate performance trade-offs.

2. **Theme Persistence**: Should theme preferences be stored in localStorage, Firebase, or both?

3. **Mobile Navigation**: Should mobile use bottom nav only, or collapsible sidebar?

4. **Game Library Migration**: How to handle existing game saves/state during UI transition?
