export const DEFAULT_CLUSTER_BASE = 'https://136.61.15.136';

export function getClusterBase(): string {
  // In Next.js, NEXT_PUBLIC_* vars are inlined for client bundles.
  const v =
    (typeof process !== 'undefined' &&
      (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
    '';
  return v || DEFAULT_CLUSTER_BASE;
}
