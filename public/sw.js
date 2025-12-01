/**
 * Service Worker - Handles asset caching and offline support
 * Implements cache-first strategy for optimal performance
 */

const CACHE_NAME = 'bellum-v1';
const RUNTIME_CACHE = 'bellum-runtime-v1';
const STATIC_CACHE = 'bellum-static-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/v86/v86.wasm',
  '/v86/bios/seabios.bin',
  '/v86/bios/vgabios.bin',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache some static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== STATIC_CACHE && name !== RUNTIME_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (unless they're our CDN)
  if (url.origin !== self.location.origin && !url.hostname.includes('github.com')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/v86/') || url.pathname.endsWith('.wasm')) {
    // WASM and BIOS files - cache forever
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Next.js static assets - cache forever
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.pathname.includes('/releases/download/')) {
    // GitHub releases - cache for a long time
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  } else if (url.pathname.startsWith('/api/')) {
    // API requests - network first
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
  } else {
    // Other requests - stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

/**
 * Cache-first strategy - check cache, then network
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

/**
 * Network-first strategy - try network, fallback to cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate - return cache immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Update cache in background
  fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    })
    .catch(() => {
      // Ignore errors
    });

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    throw error;
  }
}
