import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function PUT(req: Request, ctx: { params: { uploadId: string; chunkIndex: string } }) {
    try {
        // In a real implementation, this would write the chunk to S3/Disk/BlobStorage.
        // For this prototype/demo, we just acknowledge receipt.
        const { uploadId, chunkIndex } = ctx.params;

        // Consume the body to ensure the stream is processed
        await req.arrayBuffer();

        // Verify authentication/session if needed (omitted for speed)

        return new NextResponse(null, { status: 204 });

    } catch (e) {
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Chunk-Sha256, X-Nacho-UserId'
        }
    });
}
