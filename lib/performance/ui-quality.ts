import { adaptivePerformance, type AdaptiveConfig } from './adaptive';

export type UiQualityLevel = 'high' | 'balanced' | 'low';

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function computeUiQualityLevel(cfg: AdaptiveConfig): UiQualityLevel {
  // Use adaptive knobs as a proxy for “device is struggling”.
  // Lower render resolution or enabled frame skipping implies a low-quality state.
  if (cfg.frameSkip > 0 || cfg.renderResolution <= 0.7 || cfg.textureScale <= 0.7) return 'low';
  if (cfg.renderResolution <= 0.9 || cfg.textureScale <= 0.9) return 'balanced';
  return 'high';
}

export function applyUiQualityToDom(level: UiQualityLevel) {
  document.documentElement.dataset.perf = level;

  // Fog can be auto-managed unless the user explicitly set it.
  const fogUser = readLocalStorage('bellum.fog'); // 'on' | 'off' | null
  if (fogUser === null) {
    document.documentElement.dataset.fog = level === 'low' ? 'off' : 'on';
  }

  // Motion can be auto-managed unless the user explicitly set it.
  const motionUser = readLocalStorage('bellum.motion'); // 'auto' | 'reduced' | 'full' | null
  if (motionUser === null || motionUser === 'auto') {
    document.documentElement.dataset.motion = level === 'low' ? 'reduced' : 'auto';
  }
}

export function startUiQualityBrain(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Initialize baseline attributes early.
  if (!document.documentElement.dataset.fog) document.documentElement.dataset.fog = 'on';
  if (!document.documentElement.dataset.motion) document.documentElement.dataset.motion = 'auto';
  if (!document.documentElement.dataset.perf) document.documentElement.dataset.perf = 'high';

  const qualityMode = readLocalStorage('bellum.quality'); // 'auto' | 'pinned' | null
  const isPinned = qualityMode === 'pinned';

  if (adaptivePerformance && !isPinned) {
    const onCfg = (cfg: AdaptiveConfig) => {
      const level = computeUiQualityLevel(cfg);
      applyUiQualityToDom(level);
    };
    adaptivePerformance.onConfigChange(onCfg);
    // Apply immediately using current config.
    onCfg(adaptivePerformance.getConfig());
    return () => adaptivePerformance?.offConfigChange(onCfg);
  }

  // Pinned: keep current attributes and ensure explicit user settings exist.
  if (readLocalStorage('bellum.fog') === null) writeLocalStorage('bellum.fog', 'on');
  if (readLocalStorage('bellum.motion') === null) writeLocalStorage('bellum.motion', 'auto');
  return () => {};
}




