"use client";

import { useEffect, useState } from "react";
import { p2pNode, P2PSignal } from "@/src/nacho/net/p2p_node";
import { fabricRuntime } from "@/lib/fabric/runtime";
import { fabricScheduler } from "@/lib/fabric/scheduler";
import { runFabricSelfTest } from "@/lib/fabric/selftest";

type KvReq =
  | { op: "set"; key: string; value: string }
  | { op: "get"; key: string }
  | { op: "keys" };

type KvRes =
  | { ok: true; value?: string; keys?: string[] }
  | { ok: false; error: string };

export default function FabricPage() {
  const [nodeId, setNodeId] = useState<string | null>(null);

  // Signaling (server-brokered)
  const [remoteId, setRemoteId] = useState<string>("peer-1");
  const [signalError, setSignalError] = useState<string | null>(null);
  const [signalInfo, setSignalInfo] = useState<string>("");

  // Service hosting
  const [kvAddress, setKvAddress] = useState<string | null>(null);
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [kvKey, setKvKey] = useState<string>("hello");
  const [kvValue, setKvValue] = useState<string>("world");
  const [kvResult, setKvResult] = useState<string>("");
  const [selftest, setSelftest] = useState<string>("");
  const [knownServicesJson, setKnownServicesJson] = useState<string>("");

  useEffect(() => {
    setNodeId(p2pNode?.getId() ?? null);

    // Boot fabric runtime
    void fabricRuntime.initialize();

    if (!p2pNode) return;
    p2pNode.onSignal((s) => {
      // Forward local SDP/candidates to the server broker.
      void fetch("/api/fabric/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: s }),
      }).catch(() => {});
    });
  }, []);

  // Poll for inbound signals for this peer and apply them automatically.
  useEffect(() => {
    const node = p2pNode;
    if (!node || !nodeId) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/fabric/signal?peerId=${encodeURIComponent(nodeId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json().catch(() => null)) as { signals?: P2PSignal[] } | null;
        const signals = Array.isArray(j?.signals) ? j!.signals! : [];
        for (const s of signals) {
          if (s.type === "offer") {
            // Answer and let p2pNode emit 'answer' and ICE candidates via onSignal.
            await node.connect(s.from, s.sdp);
          } else if (s.type === "answer") {
            await node.acceptAnswer(s.from, s.sdp);
          } else if (s.type === "candidate") {
            await node.addIceCandidate(s.from, s.candidate);
          }
        }
        if (signals.length) setSignalInfo(`Applied ${signals.length} inbound signals`);
      } catch {
        // ignore
      }
    };
    void tick();
    const t = window.setInterval(() => void tick(), 800);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [nodeId]);

  // Cheap to compute; avoids hook dep lint warnings in prod builds.
  const schedulerStats = fabricScheduler.getStats();

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSignalError(null);
    } catch (e: any) {
      setSignalError(e?.message || "Clipboard copy failed");
    }
  };

  const connectToPeer = async () => {
    setSignalError(null);
    if (!p2pNode) return;
    try {
      await p2pNode.connect(remoteId);
      setSignalInfo(`Sent offer to ${remoteId}`);
    } catch (e: any) {
      setSignalError(e?.message || "Failed to connect");
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

  return (
    <div className="w-full max-w-6xl mx-auto p-8 pt-24 min-h-screen space-y-6">
      <div className="bellum-card p-6 border-2 border-white/10">
        <div className="text-2xl font-bold text-white">Web Fabric</div>
        <div className="text-sm text-white/45 mt-1">
          Connect two browsers via server-brokered signaling, host a service, and call it locally or remotely.
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
          <div className="text-sm font-bold text-white/90">Signaling</div>
          <div className="text-xs text-white/50">
            Enter the other browser’s <span className="font-mono">nodeId</span> and connect. SDP + ICE are brokered server-side under your session.
          </div>

          <div className="flex gap-2">
            <input
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-white/80 font-mono"
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              placeholder="remote nodeId"
            />
            <button className="px-3 py-2 text-xs rounded bg-white/10 hover:bg-white/15 text-white" onClick={connectToPeer}>
              Connect
            </button>
          </div>

          {signalError && <div className="text-xs text-red-300 font-mono">{signalError}</div>}
          {!!signalInfo && <div className="text-xs text-white/60 font-mono">{signalInfo}</div>}
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
            <div className="text-sm font-bold text-white/90">KV service</div>
            <div className="text-xs text-white/45">A deterministic state machine service you can host locally or on a connected peer.</div>
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
