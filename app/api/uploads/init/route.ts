import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Client sends 'fileName', 'totalBytes', 'contentType'
        // We support both just in case.
        const name = body.fileName || body.filename;
        const bytes = body.totalBytes || body.size;

        if (!name || !bytes) {
            return NextResponse.json({
                error: 'invalid_request',
                receivedKeys: Object.keys(body)
            }, { status: 400 });
        }

        const uploadId = crypto.randomUUID();

        return NextResponse.json({
            uploadId,
            url: `/api/uploads/binary/${uploadId}`,
            method: 'POST',
            // Return expected verification fields if client needs them
            totalChunks: Math.ceil(bytes / (256 * 1024))
        });

    } catch (e) {
        return NextResponse.json({ error: 'server_error', details: String(e) }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Nacho-UserId'
        }
    });
}
