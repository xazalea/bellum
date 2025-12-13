import { fabricCas } from "./cas";
import { semanticMemo, MemoScope } from "./memo";
import { CID } from "./cid";
import { fabricScheduler } from "./scheduler";

export type GraphTaskScope = Extract<MemoScope, "task" | "render" | "compile" | "inference">;

export interface GraphNode {
  id: string;
  scope: GraphTaskScope;
  // A semantic descriptor for the computation (used to dedup across time/users).
  descriptor: unknown;
  // Compute output as JSON-serializable value.
  compute: (inputs: Record<string, unknown>) => Promise<unknown>;
}

export interface GraphSpec {
  nodes: GraphNode[];
  // edges: from -> to, where `to` receives `from` output under key `as`.
  edges: { from: string; to: string; as: string }[];
  outputs: string[]; // node ids
}

export interface GraphRunResult {
  outputCids: Record<string, CID>;
  cacheHits: number;
  computed: number;
}

function buildInputs(spec: GraphSpec, nodeId: string, resolved: Record<string, CID>): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const e of spec.edges) {
    if (e.to !== nodeId) continue;
    const cid = resolved[e.from];
    if (!cid) continue;
    inputs[e.as] = cid;
  }
  return inputs;
}

async function memoKey(node: GraphNode, inputs: Record<string, unknown>): Promise<CID> {
  return semanticMemo.keyForDescriptor({ scope: node.scope, descriptor: node.descriptor, inputs });
}

export class FabricTaskGraph {
  async run(spec: GraphSpec): Promise<GraphRunResult> {
    await semanticMemo.load();

    const nodesById = new Map(spec.nodes.map((n) => [n.id, n] as const));
    const resolved: Record<string, CID> = {};

    // Topological-ish loop: repeatedly pick nodes whose dependencies are resolved.
    let cacheHits = 0;
    let computed = 0;

    const remaining = new Set(spec.nodes.map((n) => n.id));

    // Protect against cycles.
    let guard = 0;

    while (remaining.size > 0) {
      guard++;
      if (guard > 10_000) throw new Error("Graph appears cyclic or too large");

      let progress = false;

      for (const id of Array.from(remaining)) {
        const node = nodesById.get(id);
        if (!node) {
          remaining.delete(id);
          continue;
        }

        // Check if all incoming edges have been resolved.
        const deps = spec.edges.filter((e) => e.to === id).map((e) => e.from);
        const depsReady = deps.every((d) => resolved[d]);
        if (!depsReady) continue;

        const inputs = buildInputs(spec, id, resolved);
        const keyCid = await memoKey(node, inputs);
        const existing = await semanticMemo.get(keyCid);

        if (existing) {
          resolved[id] = existing.outputCid;
          cacheHits++;
        } else {
          const inputValues: Record<string, unknown> = {};
          // Load input CIDs as JSON (best-effort); pass CID if not JSON.
          for (const [k, v] of Object.entries(inputs)) {
            if (typeof v === "string" && v.startsWith("cidv1-")) {
              try {
                inputValues[k] = await fabricCas.getJSON(v as CID);
              } catch {
                inputValues[k] = v;
              }
            } else {
              inputValues[k] = v;
            }
          }

          const output = await node.compute(inputValues);
          const { cid: outputCid } = await fabricCas.putJSON(output);
          await semanticMemo.put({ keyCid, scope: node.scope, outputCid, meta: { nodeId: node.id } });
          resolved[id] = outputCid;
          computed++;
        }

        remaining.delete(id);
        progress = true;
      }

      if (!progress) {
        // no progress implies cycle or missing deps
        const stuck = Array.from(remaining);
        throw new Error(`Graph could not resolve dependencies (stuck: ${stuck.join(", ")})`);
      }
    }

    const outputCids: Record<string, CID> = {};
    for (const outId of spec.outputs) outputCids[outId] = resolved[outId];

    return { outputCids, cacheHits, computed };
  }

  // Temporal compute amplification: schedule graph execution during idle time.
  precompute(spec: GraphSpec, utility = 0.5) {
    fabricScheduler.enqueue({
      id: `graph-${crypto.randomUUID()}`,
      kind: "speculate",
      utility,
      checkpointCost: 0.5,
      run: async () => {
        await this.run(spec);
        return "done";
      }
    });
  }
}

export const fabricGraph = new FabricTaskGraph();
