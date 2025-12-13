"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { p2pNode, P2PSignal } from "@/src/nacho/net/p2p_node";
import { fabricRuntime } from "@/lib/fabric/runtime";
import { fabricScheduler } from "@/lib/fabric/scheduler";
import { runFabricSelfTest } from "@/lib/fabric/selftest";
import { GraphSpec } from "@/lib/fabric/graph";

type KvReq =
  | { op: "set"; key: string; value: string }
  | { op: "get"; key: string }
  | { op: "keys" };

type KvRes =
  | { ok: true; value?: string; keys?: string[] }
  | { ok: false; error: string };

export default function FabricPage() {
  const [nodeId, setNodeId] = useState<string | null>(null);

  // Manual signaling
  const [remoteId, setRemoteId] = useState<string>("peer-1");
  const [signalOut, setSignalOut] = useState<P2PSignal[]>([]);
  const [signalIn, setSignalIn] = useState<string>("");
  const [signalError, setSignalError] = useState<string | null>(null);

  // Service hosting
  const [kvAddress, setKvAddress] = useState<string | null>(null);
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [kvKey, setKvKey] = useState<string>("hello");
  const [kvValue, setKvValue] = useState<string>("world");
  const [kvResult, setKvResult] = useState<string>("");
  const [selftest, setSelftest] = useState<string>("");
  const [knownServicesJson, setKnownServicesJson] = useState<string>("");

  const [graphResult, setGraphResult] = useState<string>("");
  const [graphMs, setGraphMs] = useState<number | null>(null);

  const lastSignalRef = useRef<P2PSignal | null>(null);

  useEffect(() => {
    setNodeId(p2pNode?.getId() ?? null);

    // Boot fabric runtime
    void fabricRuntime.initialize();

    if (!p2pNode) return;
    p2pNode.onSignal((s) => {
      lastSignalRef.current = s;
      setSignalOut((prev) => [s, ...prev].slice(0, 50));
    });
  }, []);

  const schedulerStats = useMemo(() => fabricScheduler.getStats(), [signalOut, kvResult]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSignalError(null);
    } catch (e: any) {
      setSignalError(e?.message || "Clipboard copy failed");
    }
  };

  const createOffer = async () => {
    setSignalError(null);
    if (!p2pNode) return;
    try {
      setSignalOut([]);
      await p2pNode.connect(remoteId);
    } catch (e: any) {
      setSignalError(e?.message || "Failed to create offer");
    }
  };

  const acceptOfferCreateAnswer = async () => {
    setSignalError(null);
    if (!p2pNode) return;
    try {
      const parsed = JSON.parse(signalIn) as P2PSignal | P2PSignal[];
      const signals = Array.isArray(parsed) ? parsed : [parsed];
      const offer = signals.find((s) => s.type === "offer") as P2PSignal & { type: "offer" };
      if (!offer) throw new Error("No offer in pasted JSON");

      // Create answer
      await p2pNode.connect(remoteId, offer.sdp);

      // Apply any candidates included
      for (const s of signals) {
        if (s.type === "candidate") await p2pNode.addIceCandidate(remoteId, s.candidate);
      }
    } catch (e: any) {
      setSignalError(e?.message || "Failed to accept offer");
    }
  };

  const acceptAnswerAndCandidates = async () => {
    setSignalError(null);
    if (!p2pNode) return;
    try {
      const parsed = JSON.parse(signalIn) as P2PSignal | P2PSignal[];
      const signals = Array.isArray(parsed) ? parsed : [parsed];
      const answer = signals.find((s) => s.type === "answer") as P2PSignal & { type: "answer" };
      if (!answer) throw new Error("No answer in pasted JSON");

      await p2pNode.acceptAnswer(remoteId, answer.sdp);

      for (const s of signals) {
        if (s.type === "candidate") await p2pNode.addIceCandidate(remoteId, s.candidate);
      }
    } catch (e: any) {
      setSignalError(e?.message || "Failed to accept answer");
    }
  };

  const hostKv = async () => {
    const handle = await fabricRuntime.hostService<Record<string, string>, KvReq, KvRes>({
      serviceName: "kv",
      codeId: "v1",
      initialState: {},
      reducer: (state, req) => {
        const next = { ...state };
        if (req.op === "set") {
          next[req.key] = req.value;
          return { nextState: next, response: { ok: true }, trace: { op: "set", key: req.key } };
        }
        if (req.op === "get") {
          return { nextState: next, response: { ok: true, value: next[req.key] }, trace: { op: "get", key: req.key } };
        }
        if (req.op === "keys") {
          return { nextState: next, response: { ok: true, keys: Object.keys(next).sort() }, trace: { op: "keys" } };
        }
        return { nextState: next, response: { ok: false, error: "unknown op" }, trace: { op: "unknown" } };
      }
    });

    setKvAddress(handle.address);
    setTargetAddress(handle.address);
    setKvResult(`Hosted kv at ${handle.address}`);

    // Temporal amplification: speculate likely futures
    fabricRuntime.speculate(handle, [
      { request: { op: "get", key: "hello" }, probability: 0.4 },
      { request: { op: "keys" }, probability: 0.2 }
    ]);
  };

  const callKv = async (req: KvReq) => {
    if (!targetAddress) return;
    const res = await fabricRuntime.call<KvReq, KvRes>(targetAddress, req);
    setKvResult(JSON.stringify(res, null, 2));
  };

  const refreshKnownServices = () => {
    const list = fabricRuntime.listKnownServices();
    setKnownServicesJson(JSON.stringify(list, null, 2));
  };

  const demoGraphSpec: GraphSpec = useMemo(() => {
    // A tiny “compilation-like” pipeline:
    // parse -> optimize -> codegen -> link (all deterministic JSON)
    return {
      nodes: [
        {
          id: "parse",
          scope: "compile",
          descriptor: { stage: "parse", lang: "toy-v1" },
          compute: async () => ({ ast: ["ADD", 1, ["MUL", 2, 3]] })
        },
        {
          id: "opt",
          scope: "compile",
          descriptor: { stage: "opt", pass: "const-fold-v1" },
          compute: async (inputs) => {
            const ast = (inputs.ast as any[]) || [];
            // toy constant fold for AST structure above
            if (ast[0] === "ADD" && ast[2]?.[0] === "MUL") return { ast: ["ADD", ast[1], 6] };
            return { ast };
          }
        },
        {
          id: "codegen",
          scope: "compile",
          descriptor: { stage: "codegen", target: "wasm-toy-v1" },
          compute: async (inputs) => ({ wasmIR: `push ${inputs.ast?.[1] ?? 0}; push ${inputs.ast?.[2] ?? 0}; add;` })
        },
        {
          id: "link",
          scope: "compile",
          descriptor: { stage: "link", format: "module-v1" },
          compute: async (inputs) => ({ module: { text: inputs.wasmIR, exports: ["main"] } })
        }
      ],
      edges: [
        { from: "parse", to: "opt", as: "ast" },
        { from: "opt", to: "codegen", as: "ast" },
        { from: "codegen", to: "link", as: "wasmIR" }
      ],
      outputs: ["link"]
    };
  }, []);

  const runGraph = async () => {
    const start = performance.now();
    const res = await fabricRuntime.runGraph(demoGraphSpec);
    const ms = performance.now() - start;
    setGraphMs(ms);
    setGraphResult(JSON.stringify(res, null, 2));
  };

  const runMapReduce = async () => {
    const spec: GraphSpec = {
      nodes: [
        {
          id: "source",
          scope: "task",
          descriptor: { stage: "source", version: 1, n: 50000 },
          compute: async () => Array.from({ length: 50_000 }, (_, i) => i + 1)
        },
        {
          id: "map",
          scope: "task",
          descriptor: { stage: "map", version: 1, op: "square" },
          compute: async (inputs) => {
            const xs = (inputs.xs as number[]) || [];
            return xs.map((x) => x * x);
          }
        },
        {
          id: "reduce",
          scope: "task",
          descriptor: { stage: "reduce", version: 1, op: "sum" },
          compute: async (inputs) => {
            const xs = (inputs.xs as number[]) || [];
            let s = 0;
            for (let i = 0; i < xs.length; i++) s += xs[i];
            return { sum: s, n: xs.length };
          }
        }
      ],
      edges: [
        { from: "source", to: "map", as: "xs" },
        { from: "map", to: "reduce", as: "xs" }
      ],
      outputs: ["reduce"]
    };

    const start = performance.now();
    const res = await fabricRuntime.runGraph(spec);
    const ms = performance.now() - start;
    setGraphMs(ms);
    setGraphResult(JSON.stringify(res, null, 2));
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-8 pt-24 min-h-screen space-y-6">
      <div className="bellum-card p-6 border-2 border-white/10">
        <div className="text-2xl font-bold text-white">Web Fabric (Built-in Prototype)</div>
        <div className="text-sm text-white/45 mt-1">
          Beginner path: connect 2 browsers → host a service → call it locally or remotely → observe caching & idle-time precompute speedups.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bellum-card p-6 border-2 border-white/10 space-y-3">
          <div className="text-sm font-bold text-white/90">Node</div>
          <div className="text-xs font-mono text-white/60">nodeId: {nodeId ?? "(not available)"}</div>
          <div className="text-xs font-mono text-white/60">
            fabric: {JSON.stringify(fabricRuntime.getStats())}
          </div>
          <div className="text-xs font-mono text-white/60">
            scheduler: {JSON.stringify(schedulerStats)}
          </div>
          <div className="pt-2 flex gap-2">
            <button className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white" onClick={refreshKnownServices}>
              Refresh known services
            </button>
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={() => copy(nodeId ?? "")}
              disabled={!nodeId}
            >
              Copy nodeId
            </button>
          </div>
        </div>

        <div className="bellum-card p-6 border-2 border-white/10 space-y-3">
          <div className="text-sm font-bold text-white/90">Manual WebRTC signaling (no external infra)</div>
          <div className="text-xs text-white/50">
            This is the minimum viable mesh: copy/paste offer/answer/candidates between two browsers.
          </div>

          <div className="flex gap-2">
            <input
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-white/80 font-mono"
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              placeholder="remoteId (same string on both sides)"
            />
            <button className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white" onClick={createOffer}>
              Create offer
            </button>
          </div>

          <textarea
            className="w-full h-28 bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-white/80 font-mono"
            value={signalIn}
            onChange={(e) => setSignalIn(e.target.value)}
            placeholder="Paste remote signal JSON here (offer/answer/candidates)"
          />

          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={acceptOfferCreateAnswer}
            >
              Accept offer → create answer
            </button>
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={acceptAnswerAndCandidates}
            >
              Accept answer
            </button>
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={() => {
                setSignalOut([]);
                setSignalError(null);
              }}
            >
              Clear
            </button>
          </div>

          {signalError && <div className="text-xs text-red-300 font-mono">{signalError}</div>}

          <div className="text-xs text-white/60">Outbound signals (copy to other side):</div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={() => copy(JSON.stringify(signalOut, null, 2))}
              disabled={signalOut.length === 0}
            >
              Copy outbound JSON
            </button>
          </div>
          <pre className="w-full max-h-40 overflow-auto bg-black/30 border border-white/10 rounded p-3 text-[11px] text-white/80">
            {JSON.stringify(signalOut, null, 2)}
          </pre>
        </div>
      </div>

      <div className="bellum-card p-6 border-2 border-white/10 space-y-3">
        <div className="text-sm font-bold text-white/90">Discovered services (from mesh advertisements)</div>
        <div className="text-xs text-white/45">
          After connecting peers, hosted services show up here. Click-copy an address into “target” below.
        </div>
        <pre className="w-full max-h-48 overflow-auto bg-black/30 border border-white/10 rounded p-3 text-[11px] text-white/80">
          {knownServicesJson || "(click Refresh known services)"}
        </pre>
      </div>

      <div className="bellum-card p-6 border-2 border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white/90">Demo: deterministic KV servicelet</div>
            <div className="text-xs text-white/45">State machine + replayable transitions + memoized transitions + speculative precompute.</div>
          </div>
          <button className="px-3 py-2 text-xs rounded bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-200" onClick={hostKv}>
            Host KV
          </button>
        </div>

        <div className="text-xs font-mono text-white/60">address: {kvAddress ?? "(not hosted)"}</div>
        <div className="text-xs text-white/50">target (local or remote):</div>
        <div className="flex gap-2">
          <input
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-white/80 font-mono"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            placeholder="fabric://<serviceId>"
          />
          <button
            className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
            onClick={() => copy(targetAddress)}
            disabled={!targetAddress}
          >
            Copy target
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-white/80 font-mono"
            value={kvKey}
            onChange={(e) => setKvKey(e.target.value)}
            placeholder="key"
          />
          <input
            className="bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-white/80 font-mono"
            value={kvValue}
            onChange={(e) => setKvValue(e.target.value)}
            placeholder="value"
          />
          <div className="flex gap-2">
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={() => callKv({ op: "set", key: kvKey, value: kvValue })}
              disabled={!targetAddress}
            >
              set
            </button>
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={() => callKv({ op: "get", key: kvKey })}
              disabled={!targetAddress}
            >
              get
            </button>
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={() => callKv({ op: "keys" })}
              disabled={!targetAddress}
            >
              keys
            </button>
          </div>
        </div>

        <pre className="w-full bg-black/30 border border-white/10 rounded p-3 text-[11px] text-white/80 overflow-auto">
          {kvResult || "(no output)"}
        </pre>
      </div>

      <div className="bellum-card p-6 border-2 border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white/90">Demo: task graph (semantic caching)</div>
            <div className="text-xs text-white/45">
              Run twice: the second run should show more cache hits (execution reuse & deduplication).
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white" onClick={runGraph}>
              Run graph
            </button>
            <button className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white" onClick={runMapReduce}>
              Run map-reduce
            </button>
            <button
              className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
              onClick={() => fabricRuntime.precomputeGraph(demoGraphSpec, 0.8)}
            >
              Precompute in idle
            </button>
          </div>
        </div>
        <div className="text-xs font-mono text-white/60">last run: {graphMs !== null ? `${graphMs.toFixed(1)}ms` : "n/a"}</div>
        <pre className="w-full bg-black/30 border border-white/10 rounded p-3 text-[11px] text-white/80 overflow-auto">
          {graphResult || "(no output)"}
        </pre>
      </div>

      <div className="bellum-card p-6 border-2 border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white/90">Self-test</div>
            <div className="text-xs text-white/45">Sanity checks for determinism, CID stability, and memoization.</div>
          </div>
          <button
            className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white"
            onClick={async () => {
              const res = await runFabricSelfTest();
              setSelftest(JSON.stringify(res, null, 2));
            }}
          >
            Run self-test
          </button>
        </div>
        <pre className="w-full bg-black/30 border border-white/10 rounded p-3 text-[11px] text-white/80 overflow-auto">
          {selftest || "(not run yet)"}
        </pre>
      </div>
    </div>
  );
}
