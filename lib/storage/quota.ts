// Cloud storage quota (cluster/Telegram-backed). Local/browser storage (OPFS) is not quota-limited.
export const NACHO_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5GB per user

// Challenger Storage quota (fingerprint-based, Discord webhook backend)
export const DISCORD_WEBHOOK_STORAGE_LIMIT_BYTES = 4 * 1024 * 1024 * 1024; // 4GB per fingerprint
export const CHALLENGER_STORAGE_LIMIT_BYTES = DISCORD_WEBHOOK_STORAGE_LIMIT_BYTES; // Alias for branding

export function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  const kb = 1024;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatPercentage(used: number, total: number): string {
  if (total === 0) return '0%';
  return `${((used / total) * 100).toFixed(1)}%`;
}
