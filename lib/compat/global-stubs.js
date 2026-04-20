/**
 * Browser global stubs for edge/SSR webpack builds.
 *
 * ALL edge routes share a single webpack chunk.  Webpack's own runtime
 * code references `document` and `self` (e.g. `document.baseURI ||
 * self.location.href`), and some transitive dependencies reference
 * `document` / `window` at module level.  Without these stubs, the
 * build crashes with `ReferenceError: document is not defined`.
 *
 * The stubs are safe: code that actually needs a real DOM won't work on
 * edge runtime regardless, but module-level references won't crash the build.
 */
if (typeof self === 'undefined') {
  // `self` is the Web Worker global scope reference, used by webpack runtime.
  // Must be defined before `document` so webpack's `document.baseURI || self.location.href`
  // doesn't throw on `self` after falling through from `document.baseURI`.
  var self = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  self.location = self.location || { href: '', protocol: 'https:', hostname: 'localhost', pathname: '/' };
}

if (typeof document === 'undefined') {
  var _stubEl = function () {
    return {
      style: { setProperty() {}, removeProperty() { return ''; }, cssText: '' },
      appendChild() { return {}; },
      removeChild() { return {}; },
      getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; },
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {},
      getAttribute() { return null; },
      addEventListener() {},
      removeEventListener() {},
      innerHTML: '',
      textContent: '',
      remove() {},
      getContext() { return null; },
      width: 0,
      height: 0,
      offsetWidth: 0,
      offsetHeight: 0,
    };
  };

  var document = {
    baseURI: '',
    createElement: _stubEl,
    createEvent() { return { initEvent() {} }; },
    body: { appendChild() { return {}; }, removeChild() { return {}; }, style: {} },
    head: { appendChild() { return {}; }, removeChild() { return {}; } },
    documentElement: { style: {}, requestFullscreen() { return Promise.resolve(); } },
    hidden: false,
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return { length: 0, item() { return null; } }; },
    addEventListener() {},
    removeEventListener() {},
    fullscreenElement: null,
    exitFullscreen() { return Promise.resolve(); },
    location: { protocol: 'https:', href: '', hostname: 'localhost', pathname: '/' },
    cookie: '',
    title: '',
    readyState: 'complete',
    domain: '',
    referrer: '',
    URL: '',
    documentMode: 0,
    implementation: { createHTMLDocument() { return document; } },
  };
}

if (typeof window === 'undefined') {
  var window = {
    addEventListener() {},
    removeEventListener() {},
    location: { href: '', protocol: 'https:', hostname: 'localhost', pathname: '/' },
    screen: { width: 1920, height: 1080 },
    innerWidth: 1920,
    innerHeight: 1080,
    performance: { now() { return Date.now(); }, memory: {} },
    matchMedia() { return { matches: false, addListener() {}, removeListener() {} }; },
    navigator: {
      userAgent: '',
      language: 'en-US',
      platform: '',
      deviceMemory: 0,
      hardwareConcurrency: 1,
      maxTouchPoints: 0,
      plugins: { length: 0 },
      cookieEnabled: true,
      mediaDevices: { enumerateDevices() { return Promise.resolve([]); } },
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout: typeof setTimeout !== 'undefined' ? setTimeout : undefined,
    clearTimeout: typeof clearTimeout !== 'undefined' ? clearTimeout : undefined,
    setInterval: typeof setInterval !== 'undefined' ? setInterval : undefined,
    clearInterval: typeof clearInterval !== 'undefined' ? clearInterval : undefined,
    crypto: typeof crypto !== 'undefined' ? crypto : {
      getRandomValues(arr) { for (var i = 0; i < arr.length; i++) arr[i] = Math.random() * 256 | 0; return arr; },
      randomUUID() { return '00000000-0000-4000-8000-000000000000'; },
    },
  };
}

if (typeof navigator === 'undefined') {
  var navigator = window.navigator;
}
