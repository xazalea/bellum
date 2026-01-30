import { adminDb, requireAuthedUser } from "@/app/api/user/_util";
import { requireDiscordWebhookUrl, discordSendFileWithRetry, DiscordError, DiscordErrorType } from "@/lib/server/discord";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";


// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Uploads a binary blob to Discord storage via webhook.
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
 *  { messageId, attachmentUrl, sha256 }
 */
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "discord_upload", limit: 50, windowMs: 60_000, key: uid });
    const webhookUrl = requireDiscordWebhookUrl();

    const fileName = req.headers.get("X-File-Name") || "upload.bin";
    const uploadId = req.headers.get("X-Upload-Id") || crypto.randomUUID();
    const chunkIndex = req.headers.get("X-Chunk-Index");
    const chunkTotal = req.headers.get("X-Chunk-Total");
    const providedSha256 = req.headers.get("X-Chunk-Sha256") || undefined;

    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.byteLength) {
      return Response.json({ error: "Empty body" }, { status: 400 });
    }

    // Discord webhook limit: keep per-upload <= ~25MB
    if (buf.byteLength > 24 * 1024 * 1024) {
      return Response.json({ error: "Chunk too large for Discord (max ~24MB)" }, { status: 400 });
    }

    const content =
      chunkIndex !== null
        ? `bellum:${uid}:${uploadId}:chunk:${chunkIndex}/${chunkTotal ?? "?"}:${fileName}`
        : `bellum:${uid}:${uploadId}:file:${fileName}`;

    const safeBase = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80) || "file";
    const outName =
      chunkIndex !== null ? `bellum_${uploadId}_chunk_${String(chunkIndex).padStart(6, "0")}_${safeBase}.bin` : `bellum_${uploadId}_${safeBase}.bin`;

    const { messageId, attachmentUrl, sha256 } = await discordSendFileWithRetry({
      webhookUrl,
      content,
      filename: outName,
      bytes: buf,
      sha256: providedSha256,
    });

    // Record ownership so clients can only access their own objects.
    // Discord CDN URLs expire after ~24 hours, so we store expiration time
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
    
    await adminDb()
      .collection("discord_files")
      .doc(messageId)
      .set(
        {
          messageId,
          attachmentUrl,
          ownerUid: uid,
          kind: chunkIndex !== null ? "chunk" : "file",
          uploadId,
          fileName,
          chunkIndex: chunkIndex !== null ? Number(chunkIndex) : null,
          chunkTotal: chunkTotal !== null ? Number(chunkTotal) : null,
          sizeBytes: buf.byteLength,
          sha256,
          createdAt: Date.now(),
          expiresAt,
        },
        { merge: true },
      );

    return Response.json({ messageId, attachmentUrl, sha256 });
  } catch (e: any) {
    if (e instanceof DiscordError) {
      let status = 500;
      switch (e.type) {
        case DiscordErrorType.RATE_LIMIT:
          status = 429;
          break;
        case DiscordErrorType.INVALID_WEBHOOK:
        case DiscordErrorType.UNAUTHORIZED:
          status = 401;
          break;
        case DiscordErrorType.FILE_TOO_LARGE:
          status = 413;
          break;
        default:
          status = e.statusCode || 500;
      }
      return Response.json({ error: e.message, type: e.type, retryable: e.retryable }, { status });
    }
    const msg = e?.message || "Discord upload failed";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}
