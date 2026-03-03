/**
 * Compiler Process API
 * Bridges frontend to .NET backend for APK/EXE compilation
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Backend URL - configurable via environment
const BACKEND_URL = process.env.COMPILER_BACKEND_URL || 'http://localhost:5000';

/**
 * Process APK/EXE file through the backend compiler
 * POST /api/compiler/process
 * 
 * Body: { file: base64, fileName: string, type: 'apk' | 'exe' }
 * Returns: { compiledUrl: string, metadata: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, fileName, type, options } = body;

    if (!file || !fileName || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: file, fileName, type' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!['apk', 'exe'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be apk or exe' },
        { status: 400 }
      );
    }

    console.log(`[Compiler] Processing ${fileName} (${type})`);

    // Forward to backend compiler
    const response = await fetch(`${BACKEND_URL}/api/emulator/extract-app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `data:application/octet-stream;base64,${file}`,
        appType: type,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Compiler] Backend error:', error);
      return NextResponse.json(
        { error: 'Compiler backend error', details: error },
        { status: 502 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      compiled: result,
      fileName,
      type,
      processedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Compiler] Process error:', error);
    return NextResponse.json(
      { error: 'Processing failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Check compiler status
 * GET /api/compiler/process
 */
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emulator/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: 'offline', error: 'Backend not reachable' },
        { status: 503 }
      );
    }

    const health = await response.json();
    return NextResponse.json({
      status: 'online',
      backend: health,
    });

  } catch (error) {
    return NextResponse.json(
      { status: 'offline', error: 'Backend not reachable' },
      { status: 503 }
    );
  }
}