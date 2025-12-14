import 'server-only';

type TelegramSendDocumentResponse = {
  ok: boolean;
  result?: {
    message_id: number;
    document?: { file_id: string };
  };
  description?: string;
};

type TelegramGetFileResponse = {
  ok: boolean;
  result?: {
    file_path?: string;
  };
  description?: string;
};

export function requireTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) throw new Error('Telegram bot token not configured.');
  return token;
}

export function requireTelegramStorageChatId(): string {
  const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID || '';
  if (!chatId) throw new Error('Telegram storage chat id not configured.');
  return chatId;
}

export async function telegramSendDocument(opts: {
  token: string;
  chatId: string;
  caption: string;
  filename: string;
  bytes: Uint8Array;
  mimeType?: string;
}): Promise<{ fileId: string; messageId: number }> {
  const url = `https://api.telegram.org/bot${opts.token}/sendDocument`;
  const form = new FormData();
  form.set('chat_id', opts.chatId);
  form.set('caption', opts.caption);
  // Ensure ArrayBuffer-backed payload (BlobPart typings exclude SharedArrayBuffer).
  const copy = new Uint8Array(opts.bytes.byteLength);
  copy.set(opts.bytes);
  form.set('document', new File([copy.buffer], opts.filename, { type: opts.mimeType || 'application/octet-stream' }));

  const res = await fetch(url, { method: 'POST', body: form });
  const json = (await res.json().catch(() => null)) as TelegramSendDocumentResponse | null;
  if (!res.ok || !json?.ok) {
    const msg = json?.description || `Telegram sendDocument failed (${res.status})`;
    throw new Error(msg);
  }
  const fileId = json.result?.document?.file_id;
  const messageId = json.result?.message_id;
  if (!fileId || typeof messageId !== 'number') throw new Error('Telegram response missing file_id/message_id');
  return { fileId, messageId };
}

export async function telegramDownloadFileBytes(opts: { token: string; fileId: string }): Promise<Uint8Array> {
  const metaUrl = `https://api.telegram.org/bot${opts.token}/getFile?file_id=${encodeURIComponent(opts.fileId)}`;
  const metaRes = await fetch(metaUrl, { method: 'GET' });
  const metaJson = (await metaRes.json().catch(() => null)) as TelegramGetFileResponse | null;
  if (!metaRes.ok || !metaJson?.ok) {
    const msg = metaJson?.description || `Telegram getFile failed (${metaRes.status})`;
    throw new Error(msg);
  }
  const filePath = metaJson.result?.file_path;
  if (!filePath) throw new Error('Telegram file_path missing');

  const dlUrl = `https://api.telegram.org/file/bot${opts.token}/${filePath}`;
  const fileRes = await fetch(dlUrl, { method: 'GET' });
  if (!fileRes.ok) {
    const t = await fileRes.text().catch(() => '');
    throw new Error(`Telegram download failed (${fileRes.status}): ${t}`);
  }
  return new Uint8Array(await fileRes.arrayBuffer());
}

