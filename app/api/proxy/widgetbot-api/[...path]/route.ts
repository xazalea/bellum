import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for Widgetbot API requests
 * This allows the widget to communicate with Discord even if Widgetbot API is blocked
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams);
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function handleProxy(
  request: NextRequest,
  params: { path: string[] }
) {
  try {
    const path = params.path.join('/');
    const targetUrl = `https://widgetbot.io/${path}`;
    
    // Get the search params from the original request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    // Prepare headers
    const headers: HeadersInit = {
      'User-Agent': 'Bellum/1.0',
    };

    // Copy relevant headers from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Prepare the request options
    const options: RequestInit = {
      method: request.method,
      headers,
    };

    // If it's a POST request, include the body
    if (request.method === 'POST') {
      const body = await request.text();
      options.body = body;
      headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
    }

    // Make the proxied request
    const response = await fetch(fullUrl, options);

    // Get the response data
    const data = await response.text();

    // Return the response with appropriate headers
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error proxying Widgetbot API request:', error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Proxy request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
