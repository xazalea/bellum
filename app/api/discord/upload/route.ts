import { adminDb, requireAuthedUser } from "@/app/api/user/_util";
import {
  DiscordError,
  DiscordErrorType,
  discordSendFileWithRetry,
  requireDiscordWebhookUrl,
} from "@/lib/server/discord";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "discord_upload", limit: 30, windowMs: 60_000, key: uid });

    const webhookUrl = requireDiscordWebhookUrl();
    const fileName = req.headers.get("X-File-Name") || "upload.bin";
    const uploadId = req.headers.get("X-Upload-Id") || crypto.randomUUID();
    const chunkIndex = req.headers.get("X-Chunk-Index");
    const chunkTotal = req.headers.get("X-Chunk-Total");
    const providedSha256 = req.headers.get("X-Chunk-Sha256") || undefined;

    const bytes = new Uint8Array(await req.arrayBuffer());
    if (!bytes.byteLength) {
      return Response.json({ error: "Empty body" }, { status: 400 });
    }

    if (bytes.byteLength > 24 * 1024 * 1024) {
      return Response.json({ error: "Chunk too large for Discord (max 24MB)" }, { status: 400 });
    }

    const caption =
      chunkIndex !== null
        ? `challenger:${uid}:${uploadId}:chunk:${chunkIndex}/${chunkTotal ?? "?"}:${fileName}`
        : `challenger:${uid}:${uploadId}:file:${fileName}`;

    const safeBase = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80) || "file";
    const outName =
      chunkIndex !== null
        ? `challenger_${uploadId}_chunk_${String(chunkIndex).padStart(6, "0")}_${safeBase}.bin`
        : `challenger_${uploadId}_${safeBase}.bin`;

    const { messageId, attachmentUrl, sha256 } = await discordSendFileWithRetry({
      webhookUrl,
      content: caption,
      filename: outName,
      bytes,
      sha256: providedSha256,
    });

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const db = await adminDb();
    await db.collection("discord_files").doc(messageId).set(
      {
        ownerUid: uid,
        kind: chunkIndex !== null ? "chunk" : "file",
        uploadId,
        fileName,
        chunkIndex: chunkIndex !== null ? Number(chunkIndex) : null,
        chunkTotal: chunkTotal !== null ? Number(chunkTotal) : null,
        sizeBytes: bytes.byteLength,
        sha256,
        attachmentUrl,
        expiresAt,
        createdAt: Date.now(),
      },
      { merge: true }
    );

    return Response.json({ messageId, attachmentUrl, sha256, expiresAt }, { status: 200 });
  } catch (e: any) {
    if (e instanceof DiscordError) {
      let status = 500;
      switch (e.type) {
        case DiscordErrorType.RATE_LIMIT:
          status = 429;
          break;
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
