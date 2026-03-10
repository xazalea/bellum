'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  speed?: number;
  uploadedBytes?: number;
}

interface UploadComponentProps {
  onUpload?: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  className?: string;
}

export function UploadComponent({
  onUpload,
  accept,
  multiple = true,
  maxSize = 100 * 1024 * 1024, // 100MB default
  className = '',
}: UploadComponentProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: 'pending' as const,
      uploadedBytes: 0,
    }));

    // Validate file sizes
    const validFiles = uploadFiles.filter((f) => f.file.size <= maxSize);
    const invalidFiles = uploadFiles.filter((f) => f.file.size > maxSize);

    if (invalidFiles.length > 0) {
      console.warn(
        `${invalidFiles.length} file(s) exceed max size of ${formatBytes(maxSize)}`
      );
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, [maxSize]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const retryFile = useCallback((id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'pending', progress: 0, error: undefined } : f))
    );
  }, []);

  const simulateUpload = async (uploadFile: UploadFile) => {
    const startTime = Date.now();
    const totalBytes = uploadFile.file.size;
    let uploadedBytes = 0;

    // Simulate upload progress
    while (uploadedBytes < totalBytes) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      // Simulate variable upload speed
      const chunkSize = Math.random() * 50000 + 10000; // 10-60KB per chunk
      uploadedBytes = Math.min(uploadedBytes + chunkSize, totalBytes);
      
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = uploadedBytes / elapsed;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                progress: (uploadedBytes / totalBytes) * 100,
                uploadedBytes,
                speed,
              }
            : f
        )
      );
    }

    return true;
  };

  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    for (const uploadFile of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
        )
      );

      try {
        if (onUpload) {
          await onUpload([uploadFile.file]);
        } else {
          await simulateUpload(uploadFile);
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'completed', progress: 100 }
              : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: String(error) }
              : f
          )
        );
      }
    }

    setIsUploading(false);
  }, [files, onUpload]);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'completed'));
  }, []);

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Upload Files</h3>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-4xl mb-3">📁</div>
        <div className="text-gray-300 mb-1">
          Drag and drop files here, or click to select
        </div>
        <div className="text-xs text-gray-500">
          Max file size: {formatBytes(maxSize)}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {pendingCount} pending • {uploadingCount} uploading • {completedCount} completed • {errorCount} failed
            </div>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-gray-500 hover:text-gray-400"
              >
                Clear completed
              </button>
            )}
          </div>

          {files.map((file) => (
            <div
              key={file.id}
              className="bg-gray-800 rounded-lg p-4 flex items-center gap-4"
            >
              {/* File Icon */}
              <div className="text-2xl">📄</div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{file.file.name}</div>
                <div className="text-xs text-gray-500">
                  {formatBytes(file.file.size)}
                  {file.status === 'uploading' && file.speed && (
                    <span className="ml-2">• {formatSpeed(file.speed)}</span>
                  )}
                </div>

                {/* Progress Bar */}
                {(file.status === 'uploading' || file.status === 'completed') && (
                  <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        file.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {file.status === 'error' && file.error && (
                  <div className="mt-1 text-xs text-red-400">{file.error}</div>
                )}
              </div>

              {/* Status / Actions */}
              <div className="flex items-center gap-2">
                {file.status === 'pending' && (
                  <span className="text-xs text-gray-500">Pending</span>
                )}
                {file.status === 'uploading' && (
                  <span className="text-xs text-blue-400">
                    {file.progress.toFixed(0)}%
                  </span>
                )}
                {file.status === 'completed' && (
                  <span className="text-green-400">✓</span>
                )}
                {file.status === 'error' && (
                  <>
                    <button
                      onClick={() => retryFile(file.id)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-500 hover:text-gray-400"
                    >
                      ✕
                    </button>
                  </>
                )}
                {file.status === 'pending' && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-500 hover:text-gray-400"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && pendingCount > 0 && (
        <button
          onClick={uploadFiles}
          disabled={isUploading}
          className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          {isUploading ? 'Uploading...' : `Upload ${pendingCount} file(s)`}
        </button>
      )}
    </div>
  );
}

// Connection Status Indicator Component
export function ConnectionStatusIndicator({ className = '' }: { className?: string }) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [downlink, setDownlink] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection info if available
    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');
      setDownlink(connection.downlink || 0);

      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || 'unknown');
        setDownlink(connection.downlink || 0);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getConnectionQuality = (): 'good' | 'medium' | 'poor' => {
    if (!online) return 'poor';
    if (connectionType === '4g') return 'good';
    if (connectionType === '3g') return 'medium';
    return 'poor';
  };

  const quality = getConnectionQuality();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
        !online
          ? 'bg-red-600/20 text-red-400'
          : quality === 'good'
          ? 'bg-green-600/20 text-green-400'
          : quality === 'medium'
          ? 'bg-yellow-600/20 text-yellow-400'
          : 'bg-gray-600/20 text-gray-400'
      } ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          !online
            ? 'bg-red-400 animate-pulse'
            : quality === 'good'
            ? 'bg-green-400'
            : quality === 'medium'
            ? 'bg-yellow-400'
            : 'bg-gray-400'
        }`}
      />
      <span>
        {!online
          ? 'Offline'
          : quality === 'good'
          ? 'Excellent'
          : quality === 'medium'
          ? 'Good'
          : 'Poor'}
      </span>
      {online && downlink > 0 && (
        <span className="opacity-60">({downlink} Mbps)</span>
      )}
    </div>
  );
}

// Reduced Motion Option Component
export function ReducedMotionToggle({ className = '' }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleReducedMotion = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    document.documentElement.classList.toggle('reduce-motion', newValue);
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <div className="text-sm font-medium text-white">Reduced Motion</div>
        <div className="text-xs text-gray-500">
          Minimize animations for accessibility
        </div>
      </div>
      <button
        onClick={toggleReducedMotion}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          reducedMotion ? 'bg-blue-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            reducedMotion ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

// Storage Management Settings Component
export function StorageManagementSettings({ className = '' }: { className?: string }) {
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }
    };

    checkStorage();
    const interval = setInterval(checkStorage, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleClearStorage = async () => {
    if (!confirm('Clear all local storage? This cannot be undone.')) return;

    setClearing(true);
    try {
      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map((db) => {
            if (db.name) {
              return new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase(db.name!);
                request.onsuccess = resolve;
                request.onerror = reject;
              });
            }
          })
        );
      }

      // Clear localStorage
      localStorage.clear();

      // Clear sessionStorage
      sessionStorage.clear();

      // Refresh estimate
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }
    } finally {
      setClearing(false);
    }
  };

  const usagePercent = storageEstimate
    ? (storageEstimate.usage / storageEstimate.quota) * 100
    : 0;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-4">Storage Management</h3>

      {storageEstimate ? (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Used</span>
              <span>
                {formatBytes(storageEstimate.usage)} / {formatBytes(storageEstimate.quota)}
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usagePercent > 90
                    ? 'bg-red-500'
                    : usagePercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Cache Storage</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between">
              <span>IndexedDB</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between">
              <span>Local Storage</span>
              <span>Included</span>
            </div>
          </div>

          <button
            onClick={handleClearStorage}
            disabled={clearing}
            className="mt-4 w-full py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 rounded-lg text-sm transition-colors"
          >
            {clearing ? 'Clearing...' : 'Clear All Storage'}
          </button>
        </>
      ) : (
        <div className="text-sm text-gray-500">
          Storage information not available
        </div>
      )}
    </div>
  );
}

export default UploadComponent;