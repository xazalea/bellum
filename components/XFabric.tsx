"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Server, Shield, Sparkles, UploadCloud, Link2 } from "lucide-react";
import { chunkedUploadFile } from "@/lib/storage/chunked-upload";
import { getCachedUsername } from "@/lib/auth/nacho-auth";
import { getDeviceFingerprintId } from "@/lib/auth/fingerprint";

type CreatedSite = { id: string; domain: string; createdAt: number };

export function XFabricPanel({ initialTab }: { initialTab?: "overview" | "hosting" }) {
  const [tab, setTab] = useState<"overview" | "hosting">(initialTab ?? "overview");

  return (
    <div className="w-full max-w-6xl mx-auto p-8 pt-24 space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="text-[rgb(186,187,241)]" />
          <h1 className="text-4xl font-bold">XFabric</h1>
        </div>
        <p className="text-white/60">
          WebFabric showcase: distributed primitives for hosting, orchestration, and storage (Telegram-backed).
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab("overview")}
            className={`px-4 py-2 rounded-xl border-2 transition-colors ${
              tab === "overview" ? "bg-white text-black border-white" : "bg-white/5 text-white/70 border-white/10 hover:border-white/25"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("hosting")}
            className={`px-4 py-2 rounded-xl border-2 transition-colors ${
              tab === "hosting" ? "bg-white text-black border-white" : "bg-white/5 text-white/70 border-white/10 hover:border-white/25"
            }`}
          >
            Web hosting
          </button>
        </div>
      </motion.div>

      {tab === "overview" ? <Overview /> : <Hosting />}
    </div>
  );
}

function Overview() {
  const cards = useMemo(
    () => [
      {
        icon: Server,
        title: "Minecraft server hosting (demo)",
        desc: "Show how WebFabric can orchestrate workloads and persist state via Telegram-backed storage.",
      },
      {
        icon: Globe,
        title: "Proxy hosting (legit use-cases)",
        desc: "Host a reverse proxy for your own services (APIs, dashboards, internal tools).",
      },
      {
        icon: Shield,
        title: "Secure-by-default",
        desc: "Firestore locked down; all reads/writes go through server APIs with device trust checks.",
      },
    ],
    [],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((c, i) => (
        <motion.div
          key={c.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
          className="bellum-card p-6 border-2 border-white/10"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center mb-4">
            <c.icon className="text-white/80" />
          </div>
          <div className="text-lg font-bold">{c.title}</div>
          <div className="text-sm text-white/55 mt-2">{c.desc}</div>
        </motion.div>
      ))}
    </div>
  );
}

function Hosting() {
  const username = getCachedUsername();
  const [domain, setDomain] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [created, setCreated] = useState<CreatedSite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const create = async () => {
    setError(null);
    setCreated(null);
    setBusy(true);
    setProgress(0);
    try {
      if (!username) throw new Error("Sign in required (create a username in Account).");
      if (!file) throw new Error("Choose a .zip file containing your site (index.html at root).");
      if (!domain.trim()) throw new Error("Enter a domain you control (you can get one from FreeDNS).");

      // Upload bundle to Telegram-backed storage via existing chunked uploader.
      const up = await chunkedUploadFile(file, {
        chunkBytes: 32 * 1024 * 1024,
        compressChunks: false,
        onProgress: (p) => setProgress(Math.round((p.uploadedBytes / p.totalBytes) * 100)),
      });

      const fp = await getDeviceFingerprintId();
      const res = await fetch("/api/xfabric/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nacho-Username": username, "X-Nacho-Fingerprint": fp },
        body: JSON.stringify({ domain: domain.trim(), bundleFileId: up.fileId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || `Create failed (${res.status})`);
      }
      const j = (await res.json()) as CreatedSite;
      setCreated(j);
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bellum-card p-6 border-2 border-white/10">
        <div className="text-lg font-bold flex items-center gap-2">
          <UploadCloud size={18} className="text-white/70" />
          Host a small site (zip → Telegram → serve)
        </div>
        <div className="text-sm text-white/55 mt-2">
          Upload a zip with <span className="font-mono text-white/80">index.html</span> at the root. We store it in Telegram and serve it from this deployment.
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Domain</div>
            <input
              className="bellum-input"
              placeholder="example.mooo.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <a
              className="text-xs text-white/50 hover:text-white/80 inline-flex items-center gap-2"
              href="https://freedns.afraid.org/domain/registry/"
              target="_blank"
              rel="noreferrer"
            >
              <Link2 size={14} />
              Get a free domain on FreeDNS (opens new tab)
            </a>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Site bundle (.zip)</div>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-2 file:border-white/10 file:bg-white/5 file:text-white/80 hover:file:border-white/25"
            />
            <div className="text-xs text-white/45">We’ll serve it at a safe URL first, then you can point your domain to it.</div>
          </div>
        </div>

        {busy && (
          <div className="mt-4 text-xs text-white/60 font-mono">
            uploading… {progress}%
          </div>
        )}

        {error && <div className="mt-4 text-sm text-red-200 bg-red-500/10 border-2 border-red-400/20 rounded-xl p-3">{error}</div>}

        <div className="mt-5 flex gap-3">
          <button onClick={create} disabled={busy} className="bellum-btn disabled:opacity-50">
            Create hosted site
          </button>
        </div>
      </div>

      {created && (
        <div className="bellum-card p-6 border-2 border-white/10">
          <div className="text-lg font-bold">Site created</div>
          <div className="text-sm text-white/55 mt-2">
            Preview URL:
            <div className="mt-2 font-mono text-white/90 break-all">{`${origin}/host/${created.id}/`}</div>
          </div>
          <div className="text-sm text-white/55 mt-4">
            Next steps to use your domain:
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Point your FreeDNS domain’s DNS (A/CNAME) to this deployment.</li>
              <li>Optionally add the domain as a custom domain in your hosting provider.</li>
              <li>Keep your site bundle small (Telegram chunk limits apply).</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

