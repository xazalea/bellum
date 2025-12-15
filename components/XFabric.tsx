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
import { authService } from "@/lib/firebase/auth-service";
import { unlockAchievement } from "@/lib/gamification/achievements";
import { AppLibrary } from "@/components/AppLibrary";
import { AppRunner } from "@/components/AppRunner";

type CreatedSite = { id: string; domain: string | null; createdAt: number };
type SiteRules = {
  redirects?: Array<{ from: string; to: string; status?: number }>;
  headers?: Array<{ name: string; value: string }>;
};
type ListedSite = { id: string; domain: string | null; createdAt: number; bundleFileId: string; rules?: SiteRules };

type NavKey = "overview" | "projects" | "deploy" | "domains" | "apps" | "analytics" | "settings";

// Vercel-style A record target. Override per-deployment with:
// NEXT_PUBLIC_FABRIK_A_RECORD_TARGET=1.2.3.4
// (Legacy: NEXT_PUBLIC_XFABRIC_A_RECORD_TARGET)
const FABRIK_A_RECORD_TARGET =
  process.env.NEXT_PUBLIC_FABRIK_A_RECORD_TARGET || process.env.NEXT_PUBLIC_XFABRIC_A_RECORD_TARGET || "136.61.15.136";

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
        Set an <span className="font-mono text-white/85">A</span> record to point your domain at Fabrik:
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2 text-sm">
        <div className="text-white/45 font-mono">A name</div>
        <div className="text-white/85 font-mono">@</div>
        <div className="text-white/45 font-mono">A value</div>
        <div className="text-white/85 font-mono">{FABRIK_A_RECORD_TARGET}</div>
      </div>
      <div className="text-xs text-white/40 mt-3">
        On FreeDNS this is usually the <span className="font-mono">A</span> record for the root of your subdomain.
      </div>
    </div>
  );
}

