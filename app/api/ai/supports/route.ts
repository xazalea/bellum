import { NextRequest, NextResponse } from 'next/server';
import { requireAuthedUser } from '@/app/api/user/_util';
import { getSupports } from '@/lib/server/ai-edge';
import { rateLimit, requireSameOrigin } from '@/lib/server/security';
import 'server-only';


export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: 'ai_supports', limit: 30, windowMs: 60_000, key: uid });

    const supports = await getSupports();

    return NextResponse.json({ supports });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unknown error', supports: [] },
      { status: error?.message?.includes('unauthenticated') ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}