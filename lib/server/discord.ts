import 'server-only';

type DiscordWebhookResponse = {
  id: string;
  type: number;
  content: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    bot?: boolean;
  };
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    url: string;
    proxy_url: string;
    content_type?: string;
  }>;
  embeds: any[];
  mentions: any[];
  mention_roles: any[];
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  timestamp: string;
  edited_timestamp: string | null;
  flags: number;
  components: any[];
};

type DiscordErrorResponse = {
  message?: string;
  code?: number;
  errors?: any;
  retry_after?: number;
};

export enum DiscordErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_WEBHOOK = 'INVALID_WEBHOOK',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN = 'UNKNOWN',
}

export class DiscordError extends Error {
  constructor(
    message: string,
    public type: DiscordErrorType,
    public statusCode?: number,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'DiscordError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function requireDiscordWebhookUrl(): string {
  const webhooks = getDiscordWebhookUrls();
  if (webhooks.length === 0) {
    throw new DiscordError('Discord webhook URL not configured.', DiscordErrorType.INVALID_WEBHOOK);
  }
  // Return random webhook for load balancing
  return webhooks[Math.floor(Math.random() * webhooks.length)];
}

export function getDiscordWebhookUrls(): string[] {
  const webhook = process.env.DISCORD_WEBHOOK_URL || '';
  if (!webhook) return [];
  
  // Support comma-separated webhooks for load balancing
  return webhook
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0);
}

export function getDiscordWebhookCount(): number {
  return getDiscordWebhookUrls().length;
}

