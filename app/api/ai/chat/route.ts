import { NextRequest, NextResponse } from "next/server";
import { requireAuthedUser } from "@/app/api/user/_util";
import { chatCompletion } from "@/lib/server/ai-gpt4free";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type ChatBody = {
  prompt?: string | Array<{ role: string; content: string }>;
  model?: string;
  site?: string;
};

async function run(req: NextRequest, payload: ChatBody) {
  requireSameOrigin(req);
  const { uid } = await requireAuthedUser(req);
  rateLimit(req, { scope: "ai_chat", limit: 20, windowMs: 60_000, key: uid });

  const result = await chatCompletion({
    prompt: payload.prompt,
    model: payload.model,
    site: payload.site,
  });

  return NextResponse.json({ content: result.content, role: result.role, model: result.model, site: result.site });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ChatBody;
    return await run(req, body);
  } catch (error: any) {
    return NextResponse.json(
      { content: "", error: error?.message || "Unknown error" },
      { status: error?.message?.includes("unauthenticated") ? 401 : 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const prompt = req.nextUrl.searchParams.get("prompt") || "";
    const model = req.nextUrl.searchParams.get("model") || undefined;
    const site = req.nextUrl.searchParams.get("site") || undefined;
    return await run(req, { prompt, model, site });
  } catch (error: any) {
    return NextResponse.json(
      { content: "", error: error?.message || "Unknown error" },
      { status: error?.message?.includes("unauthenticated") ? 401 : 500 }
    );
  }
}
