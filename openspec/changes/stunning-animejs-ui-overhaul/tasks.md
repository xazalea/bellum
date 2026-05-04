## 1. Foundation — Animation Engine & Design Tokens

- [x] 1.1 Create `lib/animation/engine.ts` — anime.js v4 scope wrapper with init, cleanup, and reduced-motion detection
- [x] 1.2 Create `lib/animation/presets.ts` — reusable animation presets (spring, fade, slide, scale, cardHover, buttonPress, modalEnter, etc.)
- [x] 1.3 Create `lib/animation/tokens.ts` — DURATIONS and EASINGS token constants
- [x] 1.4 Create `lib/animation/hooks.ts` — `useAnime()`, `useAnimeTimeline()`, `useAnimeScope()` React hooks with ref bridging and auto-cleanup
- [x] 1.5 Create `lib/animation/PerformanceMonitor.ts` — FPS tracker with quality degradation (full/reduced/minimal) and `onQualityChange` callback
- [x] 1.6 Create `lib/animation/AnimeScopeProvider.tsx` — React context provider for per-route/component animation scopes
- [x] 1.7 Update `tailwind.config.ts` — add matte design tokens (colors, spacing, radii, shadows, typography)
- [x] 1.8 Update `app/globals.css` — replace CSS variables with matte palette, add reduced-motion media query rules, remove old keyframes
- [x] 1.9 Verify anime.js v4 API compatibility — check all method signatures (scope, timeline, spring, stagger) match installed version
- [x] 1.10 Create `lib/animation/index.ts` — barrel export for all animation utilities

## 2. Core UI — Layout & Page Transitions

- [x] 2.1 Implement cinematic route transitions — exit (opacity+translateY 250ms) → 50ms gap → entrance (staggered 80ms, 450ms) in layout wrapper
- [x] 2.2 Redesign `Header` component — matte aesthetic, reduced height, minimal borders, animated hover states on nav links
- [x] 2.3 Redesign `Sidebar` component — matte surfaces, collapse animation with spring physics, reduced icon sizes
- [x] 2.4 Redesign `Footer` component — minimal, muted text, subtle top border
- [x] 2.5 Update `app/layout.tsx` — wrap with `AnimeScopeProvider`, add `PerformanceMonitor` initialization, load Inter font
- [x] 2.6 Implement scroll-triggered section reveals — IntersectionObserver + anime.js stagger animation (60ms delay, translateY 24px→0)
- [x] 2.7 Update shadcn `Button` primitive — add hover (brightness 1.08), press (scale 0.97), and focus ring animations
- [x] 2.8 Update shadcn `Card` primitive — matte surface colors, minimal shadow, hover lift with spring physics
- [x] 2.9 Update shadcn `Input` primitive — focus ring animation (scale+opacity), error shake animation
- [x] 2.10 Remove or minimize Framer Motion usage — replace layout animations with anime.js, keep AnimatePresence only if exit animations cannot be prototyped with anime.js timelines

## 3. Game Library — Card Theater & Presentation

- [x] 3.1 Redesign `GameCard` component — matte surface, 8px radius, minimal shadow, hover lift with spring physics
- [x] 3.2 Implement staggered card reveal on grid load — anime.js timeline with 60ms stagger, opacity/translateY/scale, 400ms duration
- [x] 3.3 Implement card hover theater — translateY -4px, shadow intensify, border primary/0.2, thumbnail scale 1.05
- [x] 3.4 Implement play button overlay on card hover — fade in with opacity, play icon scale in with spring bounce, subtle backdrop blur
- [ ] 3.5 Implement card selection feedback — border glow pulse animation (boxShadow expand), elevated state while selected
- [x] 3.6 Implement category filter FLIP animations — removed cards fade+shrink, new cards stagger in, 500ms total transition
- [ ] 3.7 Implement featured card mouse parallax — thumbnail shifts ±8px opposite to mouse, 150ms spring lag
- [x] 3.8 Redesign `FeaturedBanner` — hero entrance animation, cinematic 900ms reveal, parallax depth on scroll
- [ ] 3.9 Update game grid layout — tighter spacing (16px gaps), consistent card sizes, minimal container padding

