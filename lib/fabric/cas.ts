import { infiniteStorage } from "@/lib/nacho/storage/infinite-storage";
import { canonicalStringify, cidForBytes, cidForJSON, CID } from "./cid";

export interface CasPutResult {
  cid: CID;
  size: number;
}

const OBJECT_PREFIX = "/.fabric/objects";

export class FabricCAS {
  async putBytes(bytes: Uint8Array): Promise<CasPutResult> {
    const cid = await cidForBytes(bytes);
    await infiniteStorage.writeFile(`${OBJECT_PREFIX}/${cid}`, bytes);
    return { cid, size: bytes.byteLength };
  }

  async getBytes(cid: CID): Promise<Uint8Array> {
    const blob = await infiniteStorage.readFile(`${OBJECT_PREFIX}/${cid}`);
    return new Uint8Array(await blob.arrayBuffer());
  }

  async putJSON<T>(value: T): Promise<CasPutResult> {
    const cid = await cidForJSON(value);
    // Store canonical JSON so identical semantic values map to identical bytes.
    const bytes = new TextEncoder().encode(canonicalStringify(value));
    await infiniteStorage.writeFile(`${OBJECT_PREFIX}/${cid}`, bytes);
    return { cid, size: bytes.byteLength };
  }

  async getJSON<T>(cid: CID): Promise<T> {
    const bytes = await this.getBytes(cid);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  }
}

export const fabricCas = new FabricCAS();
