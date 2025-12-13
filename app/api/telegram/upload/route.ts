export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  form.set(
    "document",
    new File([copy.buffer], opts.filename, { type: "application/octet-stream" }),
  );

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
    const { token, chatId } = requireTelegramConfig();

    const userId = req.headers.get("X-Nacho-UserId") || "anon";
    const fileName = req.headers.get("X-File-Name") || "upload.bin";
    const uploadId = req.headers.get("X-Upload-Id") || crypto.randomUUID();
    const chunkIndex = req.headers.get("X-Chunk-Index");
    const chunkTotal = req.headers.get("X-Chunk-Total");

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
        ? `nacho:${userId}:${uploadId}:chunk:${chunkIndex}/${chunkTotal ?? "?"}:${fileName}`
        : `nacho:${userId}:${uploadId}:file:${fileName}`;

    const safeBase = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80) || "file";
    const outName =
      chunkIndex !== null ? `nacho_${uploadId}_chunk_${String(chunkIndex).padStart(6, "0")}_${safeBase}.bin` : `nacho_${uploadId}_${safeBase}.bin`;

    const { fileId, messageId } = await sendDocument({
      token,
      chatId,
      caption,
      filename: outName,
      bytes: buf,
    });

    return Response.json({ fileId, messageId });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Telegram upload failed" }, { status: 500 });
  }
}

