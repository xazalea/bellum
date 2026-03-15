export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthedUser } from "@/app/api/user/_util";
import { getSupports } from "@/lib/server/ai-gpt4free";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";


export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "ai_supports", limit: 60, windowMs: 60_000, key: uid });

    const supports = await getSupports();
    return NextResponse.json(supports, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to get supported models" },
      { status: error?.message?.includes("unauthenticated") ? 401 : 500 }
    );
  }
}
