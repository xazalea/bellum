'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

const DEFAULT_SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',
  screenReaderMode: false,
  keyboardNavigation: true,
  focusIndicators: true,
};

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    // Load from localStorage
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }

    // Check system preferences
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: more)').matches;

    return {
      ...DEFAULT_SETTINGS,
      reducedMotion,
      highContrast,
    };
  });

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion
    root.classList.toggle('reduce-motion', settings.reducedMotion);

    // High contrast
    root.classList.toggle('high-contrast', settings.highContrast);

    // Font size
    root.setAttribute('data-font-size', settings.fontSize);

    // Screen reader mode
    root.classList.toggle('screen-reader-mode', settings.screenReaderMode);

    // Focus indicators
    root.classList.toggle('enhanced-focus', settings.focusIndicators);

    // Save to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  // Listen for system preference changes
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleReducedMotion = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrast = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotion);
    highContrastQuery.addEventListener('change', handleHighContrast);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotion);
      highContrastQuery.removeEventListener('change', handleHighContrast);
    };
  }, []);

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Screen reader announcement
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const announcer = document.getElementById('sr-announcer');
      if (announcer) {
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = message;
        setTimeout(() => {
          announcer.textContent = '';
        }, 1000);
      }
    },
    []
  );

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting, announce }}>
      {/* Screen reader announcer */}
      <div
        id="sr-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// Accessibility Settings Panel Component
export function AccessibilitySettingsPanel({ className = '' }: { className?: string }) {
  const { settings, updateSetting } = useAccessibility();

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-6">Accessibility Settings</h3>

      <div className="space-y-6">
        {/* Reduced Motion */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="reduced-motion" className="text-sm font-medium text-white">
              Reduced Motion
            </label>
            <p className="text-xs text-gray-500">
              Minimize animations and transitions
            </p>
          </div>
          <button
            id="reduced-motion"
            onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={settings.reducedMotion}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.reducedMotion ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="high-contrast" className="text-sm font-medium text-white">
              High Contrast
            </label>
            <p className="text-xs text-gray-500">
              Increase contrast for better visibility
            </p>
          </div>
          <button
            id="high-contrast"
            onClick={() => updateSetting('highContrast', !settings.highContrast)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.highContrast ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={settings.highContrast}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.highContrast ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Font Size */}
        <div>
          <label htmlFor="font-size" className="text-sm font-medium text-white block mb-2">
            Font Size
          </label>
          <select
            id="font-size"
            value={settings.fontSize}
            onChange={(e) =>
              updateSetting('fontSize', e.target.value as 'small' | 'medium' | 'large')
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        {/* Screen Reader Mode */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="screen-reader" className="text-sm font-medium text-white">
              Screen Reader Mode
            </label>
            <p className="text-xs text-gray-500">
              Optimize for screen readers
            </p>
          </div>
          <button
            id="screen-reader"
            onClick={() => updateSetting('screenReaderMode', !settings.screenReaderMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.screenReaderMode ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={settings.screenReaderMode}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.screenReaderMode ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Enhanced Focus Indicators */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="focus-indicators" className="text-sm font-medium text-white">
              Enhanced Focus Indicators
            </label>
            <p className="text-xs text-gray-500">
              Show more visible focus outlines
            </p>
          </div>
          <button
            id="focus-indicators"
            onClick={() => updateSetting('focusIndicators', !settings.focusIndicators)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.focusIndicators ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={settings.focusIndicators}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.focusIndicators ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Keyboard Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="keyboard-nav" className="text-sm font-medium text-white">
              Keyboard Navigation
            </label>
            <p className="text-xs text-gray-500">
              Enable enhanced keyboard navigation
            </p>
          </div>
          <button
            id="keyboard-nav"
            onClick={() => updateSetting('keyboardNavigation', !settings.keyboardNavigation)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.keyboardNavigation ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={settings.keyboardNavigation}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.keyboardNavigation ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// Skip to Content Link Component
export function SkipToContent({ targetId = 'main-content' }: { targetId?: string }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}

// Focus Trap Component for Modals
export function FocusTrap({ children }: { children: React.ReactNode }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [children]);

  return (
    <div ref={containerRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}

// Keyboard Navigation Hook
export function useKeyboardNavigation(
  items: Array<{ id: string; element: HTMLElement | null }>,
  onSelect?: (id: string) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && items[focusedIndex]) {
            onSelect?.(items[focusedIndex].id);
          }
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, onSelect]);

  useEffect(() => {
    if (focusedIndex >= 0 && items[focusedIndex]?.element) {
      items[focusedIndex].element?.focus();
    }
  }, [focusedIndex, items]);

  return { focusedIndex, setFocusedIndex };
}

export default AccessibilityProvider;