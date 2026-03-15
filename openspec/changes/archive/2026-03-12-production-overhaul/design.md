## Context

Challenger Deep is a browser-based platform running APK files, EXE files, and hosting 20,000+ HTML5 games. Built with Next.js 14.2, TypeScript, and deployed to Cloudflare Pages. The platform uses:

- **AlmostNode** for Node.js in browser execution
- **Framer Motion** for animations
- **WebGPU** for graphics acceleration
- **Service Workers** for offline support
- **Mesh Network** for distributed compute

Current state has foundational features but lacks production polish, has unverified functionality, and insufficient test coverage.

**Constraints:**
- Must deploy to Cloudflare Pages (Edge runtime)
- Initial bundle < 200KB
- 60 FPS target on mid-range devices
- < 3s initial load on 4G
- WCAG 2.1 AA compliance required

## Goals / Non-Goals

**Goals:**
- Transform UI to match modern gaming platforms (Steam/Epic Games quality)
- Verify all core functionality works correctly
- Achieve performance targets on all metrics
- Establish comprehensive test coverage (80%+)
- Harden security for production deployment
- Ensure accessibility compliance

**Non-Goals:**
- Adding new features beyond polish/fixes
- Rewriting core architecture
- Changing deployment platform
- Adding authentication system (use existing)
- Supporting legacy browsers without WebGPU

## Decisions

### 1. Design System Architecture

**Decision:** CSS-in-JS via Tailwind CSS with CSS custom properties for theming

**Rationale:**
- Tailwind already configured in project
- CSS variables enable runtime theming without JS overhead
- Consistent with existing component patterns
- Better performance than styled-components at runtime

**Alternatives Considered:**
- styled-components: Adds runtime overhead, increases bundle size
- CSS Modules: More complex theming, less flexible
- Tailwind only (no variables): Harder to maintain consistency

**Implementation:**
```css
:root {
  /* Spacing scale (4px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Color palette */
  --color-primary: #6366f1;
  --color-primary-hover: #818cf8;
  --color-surface: rgba(255, 255, 255, 0.05);
  --color-surface-hover: rgba(255, 255, 255, 0.1);
  
  /* Gradients */
  --gradient-card: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  --gradient-hero: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15), transparent 70%);
}
```

### 2. Component Architecture

**Decision:** Atomic design pattern with compound components

**Rationale:**
- Scales well for complex UIs
- Enables composition over configuration
- Better tree-shaking for smaller bundles
- Consistent with Framer Motion patterns

**Structure:**
```
components/
  ui/           # Atoms (buttons, inputs, icons)
  layout/       # Organisms (navigation, sidebar)
  pages/        # Templates (HomePage, GamesPage)
  games/        # Domain components (GameCard)
  apps/         # Domain components (AppCard)
```

### 3. Performance Strategy

**Decision:** Layered loading with progressive enhancement

**Phases:**
1. **Critical path** (< 50KB): HTML, critical CSS, app shell
2. **Above-fold content** (< 100KB): Hero, visible games
3. **Below-fold** (lazy): Remaining games, modals
4. **Secondary** (on-demand): Settings, admin, debug

**Implementation:**
- Route-based code splitting (Next.js automatic)
- Dynamic imports for heavy components
- Virtualization for game grids (react-window)
- Intersection Observer for lazy loading
- Service Worker for asset caching

**Alternatives Considered:**
- Single Page Application: Worse SEO, slower initial load
- Static generation for all pages: Too many games (20,000+)
- ISR (Incremental Static Regeneration): Good balance, chosen

### 4. State Management

**Decision:** React Context + URL state + SWR for server state

**Rationale:**
- Minimal boilerplate for UI state
- URL state enables deep linking and sharing
- SWR handles caching, revalidation, and deduplication
- No additional bundle cost (React built-in)

**Use Cases:**
- **URL state**: Filters, pagination, sort order
- **Context**: Theme, user preferences, modals
- **SWR**: Games catalog, user data, settings

**Alternatives Considered:**
- Redux/Zustand: Overkill for current needs
- React Query: Similar to SWR, already using SWR
- Jotai/Recoil: Adds complexity without clear benefit

### 5. Animation Strategy

**Decision:** Framer Motion with reduced motion support

**Implementation:**
- Page transitions: `AnimatePresence` with cross-fade
- List animations: Staggered children
- Hover effects: CSS transitions where possible, Motion for complex
- Scroll animations: `whileInView` for lazy trigger

**Performance:**
- Use `will-change` sparingly
- Prefer `transform` and `opacity`
- Batch animations with `layoutId`
- Disable on `prefers-reduced-motion`

### 6. APK/EXE Runner Architecture

**Decision:** WebAssembly-based execution with WebGPU rendering

**APK Runner:**
```
APK Upload → DEX Extraction → WASM Compilation → WebGPU Render → Input Mapping
```

**EXE Runner:**
```
EXE Upload → PE Parsing → x86 WASM Interpreter → GDI/DirectX → WebGPU → Canvas
```

**Rationale:**
- WASM provides near-native performance
- WebGPU enables GPU acceleration
- Shared rendering pipeline for both platforms
- Sandbox isolation for security

