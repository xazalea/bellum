/**
 * Compiler Process API
 * Handles APK/EXE registration for client-side WASM processing.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Register APK/EXE file for client-side processing
 * POST /api/compiler/process
 *
 * Body: { file: base64, fileName: string, type: 'apk' | 'exe' }
 * Returns: { success: true, clientSide: true, fileName, type, processedAt, message }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, fileName, type } = body;

    if (!file || !fileName || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: file, fileName, type' },
        { status: 400 }
      );
    }

    if (!['apk', 'exe'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be apk or exe' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      clientSide: true,
      fileName,
      type,
      processedAt: new Date().toISOString(),
      message: 'Processing client-side via WASM runtime',
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
  return NextResponse.json({ status: 'online', clientSide: true, engine: 'ChallengerJIT' });
}
