export const runtime = "edge";
import { NextRequest, NextResponse } from 'next/server';

// Use edge runtime for Cloudflare compatibility

export const dynamic = 'force-dynamic';

// Allowed game domains - security whitelist
const ALLOWED_DOMAINS = [
  'html5.gamedistribution.com',
  'gamedistribution.com',
  'img.gamedistribution.com',
  'poki.com',
  'crazygames.com',
  'gamepix.com',
  'y8.com',
  'kongregate.com',
  'itch.io',
  'github.io',
  'gitlab.io',
  'netlify.app',
  'vercel.app',
  'pages.dev',
  'surge.sh',
  'firebaseapp.com',
  'web.app',
];

/**
 * Validate if a URL is from an allowed domain
 */
function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain => 
      parsed.hostname === domain || 
      parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Game Proxy Endpoint
 * Bypasses iframe detection by proxying game content server-side
 * and modifying headers/scripts that prevent embedding
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const gameUrl = searchParams.get('url');
    
    if (!gameUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(gameUrl);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Security check - only allow http/https
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTP/HTTPS URLs allowed' },
        { status: 400 }
      );
    }

    console.log('[GameProxy] Fetching:', parsedUrl.hostname);

    // Fetch with timeout and retry logic
    const fetchWithRetry = async (retries = 2): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      try {
        const response = await fetch(gameUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': parsedUrl.origin,
            'Origin': parsedUrl.origin,
          },
        });
        clearTimeout(timeout);
        return response;
      } catch (error) {
        clearTimeout(timeout);
        if (retries > 0) {
          console.log(`[GameProxy] Retry ${3 - retries} for ${parsedUrl.hostname}`);
          await new Promise(r => setTimeout(r, 1000));
          return fetchWithRetry(retries - 1);
        }
        throw error;
      }
    };

    const response = await fetchWithRetry();

    if (!response.ok) {
      console.error('[GameProxy] HTTP error:', response.status, parsedUrl.hostname);
      return NextResponse.json(
        { error: 'Failed to fetch game', status: response.status, url: parsedUrl.hostname },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If it's HTML, modify it to bypass iframe detection
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Limit HTML size to prevent memory issues
      if (html.length > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { error: 'Game content too large' },
          { status: 413 }
        );
      }
      
      // Remove/modify iframe detection scripts - comprehensive patterns
      const antiFramePatterns = [
        { pattern: /if\s*\(\s*(?:window\.)?(?:self|top)\s*!==?\s*(?:window\.)?(?:top|self)\s*\)/gi, replacement: 'if(false)' },
        { pattern: /if\s*\(\s*(?:window\.)?(?:top|self)\s*===?\s*(?:window\.)?(?:self|top)\s*\)/gi, replacement: 'if(true)' },
        { pattern: /window\.top\s*!==?\s*window\.self/gi, replacement: 'false' },
        { pattern: /window\.self\s*!==?\s*window\.top/gi, replacement: 'false' },
        { pattern: /top\s*!==?\s*self/gi, replacement: 'false' },
        { pattern: /self\s*!==?\s*top/gi, replacement: 'false' },
        { pattern: /parent\s*!==?\s*window/gi, replacement: 'false' },
        { pattern: /window\s*!==?\s*parent/gi, replacement: 'false' },
        { pattern: /window\.location\s*!==?\s*window\.parent\.location/gi, replacement: 'false' },
        { pattern: /window\.parent\s*!==?\s*window/gi, replacement: 'false' },
      ];
      
      antiFramePatterns.forEach(({ pattern, replacement }) => {
        html = html.replace(pattern, replacement);
      });
      
      // Inject comprehensive anti-detection script
      const antiDetectionScript = `<script>
(function() {
  'use strict';
  try {
    // Override frame detection
    const selfRef = window.self;
    Object.defineProperty(window, 'top', {
      get: function() { return selfRef; },
      set: function() {},
      configurable: false
    });
    Object.defineProperty(window, 'parent', {
      get: function() { return selfRef; },
      set: function() {},
      configurable: false
    });
    
    // Prevent location hijacking
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      get: function() { return originalLocation; },
      set: function() {},
      configurable: false
    });
    
    // Block frame-busting attempts
    window.addEventListener('beforeunload', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }, true);
    
    // Override open() to prevent popups
    const originalOpen = window.open;
    window.open = function() { return null; };
    
    console.log('[ChallengerDeep] Anti-frame protection active');
  } catch(e) {
    console.warn('[ChallengerDeep] Frame protection error:', e);
  }
})();
</script>`;
      
      // Inject the script as early as possible
      if (html.includes('<!DOCTYPE')) {
        html = html.replace(/(<!DOCTYPE[^>]*>)/i, '$1' + antiDetectionScript);
      } else if (html.includes('<html')) {
        html = html.replace(/(<html[^>]*>)/i, '$1' + antiDetectionScript);
      } else if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + antiDetectionScript);
      } else {
        html = antiDetectionScript + html;
      }
      
      // Add base tag to handle relative URLs
      const baseTag = `<base href="${parsedUrl.origin}/" target="_self">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + baseTag);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[GameProxy] Proxied ${parsedUrl.hostname} in ${duration}ms (${html.length} bytes)`);
      
      // Return modified HTML with proper headers
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cross-Origin-Embedder-Policy': 'unsafe-none',
          'Cache-Control': 'public, max-age=1800, s-maxage=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    
    // For non-HTML content (images, scripts, etc.), proxy as-is with size limit
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: 'Resource too large' },
        { status: 413 }
      );
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    console.error('[GameProxy] Error:', error.message || error);
    
    // Return user-friendly error
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', details: 'The game server took too long to respond' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Proxy failed', details: error.message || 'Unknown error' },
      { status: 502 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
