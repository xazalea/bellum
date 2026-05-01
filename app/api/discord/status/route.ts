import { NextResponse } from "next/server";
import { getDiscordWebhookCount } from "@/lib/server/discord";


export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const webhookCount = getDiscordWebhookCount();
    const enabled = webhookCount > 0;
    return NextResponse.json({
      enabled,
      webhookCount,
      maxChunkBytes: 24 * 1024 * 1024,
    });
  } catch (error: any) {
    return NextResponse.json({ enabled: false, error: error?.message || "status_failed" }, { status: 500 });
  }
}
