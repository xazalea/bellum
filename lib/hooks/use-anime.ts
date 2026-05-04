'use client';

// ── Backward-compatible re-exports ──
// All consumers import from @/lib/hooks/use-anime. This file re-exports
// the canonical animation system so we maintain a single source of truth.

export {
  // Core anime.js
  animate,
  createScope,
  createTimeline,
  stagger,
  spring,

  // Engine
  safeAnimate,
  presets,
  DURATIONS,
  EASINGS,

  // Hooks
  useAnimeScope,
  useAnime,
  useAnimeTimeline,
  useAnimationQuality,
  useReducedMotion,
  useFps,
  useScrollReveal,
  usePageTransition,
  useHoverAnime,

  // Legacy helpers (kept for compatibility)
  mountReveal,
  mountFadeIn,
  staggerDefault,
  staggerFromStart,
  hoverLift,
  hoverDrop,
  scaleIn,
  slideInLeft,
  borderPulse,
  counterAnimate,

  // Token aliases
  ease,
  dur,
} from '@/lib/animation/hooks';

export type {
  Scope,
  Timeline,
  AnimationQuality,
} from '@/lib/animation/hooks';
