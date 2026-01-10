/**
 * Embedded Proxy Runtime
 * Provides resource interception and proxying for standalone HTML exports
 */

/**
 * Generate Service Worker code for proxying external resources
 */
export function generateProxyServiceWorker(): string {
  return `
// Nacho Proxy Service Worker
const CACHE_NAME = 'nacho-proxy-v1';
const ALLOWED_ORIGINS = new Set();
const RESOURCE_CACHE = new Map();

// Install event
self.addEventListener('install', (event) => {
  console.log('[ProxySW] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ProxySW] Activating...');
  event.waitUntil(clients.claim());
});

// Fetch event - intercept all requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Don't intercept same-origin requests
  if (url.origin === location.origin) {
    return;
  }
  
  console.log('[ProxySW] Intercepting:', url.href);
  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  const cacheKey = request.url;
  
  // Check memory cache first
  if (RESOURCE_CACHE.has(cacheKey)) {
    console.log('[ProxySW] Serving from memory cache:', url.href);
    return RESOURCE_CACHE.get(cacheKey).clone();
  }
  
  // Try Cache API
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      console.log('[ProxySW] Serving from cache:', url.href);
      return cached;
    }
  } catch (e) {
    console.warn('[ProxySW] Cache access failed:', e);
  }
  
  // Try direct fetch with various strategies
  try {
    console.log('[ProxySW] Attempting direct fetch:', url.href);
    const response = await fetch(request, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow'
    });
    
    if (response.ok) {
      // Cache successful responses
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      } catch (e) {
        console.warn('[ProxySW] Failed to cache:', e);
      }
      
      return response;
    }
  } catch (e) {
    console.warn('[ProxySW] Direct fetch failed:', e.message);
  }
  
  // Try alternative CDNs for common libraries
  const alternatives = getAlternativeCDN(url.href);
  for (const altUrl of alternatives) {
    try {
      console.log('[ProxySW] Trying alternative CDN:', altUrl);
      const response = await fetch(altUrl, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        return response;
      }
    } catch (e) {
      console.warn('[ProxySW] Alternative CDN failed:', altUrl);
    }
  }
  
  // Return error response with helpful message
  console.error('[ProxySW] All fetch strategies failed for:', url.href);
  return new Response(
    \`// Resource blocked: \${url.href}
// This resource could not be loaded due to CORS or network restrictions.
// The app may not function correctly without it.
console.error('Blocked resource: \${url.href}');\`,
    {
      status: 502,
      statusText: 'Proxy Failed',
      headers: {
        'Content-Type': guessContentType(url.href),
        'X-Proxy-Error': 'All fetch strategies failed'
      }
    }
  );
}

function getAlternativeCDN(url) {
  const alternatives = [];
  
  // Common CDN alternatives
  const cdnMappings = [
    { from: 'cdn.jsdelivr.net', to: ['unpkg.com', 'cdnjs.cloudflare.com'] },
    { from: 'unpkg.com', to: ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'] },
    { from: 'cdnjs.cloudflare.com', to: ['unpkg.com', 'cdn.jsdelivr.net'] },
  ];
  
  for (const mapping of cdnMappings) {
    if (url.includes(mapping.from)) {
      for (const alt of mapping.to) {
        const altUrl = url.replace(mapping.from, alt);
        alternatives.push(altUrl);
      }
    }
  }
  
  return alternatives;
}

function guessContentType(url) {
  if (url.endsWith('.js')) return 'application/javascript';
  if (url.endsWith('.css')) return 'text/css';
  if (url.endsWith('.json')) return 'application/json';
  if (url.endsWith('.html')) return 'text/html';
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  if (url.endsWith('.gif')) return 'image/gif';
  if (url.endsWith('.svg')) return 'image/svg+xml';
  if (url.endsWith('.woff') || url.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}
`;
}

/**
 * Generate fetch interceptor for inline embedding
 */
