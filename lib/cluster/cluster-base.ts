export function getClusterBaseCandidates(): string[] {
  const env =
    (typeof process !== 'undefined' &&
      (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
    '';

  // If not configured, default to same-origin (empty base).
  // This enables Telegram-backed storage routes (`/api/telegram/*`) without forcing a hardcoded cluster IP.
  const trimmed = env.trim();
  if (!trimmed) return [''];

  const primary = trimmed.replace(/\/+$/, '');
  const alt = primary.startsWith('https://')
    ? primary.replace(/^https:\/\//, 'http://')
    : primary.startsWith('http://')
      ? primary.replace(/^http:\/\//, 'https://')
      : primary;

  // Unique, stable order.
  return Array.from(new Set([primary, alt]));
}

export function getClusterBase(): string {
  return getClusterBaseCandidates()[0]!;
}
