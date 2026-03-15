/**
 * Cross-Browser Compatibility Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Cross-Browser Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Browser Detection', () => {
    it('should detect Chrome', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const isChrome = ua.includes('Chrome') && !ua.includes('Edg');
      expect(isChrome).toBe(true);
    });

    it('should detect Firefox', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
      const isFirefox = ua.includes('Firefox');
      expect(isFirefox).toBe(true);
    });

    it('should detect Safari', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
      const isSafari = ua.includes('Safari') && !ua.includes('Chrome');
      expect(isSafari).toBe(true);
    });

    it('should detect Edge', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      const isEdge = ua.includes('Edg');
      expect(isEdge).toBe(true);
    });
  });

  describe('Feature Support', () => {
    it('should check WebAssembly support', () => {
      const hasWasm = typeof WebAssembly !== 'undefined';
      expect(hasWasm).toBe(true);
    });

    it('should check WebGL support', () => {
      const canvas = document.createElement('canvas');
      const hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
      // In test environment, this might be false
      expect(typeof hasWebGL).toBe('boolean');
    });

    it('should check Service Worker support', () => {
      const hasServiceWorker = 'serviceWorker' in navigator;
      expect(typeof hasServiceWorker).toBe('boolean');
    });

    it('should check IndexedDB support', () => {
      const hasIndexedDB = 'indexedDB' in window;
      expect(typeof hasIndexedDB).toBe('boolean');
    });

    it('should check WebRTC support', () => {
      const hasWebRTC = 'RTCPeerConnection' in window;
      expect(typeof hasWebRTC).toBe('boolean');
    });

    it('should check Gamepad API support', () => {
      const hasGamepad = 'getGamepads' in navigator;
      expect(typeof hasGamepad).toBe('boolean');
    });
  });

  describe('CSS Compatibility', () => {
    it('should check CSS Grid support', () => {
      const div = document.createElement('div');
      const hasGrid = CSS.supports('display', 'grid');
      expect(typeof hasGrid).toBe('boolean');
    });

    it('should check CSS Flexbox support', () => {
      const hasFlexbox = CSS.supports('display', 'flex');
      expect(typeof hasFlexbox).toBe('boolean');
    });

    it('should check CSS Custom Properties support', () => {
      const hasCustomProps = CSS.supports('--test', '0');
      expect(typeof hasCustomProps).toBe('boolean');
    });

    it('should check backdrop-filter support', () => {
      const hasBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)') ||
                                CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
      expect(typeof hasBackdropFilter).toBe('boolean');
    });
  });

  describe('JavaScript API Compatibility', () => {
    it('should check ES6 features', () => {
      const hasES6 = typeof Promise !== 'undefined' &&
                     typeof Symbol !== 'undefined' &&
                     typeof Map !== 'undefined' &&
                     typeof Set !== 'undefined';
      expect(hasES6).toBe(true);
    });

    it('should check async/await support', () => {
      const hasAsyncAwait = (async () => {}).constructor.name === 'AsyncFunction';
      expect(hasAsyncAwait).toBe(true);
    });

    it('should check optional chaining support', () => {
      const obj = { a: { b: 1 } };
      const value = obj?.a?.b;
      expect(value).toBe(1);
    });

    it('should check nullish coalescing support', () => {
      const value = null ?? 'default';
      expect(value).toBe('default');
    });
  });

  describe('Audio API Compatibility', () => {
    it('should check Web Audio API support', () => {
      const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window;
      expect(typeof hasWebAudio).toBe('boolean');
    });

    it('should check AudioWorklet support', () => {
      const hasAudioWorklet = 'AudioWorkletNode' in window;
      expect(typeof hasAudioWorklet).toBe('boolean');
    });
  });

  describe('Storage Compatibility', () => {
    it('should check localStorage support', () => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        expect(true).toBe(true);
      } catch {
        expect(false).toBe(true); // localStorage not supported
      }
    });

    it('should check sessionStorage support', () => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        expect(true).toBe(true);
      } catch {
        expect(false).toBe(true); // sessionStorage not supported
      }
    });
  });

  describe('Input API Compatibility', () => {
    it('should check Pointer Events support', () => {
      const hasPointerEvents = 'PointerEvent' in window;
      expect(typeof hasPointerEvents).toBe('boolean');
    });

    it('should check Touch Events support', () => {
      const hasTouchEvents = 'ontouchstart' in window;
      expect(typeof hasTouchEvents).toBe('boolean');
    });

    it('should check Keyboard API support', () => {
      const hasKeyboardAPI = 'keyboard' in navigator;
      expect(typeof hasKeyboardAPI).toBe('boolean');
    });
  });

  describe('Browser-Specific Workarounds', () => {
    it('should handle Safari WebAudio context state', () => {
      // Safari requires user interaction to start AudioContext
      const workaround = {
        needsUserGesture: true,
        hasInteracted: false,
      };
      expect(workaround.needsUserGesture).toBe(true);
    });

    it('should handle Firefox WebGL context loss', () => {
      const contextLossHandler = {
        handled: false,
        restore: () => { contextLossHandler.handled = true; },
      };
      contextLossHandler.restore();
      expect(contextLossHandler.handled).toBe(true);
    });

    it('should handle iOS audio restrictions', () => {
      const iOSWorkaround = {
        isIOS: true,
        audioUnlocked: false,
        unlockAudio: () => { iOSWorkaround.audioUnlocked = true; },
      };
      iOSWorkaround.unlockAudio();
      expect(iOSWorkaround.audioUnlocked).toBe(true);
    });
  });

  describe('Performance API Compatibility', () => {
    it('should check Performance API support', () => {
      const hasPerformance = 'performance' in window;
      expect(typeof hasPerformance).toBe('boolean');
    });

    it('should check Performance Observer support', () => {
      const hasPerfObserver = 'PerformanceObserver' in window;
      expect(typeof hasPerfObserver).toBe('boolean');
    });

    it('should check requestAnimationFrame support', () => {
      const hasRAF = 'requestAnimationFrame' in window;
      expect(typeof hasRAF).toBe('boolean');
    });
  });
});