import { adminDb } from "@/app/api/user/_util";
import { verifySessionCookieFromRequest } from "@/lib/server/session";
import { requireTelegramBotToken, telegramDownloadFileBytes } from "@/lib/server/telegram";
import { rateLimit } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const uid = (await verifySessionCookieFromRequest(req)).uid;
    rateLimit(req, { scope: "telegram_file", limit: 600, windowMs: 60_000, key: uid });
    const token = requireTelegramBotToken();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("file_id") || "";
    if (!fileId) return Response.json({ error: "file_id required" }, { status: 400 });

    // Enforce ownership.
    const snap = await adminDb().collection("telegram_files").doc(fileId).get();
    if (!snap.exists) return Response.json({ error: "not_found" }, { status: 404 });
    const meta = snap.data() as any;
    if (String(meta?.ownerUid || "") !== uid) return Response.json({ error: "forbidden" }, { status: 403 });

    const bytes = await telegramDownloadFileBytes({ token, fileId });
    // Stream bytes through
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        // cache aggressively; Telegram file_id is stable for content-addressed object
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    const msg = e?.message || "Telegram download failed";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}

