import { adminDb, requireAuthedUser } from "@/app/api/user/_util";
import { requireTelegramBotToken, telegramDownloadFileBytesWithRetry, TelegramError, TelegramErrorType } from "@/lib/server/telegram";
import { rateLimit } from "@/lib/server/security";

export const runtime = 'edge';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "telegram_file", limit: 600, windowMs: 60_000, key: uid });
    const token = requireTelegramBotToken();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("file_id") || "";
    if (!fileId) return Response.json({ error: "file_id required" }, { status: 400 });

    // Enforce ownership.
    const snap = await (await adminDb()).collection("telegram_files").doc(fileId).get();
    if (!snap.exists) return Response.json({ error: "not_found" }, { status: 404 });
    const meta = snap.data() as any;
    if (String(meta?.ownerUid || "") !== uid) return Response.json({ error: "forbidden" }, { status: 403 });

    const bytes = await telegramDownloadFileBytesWithRetry({ 
      token, 
      fileId,
      expectedSha256: meta?.sha256 // Verify hash if stored
    });
    // Ensure ArrayBuffer-backed payload for Response typings (avoid ArrayBufferLike/SharedArrayBuffer complaints).
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const body: ArrayBuffer = copy.buffer;
    // Stream bytes through
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        // cache aggressively; Telegram file_id is stable for content-addressed object
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    if (e instanceof TelegramError) {
      let status = 500;
      switch (e.type) {
        case TelegramErrorType.RATE_LIMIT:
          status = 429;
          break;
        case TelegramErrorType.INVALID_TOKEN:
          status = 401;
          break;
        default:
          status = e.statusCode || 500;
      }
      return Response.json({ error: e.message, type: e.type, retryable: e.retryable }, { status });
    }
    const msg = e?.message || "Telegram download failed";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}