export function generateFetchInterceptor(): string {
  return `
// Nacho Fetch Interceptor (Inline)
(function() {
  const originalFetch = window.fetch;
  const resourceCache = new Map();
  const failedResources = new Set();
  
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    
    // Check if already failed
    if (failedResources.has(url)) {
      console.warn('[Interceptor] Skipping previously failed resource:', url);
      return Promise.reject(new Error('Resource previously failed: ' + url));
    }
    
    // Check cache
    if (resourceCache.has(url)) {
      console.log('[Interceptor] Serving from cache:', url);
      return Promise.resolve(resourceCache.get(url).clone());
    }
    
    try {
      // Try original fetch
      const response = await originalFetch.call(window, input, init);
      
      if (response.ok) {
        // Cache successful responses
        const cloned = response.clone();
        resourceCache.set(url, cloned);
        return response;
      } else {
        console.warn('[Interceptor] Non-OK response:', url, response.status);
        failedResources.add(url);
        return response;
      }
    } catch (error) {
      console.error('[Interceptor] Fetch failed:', url, error.message);
      failedResources.add(url);
      
      // Try to provide fallback
      return createFallbackResponse(url, error);
    }
  };
  
  function createFallbackResponse(url, error) {
    const contentType = guessContentType(url);
    
    if (contentType === 'application/javascript') {
      return new Response(
        \`// Failed to load: \${url}\\nconsole.error('Resource unavailable: \${url}', '\${error.message}');\`,
        { status: 502, headers: { 'Content-Type': contentType } }
      );
    } else if (contentType === 'text/css') {
      return new Response(
        \`/* Failed to load: \${url} */\`,
        { status: 502, headers: { 'Content-Type': contentType } }
      );
    } else {
      return new Response(
        null,
        { status: 502, statusText: 'Proxy Failed', headers: { 'Content-Type': contentType } }
      );
    }
  }
  
  function guessContentType(url) {
    if (url.endsWith('.js')) return 'application/javascript';
    if (url.endsWith('.css')) return 'text/css';
    if (url.endsWith('.json')) return 'application/json';
    if (url.endsWith('.png')) return 'image/png';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }
  
  console.log('[Interceptor] Fetch interceptor installed');
})();
`;
}

/**
 * Generate full proxy runtime (Service Worker + Fetch Interceptor)
 */
export function generateFullProxyRuntime(): string {
  const sw = generateProxyServiceWorker();
  const interceptor = generateFetchInterceptor();
  
  return `
<script>
// Register Service Worker for proxying
if ('serviceWorker' in navigator) {
  // Create Service Worker from inline code
  const swCode = ${JSON.stringify(sw)};
  const swBlob = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(swBlob);
  
  navigator.serviceWorker.register(swUrl)
    .then(registration => {
      console.log('[Nacho] Service Worker registered for proxying');
      
      // Wait for SW to be active
      if (registration.active) {
        console.log('[Nacho] Service Worker already active');
      } else {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[Nacho] Service Worker activated');
            }
          });
        });
      }
    })
    .catch(error => {
      console.warn('[Nacho] Service Worker registration failed:', error);
      console.log('[Nacho] Falling back to fetch interceptor only');
    });
} else {
  console.warn('[Nacho] Service Worker not supported, using fetch interceptor only');
}

// Install fetch interceptor as backup
${interceptor}
</script>
`;
}

/**
 * Scan HTML content for external URLs
 */
export function scanForExternalURLs(html: string): string[] {
  const urls: string[] = [];
  const urlPatterns = [
    /src=["']https?:\/\/[^"']+["']/gi,
    /href=["']https?:\/\/[^"']+["']/gi,
    /url\(["']?https?:\/\/[^"')]+["']?\)/gi,
    /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  ];
  
  for (const pattern of urlPatterns) {
    const matches = html.match(pattern) || [];
    for (const match of matches) {
      const url = match.match(/https?:\/\/[^\s<>"'{}|\\^`\[\]()]+/)?.[0];
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    }
  }
  
  return urls;
}

/**
 * Download and encode resource as data URL
 */
export async function downloadAndEncodeResource(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    // Determine MIME type
    const contentType = response.headers.get('content-type') || guessMimeType(url);
    
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.warn(`Failed to download resource: ${url}`, e);
    return null;
  }
}

function guessMimeType(url: string): string {
  if (url.endsWith('.js')) return 'application/javascript';
  if (url.endsWith('.css')) return 'text/css';
  if (url.endsWith('.json')) return 'application/json';
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  if (url.endsWith('.gif')) return 'image/gif';
  if (url.endsWith('.svg')) return 'image/svg+xml';
  if (url.endsWith('.woff')) return 'font/woff';
  if (url.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}
