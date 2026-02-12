import { NextRequest, NextResponse } from 'next/server';

// Use edge runtime for Cloudflare compatibility
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Game Proxy Endpoint
 * Bypasses iframe detection by proxying game content server-side
 * and modifying headers/scripts that prevent embedding
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUrl = searchParams.get('url');
    
    if (!gameUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(gameUrl);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    console.log('[GameProxy] Fetching game:', gameUrl);

    // Fetch the game content
    const response = await fetch(gameUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': new URL(gameUrl).origin,
      },
    });

    if (!response.ok) {
      console.error('[GameProxy] Failed to fetch game:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch game', status: response.status },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If it's HTML, modify it to bypass iframe detection
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Remove/modify iframe detection scripts
      html = html.replace(/if\s*\(\s*(?:window\.)?(?:self|top)\s*!==?\s*(?:window\.)?(?:top|self)\s*\)/gi, 'if(false)');
      html = html.replace(/if\s*\(\s*(?:window\.)?(?:top|self)\s*===?\s*(?:window\.)?(?:self|top)\s*\)/gi, 'if(true)');
      html = html.replace(/window\.top\s*!==?\s*window\.self/gi, 'false');
      html = html.replace(/window\.self\s*!==?\s*window\.top/gi, 'false');
      html = html.replace(/top\s*!==?\s*self/gi, 'false');
      html = html.replace(/self\s*!==?\s*top/gi, 'false');
      html = html.replace(/parent\s*!==?\s*window/gi, 'false');
      html = html.replace(/window\s*!==?\s*parent/gi, 'false');
      
      // Inject script to override iframe detection at runtime
      const antiDetectionScript = `
<script>
(function() {
  // Override frame detection
  try {
    Object.defineProperty(window, 'top', {
      get: function() { return window.self; },
      set: function() {}
    });
    Object.defineProperty(window, 'parent', {
      get: function() { return window.self; },
      set: function() {}
    });
  } catch(e) {}
  
  // Prevent frame-busting
  window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
})();
</script>
`;
      
      // Inject the script right after <head> or at the beginning of <body>
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + antiDetectionScript);
      } else if (html.includes('<body>')) {
        html = html.replace('<body>', '<body>' + antiDetectionScript);
      } else {
        html = antiDetectionScript + html;
      }
      
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
          'Cache-Control': 'public, max-age=3600',
          // DO NOT set X-Frame-Options or CSP that would block iframe embedding
        },
      });
    }
    
    // For non-HTML content (images, scripts, etc.), proxy as-is
    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('[GameProxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy failed', details: error.message },
      { status: 500 }
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
