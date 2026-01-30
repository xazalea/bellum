import { adminDb, requireAuthedUser } from "@/app/api/user/_util";
import { requireTelegramBotToken, requireTelegramStorageChatId, telegramSendDocumentWithRetry, TelegramError, TelegramErrorType } from "@/lib/server/telegram";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Uploads a binary blob to Telegram storage.
 *
 * Request:
 * - Body: application/octet-stream
 * - Headers (optional):
 *   - X-Nacho-UserId
 *   - X-File-Name
 *   - X-Upload-Id
 *   - X-Chunk-Index
 *   - X-Chunk-Total
 *
 * Response:
 *  { fileId, messageId }
 */
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "telegram_upload", limit: 30, windowMs: 60_000, key: uid });
    const token = requireTelegramBotToken();
    const chatId = requireTelegramStorageChatId();

    const fileName = req.headers.get("X-File-Name") || "upload.bin";
    const uploadId = req.headers.get("X-Upload-Id") || crypto.randomUUID();
    const chunkIndex = req.headers.get("X-Chunk-Index");
    const chunkTotal = req.headers.get("X-Chunk-Total");
    const providedSha256 = req.headers.get("X-Chunk-Sha256") || undefined;

    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.byteLength) {
      return Response.json({ error: "Empty body" }, { status: 400 });
    }

    // Telegram practical limit: keep per-upload <= ~50MB
    if (buf.byteLength > 45 * 1024 * 1024) {
      return Response.json({ error: "Chunk too large for Telegram (max ~45MB)" }, { status: 400 });
    }

    const caption =
      chunkIndex !== null
        ? `bellum:${uid}:${uploadId}:chunk:${chunkIndex}/${chunkTotal ?? "?"}:${fileName}`
        : `bellum:${uid}:${uploadId}:file:${fileName}`;

    const safeBase = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80) || "file";
    const outName =
      chunkIndex !== null ? `nacho_${uploadId}_chunk_${String(chunkIndex).padStart(6, "0")}_${safeBase}.bin` : `nacho_${uploadId}_${safeBase}.bin`;

    const { fileId, messageId, sha256 } = await telegramSendDocumentWithRetry({
      token,
      chatId,
      caption,
      filename: outName,
      bytes: buf,
      sha256: providedSha256,
    });

    // Record ownership so clients can only access their own objects.
    await adminDb()
      .collection("telegram_files")
      .doc(fileId)
      .set(
        {
          ownerUid: uid,
          kind: chunkIndex !== null ? "chunk" : "file",
          uploadId,
          fileName,
          chunkIndex: chunkIndex !== null ? Number(chunkIndex) : null,
          chunkTotal: chunkTotal !== null ? Number(chunkTotal) : null,
          sizeBytes: buf.byteLength,
          sha256,
          createdAt: Date.now(),
        },
        { merge: true },
      );

    return Response.json({ fileId, messageId, sha256 });
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
        case TelegramErrorType.FILE_TOO_LARGE:
          status = 413;
          break;
        case TelegramErrorType.CHAT_NOT_FOUND:
          status = 500;
          break;
        default:
          status = e.statusCode || 500;
      }
      return Response.json({ error: e.message, type: e.type, retryable: e.retryable }, { status });
    }
    const msg = e?.message || "Telegram upload failed";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}

