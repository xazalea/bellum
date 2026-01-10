import 'server-only';
import { createHash } from 'crypto';

type TelegramSendDocumentResponse = {
  ok: boolean;
  result?: {
    message_id: number;
    document?: { file_id: string };
  };
  description?: string;
  error_code?: number;
};

type TelegramGetFileResponse = {
  ok: boolean;
  result?: {
    file_path?: string;
    file_size?: number;
  };
  description?: string;
  error_code?: number;
};

export enum TelegramErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  CHAT_NOT_FOUND = 'CHAT_NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

export class TelegramError extends Error {
  constructor(
    message: string,
    public type: TelegramErrorType,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TelegramError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function requireTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) throw new TelegramError('Telegram bot token not configured.', TelegramErrorType.INVALID_TOKEN);
  return token;
}

export function requireTelegramStorageChatId(): string {
  const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID || '';
  if (!chatId) throw new TelegramError('Telegram storage chat id not configured.', TelegramErrorType.CHAT_NOT_FOUND);
  return chatId;
}

export function sha256Hash(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function classifyTelegramError(json: any, statusCode: number): TelegramError {
  const desc = json?.description || '';
  const errorCode = json?.error_code;

  // Rate limiting
  if (statusCode === 429 || errorCode === 429 || desc.includes('Too Many Requests')) {
    return new TelegramError('Rate limited by Telegram API', TelegramErrorType.RATE_LIMIT, statusCode, true);
  }

  // Invalid token
  if (statusCode === 401 || desc.includes('Unauthorized') || desc.includes('bot token')) {
    return new TelegramError('Invalid or missing bot token', TelegramErrorType.INVALID_TOKEN, statusCode, false);
  }

  // Chat not found
  if (desc.includes('chat not found') || desc.includes('PEER_ID_INVALID')) {
    return new TelegramError('Chat ID not found or invalid', TelegramErrorType.CHAT_NOT_FOUND, statusCode, false);
  }

  // File too large
  if (desc.includes('file is too big') || desc.includes('FILE_TOO_BIG')) {
    return new TelegramError('File exceeds Telegram size limit', TelegramErrorType.FILE_TOO_LARGE, statusCode, false);
  }

  // Network errors (retryable)
  if (statusCode >= 500 && statusCode < 600) {
    return new TelegramError(`Telegram server error (${statusCode})`, TelegramErrorType.NETWORK_ERROR, statusCode, true);
  }

  // Connection errors (retryable)
  if (desc.includes('ECONNRESET') || desc.includes('ETIMEDOUT') || desc.includes('socket hang up')) {
    return new TelegramError('Network connection error', TelegramErrorType.NETWORK_ERROR, statusCode, true);
  }

  return new TelegramError(
    `Telegram API error: ${desc || 'Unknown error'}`,
    TelegramErrorType.UNKNOWN,
    statusCode,
    statusCode >= 500
  );
}

export async function telegramSendDocument(opts: {
  token: string;
  chatId: string;
  caption: string;
  filename: string;
  bytes: Uint8Array;
  mimeType?: string;
  sha256?: string;
}): Promise<{ fileId: string; messageId: number; sha256: string }> {
  const url = `https://api.telegram.org/bot${opts.token}/sendDocument`;
  const form = new FormData();
  form.set('chat_id', opts.chatId);
  
  // Calculate hash if not provided
  const hash = opts.sha256 || sha256Hash(opts.bytes);
  
  // Include hash in caption for verification
  form.set('caption', `${opts.caption}\nSHA256:${hash}`);
  
  // Ensure ArrayBuffer-backed payload (BlobPart typings exclude SharedArrayBuffer).
  const copy = new Uint8Array(opts.bytes.byteLength);
  copy.set(opts.bytes);
  form.set('document', new File([copy.buffer], opts.filename, { type: opts.mimeType || 'application/octet-stream' }));

  const res = await fetch(url, { method: 'POST', body: form });
  const json = (await res.json().catch(() => null)) as TelegramSendDocumentResponse | null;
  
  if (!res.ok || !json?.ok) {
    throw classifyTelegramError(json, res.status);
  }
  
  const fileId = json.result?.document?.file_id;
  const messageId = json.result?.message_id;
  
  if (!fileId || typeof messageId !== 'number') {
    throw new TelegramError('Telegram response missing file_id/message_id', TelegramErrorType.UNKNOWN);
  }
  
  return { fileId, messageId, sha256: hash };
}

export async function telegramSendDocumentWithRetry(
  opts: {
    token: string;
    chatId: string;
    caption: string;
    filename: string;
    bytes: Uint8Array;
    mimeType?: string;
    sha256?: string;
  },
  maxRetries: number = 3
): Promise<{ fileId: string; messageId: number; sha256: string }> {
  let lastError: TelegramError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await telegramSendDocument(opts);
    } catch (e: any) {
      lastError = e instanceof TelegramError ? e : new TelegramError(e.message, TelegramErrorType.UNKNOWN);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delayMs = Math.min(Math.pow(2, attempt) * 1000, 10000);
      console.warn(`[Telegram] Upload attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, lastError.message);
      await sleep(delayMs);
    }
  }

  throw lastError || new TelegramError('Upload failed after retries', TelegramErrorType.UNKNOWN);
}

export async function telegramDownloadFileBytes(opts: { 
  token: string; 
  fileId: string;
  expectedSha256?: string;
}): Promise<Uint8Array> {
  const metaUrl = `https://api.telegram.org/bot${opts.token}/getFile?file_id=${encodeURIComponent(opts.fileId)}`;
  const metaRes = await fetch(metaUrl, { method: 'GET' });
  const metaJson = (await metaRes.json().catch(() => null)) as TelegramGetFileResponse | null;
  
  if (!metaRes.ok || !metaJson?.ok) {
    throw classifyTelegramError(metaJson, metaRes.status);
  }
  
  const filePath = metaJson.result?.file_path;
  if (!filePath) {
    throw new TelegramError('Telegram file_path missing', TelegramErrorType.UNKNOWN);
  }

  const dlUrl = `https://api.telegram.org/file/bot${opts.token}/${filePath}`;
  const fileRes = await fetch(dlUrl, { method: 'GET' });
  
  if (!fileRes.ok) {
    const t = await fileRes.text().catch(() => '');
    throw new TelegramError(
      `Telegram download failed (${fileRes.status}): ${t}`,
      TelegramErrorType.NETWORK_ERROR,
      fileRes.status,
      fileRes.status >= 500
    );
  }
  
  const bytes = new Uint8Array(await fileRes.arrayBuffer());

  // Verify hash if provided
  if (opts.expectedSha256) {
    const actualHash = sha256Hash(bytes);
    if (actualHash !== opts.expectedSha256) {
      throw new TelegramError(
        `Hash mismatch: expected ${opts.expectedSha256}, got ${actualHash}`,
        TelegramErrorType.UNKNOWN,
        undefined,
        true // Retryable - file might be corrupted in transit
      );
    }
  }

  return bytes;
}

export async function telegramDownloadFileBytesWithRetry(
  opts: { 
    token: string; 
    fileId: string;
    expectedSha256?: string;
  },
  maxRetries: number = 3
): Promise<Uint8Array> {
  let lastError: TelegramError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await telegramDownloadFileBytes(opts);
    } catch (e: any) {
      lastError = e instanceof TelegramError ? e : new TelegramError(e.message, TelegramErrorType.UNKNOWN);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff
      const delayMs = Math.min(Math.pow(2, attempt) * 1000, 10000);
      console.warn(`[Telegram] Download attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, lastError.message);
      await sleep(delayMs);
    }
  }

  throw lastError || new TelegramError('Download failed after retries', TelegramErrorType.UNKNOWN);
}

