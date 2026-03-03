/**
 * Fast content hashing using XXHash64
 * Provides collision-resistant hashing for chunk deduplication
 */

// XXHash64 implementation in TypeScript
// Based on the reference implementation
class XXHash64 {
  private static readonly PRIME64_1 = BigInt('11400714785074694791');
  private static readonly PRIME64_2 = BigInt('14029467366897019727');
  private static readonly PRIME64_3 = BigInt('1609587929392839161');
  private static readonly PRIME64_4 = BigInt('9650029242287828579');
  private static readonly PRIME64_5 = BigInt('2870177450012600261');

  private static rotl64(x: bigint, r: number): bigint {
    return (x << BigInt(r)) | (x >> BigInt(64 - r));
  }

  private static round(acc: bigint, input: bigint): bigint {
    acc = (acc + input * this.PRIME64_2) & BigInt('0xFFFFFFFFFFFFFFFF');
    acc = this.rotl64(acc, 31);
    acc = (acc * this.PRIME64_1) & BigInt('0xFFFFFFFFFFFFFFFF');
    return acc;
  }

  private static mergeRound(acc: bigint, val: bigint): bigint {
    val = this.round(BigInt(0), val);
    acc = acc ^ val;
    acc = (acc * this.PRIME64_1 + this.PRIME64_4) & BigInt('0xFFFFFFFFFFFFFFFF');
    return acc;
  }

  static hash(data: Uint8Array, seed: bigint = BigInt(0)): bigint {
    const len = data.length;
    let h64: bigint;

    if (len >= 32) {
      let v1 = (seed + this.PRIME64_1 + this.PRIME64_2) & BigInt('0xFFFFFFFFFFFFFFFF');
      let v2 = (seed + this.PRIME64_2) & BigInt('0xFFFFFFFFFFFFFFFF');
      let v3 = seed;
      let v4 = (seed - this.PRIME64_1) & BigInt('0xFFFFFFFFFFFFFFFF');

      let p = 0;
      while (p <= len - 32) {
        v1 = this.round(v1, this.readUint64LE(data, p));
        p += 8;
        v2 = this.round(v2, this.readUint64LE(data, p));
        p += 8;
        v3 = this.round(v3, this.readUint64LE(data, p));
        p += 8;
        v4 = this.round(v4, this.readUint64LE(data, p));
        p += 8;
      }

      h64 = this.rotl64(v1, 1) + this.rotl64(v2, 7) + this.rotl64(v3, 12) + this.rotl64(v4, 18);
      h64 = this.mergeRound(h64, v1);
      h64 = this.mergeRound(h64, v2);
      h64 = this.mergeRound(h64, v3);
      h64 = this.mergeRound(h64, v4);
    } else {
      h64 = (seed + this.PRIME64_5) & BigInt('0xFFFFFFFFFFFFFFFF');
    }

    h64 = (h64 + BigInt(len)) & BigInt('0xFFFFFFFFFFFFFFFF');

    // Process remaining bytes
    let p = Math.floor(len / 32) * 32;
    while (p <= len - 8) {
      const k1 = this.round(BigInt(0), this.readUint64LE(data, p));
      h64 = h64 ^ k1;
      h64 = (this.rotl64(h64, 27) * this.PRIME64_1 + this.PRIME64_4) & BigInt('0xFFFFFFFFFFFFFFFF');
      p += 8;
    }

    if (p <= len - 4) {
      h64 = h64 ^ (BigInt(this.readUint32LE(data, p)) * this.PRIME64_1);
      h64 = (this.rotl64(h64, 23) * this.PRIME64_2 + this.PRIME64_3) & BigInt('0xFFFFFFFFFFFFFFFF');
      p += 4;
    }

    while (p < len) {
      h64 = h64 ^ (BigInt(data[p]) * this.PRIME64_5);
      h64 = (this.rotl64(h64, 11) * this.PRIME64_1) & BigInt('0xFFFFFFFFFFFFFFFF');
      p++;
    }

    // Avalanche
    h64 = h64 ^ (h64 >> BigInt(33));
    h64 = (h64 * this.PRIME64_2) & BigInt('0xFFFFFFFFFFFFFFFF');
    h64 = h64 ^ (h64 >> BigInt(29));
    h64 = (h64 * this.PRIME64_3) & BigInt('0xFFFFFFFFFFFFFFFF');
    h64 = h64 ^ (h64 >> BigInt(32));

    return h64;
  }

  private static readUint64LE(data: Uint8Array, offset: number): bigint {
    return (
      BigInt(data[offset]) |
      (BigInt(data[offset + 1]) << BigInt(8)) |
      (BigInt(data[offset + 2]) << BigInt(16)) |
      (BigInt(data[offset + 3]) << BigInt(24)) |
      (BigInt(data[offset + 4]) << BigInt(32)) |
      (BigInt(data[offset + 5]) << BigInt(40)) |
      (BigInt(data[offset + 6]) << BigInt(48)) |
      (BigInt(data[offset + 7]) << BigInt(56))
    );
  }

  private static readUint32LE(data: Uint8Array, offset: number): number {
    return (
      data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)
    );
  }
}

/**
 * Hash a chunk of data using XXHash64
 * @param data The data to hash
 * @param seed Optional seed value (default: 0)
 * @returns Hexadecimal hash string
 */
export function hashChunk(data: Uint8Array, seed: bigint = BigInt(0)): string {
  const hash = XXHash64.hash(data, seed);
  return hash.toString(16).padStart(16, '0');
}

/**
 * Hash multiple chunks and return their hashes
 * @param chunks Array of data chunks
 * @returns Array of hash strings
 */
export function hashChunks(chunks: Uint8Array[]): string[] {
  return chunks.map(chunk => hashChunk(chunk));
}

/**
 * Verify a chunk against its expected hash
 * @param data The data to verify
 * @param expectedHash The expected hash
 * @returns True if hash matches
 */
export function verifyChunkHash(data: Uint8Array, expectedHash: string): boolean {
  const actualHash = hashChunk(data);
  return actualHash === expectedHash;
}

/**
 * Create a content-addressed identifier from hash
 * @param hash The hash string
 * @returns Content-addressed ID (e.g., "xx64:0123456789abcdef")
 */
export function createContentId(hash: string): string {
  return `xx64:${hash}`;
}

/**
 * Parse a content-addressed identifier
 * @param contentId The content ID
 * @returns Hash string or null if invalid
 */
export function parseContentId(contentId: string): string | null {
  if (!contentId.startsWith('xx64:')) return null;
  return contentId.slice(5);
}
