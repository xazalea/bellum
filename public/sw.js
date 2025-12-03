/**
 * Service Worker - Handles asset caching and offline support
 * Implements cache-first strategy for optimal performance
 */

const CACHE_NAME = 'bellum-v1';
const RUNTIME_CACHE = 'bellum-runtime-v1';
const STATIC_CACHE = 'bellum-static-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/v86/v86.wasm',
  '/v86/bios/seabios.bin',
  '/v86/bios/vgabios.bin',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache some static assets:', err);
      });
    })
  );
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

// On-Demand Materialization:
// Intercept requests for heavy assets and generate/stream them if needed.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Materialization API
  if (url.pathname.startsWith('/_nacho/materialize/')) {
      event.respondWith(handleMaterialization(event.request));
      return;
  }
  
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
  } else {
    // Other requests - stale-while-revalidate
    // Use network first for API to ensure fresh data
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, RUNTIME_CACHE));
    } else {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    }
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
    // Return error response instead of throwing to prevent "Failed to convert value to Response"
    return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first strategy
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
        if (cached) return cached;
        return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * Stale-while-revalidate
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(e => {
      console.warn('Fetch failed in background', e);
      // Return a 503 response if background fetch fails, so we don't return undefined
      return new Response('Background fetch failed', { status: 503 });
  });

  return cached || fetchPromise;
}

/**
 * Handle On-Demand Materialization
 * Generates resources via ServiceWorker compute instead of fetching from server
 */
async function handleMaterialization(request) {
    const url = new URL(request.url);
    
    // Mock generation logic
    // In a real scenario, this would use WASM or JS logic to generate textures/geometry
    // "Materializing" a requested asset from procedural rules.
    
    const data = new Float32Array(1024 * 1024); // 1MB dummy data
    for(let i=0; i<data.length; i++) data[i] = Math.random();
    
    // Return as a binary stream
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const response = new Response(blob, {
        headers: {
            'X-Nacho-Materialized': 'true',
            'Cache-Control': 'public, max-age=3600'
        }
    });
    
    return response;
}
