export type CID = string;

// Canonical JSON stringify (stable key order) for semantic keys.
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = canonicalize(obj[k]);
  return out;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // @ts-expect-error: BufferSource strictness
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

export async function cidForBytes(bytes: Uint8Array): Promise<CID> {
  // Prefix allows algorithm agility and avoids collisions with other hash domains.
  return `cidv1-sha256-${await sha256Hex(bytes)}`;
}

export async function cidForText(text: string): Promise<CID> {
  return cidForBytes(new TextEncoder().encode(text));
}

export async function cidForJSON(value: unknown): Promise<CID> {
  return cidForText(canonicalStringify(value));
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}
