## Context

Bellum is a browser-native gaming platform that executes Android APKs and Windows EXEs via WebAssembly + WebGPU acceleration. The current UI is functional but visually inconsistent — it mixes Framer Motion, CSS keyframes, and ad-hoc anime.js usage. The color palette leans heavily into high-contrast gold themes that feel more "crypto" than "gaming." Our competitors (GeForce NOW, Steam, Xbox Cloud Gaming) use restrained palettes, generous whitespace, and cinematic transitions.

Current architecture:
- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS 3.4 with shadcn/ui primitives
- **Animation**: Fragmented — anime.js v4 in package.json but underutilized; Framer Motion used for some transitions; CSS keyframes for loading states
- **Themes**: 30+ color themes in `lib/themes.ts`, default is `challenger-gold` (high saturation, high contrast)
- **Auth**: FingerprintJS + username, stored in localStorage, synced to cloud
- **Runtime**: WASM-based x86/Dalvik emulator with WebGPU renderer, target 40+ FPS

## Goals / Non-Goals

**Goals:**
1. Establish anime.js v4 as the sole animation engine for all time-based motion (layout transitions, micro-interactions, loading states)
2. Create a cohesive matte design system with restrained color palette, precise spacing, and refined typography
3. Implement cinematic page transitions on every route change
4. Build a reusable micro-interaction library (hover, press, focus, loading) with spring physics
5. Redesign game cards with staggered reveals, parallax thumbnails, and smooth hover transitions
6. Polish auth flow with animated modal entrances, progress steps, and error feedback
7. Redesign runtime HUD with real-time FPS display, telemetry, and execution controls
8. Implement performance-conscious animation degradation (reduce complexity when FPS < 30)

**Non-Goals:**
- No changes to core emulation engine or runtime performance targets
- No changes to authentication logic or security model
- No new theme presets beyond the matte default
- No changes to WebGPU renderer internals
- No migration away from Next.js or Tailwind CSS

## Decisions

### Decision 1: anime.js v4 as Primary Animation Engine
**Rationale**: anime.js v4 offers a unified API for springs, timelines, and staggers with superior performance characteristics compared to mixing Framer Motion + CSS. It supports `requestAnimationFrame` batching, timeline sequencing, and per-property spring physics — all critical for a gaming platform where the UI must never drop frames.

**Alternatives considered**:
- *Framer Motion*: Excellent for React gestures but heavier bundle size (~90KB) and less control over sequencing. We keep it only for AnimatePresence exit animations where React lifecycle integration is needed.
- *GSAP*: Industry standard but requires a paid license for commercial use. anime.js is MIT-licensed and v4's performance is comparable.
- *Pure CSS*: Insufficient for choreographed sequences and spring physics.

**Approach**: Create a centralized `lib/animation/engine.ts` that wraps anime.js with presets, timelines, and a React hook `useAnime()` that handles cleanup, refs, and reduced-motion checks.

### Decision 2: Matte Aesthetic with Obsidian-Coral Default
**Rationale**: The current `challenger-gold` theme (saturated gold on near-black) feels aggressive. Gaming platforms like Steam and GeForce NOW use muted, desaturated palettes that reduce eye strain during long sessions. A matte obsidian base with a restrained coral accent achieves "premium" without "loud."

**Palette specification**:
- Background: `hsl(0 0% 3.5%)` — near-black with warmth
- Surface: `hsl(0 0% 6%)` — elevated cards
- Border: `hsl(0 0% 12%)` — barely visible separation
- Primary: `hsl(0 85% 62%)` — coral accent, used sparingly
- Muted text: `hsl(0 0% 38%)` — de-emphasized content
- Radius: `0.375rem` (6px) — sharp, modern, not bubbly
- Shadows: Single-layer, low-opacity (`0.03`–`0.08` alpha)

### Decision 3: Scoped Animation System via React Context
**Rationale**: anime.js operates on DOM nodes directly, which conflicts with React's virtual DOM. We need a system that bridges React refs to anime.js instances while handling component unmount cleanup.

**Approach**: `AnimeScopeProvider` creates an `anime.scope()` per route/component. Child components use `useAnimeScope()` to get the scope and queue animations. On unmount, the scope cleans up all running animations automatically.

### Decision 4: Performance-Conscious Motion Degradation
**Rationale**: When the emulator is running at 40+ FPS, any UI animation that causes a frame drop is unacceptable. We need an automatic degradation system.

