"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Boxes,
  Cpu,
  ExternalLink,
  FolderGit2,
  Globe,
  HardDrive,
  Link2,
  Rocket,
  Server,
  Settings,
  Shield,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { chunkedUploadFile } from "@/lib/storage/chunked-upload";
import { getCachedUsername } from "@/lib/auth/nacho-auth";
import { getDeviceFingerprintId } from "@/lib/auth/fingerprint";

type CreatedSite = { id: string; domain: string | null; createdAt: number };
type ListedSite = { id: string; domain: string | null; createdAt: number; bundleFileId: string };

type NavKey = "overview" | "projects" | "deploy" | "domains" | "analytics" | "settings";

// Vercel-style A record target. Override per-deployment with:
// NEXT_PUBLIC_XFABRIC_A_RECORD_TARGET=1.2.3.4
const XFABRIC_A_RECORD_TARGET = process.env.NEXT_PUBLIC_XFABRIC_A_RECORD_TARGET || "136.61.15.136";

function normalizeGitHubRepoUrl(raw: string): { owner: string; repo: string; url: string } {
  const s = raw.trim();
  // https://github.com/owner/repo(.git)
  try {
    const u = new URL(s);
    if (u.hostname !== "github.com") throw new Error("Only github.com is supported right now.");
    const parts = u.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    if (parts.length < 2) throw new Error("Invalid GitHub repo URL.");
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  } catch {
    // git@github.com:owner/repo(.git)
    const m = s.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!m) throw new Error("Invalid repo URL (supported: https://github.com/owner/repo or git@github.com:owner/repo.git).\n");
    return { owner: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}` };
  }
}

function githubZipUrl(owner: string, repo: string, branch: string) {
  // codeload supports CORS for downloads; works great for “clone” UX without git binary.
  return `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(branch)}`;
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
        <Icon size={16} className="text-white/80" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest text-white/40 font-bold">{label}</div>
        <div className="text-lg font-extrabold text-white truncate">{value}</div>
      </div>
    </div>
  );
}

function DnsARecordCallout() {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-widest text-white/40 font-bold">DNS (Vercel-style)</div>
      <div className="text-sm text-white/70 mt-2">
        Set an <span className="font-mono text-white/85">A</span> record to point your domain at XFabric:
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2 text-sm">
        <div className="text-white/45 font-mono">A name</div>
        <div className="text-white/85 font-mono">@</div>
        <div className="text-white/45 font-mono">A value</div>
        <div className="text-white/85 font-mono">{XFABRIC_A_RECORD_TARGET}</div>
      </div>
      <div className="text-xs text-white/40 mt-3">
        On FreeDNS this is usually the <span className="font-mono">A</span> record for the root of your subdomain.
      </div>
    </div>
  );
}

export function XFabricPanel({ initialTab }: { initialTab?: "overview" | "hosting" }) {
  const initial: NavKey = initialTab === "hosting" ? "deploy" : "overview";
  const [nav, setNav] = useState<NavKey>(initial);

  const username = getCachedUsername();

  const [sites, setSites] = useState<ListedSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const navItems = useMemo(
    () =>
      [
        { key: "overview" as const, label: "Overview", icon: Sparkles },
        { key: "projects" as const, label: "Projects", icon: Boxes },
        { key: "deploy" as const, label: "Deploy", icon: Rocket },
        { key: "domains" as const, label: "Domains", icon: Globe },
        { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
        { key: "settings" as const, label: "Settings", icon: Settings },
      ],
    [],
  );

  const refreshSites = async () => {
    setSitesError(null);
    setSitesLoading(true);
    try {
      if (!username) throw new Error("Sign in required.");
      const fp = await getDeviceFingerprintId();
      const res = await fetch("/api/xfabric/sites", {
        headers: { "X-Nacho-Username": username, "X-Nacho-Fingerprint": fp },
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || `Failed to load sites (${res.status})`);
      }
      const j = (await res.json()) as { sites?: ListedSite[] };
      setSites(Array.isArray(j?.sites) ? j.sites : []);
    } catch (e: any) {
      setSitesError(e?.message || "Failed to load sites");
    } finally {
      setSitesLoading(false);
    }
  };

  useEffect(() => {
    void refreshSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-24 pb-10">
      <div className="bellum-card border-2 border-white/10 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          {/* Sidebar (Cloudflare-ish) */}
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                <Sparkles className="text-[rgb(186,187,241)]" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-white tracking-tight">XFabric</div>
                <div className="text-xs text-white/45 truncate">WebFabric dashboard</div>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              {navItems.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setNav(it.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-colors ${
                    nav === it.key
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-white/70 border-white/10 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <it.icon size={16} />
                  <span className="text-sm font-semibold">{it.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Cluster</div>
              <div className="text-xs text-white/55 mt-2">
                Bandwidth mode: <span className="text-white/80 font-mono">enabled</span>
              </div>
              <div className="text-xs text-white/45 mt-1">WebRTC binary streaming + cache-aware routing.</div>
            </div>
          </div>

          {/* Main (Vercel-ish) */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  {navItems.find((n) => n.key === nav)?.label ?? "XFabric"}
                </div>
                <div className="text-sm text-white/55 mt-1">Telegram-backed storage + distributed edge compute across your cluster.</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshSites()}
                  className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold"
                >
                  Refresh
                </button>
                <button type="button" onClick={() => setNav("deploy")} className="bellum-btn">
                  New deployment
                </button>
              </div>
            </div>

            {sitesError && (
              <div className="mt-5 text-sm text-red-200 bg-red-500/10 border-2 border-red-400/20 rounded-xl p-3">{sitesError}</div>
            )}

            <div className="mt-6">
              {nav === "overview" && (
                <OverviewDashboard sites={sites} loading={sitesLoading} onGoDeploy={() => setNav("deploy")} />
              )}
              {nav === "projects" && (
                <ProjectsView sites={sites} loading={sitesLoading} origin={origin} onGoDeploy={() => setNav("deploy")} />
              )}
              {nav === "deploy" && (
                <DeployView
                  origin={origin}
                  username={username}
                  onDeployed={async () => {
                    await refreshSites();
                    setNav("projects");
                  }}
                />
              )}
              {nav === "domains" && <DomainsView sites={sites} loading={sitesLoading} />}
              {nav === "analytics" && <AnalyticsView sites={sites} loading={sitesLoading} />}
              {nav === "settings" && <SettingsView />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewDashboard({ sites, loading, onGoDeploy }: { sites: ListedSite[]; loading: boolean; onGoDeploy: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={Boxes} label="Projects" value={loading ? "…" : String(sites.length)} />
        <StatCard icon={Cpu} label="Edge compute" value="Cluster mesh" />
        <StatCard icon={HardDrive} label="Storage" value="Telegram CAS" />
        <StatCard icon={Activity} label="Bandwidth" value="Binary streams" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
          <div className="font-extrabold text-white flex items-center gap-2">
            <Server size={16} className="text-white/70" />
            Minecraft hosting (showcase)
          </div>
          <div className="text-sm text-white/55 mt-2">Orchestrate workloads, persist worlds, and stream state across nodes.</div>
        </div>
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
          <div className="font-extrabold text-white flex items-center gap-2">
            <Globe size={16} className="text-white/70" />
            Proxy hosting
          </div>
          <div className="text-sm text-white/55 mt-2">Route to services with policy-aware controls (Cloudflare-ish).</div>
        </div>
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
          <div className="font-extrabold text-white flex items-center gap-2">
            <Shield size={16} className="text-white/70" />
            Zero-trust identity
          </div>
          <div className="text-sm text-white/55 mt-2">Device-trust headers gate writes; cluster membership is auditable.</div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="font-extrabold text-white">Deploy a site in under a minute</div>
          <div className="text-sm text-white/55 mt-1">Upload a zip, or import a GitHub repo (clone-like).</div>
        </div>
        <button onClick={onGoDeploy} className="bellum-btn">
          Deploy now
        </button>
      </div>
    </div>
  );
}

function ProjectsView({
  sites,
  loading,
  origin,
  onGoDeploy,
}: {
  sites: ListedSite[];
  loading: boolean;
  origin: string;
  onGoDeploy: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
        <div className="text-sm text-white/60">{loading ? "Loading…" : sites.length ? "Your deployments (latest first)." : "No deployments yet."}</div>
        <button
          onClick={onGoDeploy}
          className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold"
        >
          New
        </button>
      </div>

      <div className="rounded-2xl border-2 border-white/10 overflow-hidden">
        <div className="grid grid-cols-[1fr_220px_140px] bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-white/40 font-bold">
          <div>Project</div>
          <div>Domain</div>
          <div>Open</div>
        </div>
        <div className="divide-y divide-white/10">
          {sites.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_220px_140px] px-4 py-3 items-center">
              <div className="min-w-0">
                <div className="font-extrabold text-white truncate">{s.id}</div>
                <div className="text-xs text-white/45 font-mono">created: {new Date(s.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-sm text-white/70 truncate font-mono">{s.domain || "—"}</div>
              <a className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white" href={`${origin}/host/${s.id}/`} target="_blank" rel="noreferrer">
                Preview <ExternalLink size={14} />
              </a>
            </div>
          ))}
          {!loading && sites.length === 0 && <div className="px-4 py-10 text-center text-white/45">No projects yet.</div>}
        </div>
      </div>
    </div>
  );
}

function DeployView({
  origin,
  username,
  onDeployed,
}: {
  origin: string;
  username: string | null;
  onDeployed: () => Promise<void>;
}) {
  const [domain, setDomain] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [created, setCreated] = useState<CreatedSite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deployZip = async (bundle: File) => {
    setError(null);
    setCreated(null);
    setBusy(true);
    setProgress(0);
    try {
      if (!username) throw new Error("Sign in required (create a username in Account). ");

      const up = await chunkedUploadFile(bundle, {
        chunkBytes: 32 * 1024 * 1024,
        compressChunks: false,
        onProgress: (p) => setProgress(Math.round((p.uploadedBytes / p.totalBytes) * 100)),
      });

      const fp = await getDeviceFingerprintId();
      const res = await fetch("/api/xfabric/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nacho-Username": username, "X-Nacho-Fingerprint": fp },
        body: JSON.stringify({ domain: domain.trim() || undefined, bundleFileId: up.fileId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || `Create failed (${res.status})`);
      }
      const j = (await res.json()) as CreatedSite;
      setCreated(j);
      await onDeployed();
    } catch (e: any) {
      setError(e?.message || "Deploy failed");
    } finally {
      setBusy(false);
    }
  };

  const importFromGitHub = async () => {
    setError(null);
    setCreated(null);
    setBusy(true);
    setProgress(0);
    try {
      if (!username) throw new Error("Sign in required (create a username in Account). ");
      const { owner, repo } = normalizeGitHubRepoUrl(repoUrl);
      const zip = githubZipUrl(owner, repo, repoBranch.trim() || "main");
      const res = await fetch(zip, { cache: "no-store" });
      if (!res.ok) throw new Error(`GitHub download failed (${res.status})`);
      const blob = await res.blob();
      const bundle = new File([blob], `${owner}-${repo}-${repoBranch}.zip`, { type: "application/zip" });
      await deployZip(bundle);
    } catch (e: any) {
      setError(e?.message || "Git import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bellum-card p-6 border-2 border-white/10">
        <div className="text-lg font-extrabold flex items-center gap-2">
          <Rocket size={18} className="text-white/70" />
          Deploy
        </div>
        <div className="text-sm text-white/55 mt-2">Deploy a static site to XFabric (zip → Telegram → serve). You can also “clone” from GitHub by importing a repo zip.</div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Domain (optional)</div>
            <input className="bellum-input" placeholder="example.mooo.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <a className="text-xs text-white/50 hover:text-white/80 inline-flex items-center gap-2" href="https://freedns.afraid.org/domain/registry/" target="_blank" rel="noreferrer">
              <Link2 size={14} />
              Get a free domain on FreeDNS (opens new tab)
            </a>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Site bundle (.zip)</div>
            <input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-2 file:border-white/10 file:bg-white/5 file:text-white/80 hover:file:border-white/25" />
            <div className="text-xs text-white/45">Zip should contain <span className="font-mono text-white/70">index.html</span> at the root.</div>
          </div>
        </div>

        <div className="mt-5">
          <DnsARecordCallout />
        </div>

        <div className="mt-5 rounded-2xl border-2 border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 font-extrabold text-white">
            <FolderGit2 size={16} className="text-white/70" />
            Import from Git (GitHub)
          </div>
          <div className="text-sm text-white/55 mt-1">Paste a GitHub repo URL and we’ll fetch the zip (fast “clone” UX), then deploy it.</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_160px_160px] gap-2">
            <input className="bellum-input" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
            <input className="bellum-input" placeholder="branch" value={repoBranch} onChange={(e) => setRepoBranch(e.target.value)} />
            <button type="button" disabled={busy || !repoUrl.trim()} onClick={() => void importFromGitHub()} className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm disabled:opacity-50">
              Import & Deploy
            </button>
          </div>
          <div className="text-xs text-white/40 mt-2">Note: GitHub-only for now (GitLab/Bitbucket next).</div>
        </div>

        {busy && <div className="mt-4 text-xs text-white/60 font-mono">uploading… {progress}%</div>}

        {error && <div className="mt-4 text-sm text-red-200 bg-red-500/10 border-2 border-red-400/20 rounded-xl p-3">{error}</div>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => {
              if (!file) {
                setError("Choose a .zip first, or import from GitHub.");
                return;
              }
              void deployZip(file);
            }}
            disabled={busy}
            className="bellum-btn disabled:opacity-50"
          >
            Deploy zip
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
            Next steps to use your domain (FreeDNS-style):
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>
                Create an <span className="font-mono">A</span> record pointing to{" "}
                <span className="font-mono text-white/80">{XFABRIC_A_RECORD_TARGET}</span>.
              </li>
              <li>Wait for DNS propagation (a few minutes up to an hour).</li>
              <li>Keep your site bundle small (Telegram chunk limits apply).</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function DomainsView({ sites, loading }: { sites: ListedSite[]; loading: boolean }) {
  const domains = sites.filter((s) => !!s.domain).map((s) => s.domain as string);
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
      <div className="font-extrabold text-white">Domains</div>
      <div className="text-sm text-white/55 mt-2">{loading ? "Loading…" : domains.length ? "Domains connected to your deployments:" : "No domains connected yet."}</div>
      <div className="mt-4 space-y-2">
        {domains.map((d) => (
          <div key={d} className="px-3 py-2 rounded-xl border-2 border-white/10 bg-black/20 font-mono text-sm text-white/80">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <DnsARecordCallout />
      </div>
      <a className="mt-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/85" href="https://freedns.afraid.org/domain/registry/" target="_blank" rel="noreferrer">
        <Link2 size={14} />
        Get a free domain (FreeDNS)
      </a>
    </div>
  );
}

function AnalyticsView({ sites, loading }: { sites: ListedSite[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
      <div className="font-extrabold text-white">Analytics</div>
      <div className="text-sm text-white/55 mt-2">Coming next: request volume, edge cache hit-rate, cluster bandwidth, and per-project receipts.</div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard icon={Activity} label="Projects" value={loading ? "…" : String(sites.length)} />
        <StatCard icon={BarChart3} label="Cache hit" value="—" />
        <StatCard icon={Cpu} label="Edge CPU" value="—" />
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
      <div className="font-extrabold text-white">XFabric settings</div>
      <div className="text-sm text-white/55 mt-2">Coming next: cluster role toggles (ingress/storage/compute), bandwidth caps, and per-project auth.</div>
    </div>
  );
}