**Alternatives Considered:**
- Native server execution: Latency issues, scaling problems
- Full emulation in JS: Too slow for complex apps
- WebAssembly with WebGL: WebGPU offers better performance

### 7. Mesh Network Protocol

**Decision:** WebRTC for P2P with WebSocket signaling

**Topology:** Hybrid mesh with super-peers

**Implementation:**
1. **Discovery**: WebSocket signaling server for peer introduction
2. **Connection**: WebRTC data channels for P2P
3. **Task Distribution**: Content-addressed tasks (SHA-256)
4. **Verification**: Merkle proofs for result validation
5. **Fault Tolerance**: Redundant execution, timeout recovery

**Alternatives Considered:**
- Pure WebSocket: No P2P, server bottleneck
- libp2p: Overkill for current scale
- Server-only: Doesn't scale, high latency

### 8. Testing Architecture

**Decision:** Vitest (unit) + Playwright (E2E) with MSW for API mocking

**Structure:**
```
tests/
  unit/         # Vitest: utilities, components, hooks
  integration/  # Vitest: API routes, services
  e2e/          # Playwright: user journeys
```

**Coverage Targets:**
- Critical paths: 100%
- Components: 80%
- Utilities: 90%
- Overall: 80%

**Alternatives Considered:**
- Jest: Slower than Vitest, more config
- Cypress: Good but Playwright better for cross-browser
- TestCafe: Less mature ecosystem

### 9. Security Model

**Decision:** Defense in depth with sandbox isolation

**Layers:**
1. **Input Validation**: Magic bytes + file type detection
2. **Rate Limiting**: Sliding window per IP/user
3. **Sandbox**: iframe with sandbox attribute for executed code
4. **CSP**: Strict Content Security Policy
5. **CORS**: Whitelisted origins only

**Implementation:**
```typescript
// File validation
const MAGIC_BYTES = {
  APK: [0x50, 0x4B, 0x03, 0x04], // ZIP signature
  EXE: [0x4D, 0x5A],              // MZ header
};

// Rate limiting
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip ?? req.user.id,
});
```

### 10. Offline Strategy

**Decision:** Service Worker with cache-first for assets, network-first for API

**Cache Strategy:**
- **Static assets**: Cache-first, long TTL
- **Games catalog**: Stale-while-revalidate
- **Game binaries**: Cache on first play
- **User data**: Network-first with offline fallback

**Implementation:**
```javascript
// sw.js
const CACHE_STRATEGIES = {
  static: new CacheFirst({ cacheName: 'static-v1', expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } }),
  api: new NetworkFirst({ cacheName: 'api-v1', networkTimeoutSeconds: 10 }),
  games: new CacheFirst({ cacheName: 'games-v1', plugins: [new RangeRequestsPlugin()] }),
};
```

## Risks / Trade-offs

### Risk: WebGPU Browser Support
**Impact:** APK/EXE runners won't work in Safari/Firefox
**Mitigation:** WebGL fallback for non-WebGPU browsers; feature detection and graceful degradation

### Risk: Large Games Catalog Performance
**Impact:** 20,000+ games could cause memory/performance issues
**Mitigation:** Virtualization (react-window), infinite scroll, image lazy loading, pagination

### Risk: Mesh Network Reliability
**Impact:** P2P connections can fail; peers can disconnect
**Mitigation:** Fallback to server execution, redundant task distribution, timeout recovery

### Risk: APK/EXE Execution Security
**Impact:** Malicious code could escape sandbox
**Mitigation:** Multiple isolation layers, CSP, no network access from sandbox, code signing verification

### Risk: Performance Regression
**Impact:** Animations could cause jank on low-end devices
**Mitigation:** Performance budgets, Lighthouse CI, reduced motion option, FPS monitoring

### Trade-off: Bundle Size vs Features
**Choice:** Lazy load non-critical features
**Impact:** Slightly slower first interaction with secondary features
**Benefit:** Fast initial load, better Core Web Vitals

### Trade-off: Offline Capability vs Freshness
**Choice:** Stale-while-revalidate for games catalog
**Impact:** Users may see slightly outdated data initially
**Benefit:** Instant load, works offline

## Migration Plan

### Phase 1: Foundation (Week 1-2)
1. Set up design system CSS variables
2. Implement base component primitives
3. Configure testing infrastructure
4. Set up performance monitoring

### Phase 2: UI Overhaul (Week 2-4)
1. Redesign navigation system
2. Rebuild game cards and catalog
3. Update upload experience
4. Implement responsive layouts
5. Add accessibility features

### Phase 3: Core Functionality (Week 4-6)
1. Verify and fix APK runner
2. Verify and fix EXE runner
3. Test mesh network
4. Validate offline support

### Phase 4: Polish & Deploy (Week 6-8)
1. Performance optimization
2. Security hardening
3. Complete test coverage
4. Documentation updates
5. Deploy to production

### Rollback Strategy
- Feature flags for all new components
- Gradual rollout (10% → 50% → 100%)
- Previous version deployed to staging for quick rollback
- Database migrations are additive only (no destructive changes)