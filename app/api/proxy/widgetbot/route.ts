import { NextRequest, NextResponse } from 'next/server';


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

/**
 * Proxy endpoint for Widgetbot script
 * This allows the Widgetbot embed to work even if the CDN is blocked
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch the Widgetbot script from the CDN
    const response = await fetch('https://cdn.jsdelivr.net/npm/@widgetbot/html-embed', {
      headers: {
        'User-Agent': 'Bellum/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Widgetbot script: ${response.statusText}`);
    }

    const script = await response.text();

    // Return the script with appropriate headers
    return new NextResponse(script, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error proxying Widgetbot script:', error);
    
    // Return a minimal error script
    const errorScript = `
      console.error('Widgetbot proxy failed to load script');
      // Fallback: try loading from CDN directly
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@widgetbot/html-embed';
      document.head.appendChild(script);
    `;

    return new NextResponse(errorScript, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
      },
    });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
