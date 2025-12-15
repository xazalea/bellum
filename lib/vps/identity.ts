export type VpsIdentity = {
  vpsId: string;
  createdAt: number;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
};

const STORAGE_KEY = 'fabrik.vps.identity.v1';

function base64Url(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  const base64 = btoa(s);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function exportJwkPair(keyPair: CryptoKeyPair): Promise<{ publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey }> {
  const publicKeyJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey;
  const privateKeyJwk = (await crypto.subtle.exportKey('jwk', keyPair.privateKey)) as JsonWebKey;
  return { publicKeyJwk, privateKeyJwk };
}

async function computeVpsId(publicKeyJwk: JsonWebKey): Promise<string> {
  // Stable ID: sha256(JWK JSON), base64url.
  const enc = new TextEncoder();
  const json = JSON.stringify(publicKeyJwk);
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(json));
  return base64Url(hash);
}

export function loadVpsIdentity(): VpsIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as VpsIdentity;
    if (!j?.vpsId || !j.publicKeyJwk || !j.privateKeyJwk) return null;
    return j;
  } catch {
    return null;
  }
}

export function clearVpsIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function createVpsIdentity(): Promise<VpsIdentity> {
  if (typeof window === 'undefined') throw new Error('client_only');
  // Use P-256 for wide WebCrypto support.
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );

  const { publicKeyJwk, privateKeyJwk } = await exportJwkPair(keyPair as CryptoKeyPair);
  const vpsId = await computeVpsId(publicKeyJwk);
  const identity: VpsIdentity = { vpsId, createdAt: Date.now(), publicKeyJwk, privateKeyJwk };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // ignore
  }
  return identity;
}

