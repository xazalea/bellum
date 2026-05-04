import { spring } from 'animejs';

// ── Duration tokens ──
export const DURATIONS = {
  instant: 0,
  fast: 150,
  base: 300,
  reveal: 450,
  page: 600,
  cinematic: 900,
} as const;

// ── Easing tokens ──
export const EASINGS = {
  default: 'out(3)',
  out: 'out(3)',
  outExpo: 'outExpo',
  inOut: 'inOut(3)',
  inOutExpo: 'inOutExpo',
  linear: 'linear',
  spring: spring({ bounce: 0.25, stiffness: 200, damping: 12 }),
  springBouncy: spring({ bounce: 0.6, stiffness: 180, damping: 10 }),
  springGentle: spring({ bounce: 0.1, stiffness: 150, damping: 15 }),
  springSnappy: spring({ bounce: 0.35, stiffness: 280, damping: 14 }),
} as const;

// ── Animation quality levels ──
export type AnimationQuality = 'full' | 'reduced' | 'minimal';

export const QUALITY_CONFIG: Record<AnimationQuality, {
  useSpring: boolean;
  staggerDelay: number;
  maxParticles: number;
  useBlur: boolean;
  durationMultiplier: number;
}> = {
  full: {
    useSpring: true,
    staggerDelay: 60,
    maxParticles: 30,
    useBlur: true,
    durationMultiplier: 1,
  },
  reduced: {
    useSpring: false,
    staggerDelay: 20,
    maxParticles: 10,
    useBlur: false,
    durationMultiplier: 0.6,
  },
  minimal: {
    useSpring: false,
    staggerDelay: 0,
    maxParticles: 0,
    useBlur: false,
    durationMultiplier: 0,
  },
};

// ── GPU-safe animated properties whitelist ──
export const GPU_SAFE_PROPERTIES = new Set([
  'transform',
  'opacity',
  'filter',
  'scale',
  'scaleX',
  'scaleY',
  'translateX',
  'translateY',
  'translateZ',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
  'brightness',
  'contrast',
  'saturate',
]);

// ── Check if a property is GPU-safe ──
export function isGpuSafe(property: string): boolean {
  return GPU_SAFE_PROPERTIES.has(property);
}

// ── Apply quality multiplier to duration ──
export function applyQualityDuration(
  duration: number,
  quality: AnimationQuality,
): number {
  if (duration === 0) return 0;
  const config = QUALITY_CONFIG[quality];
  return Math.round(duration * config.durationMultiplier);
}

// ── Get easing for current quality ──
export function getQualityEasing(
  preferredEasing: typeof EASINGS[keyof typeof EASINGS],
  quality: AnimationQuality,
): typeof EASINGS[keyof typeof EASINGS] {
  if (quality === 'minimal') return 'linear';
  if (quality === 'reduced') {
    // Replace spring with out easing
    if (preferredEasing === EASINGS.spring || preferredEasing === EASINGS.springBouncy ||
        preferredEasing === EASINGS.springGentle || preferredEasing === EASINGS.springSnappy) {
      return EASINGS.out;
    }
  }
  return preferredEasing;
}
