// ── Anime.js core ──
export {
  animate,
  createScope,
  createTimeline,
  stagger,
  spring,
} from 'animejs';

export type {
  Scope,
  Timeline,
} from 'animejs';

// ── Tokens ──
export {
  DURATIONS,
  EASINGS,
  QUALITY_CONFIG,
  GPU_SAFE_PROPERTIES,
  isGpuSafe,
  applyQualityDuration,
  getQualityEasing,
} from './tokens';

export type {
  AnimationQuality,
} from './tokens';

// ── Performance Monitor ──
export {
  PerformanceMonitor,
  getGlobalPerformanceMonitor,
  destroyGlobalPerformanceMonitor,
} from './PerformanceMonitor';

// ── Engine ──
export {
  safeAnimate,
  presets,
  addWillChange,
  removeWillChange,
  staggerDefault,
  staggerGrid,
  counterAnimate,
} from './engine';

// ── Hooks ──
export {
  useAnimeScope,
  useAnime,
  useAnimeTimeline,
  useAnimationQuality,
  useReducedMotion,
  useFps,
  useScrollReveal,
  usePageTransition,
  useHoverAnime,
  mountReveal,
  mountFadeIn,
  staggerDefault as staggerLegacy,
  staggerFromStart,
  hoverLift,
  hoverDrop,
  scaleIn,
  slideInLeft,
  borderPulse,
  counterAnimate as counterAnimateLegacy,
  ease,
  dur,
} from './hooks';