export function FabrikPanel({ initialTab }: { initialTab?: "overview" | "hosting" }) {
  const initial: NavKey = initialTab === "hosting" ? "deploy" : "overview";
  const [nav, setNav] = useState<NavKey>(initial);
  const [runnerAppId, setRunnerAppId] = useState<string | null>(null);

  const [user, setUser] = useState(() => authService.getCurrentUser());
  useEffect(() => authService.onAuthStateChange(setUser), []);

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
        { key: "apps" as const, label: "Apps", icon: Server },
        { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
        { key: "settings" as const, label: "Settings", icon: Settings },
      ],
    [],
  );

  const refreshSites = async () => {
    setSitesError(null);
    setSitesLoading(true);
    try {
      const res = await fetch("/api/fabrik/sites", {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || (res.status === 401 ? "Sign in required." : `Failed to load sites (${res.status})`));
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
  }, [user?.uid]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-24 pb-10">
      <div className="bellum-card border-2 border-white/10 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                <Sparkles className="text-[rgb(186,187,241)]" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-white tracking-tight">Fabrik</div>
                <div className="text-xs text-white/45 truncate">Hosting dashboard</div>
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

          {/* Main */}
          <div className="p-6">
            {runnerAppId && (
              <AppRunner
                appId={runnerAppId}
                onExit={() => {
                  setRunnerAppId(null);
                }}
              />
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  {navItems.find((n) => n.key === nav)?.label ?? "Fabrik"}
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
                <ProjectsView
                  sites={sites}
                  loading={sitesLoading}
                  origin={origin}
                  onGoDeploy={() => setNav("deploy")}
                  onSitesChanged={() => void refreshSites()}
                />
              )}
              {nav === "deploy" && (
                <DeployView
                  origin={origin}
                  signedIn={!!user}
                  onDeployed={async () => {
                    try {
                      window.localStorage.setItem('bellum.mission.deployed_site', '1');
                    } catch {
                      // ignore
                    }
                    unlockAchievement('deployed_site');
                    await refreshSites();
                    setNav("projects");
                  }}
                />
              )}
              {nav === "domains" && <DomainsView sites={sites} loading={sitesLoading} onSitesChanged={() => void refreshSites()} />}
              {nav === "apps" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-bold text-white/90">Edge Apps (Nacho)</div>
                    <div className="text-xs text-white/55 mt-1">
                      Install and run apps that power hosting, automation, and compute across your cluster.
                      This is the same App Library as NachoOS — available directly inside Fabrik.
                    </div>
                  </div>
                  <AppLibrary
                    onRunApp={(appId) => {
                      setRunnerAppId(appId);
                    }}
                  />
                </div>
              )}
              {nav === "analytics" && <AnalyticsView sites={sites} loading={sitesLoading} />}
              {nav === "settings" && <SettingsView sites={sites} onSitesChanged={() => void refreshSites()} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Backwards-compatible export for older imports.
export const XFabricPanel = FabrikPanel;

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
            Static web hosting
          </div>
          <div className="text-sm text-white/55 mt-2">Upload a zip (or import a GitHub repo zip) and serve it from your deployment.</div>
        </div>
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
          <div className="font-extrabold text-white flex items-center gap-2">
            <Globe size={16} className="text-white/70" />
            Custom domains
          </div>
          <div className="text-sm text-white/55 mt-2">Attach a domain to any deployment (DNS A record) and manage it per project.</div>
        </div>
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
          <div className="font-extrabold text-white flex items-center gap-2">
            <Shield size={16} className="text-white/70" />
            Server-verified auth
          </div>
          <div className="text-sm text-white/55 mt-2">All reads/writes go through server APIs with Firebase Admin verification.</div>
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
  onSitesChanged,
}: {
  sites: ListedSite[];
  loading: boolean;
  origin: string;
  onGoDeploy: () => void;
  onSitesChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const deleteSite = async (id: string) => {
    setErr(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/fabrik/sites/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || `Delete failed (${res.status})`);
      }
      onSitesChanged();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {err && <div className="text-sm text-red-200 bg-red-500/10 border-2 border-red-400/20 rounded-xl p-3">{err}</div>}
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
        <div className="grid grid-cols-[1fr_220px_160px_140px] bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-white/40 font-bold">
          <div>Project</div>
          <div>Domain</div>
          <div>Requests</div>
          <div>Actions</div>
        </div>
        <div className="divide-y divide-white/10">
          {sites.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_220px_160px_140px] px-4 py-3 items-center">
              <div className="min-w-0">
                <div className="font-extrabold text-white truncate">{s.id}</div>
                <div className="text-xs text-white/45 font-mono">created: {new Date(s.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-sm text-white/70 truncate font-mono">{s.domain || "—"}</div>
              <div className="text-sm text-white/70 font-mono">
                {typeof (s as any)?.stats?.totalRequests === "number" ? String((s as any).stats.totalRequests) : "—"}
              </div>
              <div className="flex items-center justify-end gap-2">
                <a
                  className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white"
                  href={`${origin}/host/${s.id}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => void deleteSite(s.id)}
                  disabled={busyId === s.id}
                  className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold disabled:opacity-50"
                  title="Delete deployment"
                >
                  Delete
                </button>
              </div>
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
  signedIn,
  onDeployed,
}: {
  origin: string;
  signedIn: boolean;
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
      if (!signedIn) throw new Error("Sign in required.");

      const up = await chunkedUploadFile(bundle, {
        chunkBytes: 32 * 1024 * 1024,
        compressChunks: false,
        onProgress: (p) => setProgress(Math.round((p.uploadedBytes / p.totalBytes) * 100)),
      });

      const res = await fetch("/api/fabrik/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() || undefined, bundleFileId: up.fileId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || (res.status === 401 ? "Sign in required." : `Create failed (${res.status})`));
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
      if (!signedIn) throw new Error("Sign in required.");
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
                <span className="font-mono text-white/80">{FABRIK_A_RECORD_TARGET}</span>.
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

function DomainsView({
  sites,
  loading,
  onSitesChanged,
}: {
  sites: ListedSite[];
  loading: boolean;
  onSitesChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const saveDomain = async (id: string) => {
    setErr(null);
    setBusyId(id);
    try {
      const domain = (drafts[id] ?? "").trim();
      const res = await fetch(`/api/fabrik/sites/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain || null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || `Update failed (${res.status})`);
      }
      await onSitesChanged();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
      <div className="font-extrabold text-white">Domains</div>
      <div className="text-sm text-white/55 mt-2">{loading ? "Loading…" : sites.length ? "Edit domains per deployment:" : "No deployments yet."}</div>
      {err && <div className="mt-4 text-sm text-red-200 bg-red-500/10 border-2 border-red-400/20 rounded-xl p-3">{err}</div>}
      <div className="mt-4 space-y-3">
        {sites.map((s) => (
          <div key={s.id} className="rounded-2xl border-2 border-white/10 bg-black/20 p-4">
            <div className="font-bold text-white">{s.id}</div>
            <div className="text-xs text-white/45 font-mono mt-1">current: {s.domain || "—"}</div>
            <div className="mt-3 flex gap-2">
              <input
                className="bellum-input flex-1"
                placeholder="example.com (optional)"
                value={drafts[s.id] ?? s.domain ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [s.id]: e.target.value }))}
              />
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => void saveDomain(s.id)}
                className="px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 transition-all active:scale-95 font-bold text-sm disabled:opacity-50"
              >
                Save
              </button>
            </div>
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
  const total = sites.reduce((s, x: any) => s + (typeof x?.stats?.totalRequests === "number" ? x.stats.totalRequests : 0), 0);
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
      <div className="font-extrabold text-white">Analytics</div>
      <div className="text-sm text-white/55 mt-2">Per-deployment request counters (best-effort, updated on every served request).</div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard icon={Boxes} label="Projects" value={loading ? "…" : String(sites.length)} />
        <StatCard icon={Activity} label="Requests" value={loading ? "…" : String(total)} />
        <StatCard icon={BarChart3} label="Last activity" value={loading ? "…" : (sites.some((x: any) => x?.stats?.lastRequestAt) ? "tracked" : "—")} />
      </div>

      <div className="mt-6 rounded-2xl border-2 border-white/10 overflow-hidden">
        <div className="grid grid-cols-[1fr_180px_240px] bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-white/40 font-bold">
          <div>Project</div>
          <div>Requests</div>
          <div>Last request</div>
        </div>
        <div className="divide-y divide-white/10">
          {sites.map((s: any) => (
            <div key={s.id} className="grid grid-cols-[1fr_180px_240px] px-4 py-3 items-center">
              <div className="font-bold text-white truncate">{s.id}</div>
              <div className="text-sm text-white/70 font-mono">{typeof s?.stats?.totalRequests === "number" ? String(s.stats.totalRequests) : "—"}</div>
              <div className="text-sm text-white/70 font-mono">
                {typeof s?.stats?.lastRequestAt === "number" ? new Date(s.stats.lastRequestAt).toLocaleString() : "—"}
              </div>
            </div>
          ))}
          {!loading && sites.length === 0 && <div className="px-4 py-10 text-center text-white/45">No projects yet.</div>}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ sites, onSitesChanged }: { sites: ListedSite[]; onSitesChanged: () => void }) {
  const [siteId, setSiteId] = useState<string>(() => (sites[0]?.id ? String(sites[0].id) : ''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId && sites[0]?.id) setSiteId(String(sites[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites.length]);

  const site = sites.find((s) => s.id === siteId) || null;
  const [redirects, setRedirects] = useState<Array<{ from: string; to: string; status: number }>>([]);
  const [headers, setHeaders] = useState<Array<{ name: string; value: string }>>([]);

  useEffect(() => {
    const r = Array.isArray(site?.rules?.redirects) ? site!.rules!.redirects! : [];
    setRedirects(
      r.map((x) => ({
        from: String((x as any)?.from || ''),
        to: String((x as any)?.to || ''),
        status: Number((x as any)?.status || 302),
      })),
    );
    const h = Array.isArray(site?.rules?.headers) ? site!.rules!.headers! : [];
    setHeaders(h.map((x) => ({ name: String((x as any)?.name || ''), value: String((x as any)?.value || '') })));
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!siteId) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/fabrik/sites/${encodeURIComponent(siteId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: {
            redirects,
            headers,
          },
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error || `Save failed (${res.status})`);
      }
      onSitesChanged();
    } catch (e: any) {
      setErr(e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5">
      <div className="font-extrabold text-white">Fabrik rules</div>
      <div className="text-sm text-white/55 mt-2">Cloudflare-style rules applied at the edge (redirects + custom headers).</div>

      {err && <div className="mt-4 text-sm text-red-200 bg-red-500/10 border-2 border-red-400/20 rounded-xl p-3">{err}</div>}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-2xl border-2 border-white/10 bg-black/20 p-4">
          <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Site</div>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="mt-2 w-full bellum-input"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.domain ? s.domain : s.id}
              </option>
            ))}
          </select>

          <div className="mt-4 text-xs text-white/45">
            Applies to <span className="font-mono text-white/70">{site?.domain ? site.domain : `/host/${siteId}`}</span>
          </div>

          <button type="button" onClick={() => void save()} disabled={busy || !siteId} className="mt-4 w-full bellum-btn disabled:opacity-50">
            Save rules
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white/90">Redirects</div>
                <div className="text-xs text-white/45 mt-1">Exact-path redirects (e.g. /old → /new).</div>
              </div>
              <button
                type="button"
                onClick={() => setRedirects((r) => [...r, { from: '/old', to: '/new', status: 302 }])}
                className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold"
              >
                Add
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {redirects.length === 0 ? (
                <div className="text-sm text-white/40">No redirects yet.</div>
              ) : (
                redirects.map((r, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_90px_90px] gap-2">
                    <input
                      className="bellum-input"
                      value={r.from}
                      onChange={(e) => setRedirects((prev) => prev.map((x, idx) => (idx === i ? { ...x, from: e.target.value } : x)))}
                      placeholder="/from"
                    />
                    <input
                      className="bellum-input"
                      value={r.to}
                      onChange={(e) => setRedirects((prev) => prev.map((x, idx) => (idx === i ? { ...x, to: e.target.value } : x)))}
                      placeholder="/to"
                    />
                    <select
                      className="bellum-input"
                      value={String(r.status)}
                      onChange={(e) => setRedirects((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: Number(e.target.value) } : x)))}
                    >
                      <option value="301">301</option>
                      <option value="302">302</option>
                      <option value="307">307</option>
                      <option value="308">308</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setRedirects((prev) => prev.filter((_, idx) => idx !== i))}
                      className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white/90">Response headers</div>
                <div className="text-xs text-white/45 mt-1">Adds headers to every response for this site.</div>
              </div>
              <button
                type="button"
                onClick={() => setHeaders((h) => [...h, { name: 'X-Robots-Tag', value: 'noindex' }])}
                className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold"
              >
                Add
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {headers.length === 0 ? (
                <div className="text-sm text-white/40">No custom headers yet.</div>
              ) : (
                headers.map((h, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_90px] gap-2">
                    <input
                      className="bellum-input"
                      value={h.name}
                      onChange={(e) => setHeaders((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                      placeholder="Header-Name"
                    />
                    <input
                      className="bellum-input"
                      value={h.value}
                      onChange={(e) => setHeaders((prev) => prev.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
                      placeholder="value"
                    />
                    <button
                      type="button"
                      onClick={() => setHeaders((prev) => prev.filter((_, idx) => idx !== i))}
                      className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
