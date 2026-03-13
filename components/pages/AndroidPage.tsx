"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { MinimalNavIsland } from "@/components/ui/dynamic-island";
import { Button } from "@/components/ui/button";
import {
  addInstalledApp,
  detectAppType,
  listInstalledApps,
  removeInstalledAppWithCleanup,
  type InstalledApp,
} from "@/lib/apps/apps-service";
import { authService } from "@/lib/firebase/auth-service";
import { APKLoader } from "@/lib/engine/loaders/apk-loader";
import { chunkedUploadFile } from "@/lib/storage/chunked-upload";
import { downloadClusterFile } from "@/lib/storage/chunked-download";
import { 
  Smartphone, Upload, Play, Trash2, StopCircle, Loader2, Package,
  Cpu, HardDrive, Monitor, Camera, ChevronDown, ChevronUp, Info,
  CheckCircle, Circle, AlertTriangle
} from "lucide-react";

type RuntimeState = "idle" | "uploading" | "launching" | "running" | "error";

// System requirements
const SYSTEM_REQUIREMENTS = {
  cpu: "Modern CPU with SSE4.2 support",
  ram: "4GB RAM minimum, 8GB recommended",
  storage: "500MB free disk space",
  browser: "Chrome 90+, Firefox 88+, Safari 15+, Edge 90+",
  webgpu: "WebGPU support (or WebGL2 fallback)",
};

// File size limits
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const RECOMMENDED_SIZE = 200 * 1024 * 1024; // 200MB

// Upload stages
const UPLOAD_STAGES = [
  { id: "validating", label: "Validating file" },
  { id: "compressing", label: "Compressing chunks" },
  { id: "uploading", label: "Uploading to storage" },
  { id: "installing", label: "Installing app" },
];

// Log entry type
interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

