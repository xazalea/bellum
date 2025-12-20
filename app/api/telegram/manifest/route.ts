import { adminDb, requireAuthedUser } from "@/app/api/user/_util";
import { requireTelegramBotToken, requireTelegramStorageChatId, telegramDownloadFileBytes, telegramSendDocument } from "@/lib/server/telegram";
import { rateLimit, requireSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManifestChunk = { index: number; telegramFileId: string; sizeBytes: number };
type TelegramManifest = {
  version: 1;
  fileName: string;
  totalBytes: number;
  chunkBytes: number;
  totalChunks: number;
  createdAtUnixMs: number;
  storedBytes: number;
  chunks: ManifestChunk[];
};

/**
 * Stores and retrieves file manifests in Telegram itself.
 *
 * POST: stores manifest json in Telegram; returns { fileId, messageId } where fileId is the manifest telegram file_id.
 * GET: downloads manifest json by fileId (telegram file_id) and returns it as JSON.
 */
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "telegram_manifest_store", limit: 60, windowMs: 60_000, key: uid });
    const token = requireTelegramBotToken();
    const chatId = requireTelegramStorageChatId();

    const body = (await req.json()) as Partial<TelegramManifest>;
    if (!body.fileName || typeof body.totalBytes !== "number" || !Array.isArray(body.chunks)) {
      return Response.json({ error: "Invalid manifest body" }, { status: 400 });
    }

    const manifest: TelegramManifest = {
      version: 1,
      fileName: body.fileName,
      totalBytes: body.totalBytes,
      chunkBytes: typeof body.chunkBytes === "number" ? body.chunkBytes : 0,
      totalChunks: typeof body.totalChunks === "number" ? body.totalChunks : body.chunks.length,
      createdAtUnixMs: typeof body.createdAtUnixMs === "number" ? body.createdAtUnixMs : Date.now(),
      storedBytes: typeof body.storedBytes === "number" ? body.storedBytes : body.chunks.reduce((s, c: any) => s + (Number(c?.sizeBytes) || 0), 0),
      chunks: body.chunks.map((c: any) => ({
        index: Number(c.index),
        telegramFileId: String(c.telegramFileId),
        sizeBytes: Number(c.sizeBytes),
      })),
    };

    const bytes = new TextEncoder().encode(JSON.stringify(manifest));
    const safeName = String(manifest.fileName).replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80) || "file";
    const caption = `bellum:${uid}:manifest:${safeName}:${manifest.totalChunks}chunks:${manifest.storedBytes}bytes`;
    const filename = `nacho_manifest_${crypto.randomUUID()}_${safeName}.json`;

    const { fileId, messageId } = await telegramSendDocument({ token, chatId, caption, filename, bytes, mimeType: "application/json" });

    await adminDb()
      .collection("telegram_files")
      .doc(fileId)
      .set(
        {
          ownerUid: uid,
          kind: "manifest",
          fileName: manifest.fileName,
          totalBytes: manifest.totalBytes,
          totalChunks: manifest.totalChunks,
          storedBytes: manifest.storedBytes,
          createdAt: Date.now(),
        },
        { merge: true },
      );

    return Response.json({ fileId, messageId });
  } catch (e: any) {
    const msg = e?.message || "Manifest store failed";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId") || "";
    if (!fileId) return Response.json({ error: "fileId required" }, { status: 400 });

    const { uid } = await requireAuthedUser(req);
    rateLimit(req, { scope: "telegram_manifest_fetch", limit: 240, windowMs: 60_000, key: uid });
    const snap = await adminDb().collection("telegram_files").doc(fileId).get();
    if (!snap.exists) return Response.json({ error: "not_found" }, { status: 404 });
    const meta = snap.data() as any;
    if (String(meta?.ownerUid || "") !== uid) return Response.json({ error: "forbidden" }, { status: 403 });

    const token = requireTelegramBotToken();
    const bytes = await telegramDownloadFileBytes({ token, fileId });
    const text = new TextDecoder().decode(bytes);
    const json = JSON.parse(text);
    return Response.json(json, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || "Manifest fetch failed";
    const status = msg.includes("unauthenticated") ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}

