const SHARED_CLUSTER_BASE = '';

function normalizeCandidate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withoutSlash = trimmed.replace(/\/+$/, '');
  return withoutSlash;
}

export function getClusterBaseCandidates(): string[] {
  const env =
    (typeof process !== 'undefined' &&
      (process.env as unknown as { NEXT_PUBLIC_CLUSTER_SERVER_URL?: string })?.NEXT_PUBLIC_CLUSTER_SERVER_URL) ||
    '';

  const seen = new Set<string>();
  const pushCandidate = (value: string | null) => {
    if (value === null) return;
    const normalized = value === '' ? '' : normalizeCandidate(value);
    if (normalized === null) return;
    if (!seen.has(normalized)) {
      seen.add(normalized);
    }
  };

  const addAlternatives = (base: string) => {
    pushCandidate(base);
    if (base.startsWith('https://')) {
      pushCandidate(base.replace(/^https:\/\//, 'http://'));
    } else if (base.startsWith('http://')) {
      pushCandidate(base.replace(/^http:\/\//, 'https://'));
    }
  };

  if (env.trim()) {
    addAlternatives(env.trim());
  }

  addAlternatives(SHARED_CLUSTER_BASE);
  pushCandidate('');

  return Array.from(seen);
}

export function getClusterBase(): string {
  return getClusterBaseCandidates()[0]!;
}