## 4. Authentication — Animated Auth Flow

- [x] 4.1 Redesign auth modal entrance — backdrop fade (250ms), card spring enter (opacity+translateY+scale, 400ms, overshoot)
- [x] 4.2 Implement staggered modal content reveal — title (0ms), form fields (80ms stagger), buttons (160ms), each opacity+translateY
- [x] 4.3 Implement fingerprint scanning animation — rotating ring (360°/1.5s), color pulse between muted and primary
- [x] 4.4 Implement fingerprint success animation — ring expand+fade (scale 1→1.5, opacity 1→0), checkmark spring bounce in
- [x] 4.5 Implement fingerprint fallback animation — ring shake (translateX oscillate), color to warning, tooltip fade in
- [x] 4.6 Implement form error animations — input shake (translateX 0→-5→5→-3→3→0, 350ms), border destructive, error message slide in
- [x] 4.7 Implement auth loading state transition — button text fade out, spinner fade in+rotate, constant button width
- [x] 4.8 Implement sign-up/sign-in toggle transition — current form slide out left (300ms), new form slide in from right
- [x] 4.9 Implement auth success to dashboard transition — modal animate out (opacity+scale), page entrance replay, success toast slide in

## 5. Runtime HUD — Execution Overlay & Telemetry

- [x] 5.1 Redesign FPS counter — top-right position, color-coded (green ≥40, yellow 30-39, red <30), update every 500ms
- [x] 5.2 Implement FPS history sparkline — 20 bars (250ms each), hover reveals graph with scaleY animation from 0
- [x] 5.3 Implement APK/EXE loading steps overlay — animated indicators, active steps pulse (opacity 0.5→1), completed steps checkmark scale in
- [x] 5.4 Implement loading progress bar — scaleX from 0→1, transform-origin left, primary accent color, smooth fill animation
- [x] 5.5 Implement step completion transitions — completed step fade to muted, new active step highlight (opacity 0.5→1, 200ms)
- [x] 5.6 Implement telemetry dashboard — CPU/memory/GPU bars with scaleX fill animation (300ms ease-out)
- [x] 5.7 Implement LIVE indicator pulse — opacity 0.6→1 with 1.2s cycle, blinking dot alongside
- [x] 5.8 Implement runtime control button animations — hover scale 1.1, icon bounce, press feedback
- [x] 5.9 Implement fullscreen transition — canvas container scale+translate to fill screen (400ms), UI chrome fade out
- [x] 5.10 Integrate performance monitor with animation engine — animation quality auto-degrades when FPS <30, recovers when FPS >45

## 6. Polish, QA & Performance

- [x] 6.1 Implement `prefers-reduced-motion` compliance — all animations disabled (0ms duration), opacity fades ≤100ms only, localStorage toggle in settings
- [x] 6.2 Implement GPU property whitelist enforcement — only transform/opacity/filter(brightness/contrast/saturate) animated, no width/height/top/left/margin/padding animation
- [x] 6.3 Implement `will-change` management — apply before animation, remove 1s after completion
- [ ] 6.4 Implement shared RAF scheduler — emulator gets priority, UI animations use manual `tick()` synchronized to display refresh
- [x] 6.5 Add error boundary with animated fallback — shake animation on error, smooth transition to error UI
- [ ] 6.6 Test on throttled CPU/GPU — verify animations degrade gracefully, no frame drops during gameplay
- [x] 6.7 Run full TypeScript typecheck — fix any type errors in new animation engine and components
- [ ] 6.8 Run production build — verify bundle size impact, tree-shaking of unused presets, no build errors
- [ ] 6.9 Visual regression testing — capture screenshots of key screens (home, library, auth modal, runtime HUD) before and after
- [x] 6.10 Update theme migration logic — if no stored preference, default to matte obsidian-coral on first visit, keep all 30+ themes available
