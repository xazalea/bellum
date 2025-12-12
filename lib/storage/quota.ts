export const NACHO_STORAGE_LIMIT_BYTES = 7 * 1024 * 1024 * 1024; // 7GB per user

export function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  const kb = 1024;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)} KB`;
  return `${bytes} B`;
}
