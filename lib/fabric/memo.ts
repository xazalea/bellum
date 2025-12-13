import { fabricCas } from "./cas";
import { canonicalStringify, cidForText, CID } from "./cid";
import { infiniteStorage } from "@/lib/nacho/storage/infinite-storage";

export type MemoScope = "task" | "transition" | "render" | "compile" | "inference";

export interface MemoEntry {
  keyCid: CID;
  scope: MemoScope;
  outputCid: CID;
  createdAt: number;
  meta?: Record<string, unknown>;
}

const MEMO_INDEX_PATH = "/.fabric/memo/index.json";

// A semantic memo store: canonicalizes descriptors into stable keys, then stores output CIDs.
export class SemanticMemoStore {
  private index: Map<string, MemoEntry> = new Map();
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const blob = await infiniteStorage.readFile(MEMO_INDEX_PATH);
      const text = await blob.text();
      const parsed = JSON.parse(text) as { entries: MemoEntry[] };
      for (const e of parsed.entries) this.index.set(e.keyCid, e);
    } catch {
      // no index yet
    }
  }

  private async persist(): Promise<void> {
    const entries = Array.from(this.index.values());
    const bytes = new TextEncoder().encode(JSON.stringify({ entries }));
    await infiniteStorage.writeFile(MEMO_INDEX_PATH, bytes);
  }

  async keyForDescriptor(descriptor: unknown): Promise<CID> {
    const canonical = canonicalStringify(descriptor);
    return cidForText(canonical);
  }

  async get(keyCid: CID): Promise<MemoEntry | null> {
    await this.load();
    return this.index.get(keyCid) ?? null;
  }

  async put(entry: Omit<MemoEntry, "createdAt">): Promise<MemoEntry> {
    await this.load();
    const full: MemoEntry = { ...entry, createdAt: Date.now() };
    this.index.set(full.keyCid, full);
    await this.persist();
    return full;
  }

  async memoizeJSON(scope: MemoScope, descriptor: unknown, output: unknown, meta?: Record<string, unknown>): Promise<MemoEntry> {
    const keyCid = await this.keyForDescriptor({ scope, descriptor });
    const existing = await this.get(keyCid);
    if (existing) return existing;

    const { cid: outputCid } = await fabricCas.putJSON(output);
    return this.put({ keyCid, scope, outputCid, meta });
  }
}

export const semanticMemo = new SemanticMemoStore();
