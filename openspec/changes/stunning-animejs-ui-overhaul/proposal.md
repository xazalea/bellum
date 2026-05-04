## Why

Bellum's current UI, while functional, lacks the visual polish and production-grade experience expected by modern gamers. Competing platforms like GeForce NOW, Steam, and Xbox Cloud Gaming set a high bar with fluid animations, cinematic transitions, and polished micro-interactions. This proposal establishes a comprehensive UI overhaul leveraging **anime.js v4** to deliver stunning, performant animations while adopting a **minimal, modern, matte** aesthetic that signals premium quality. The timing is critical: as we scale APK/EXE execution to 40+ FPS, the surrounding chrome must feel equally responsive and polished.

## What Changes

- **Complete visual redesign** with anime.js v4 as the primary animation engine, replacing ad-hoc CSS animations and Framer Motion for layout transitions
- **Matte, minimal aesthetic system** — softer color palette (muted warm grays, restrained coral accent), reduced border radii, subtler shadows, and precise typography hierarchy
- **Cinematic page transitions** — every route change animates with choreographed entrance/exit sequences using anime.js timelines
- **Micro-interaction system** — hover states, button presses, card lifts, and loading states all use spring physics via anime.js for tactile feedback
- **Game library presentation overhaul** — game cards get staggered reveal animations, parallax thumbnails, and smooth scale transitions on hover
- **Auth flow polish** — fingerprint + username modal gets animated entrance, progress indicators, and error shake animations
- **Runtime execution UI** — APK/EXE loading states, FPS overlay, and runtime controls redesigned with real-time telemetry animations
- **Performance-observed animations** — all anime.js animations respect `prefers-reduced-motion` and bail out when FPS drops below 30
- **BREAKING**: Remove dependency on Framer Motion for layout animations (keep for AnimatePresence only); migrate all time-based motion to anime.js
- **BREAKING**: Deprecate the `challenger-gold` theme as default; replace with `obsidian-coral` matte default

## Capabilities

### New Capabilities
- `animejs-animation-engine`: Centralized anime.js integration with reusable animation presets, timelines, and scope management
- `matte-design-system`: Complete design token system for matte aesthetic including colors, shadows, spacing, and typography
- `cinematic-page-transitions`: Route-level enter/exit animation orchestration using anime.js timelines
- `micro-interaction-system`: Reusable hover, press, focus, and loading interaction primitives
- `game-card-theater`: Enhanced game card presentation with anime.js-driven staggered reveals and parallax
- `auth-flow-animations`: Animated authentication modal flows with progress and error states
- `runtime-hud`: Redesigned heads-up display for APK/EXE execution with real-time FPS and telemetry
- `performance-conscious-motion`: Animation quality degradation system tied to runtime FPS

### Modified Capabilities
- *(none — this is a pure UI/UX enhancement with no spec-level requirement changes to existing capabilities)*

## Impact

- **Frontend**: All React components using Framer Motion for layout animations (`page.tsx`, `game-card.tsx`, `header.tsx`, `sidebar.tsx`, `signup-modal.tsx`, `featured-banner.tsx`)
- **Styling**: `globals.css` — new matte palette variables, reduced animation keyframes, anime.js utility classes
- **Tailwind Config**: `tailwind.config.ts` — updated theme tokens, new animation utilities
- **Dependencies**: Add `animejs@^4.3.6` (already present), remove `framer-motion` usage from layout transitions
- **Auth**: `auth-context.tsx`, `auth-provider.tsx`, `signup-modal.tsx` — animated state transitions
- **Game runtime**: `engine.ts`, `hypervisor.ts`, `run` page — new HUD overlay and telemetry presentation
- **Build**: No breaking changes to build pipeline; anime.js is already in `package.json`