export async function sha256Hash(data: Uint8Array): Promise<string> {
  // Use Web Crypto API for better compatibility with Edge Runtime
  // Cast to any to avoid SharedArrayBuffer issues with BufferSource in some TS versions
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function classifyDiscordError(json: DiscordErrorResponse | null, statusCode: number): DiscordError {
  const message = json?.message || '';
  const code = json?.code;
  const retryAfter = json?.retry_after;

  // Rate limiting
  if (statusCode === 429 || code === 429 || message.includes('rate limit')) {
    return new DiscordError(
      'Rate limited by Discord API',
      DiscordErrorType.RATE_LIMIT,
      statusCode,
      true,
      retryAfter ? retryAfter * 1000 : undefined
    );
  }

  // Invalid webhook
  if (statusCode === 401 || statusCode === 403 || code === 10015 || message.includes('Unknown Webhook')) {
    return new DiscordError('Invalid or unauthorized webhook', DiscordErrorType.UNAUTHORIZED, statusCode, false);
  }

  // File too large (Discord limit is 25MB for webhooks)
  if (statusCode === 413 || message.includes('too large') || message.includes('Request entity too large')) {
    return new DiscordError('File exceeds Discord size limit (25MB)', DiscordErrorType.FILE_TOO_LARGE, statusCode, false);
  }

  // Network errors (retryable)
  if (statusCode >= 500 && statusCode < 600) {
    return new DiscordError(`Discord server error (${statusCode})`, DiscordErrorType.NETWORK_ERROR, statusCode, true);
  }

  // Connection errors (retryable)
  if (message.includes('ECONNRESET') || message.includes('ETIMEDOUT') || message.includes('socket hang up')) {
    return new DiscordError('Network connection error', DiscordErrorType.NETWORK_ERROR, statusCode, true);
  }

  return new DiscordError(
    `Discord API error: ${message || 'Unknown error'}`,
    DiscordErrorType.UNKNOWN,
    statusCode,
    statusCode >= 500
  );
}

export async function discordSendFile(opts: {
  webhookUrl: string;
  content: string;
  filename: string;
  bytes: Uint8Array;
  sha256?: string;
}): Promise<{ messageId: string; attachmentUrl: string; sha256: string }> {
  // Calculate hash if not provided
  const hash = opts.sha256 || await sha256Hash(opts.bytes);

  // Include hash in content for verification
  const contentWithHash = `${opts.content}\nSHA256:${hash}`;

  // Ensure ArrayBuffer-backed payload (BlobPart typings exclude SharedArrayBuffer).
  const copy = new Uint8Array(opts.bytes.byteLength);
  copy.set(opts.bytes);

  const form = new FormData();
  form.set('content', contentWithHash);
  form.set('file', new File([copy.buffer], opts.filename, { type: 'application/octet-stream' }));

  const res = await fetch(opts.webhookUrl + '?wait=true', { 
    method: 'POST', 
    body: form 
  });
  
  const json = (await res.json().catch(() => null)) as DiscordWebhookResponse | DiscordErrorResponse | null;

  if (!res.ok) {
    throw classifyDiscordError(json as DiscordErrorResponse, res.status);
  }

  const response = json as DiscordWebhookResponse;
  const messageId = response.id;
  const attachment = response.attachments?.[0];

  if (!messageId || !attachment) {
    throw new DiscordError('Discord response missing message ID or attachment', DiscordErrorType.UNKNOWN);
  }

  return { 
    messageId, 
    attachmentUrl: attachment.url,
    sha256: hash 
  };
}

export async function discordSendFileWithRetry(
  opts: {
    webhookUrl: string;
    content: string;
    filename: string;
    bytes: Uint8Array;
    sha256?: string;
  },
  maxRetries: number = 3
): Promise<{ messageId: string; attachmentUrl: string; sha256: string }> {
  let lastError: DiscordError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await discordSendFile(opts);
    } catch (e: any) {
      lastError = e instanceof DiscordError ? e : new DiscordError(e.message, DiscordErrorType.UNKNOWN);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Use retry_after if provided by Discord, otherwise exponential backoff
      const delayMs = lastError.retryAfter || Math.min(Math.pow(2, attempt) * 1000, 10000);
      console.warn(`[Discord] Upload attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, lastError.message);
      await sleep(delayMs);
    }
  }

  throw lastError || new DiscordError('Upload failed after retries', DiscordErrorType.UNKNOWN);
}

export async function discordDownloadFile(opts: {
  attachmentUrl: string;
  expectedSha256?: string;
}): Promise<Uint8Array> {
  const res = await fetch(opts.attachmentUrl, { method: 'GET' });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DiscordError(
      `Discord download failed (${res.status}): ${text}`,
      DiscordErrorType.NETWORK_ERROR,
      res.status,
      res.status >= 500
    );
  }

  const bytes = new Uint8Array(await res.arrayBuffer());

  // Verify hash if provided
  if (opts.expectedSha256) {
    const actualHash = await sha256Hash(bytes);
    if (actualHash !== opts.expectedSha256) {
      throw new DiscordError(
        `Hash mismatch: expected ${opts.expectedSha256}, got ${actualHash}`,
        DiscordErrorType.UNKNOWN,
        undefined,
        true // Retryable - file might be corrupted in transit
      );
    }
  }

  return bytes;
}

export async function discordDownloadFileWithRetry(
  opts: {
    attachmentUrl: string;
    expectedSha256?: string;
  },
  maxRetries: number = 3
): Promise<Uint8Array> {
  let lastError: DiscordError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await discordDownloadFile(opts);
    } catch (e: any) {
      lastError = e instanceof DiscordError ? e : new DiscordError(e.message, DiscordErrorType.UNKNOWN);

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
      console.warn(`[Discord] Download attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, lastError.message);
      await sleep(delayMs);
    }
  }

  throw lastError || new DiscordError('Download failed after retries', DiscordErrorType.UNKNOWN);
}

export async function discordDeleteMessage(opts: {
  webhookUrl: string;
  messageId: string;
}): Promise<void> {
  const res = await fetch(`${opts.webhookUrl}/messages/${opts.messageId}`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 404) {
    const json = (await res.json().catch(() => null)) as DiscordErrorResponse | null;
    throw classifyDiscordError(json, res.status);
  }
}