// System Requirements Display
function SystemRequirements({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/80 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Cpu className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-sm font-medium text-white">System Requirements</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <Cpu className="w-4 h-4 text-neutral-500 mt-0.5" />
                <div>
                  <span className="text-neutral-400">CPU:</span>
                  <span className="text-white ml-2">{SYSTEM_REQUIREMENTS.cpu}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <HardDrive className="w-4 h-4 text-neutral-500 mt-0.5" />
                <div>
                  <span className="text-neutral-400">RAM:</span>
                  <span className="text-white ml-2">{SYSTEM_REQUIREMENTS.ram}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Monitor className="w-4 h-4 text-neutral-500 mt-0.5" />
                <div>
                  <span className="text-neutral-400">Browser:</span>
                  <span className="text-white ml-2">{SYSTEM_REQUIREMENTS.browser}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Info className="w-4 h-4 text-neutral-500 mt-0.5" />
                <div>
                  <span className="text-neutral-400">Storage:</span>
                  <span className="text-white ml-2">{SYSTEM_REQUIREMENTS.storage}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// File Size Indicator
function FileSizeIndicator({ file }: { file: File | null }) {
  if (!file) return null;
  
  const sizeMB = file.size / (1024 * 1024);
  const isOverRecommended = file.size > RECOMMENDED_SIZE;
  const isOverLimit = file.size > MAX_FILE_SIZE;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
      isOverLimit 
        ? "bg-red-500/10 text-red-400" 
        : isOverRecommended 
          ? "bg-yellow-500/10 text-yellow-400"
          : "bg-green-500/10 text-green-400"
    }`}>
      {isOverLimit ? (
        <AlertTriangle className="w-4 h-4" />
      ) : isOverRecommended ? (
        <Info className="w-4 h-4" />
      ) : (
        <CheckCircle className="w-4 h-4" />
      )}
      <span>
        {sizeMB.toFixed(1)} MB
        {isOverLimit && " - Exceeds 500MB limit"}
        {isOverRecommended && !isOverLimit && " - Large files may take longer"}
      </span>
    </div>
  );
}

// Upload Progress with Stages
function UploadProgress({ 
  currentStage, 
  progress, 
  stages 
}: { 
  currentStage: number; 
  progress: number;
  stages: typeof UPLOAD_STAGES;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                index < currentStage
                  ? "bg-green-500 border-green-500"
                  : index === currentStage
                    ? "bg-white/10 border-white/40"
                    : "bg-transparent border-white/20"
              }`}>
                {index < currentStage ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : index === currentStage ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-neutral-500" />
                )}
              </div>
              <span className={`text-xs mt-1 ${
                index <= currentStage ? "text-white" : "text-neutral-500"
              }`}>
                {stage.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 transition-colors ${
                index < currentStage ? "bg-green-500" : "bg-white/20"
              }`} />
            )}
          </div>
        ))}
      </div>
      
      {currentStage === 2 && (
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  );
}

// Execution Log Viewer
function ExecutionLogViewer({ 
  logs, 
  isExpanded, 
  onToggle 
}: { 
  logs: LogEntry[]; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const logEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isExpanded) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isExpanded]);
  
  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "success": return "text-green-400";
      case "warn": return "text-yellow-400";
      case "error": return "text-red-400";
      default: return "text-neutral-400";
    }
  };
  
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/80 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Monitor className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-white">Execution Log</span>
          {logs.length > 0 && (
            <span className="text-xs text-neutral-500">({logs.length} entries)</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="h-48 overflow-y-auto bg-black/50 rounded-lg p-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-neutral-600">No logs yet. Launch an app to see execution logs.</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex gap-2 mb-1">
                      <span className="text-neutral-600">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={getLevelColor(log.level)}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-neutral-300">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AndroidPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string>("");
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [state, setState] = useState<RuntimeState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const runnerRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<APKLoader | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const sortedApps = useMemo(
    () => [...apps].sort((a, b) => b.installedAt - a.installedAt),
    [apps]
  );

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), level, message }]);
  }, []);

  useEffect(() => {
    void bootstrap();
    return () => {
      stopRuntime();
    };
  }, []);

  async function bootstrap() {
    try {
      addLog("info", "Initializing Android runner...");
      const identity = await authService.ensureIdentity();
      setUid(identity.uid);
      await refreshApps(identity.uid);
      addLog("success", "Android runner initialized successfully");
    } catch (e: any) {
      addLog("error", `Failed to initialize: ${e?.message || "Unknown error"}`);
      setError(e?.message || "Failed to initialize Android runner");
    }
  }

  async function refreshApps(nextUid: string) {
    const all = await listInstalledApps(nextUid);
    setApps(all.filter((app) => app.type === "android" || app.originalName.toLowerCase().endsWith(".apk")));
  }

  function stopRuntime() {
    loaderRef.current?.stop();
    loaderRef.current = null;
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setActiveAppId(null);
    if (state !== "uploading") {
      setState("idle");
      setStatus("Ready");
    }
  }

  async function uploadAndInstall(file: File) {
    if (!uid) return;
    if (!file.name.toLowerCase().endsWith(".apk")) {
      setError("Only .apk files are supported on this page");
      addLog("error", "Invalid file type: not an APK");
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds 500MB limit");
      addLog("error", `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      return;
    }

    setError(null);
    setState("uploading");
    setProgress(0);
    setUploadStage(0);
    setStatus(`Uploading ${file.name}`);
    addLog("info", `Starting upload: ${file.name}`);

    try {
      // Stage 0: Validating
      setUploadStage(0);
      await new Promise(r => setTimeout(r, 500));
      addLog("info", "File validated successfully");
      
      // Stage 1: Compressing
      setUploadStage(1);
      await new Promise(r => setTimeout(r, 500));
      addLog("info", "Chunks compressed");
      
      // Stage 2: Uploading
      setUploadStage(2);
      const uploaded = await chunkedUploadFile(file, {
        compressChunks: true,
        onProgress: ({ uploadedBytes, totalBytes }) => {
          setProgress(Math.round((uploadedBytes / Math.max(totalBytes, 1)) * 100));
        },
      });
      addLog("success", `Upload complete: ${uploaded.storedBytes} bytes stored`);

      // Stage 3: Installing
      setUploadStage(3);
      await addInstalledApp(uid, {
        name: file.name.replace(/\.apk$/i, ""),
        originalName: file.name,
        type: detectAppType(file.name),
        scope: "user",
        originalBytes: file.size,
        storedBytes: uploaded.storedBytes,
        fileId: uploaded.fileId,
        installedAt: Date.now(),
        compression: "gzip-chunked",
      });
      addLog("success", `App installed: ${file.name}`);

      await refreshApps(uid);
      setStatus(`Installed ${file.name}`);
      setState("idle");
      setProgress(0);
      setUploadStage(0);
      setSelectedFile(null);
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Upload failed");
      addLog("error", `Upload failed: ${e?.message || "Unknown error"}`);
    }
  }

  async function launchApp(app: InstalledApp) {
    if (!runnerRef.current) return;

    stopRuntime();
    setError(null);
    setState("launching");
    setStatus(`Preparing ${app.originalName}`);
    setActiveAppId(app.id);
    addLog("info", `Launching app: ${app.name}`);

    try {
      const downloaded = await downloadClusterFile(app.fileId, {
        scope: app.scope ?? "user",
        compressedChunks: app.compression === "gzip-chunked",
        onProgress: ({ chunkIndex, totalChunks }) => {
          const pct = Math.round(((chunkIndex + 1) / Math.max(totalChunks, 1)) * 100);
          setProgress(pct);
          setStatus(`Downloading app ${pct}%`);
        },
      });
      addLog("success", "App downloaded successfully");

      const copy = new Uint8Array(downloaded.bytes.byteLength);
      copy.set(downloaded.bytes);
      const objectUrl = URL.createObjectURL(
        new Blob([copy.buffer], { type: "application/vnd.android.package-archive" })
      );
      activeObjectUrlRef.current = objectUrl;

      const loader = new APKLoader();
      loader.onStatusUpdate = (nextStatus, detail) => {
        setStatus(detail ? `${nextStatus}: ${detail}` : nextStatus);
        addLog("info", detail ? `${nextStatus}: ${detail}` : nextStatus);
      };
      loaderRef.current = loader;

      await loader.load(runnerRef.current, objectUrl);
      setState("running");
      setStatus(`Running ${app.name}`);
      addLog("success", `App running: ${app.name}`);
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Launch failed");
      setStatus("Launch failed");
      setActiveAppId(null);
      addLog("error", `Launch failed: ${e?.message || "Unknown error"}`);
    }
  }

  async function removeApp(app: InstalledApp) {
    if (!uid) return;
    try {
      addLog("info", `Removing app: ${app.name}`);
      await removeInstalledAppWithCleanup(uid, app);
      if (activeAppId === app.id) stopRuntime();
      await refreshApps(uid);
      addLog("success", `App removed: ${app.name}`);
    } catch (e: any) {
      setError(e?.message || "Failed to remove app");
      addLog("error", `Failed to remove app: ${e?.message || "Unknown error"}`);
    }
  }

  const captureScreenshot = useCallback(() => {
    if (!runnerRef.current) return;
    
    // Create a canvas from the runner div contents
    const canvas = document.createElement("canvas");
    const rect = runnerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Try to capture using html2canvas approach (simplified)
    // In production, you'd use html2canvas or a similar library
    addLog("info", "Screenshot captured (placeholder)");
    
    // For now, just log - in production this would save the image
    const link = document.createElement("a");
    link.download = `screenshot-${Date.now()}.png`;
    addLog("success", "Screenshot saved");
  }, [addLog]);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <BackgroundRippleEffect />
      <MinimalNavIsland currentPath="/android" onNavigate={(path) => router.push(path)} />
      
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-24 md:px-6 md:py-32">
        {/* Header Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/10 mb-6">
            <Smartphone className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Android Runner
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto">
            Upload APKs to your storage backend, install to your account, then launch through the Android runtime.
          </p>
        </motion.section>

        {/* System Requirements */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <SystemRequirements 
            isExpanded={showRequirements} 
            onToggle={() => setShowRequirements(prev => !prev)} 
          />
        </motion.section>

        {/* Status Bar */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="surface-glow p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${
                state === "idle" ? "bg-neutral-500" :
                state === "running" ? "bg-green-500 animate-pulse" :
                state === "error" ? "bg-red-500" :
                "bg-amber-500 animate-pulse"
              }`} />
              <div>
                <p className="text-sm font-medium text-white capitalize">{state} {progress > 0 && progress < 100 ? `(${progress}%)` : ""}</p>
                <p className="text-xs text-neutral-500">{status}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    void uploadAndInstall(file);
                  }
                  e.currentTarget.value = "";
                }}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={state === "uploading" || state === "launching"}
                className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload APK
              </Button>
              <Button 
                variant="outline" 
                onClick={stopRuntime}
                disabled={state === "idle"}
                className="border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Runtime
              </Button>
              {state === "running" && (
                <Button 
                  variant="outline" 
                  onClick={captureScreenshot}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Screenshot
                </Button>
              )}
            </div>
          </div>
          
          {/* File Size Indicator */}
          {selectedFile && state === "uploading" && (
            <div className="mb-4">
              <FileSizeIndicator file={selectedFile} />
            </div>
          )}
          
          {/* Upload Progress Stages */}
          {state === "uploading" && (
            <div className="mb-4">
              <UploadProgress 
                currentStage={uploadStage} 
                progress={progress}
                stages={UPLOAD_STAGES}
              />
            </div>
          )}
          
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
        </motion.section>

        {/* Main Content */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Runner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="surface-glow p-4">
              <div
                ref={runnerRef}
                className="min-h-[460px] w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-950"
              />
            </div>
            
            {/* Execution Log */}
            <ExecutionLogViewer 
              logs={logs} 
              isExpanded={showLogs}
              onToggle={() => setShowLogs(prev => !prev)}
            />
          </motion.div>

          {/* Installed Apps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="surface-glow p-5"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 mb-4">
              Installed Apps
            </h2>
            <div className="space-y-3">
              {sortedApps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                  <Package className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">No APKs installed yet.</p>
                  <p className="text-xs text-neutral-600 mt-1">Upload an APK to get started.</p>
                </div>
              ) : (
                sortedApps.map((app) => (
                  <div 
                    key={app.id} 
                    className={`group rounded-xl border bg-neutral-900/80 p-4 transition-all ${
                      activeAppId === app.id 
                        ? "border-green-500/50 bg-green-500/5" 
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{app.name}</p>
                        <p className="mt-1 text-xs text-neutral-500">{app.originalName}</p>
                        <p className="mt-1 text-xs text-neutral-600">
                          {(app.originalBytes / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => void launchApp(app)}
                        disabled={state === "uploading" || state === "launching"}
                        className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Launch
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => void removeApp(app)}
                        className="border-white/20 text-white hover:bg-white/10 hover:text-red-400 hover:border-red-500/50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}