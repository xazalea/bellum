import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
    void req;
    return NextResponse.json(
        {
            error: 'external_cluster_not_configured',
            message: 'Configure Discord/Telegram storage or NEXT_PUBLIC_CLUSTER_SERVER_URL for chunk uploads.'
        },
        { status: 501 }
    );
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Challenger-UserId'
        }
    });
}
