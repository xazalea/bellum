/**
 * Service Worker for Bellum Platform
 * Provides offline support, caching, and background sync
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `bellum-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bellum-dynamic-${CACHE_VERSION}`;
const GAMES_CACHE = `bellum-games-${CACHE_VERSION}`;
const CODE_CACHE = `bellum-code-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add critical CSS and JS
];

// Cache size limits
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 100 * 1024 * 1024, // 100MB
  [GAMES_CACHE]: 500 * 1024 * 1024,   // 500MB
  [CODE_CACHE]: 200 * 1024 * 1024,    // 200MB
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !name.includes(CACHE_VERSION))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Determine cache strategy based on request type
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isGameAsset(url)) {
    event.respondWith(cacheFirst(request, GAMES_CACHE));
  } else if (isCodeAsset(url)) {
    event.respondWith(cacheFirst(request, CODE_CACHE));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-library') {
    event.waitUntil(syncLibrary());
  } else if (event.tag === 'sync-settings') {
    event.waitUntil(syncSettings());
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'CACHE_GAME':
      event.waitUntil(cacheGame(payload));
      break;
    case 'CACHE_CODE':
      event.waitUntil(cacheCode(payload));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload));
      break;
    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then((size) => {
        event.ports[0]?.postMessage({ size });
      }));
      break;
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Bellum', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.data,
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Focus existing window or open new one
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
  );
});

// Helper functions

function isStaticAsset(url) {
  return url.pathname.match(/\.(html|css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/i);
}

function isGameAsset(url) {
  return url.pathname.startsWith('/games/') || 
         url.pathname.includes('/game-assets/');
}

function isCodeAsset(url) {
  return url.pathname.match(/\.(apk|exe|wasm)$/i) ||
         url.pathname.startsWith('/compiled/');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await enforceCacheLimit(cacheName);
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

// Enforce cache size limits
async function enforceCacheLimit(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;
  
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  let totalSize = 0;
  const entries = [];
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const size = parseInt(response.headers.get('content-length') || '0');
      entries.push({ request, size, date: response.headers.get('date') });
      totalSize += size;
    }
  }
  
  if (totalSize > limit) {
    // Sort by date (oldest first)
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Remove oldest entries until under limit
    for (const entry of entries) {
      if (totalSize <= limit * 0.9) break;
      await cache.delete(entry.request);
      totalSize -= entry.size;
    }
  }
}

// Cache a game
async function cacheGame(gameId) {
  const cache = await caches.open(GAMES_CACHE);
  const gameUrl = `/api/games/${gameId}`;
  
  try {
    const response = await fetch(gameUrl);
    if (response.ok) {
      await cache.put(gameUrl, response.clone());
    }
  } catch (error) {
    console.error('[SW] Failed to cache game:', error);
  }
}

// Cache compiled code
async function cacheCode(codeId) {
  const cache = await caches.open(CODE_CACHE);
  const codeUrl = `/compiled/${codeId}`;
  
  try {
    const response = await fetch(codeUrl);
    if (response.ok) {
      await cache.put(codeUrl, response.clone());
    }
  } catch (error) {
    console.error('[SW] Failed to cache code:', error);
  }
}

// Clear cache
async function clearCache(cacheType) {
  if (cacheType === 'all') {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  } else if (cacheType === 'games') {
    await caches.delete(GAMES_CACHE);
  } else if (cacheType === 'code') {
    await caches.delete(CODE_CACHE);
  } else if (cacheType === 'dynamic') {
    await caches.delete(DYNAMIC_CACHE);
  }
}

// Get total cache size
async function getCacheSize() {
  const names = await caches.keys();
  let totalSize = 0;
  
  for (const name of names) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const size = parseInt(response.headers.get('content-length') || '0');
        totalSize += size;
      }
    }
  }
  
  return totalSize;
}

// Sync library
async function syncLibrary() {
  try {
    const response = await fetch('/api/library/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync: true }),
    });
    
    if (response.ok) {
      console.log('[SW] Library synced successfully');
    }
  } catch (error) {
    console.error('[SW] Library sync failed:', error);
  }
}

// Sync settings
async function syncSettings() {
  try {
    const response = await fetch('/api/settings/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync: true }),
    });
    
    if (response.ok) {
      console.log('[SW] Settings synced successfully');
    }
  } catch (error) {
    console.error('[SW] Settings sync failed:', error);
  }
}

console.log('[SW] Service worker loaded');