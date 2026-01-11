/**
 * Nacho Proxy Service Worker
 * Handles CORS proxying and caching for game resources
 * Scratch-made for Nacho (not using v86, arsenic, or cherri)
 */

const CACHE_NAME = 'nacho-proxy-cache-v1';
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event
self.addEventListener('install', (event) => {
  console.log('[NachoProxy] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[NachoProxy] Activating service worker...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      cleanupOldCaches(),
    ])
  );
});

// Fetch event - intercept all requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept external requests (not same-origin)
  if (url.origin === self.location.origin) {
    return;
  }
  
  // Check if this is a Nacho proxy request
  const isNachoProxy = event.request.headers.get('X-Nacho-Proxy') === 'true';
  
  if (isNachoProxy || shouldProxy(url)) {
    event.respondWith(handleProxyRequest(event.request));
  }
});

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  const { type, id, urls } = event.data;
  
  switch (type) {
    case 'PRECACHE':
      handlePrecache(urls, id, event.source);
      break;
    case 'CLEAR_CACHE':
      handleClearCache(id, event.source);
      break;
    case 'GET_STATS':
      handleGetStats(id, event.source);
      break;
  }
});

/**
 * Determine if a URL should be proxied
 */
function shouldProxy(url) {
  // Proxy game distribution URLs
  if (url.hostname.includes('gamedistribution.com')) return true;
  if (url.hostname.includes('html5.gamedistribution.com')) return true;
  if (url.hostname.includes('img.gamedistribution.com')) return true;
  
  // Proxy common CDNs that might have CORS issues
  if (url.hostname.includes('cloudflare')) return true;
  if (url.hostname.includes('jsdelivr')) return true;
  
  return false;
}

/**
 * Handle a proxied fetch request
 */
async function handleProxyRequest(request) {
  const url = new URL(request.url);
  const cacheKey = request.url;
  
  try {
    // Check cache first
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(cacheKey);
    
    if (cached) {
      const cacheTime = cached.headers.get('X-Cache-Time');
      if (cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < CACHE_EXPIRY) {
          console.log('[NachoProxy] Cache hit:', url.href);
          return cached;
        }
      }
    }
    
    // Fetch with CORS handling
    console.log('[NachoProxy] Fetching:', url.href);
    const response = await fetchWithCorsHandling(request);
    
    // Cache successful responses
    if (response.ok) {
      await cacheResponse(cache, cacheKey, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[NachoProxy] Fetch failed:', url.href, error);
    
    // Try to return cached version even if expired
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(cacheKey);
    if (cached) {
      console.log('[NachoProxy] Returning stale cache:', url.href);
      return cached;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Failed to fetch resource', url: url.href }),
      {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Fetch with CORS handling strategies
 */
async function fetchWithCorsHandling(request) {
  const url = new URL(request.url);
  
  // Strategy 1: Try direct fetch with no-cors mode
  try {
    const response = await fetch(request, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
    });
    
    if (response.ok) {
      return addCorsHeaders(response);
    }
  } catch (e) {
    console.warn('[NachoProxy] CORS fetch failed, trying alternatives:', e.message);
  }
  
  // Strategy 2: Try with no-cors mode (opaque response)
  try {
    const response = await fetch(request, {
      mode: 'no-cors',
      credentials: 'omit',
      redirect: 'follow',
    });
    
    return addCorsHeaders(response);
  } catch (e) {
    console.warn('[NachoProxy] No-cors fetch failed:', e.message);
  }
  
  // Strategy 3: Try alternative CDN for common resources
  const alternatives = getAlternativeCDN(url.href);
  for (const altUrl of alternatives) {
    try {
      console.log('[NachoProxy] Trying alternative:', altUrl);
      const response = await fetch(altUrl, {
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (response.ok) {
        return addCorsHeaders(response);
      }
    } catch (e) {
      console.warn('[NachoProxy] Alternative failed:', altUrl);
    }
  }
  
  throw new Error('All fetch strategies failed');
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Cache a response with metadata
 */
async function cacheResponse(cache, key, response) {
  const headers = new Headers(response.headers);
  headers.set('X-Cache-Time', Date.now().toString());
  
  const cachedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  
  await cache.put(key, cachedResponse);
  
  // Check cache size and cleanup if needed
  await enforceMaxCacheSize();
}

/**
 * Get alternative CDN URLs for common resources
 */
function getAlternativeCDN(url) {
  const alternatives = [];
  
  // For jsdelivr, try unpkg
  if (url.includes('jsdelivr.net')) {
    alternatives.push(url.replace('jsdelivr.net', 'unpkg.com'));
  }
  
  // For unpkg, try jsdelivr
  if (url.includes('unpkg.com')) {
    alternatives.push(url.replace('unpkg.com', 'jsdelivr.net'));
  }
  
  return alternatives;
}

/**
 * Enforce maximum cache size
 */
async function enforceMaxCacheSize() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    if (keys.length === 0) return;
    
    // Estimate cache size (rough approximation)
    let totalSize = 0;
    const entries = [];
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        const size = blob.size;
        const cacheTime = parseInt(response.headers.get('X-Cache-Time') || '0', 10);
        
        totalSize += size;
        entries.push({ request, size, cacheTime });
      }
    }
    
    // If over limit, delete oldest entries
    if (totalSize > MAX_CACHE_SIZE) {
      entries.sort((a, b) => a.cacheTime - b.cacheTime);
      
      let removed = 0;
      for (const entry of entries) {
        await cache.delete(entry.request);
        removed += entry.size;
        
        if (totalSize - removed < MAX_CACHE_SIZE * 0.8) {
          break;
        }
      }
      
      console.log('[NachoProxy] Cleaned up cache:', removed, 'bytes');
    }
  } catch (error) {
    console.error('[NachoProxy] Cache cleanup failed:', error);
  }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames
      .filter(name => name.startsWith('nacho-proxy-') && name !== CACHE_NAME)
      .map(name => caches.delete(name))
  );
}

/**
 * Handle precache command
 */
async function handlePrecache(urls, id, source) {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (response.ok) {
          await cacheResponse(cache, url, response);
        }
      } catch (e) {
        console.warn('[NachoProxy] Precache failed for:', url);
      }
    }
    
    source.postMessage({ type: 'PRECACHE_COMPLETE', id, data: { success: true } });
  } catch (error) {
    source.postMessage({ type: 'PRECACHE_COMPLETE', id, data: { success: false, error: error.message } });
  }
}

/**
 * Handle clear cache command
 */
async function handleClearCache(id, source) {
  try {
    await caches.delete(CACHE_NAME);
    await caches.open(CACHE_NAME); // Recreate empty cache
    source.postMessage({ type: 'CLEAR_CACHE_COMPLETE', id, data: { success: true } });
  } catch (error) {
    source.postMessage({ type: 'CLEAR_CACHE_COMPLETE', id, data: { success: false, error: error.message } });
  }
}

/**
 * Handle get stats command
 */
async function handleGetStats(id, source) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    source.postMessage({
      type: 'GET_STATS_COMPLETE',
      id,
      data: { size: totalSize, entries: keys.length },
    });
  } catch (error) {
    source.postMessage({
      type: 'GET_STATS_COMPLETE',
      id,
      data: { size: 0, entries: 0 },
    });
  }
}
