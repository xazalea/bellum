import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOP_COEP_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

const RUN_PATTERN = /^\/run/;

export function middleware(request: NextRequest) {
  // COOP/COEP headers on /run — required for SharedArrayBuffer (WASM threading)
  if (RUN_PATTERN.test(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    Object.entries(COOP_COEP_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/run'],
};