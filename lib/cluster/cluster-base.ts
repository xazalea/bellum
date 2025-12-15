// Cluster host is an IP; HTTPS is often misconfigured on raw IPs.
// We proxy through our own API anyway, but keep both candidates.
export const DEFAULT_CLUSTER_HOST = '136.61.15.136';

export function getClusterBaseCandidates(): string[] {
  const env =
    (typeof process !== 'undefined' &&
      (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
    '';

  const primary = (env || `https://${DEFAULT_CLUSTER_HOST}`).replace(/\/+$/, '');
  const alt = primary.startsWith('https://')
    ? primary.replace(/^https:\/\//, 'http://')
    : primary.startsWith('http://')
      ? primary.replace(/^http:\/\//, 'https://')
      : `http://${DEFAULT_CLUSTER_HOST}`;

  // Unique, stable order.
  return Array.from(new Set([primary, alt]));
}

export function getClusterBase(): string {
  return getClusterBaseCandidates()[0]!;
}

export function getClusterBase(): string {
  // In Next.js, NEXT_PUBLIC_* vars are inlined for client bundles.
  const v =
    (typeof process !== 'undefined' &&
      (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
    '';
  return v || DEFAULT_CLUSTER_BASE;
}
