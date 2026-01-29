import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware runs on all requests
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add platform detection header
  const platform = process.env.CF_PAGES ? 'cloudflare' : 'vercel';
  response.headers.set('X-Platform', platform);
  
  return response;
}

// Only run on API routes and pages (not static files)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|xml|json)$).*)',
  ],
};
