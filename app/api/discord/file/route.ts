import { adminDb, requireAuthedUser } from "@/app/api/user/_util";
import { discordDownloadFileWithRetry, DiscordError, DiscordErrorType } from "@/lib/server/discord";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

/**
 * Downloads a file from Discord CDN by message ID.
 *
 * Query params:
 *  - messageId: Discord message ID
 *
 * Response:
 *  Binary file data (application/octet-stream)
 */
export async function GET(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "discord_download", limit: 100, windowMs: 60_000, key: uid });

    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");

    if (!messageId) {
      return Response.json({ error: "Missing messageId parameter" }, { status: 400 });
    }

    // Fetch metadata from Firebase
    const doc = await adminDb().collection("discord_files").doc(messageId).get();

    if (!doc.exists) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const data = doc.data();
    if (!data) {
      return Response.json({ error: "File metadata missing" }, { status: 404 });
    }

    // Verify ownership
    if (data.ownerUid !== uid) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if CDN URL has expired
    const now = Date.now();
    if (data.expiresAt && data.expiresAt < now) {
      // URL has expired - this should trigger a refresh mechanism
      // For now, return an error indicating the URL needs to be refreshed
      return Response.json({ 
        error: "CDN URL expired", 
        messageId,
        expired: true 
      }, { status: 410 });
    }

    // Download from Discord CDN
    const bytes = await discordDownloadFileWithRetry({
      attachmentUrl: data.attachmentUrl,
      expectedSha256: data.sha256,
    });

    // Convert Uint8Array to Buffer for Node.js runtime
    const buffer = Buffer.from(bytes);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${data.fileName || "download.bin"}"`,
      },
    });
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
        default:
          status = e.statusCode || 500;
      }
      return Response.json({ error: e.message, type: e.type, retryable: e.retryable }, { status });
    }
    const msg = e?.message || "Discord download failed";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}
