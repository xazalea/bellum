"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface StorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  url?: string;
}

interface StorageStatus {
  available: boolean;
  configured: boolean;
  message?: string;
  maxFileSize?: string;
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function CloudIcon({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
      />
    </svg>
  );
}

function UploadIcon({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function FileIcon({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function TrashIcon({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function DownloadIcon({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function StoragePage() {
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Check storage status on mount
  useEffect(() => {
    checkStorageStatus();
    loadFiles();
  }, []);

  // Check if storage is available
  const checkStorageStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/discord/status");
      const data = await response.json();
      setStorageStatus(data);
    } catch (err: any) {
      console.error("Failed to check storage status:", err);
      setStorageStatus({
        available: false,
        configured: false,
        message: "Failed to connect to storage service",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load files from storage (mock for now, would need to implement list endpoint)
  const loadFiles = () => {
    // Load from localStorage for demo
    try {
      const stored = localStorage.getItem("cd_uploaded_files");
      if (stored) {
        setFiles(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    }
  };

  // Save files to localStorage
  const saveFiles = (newFiles: StorageFile[]) => {
    try {
      localStorage.setItem("cd_uploaded_files", JSON.stringify(newFiles));
      setFiles(newFiles);
    } catch (err) {
      console.error("Failed to save files:", err);
    }
  };

  // Upload file
  const uploadFile = async (file: File) => {
    if (!storageStatus?.available) {
      setError("Storage is not available");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/discord/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();

      // Add to files list
      const newFile: StorageFile = {
        id: data.messageId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: Date.now(),
        url: data.url,
      };

      const updatedFiles = [newFile, ...files];
      saveFiles(updatedFiles);

      setUploadProgress(0);
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "Failed to upload file");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    uploadFile(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      e.target.value = "";
    }
  };

  // Delete file
  const deleteFile = (fileId: string) => {
    const updatedFiles = files.filter((f) => f.id !== fileId);
    saveFiles(updatedFiles);
  };

  // Download file
  const downloadFile = (file: StorageFile) => {
    if (file.url) {
      window.open(file.url, "_blank");
    }
  };

  // Drag and drop handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onEnter = (e: DragEvent) => {
      prevent(e);
      setIsDragging(true);
    };

    const onLeave = (e: DragEvent) => {
      prevent(e);
      setIsDragging(false);
    };

    const onDrop = (e: DragEvent) => {
      prevent(e);
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFileSelect(file);
    };

    el.addEventListener("dragenter", onEnter);
    el.addEventListener("dragover", prevent);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragenter", onEnter);
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Calculate total storage used
  const totalStorage = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }}>
      {/* Header */}
      <div
        className="border-b"
        style={{ borderColor: "var(--cd-border-default)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--cd-cyan-muted)",
                  border: "1px solid var(--cd-cyan-border)",
                }}
              >
                <CloudIcon
                  className="w-6 h-6"
                  style={{ color: "var(--cd-cyan)" }}
                />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "var(--cd-text-primary)" }}
                >
                  Cloud Storage
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  Unlimited storage via Discord CDN
                </p>
              </div>
            </div>

            {/* Status Badge */}
            {storageStatus && (
              <div
                className="cd-badge"
                style={{
                  background: storageStatus.available
                    ? "var(--cd-success)"
                    : "var(--cd-error)",
                  color: "white",
                  borderColor: "transparent",
                }}
              >
                {storageStatus.available ? "✓ Connected" : "✗ Unavailable"}
              </div>
            )}
          </div>

          {/* Storage Stats */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="cd-card" style={{ padding: "1rem" }}>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  Files Stored
                </span>
                <span
                  className="text-lg font-semibold"
                  style={{ color: "var(--cd-cyan)" }}
                >
                  {files.length}
                </span>
              </div>
            </div>
            <div className="cd-card" style={{ padding: "1rem" }}>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  Total Size
                </span>
                <span
                  className="text-lg font-semibold"
                  style={{ color: "var(--cd-cyan)" }}
                >
                  {formatFileSize(totalStorage)}
                </span>
              </div>
            </div>
            <div className="cd-card" style={{ padding: "1rem" }}>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  Max File Size
                </span>
                <span
                  className="text-lg font-semibold"
                  style={{ color: "var(--cd-cyan)" }}
                >
                  {storageStatus?.maxFileSize || "25 MB"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="cd-alert cd-alert-error">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Upload Failed</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="cd-btn cd-btn-ghost text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Storage Not Available Warning */}
      {!loading && !storageStatus?.available && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="cd-alert cd-alert-warning">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Storage Not Configured</p>
              <p className="text-sm mt-1 opacity-80">
                {storageStatus?.message ||
                  "Discord storage is not configured. Please set DISCORD_WEBHOOK_URL in environment variables."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Upload Area */}
        <div
          ref={dropRef}
          className="cd-card mb-6 transition-all"
          style={{
            background: isDragging ? "var(--cd-elevated)" : "var(--cd-surface)",
            borderColor: isDragging
              ? "var(--cd-cyan-border)"
              : "var(--cd-border-default)",
            borderWidth: isDragging ? "2px" : "1px",
            borderStyle: isDragging ? "dashed" : "solid",
            padding: 0,
            minHeight: "200px",
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="cd-spinner cd-spinner-lg mb-4" />
              <p
                className="text-sm mb-2"
                style={{ color: "var(--cd-text-secondary)" }}
              >
                Uploading...
              </p>
              <div
                className="w-64 h-2 rounded-full overflow-hidden"
                style={{ background: "var(--cd-elevated)" }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    background: "var(--cd-cyan)",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: isDragging
                    ? "var(--cd-cyan-muted)"
                    : "var(--cd-elevated)",
                  border: `2px ${isDragging ? "solid" : "dashed"} var(--cd-border-default)`,
                }}
              >
                {isDragging ? (
                  <DownloadIcon
                    className="w-8 h-8"
                    style={{ color: "var(--cd-cyan)" }}
                  />
                ) : (
                  <UploadIcon
                    className="w-8 h-8"
                    style={{ color: "var(--cd-cyan)" }}
                  />
                )}
              </div>

              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--cd-text-primary)" }}
              >
                {isDragging ? "Drop file here" : "Upload Files"}
              </h3>

              <p
                className="text-sm text-center mb-4 max-w-md"
                style={{ color: "var(--cd-text-secondary)" }}
              >
                Drag and drop files here, or click to browse. Files are stored
                on Discord CDN with unlimited storage.
              </p>

              <label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={!storageStatus?.available}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cd-btn cd-btn-primary"
                  disabled={!storageStatus?.available}
                >
                  <UploadIcon className="w-4 h-4" />
                  Choose File
                </button>
              </label>

              <p
                className="text-xs mt-4"
                style={{ color: "var(--cd-text-muted)" }}
              >
                Maximum file size: {storageStatus?.maxFileSize || "25 MB"}
              </p>
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="cd-card" style={{ padding: 0 }}>
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--cd-border-default)" }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--cd-text-primary)" }}
            >
              Your Files
            </h3>
            <span
              className="text-xs font-mono px-2 py-1 rounded"
              style={{
                background: "var(--cd-elevated)",
                color: "var(--cd-text-muted)",
              }}
            >
              {files.length} files
            </span>
          </div>

          {files.length === 0 ? (
            <div
              className="text-center py-12"
              style={{ color: "var(--cd-text-muted)" }}
            >
              <FileIcon
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: "var(--cd-text-muted)" }}
              />
              <p className="text-sm">No files uploaded yet</p>
              <p className="text-xs mt-1">
                Upload your first file to get started
              </p>
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "var(--cd-border-muted)" }}
            >
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-opacity-50 transition-colors"
                  style={{ background: "transparent" }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileIcon
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: "var(--cd-cyan)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--cd-text-primary)" }}
                      >
                        {file.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--cd-text-muted)" }}
                      >
                        {formatFileSize(file.size)} •{" "}
                        {formatDate(file.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadFile(file)}
                      className="p-2 rounded hover:bg-opacity-10 transition-colors"
                      style={{ color: "var(--cd-text-secondary)" }}
                      title="Download"
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="p-2 rounded hover:bg-opacity-10 transition-colors"
                      style={{ color: "var(--cd-error)" }}
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <InfoCard
            icon="🔒"
            title="Secure Storage"
            description="Files are stored on Discord's CDN with enterprise-grade security and encryption"
          />
          <InfoCard
            icon="♾️"
            title="Unlimited Space"
            description="No storage limits - upload as many files as you need within size constraints"
          />
          <InfoCard
            icon="⚡"
            title="Fast Delivery"
            description="Global CDN ensures fast downloads from anywhere in the world"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INFO CARD
// ═══════════════════════════════════════════════════════════

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="cd-card">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h4
          className="font-semibold text-sm"
          style={{ color: "var(--cd-text-primary)" }}
        >
          {title}
        </h4>
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "var(--cd-text-secondary)" }}
      >
        {description}
      </p>
    </div>
  );
}