**Approach**:
1. A global `PerformanceMonitor` tracks FPS using `requestAnimationFrame` delta times
2. When FPS drops below 30 for >2 seconds, the monitor sets `animationQuality = 'reduced'`
3. All anime.js presets check `animationQuality`:
   - `'full'`: All effects, spring physics, stagger delays
   - `'reduced'`: Instant transitions (duration 0), no stagger, no spring
   - `'minimal'`: Only opacity transitions, 100ms duration
4. When FPS recovers above 45 for >3 seconds, quality returns to `'full'`

### Decision 5: Component-Level Animation Tokens
**Rationale**: Hardcoding animation durations in components leads to inconsistency. We need a token system.

**Token hierarchy**:
```typescript
const DURATIONS = {
  instant: 0,
  fast: 150,      // micro-interactions (hover, press)
  base: 300,      // standard transitions
  reveal: 450,    // element entrance
  page: 600,      // route transitions
  cinematic: 900, // hero moments
} as const;

const EASINGS = {
  default: 'cubicBezier(0.25, 0.1, 0.25, 1)',
  spring: 'spring(1, 80, 10, 0)',  // mass, stiffness, damping, velocity
  bounce: 'spring(1, 120, 8, 0)',
  exit: 'cubicBezier(0.4, 0, 1, 1)',
  enter: 'cubicBezier(0, 0, 0.2, 1)',
} as const;
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Anime.js bundle size**: anime.js v4 is ~25KB gzipped. Adding extensive animation logic increases JS bundle. | Tree-shake unused presets. Lazy-load animation engine on first user interaction. Code-split route transition animations. |
| **React reconciliation conflicts**: anime.js mutates DOM directly; React may overwrite styles on re-render. | Use `anime.set()` for instantaneous style application (no animation). Scope all animations via refs, never animate state-driven props. |
| **Accessibility (reduced-motion)**: Users with vestibular disorders may be harmed by motion. | All animations respect `prefers-reduced-motion: reduce` — degrade to instant transitions. Provide toggle in settings. |
| **Performance on low-end devices**: Smooth animations require GPU compositing; integrated GPUs may struggle. | Degradation system auto-reduces quality. Use `transform` and `opacity` only (GPU-accelerated). Avoid animating `blur`, `box-shadow`. |
| **Theme migration breakage**: Changing default theme affects returning users. | Store theme preference in localStorage. If unset, migrate to new default on first visit. Keep all 30+ themes available. |
| **WASM runtime interference**: anime.js `requestAnimationFrame` callbacks may conflict with emulator's frame loop. | Use a shared `requestAnimationFrame` scheduler. Emulator frame loop gets priority; UI animations use `anime` with `autoplay: false` + manual `tick()` synchronized to display refresh. |

## Migration Plan

1. **Phase 1 — Foundation** (1-2 days):
   - Create `lib/animation/` directory with engine, presets, tokens, and React hooks
   - Update `tailwind.config.ts` with matte design tokens
   - Update `globals.css` with new CSS variables and reduced keyframes
   - Verify anime.js v4 API compatibility

2. **Phase 2 — Core UI** (2-3 days):
   - Implement `AnimeScopeProvider` and `useAnimeScope()`
   - Redesign `Header`, `Sidebar`, `Footer` with matte aesthetic
   - Implement cinematic route transitions
   - Update `layout.tsx` to include animation providers

3. **Phase 3 — Components** (2-3 days):
   - Redesign `GameCard` with theater animations
   - Redesign `SignupModal` with auth flow animations
   - Redesign `FeaturedBanner` with hero animations
   - Update `Button`, `Card`, `Input` shadcn primitives with micro-interactions

4. **Phase 4 — Runtime** (1-2 days):
   - Redesign FPS overlay and runtime HUD
   - Implement performance monitor
   - Integrate degradation system

5. **Phase 5 — Polish & QA** (1-2 days):
   - Test on low-end devices (throttled CPU/GPU)
   - Verify `prefers-reduced-motion` compliance
   - Run full build and typecheck
   - Visual regression testing on key screens

## Open Questions

1. **Should we keep Framer Motion at all?** The proposal suggests keeping it for `AnimatePresence`. If anime.js v4 handles exit animations well via timelines, we could remove Framer Motion entirely, saving ~90KB. Need to prototype exit animations first.

2. **WebGPU renderer animation integration**: The WebGPU renderer has its own render loop. Should HUD animations (FPS counter, telemetry bars) be rendered via WebGPU overlays instead of DOM to avoid layer composition overhead?

3. **Mobile gesture support**: anime.js handles touch gestures differently than Framer Motion. Do we need a separate gesture library (e.g., Hammer.js) for mobile swipe interactions on game cards?
