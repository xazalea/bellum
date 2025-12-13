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

type TelegramSendDocumentResponse = {
  ok: boolean;
  result?: {
    message_id: number;
    document?: { file_id: string };
  };
  description?: string;
};

function requireTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID || "";
  if (!token || !chatId) {
    throw new Error("Telegram storage not configured (missing env vars).");
  }
  return { token, chatId };
}

async function sendDocument(opts: {
  token: string;
  chatId: string;
  caption: string;
  filename: string;
  bytes: Uint8Array;
}) {
  const url = `https://api.telegram.org/bot${opts.token}/sendDocument`;
  const form = new FormData();
  form.set("chat_id", opts.chatId);
  form.set("caption", opts.caption);
  // Ensure ArrayBuffer-backed payload (BlobPart typings exclude SharedArrayBuffer).
  const copy = new Uint8Array(opts.bytes.byteLength);
  copy.set(opts.bytes);
  form.set("document", new File([copy.buffer], opts.filename, { type: "application/json" }));

  const res = await fetch(url, { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as TelegramSendDocumentResponse | null;
  if (!res.ok || !json?.ok) {
    const msg = json?.description || `Telegram sendDocument failed (${res.status})`;
    throw new Error(msg);
  }
  const fileId = json.result?.document?.file_id;
  const messageId = json.result?.message_id;
  if (!fileId || typeof messageId !== "number") throw new Error("Telegram response missing file_id/message_id");
  return { fileId, messageId };
}

/**
 * Stores and retrieves file manifests in Telegram itself.
 *
 * POST: stores manifest json in Telegram; returns { fileId, messageId } where fileId is the manifest telegram file_id.
 * GET: downloads manifest json by fileId (telegram file_id) and returns it as JSON.
 */
export async function POST(req: Request) {
  try {
    const { token, chatId } = requireTelegramConfig();
    const userId = req.headers.get("X-Nacho-UserId") || "anon";

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
    const caption = `nacho:${userId}:manifest:${safeName}:${manifest.totalChunks}chunks:${manifest.storedBytes}bytes`;
    const filename = `nacho_manifest_${crypto.randomUUID()}_${safeName}.json`;

    const { fileId, messageId } = await sendDocument({ token, chatId, caption, filename, bytes });
    return Response.json({ fileId, messageId });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Manifest store failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId") || "";
    if (!fileId) return Response.json({ error: "fileId required" }, { status: 400 });

    const res = await fetch(`${new URL(req.url).origin}/api/telegram/file?file_id=${encodeURIComponent(fileId)}`, {
      method: "GET",
      headers: { Accept: "application/octet-stream" },
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return Response.json({ error: `Manifest download failed (${res.status}): ${t}` }, { status: 500 });
    }
    const text = await res.text();
    const json = JSON.parse(text);
    return Response.json(json);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Manifest fetch failed" }, { status: 500 });
  }
}

