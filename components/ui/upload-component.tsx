'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  FileArchive, 
  FileCode, 
  FileX, 
  Upload, 
  Check, 
  X, 
  RefreshCw,
  Clock,
  HardDrive,
  AlertCircle
} from 'lucide-react';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  speed?: number;
  uploadedBytes?: number;
  eta?: number; // seconds remaining
  startTime?: number;
}

interface UploadComponentProps {
  onUpload?: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  className?: string;
}

// File type detection and icon component
function FileTypeIcon({ filename, size = 24, className = '' }: { filename: string; size?: number; className?: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'apk') {
    return (
      <div className={`relative ${className}`}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.6 11.4C17.6 11.4 16.4 9.8 14.4 9.8C12.4 9.8 11.2 11.4 11.2 11.4L12.8 14.6C12.8 14.6 13.6 13.4 14.4 13.4C15.2 13.4 16 14.6 16 14.6L17.6 11.4Z" fill="#3DDC84"/>
          <path d="M6.4 11.4C6.4 11.4 7.6 9.8 9.6 9.8C11.6 9.8 12.8 11.4 12.8 11.4L11.2 14.6C11.2 14.6 10.4 13.4 9.6 13.4C8.8 13.4 8 14.6 8 14.6L6.4 11.4Z" fill="#3DDC84"/>
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="#3DDC84" strokeWidth="2"/>
          <circle cx="12" cy="17" r="1.5" fill="#3DDC84"/>
        </svg>
      </div>
    );
  }
  if (ext === 'exe') {
    return (
      <div className={`relative ${className}`}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#0078D4" strokeWidth="2"/>
          <path d="M8 8H16V10H8V8Z" fill="#0078D4"/>
          <path d="M8 12H16V14H8V12Z" fill="#0078D4"/>
          <path d="M8 16H13V18H8V16Z" fill="#0078D4"/>
        </svg>
      </div>
    );
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return <FileArchive size={size} className={`text-yellow-400 ${className}`} />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c'].includes(ext || '')) {
    return <FileCode size={size} className={`text-purple-400 ${className}`} />;
  }
  
  return <FileX size={size} className={`text-gray-400 ${className}`} />;
}

// Check if file type is supported
function isSupportedFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['apk', 'exe', 'zip', 'rar', '7z', 'tar', 'gz', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c'].includes(ext || '');
}

// Circular progress ring component
function CircularProgress({ 
  progress, 
  size = 48, 
  strokeWidth = 4,
  status,
  showAnimation = true
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  status: 'uploading' | 'completed' | 'error';
  showAnimation?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const getColor = () => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getGradientId = () => `progress-gradient-${status}`;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id={getGradientId()} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getColor()} />
            <stop offset="100%" stopColor={getColor()} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/10"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${getGradientId()})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={showAnimation ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {status === 'completed' ? (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check size={size * 0.4} className="text-green-500" />
          </motion.div>
        ) : status === 'error' ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <X size={size * 0.4} className="text-red-500" />
          </motion.div>
        ) : (
          <span className="text-xs font-medium text-white">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Animated border for drag zone
function AnimatedBorder({ isDragging, children }: { isDragging: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Animated border gradient */}
      <motion.div
        className="absolute inset-0 rounded-lg overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: isDragging ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div 
          className="absolute inset-[-200%] animate-spin-slow"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, #3b82f6 60deg, #8b5cf6 120deg, transparent 180deg)',
            animationDuration: '3s',
          }}
        />
      </motion.div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Success animation with checkmark
function SuccessAnimation({ size = 48 }: { size?: number }) {
  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <motion.div
        className="rounded-full bg-green-500/20 flex items-center justify-center"
        style={{ width: size, height: size }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <motion.svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-500"
        >
          <motion.path
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
}

// Error animation with retry option
function ErrorAnimation({ 
  size = 48, 
  onRetry,
  onDismiss 
}: { 
  size?: number; 
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <motion.div
        className="rounded-full bg-red-500/20 flex items-center justify-center"
        style={{ width: size, height: size }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <motion.svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-500"
        >
          <motion.path
            d="M18 6L6 18M6 6l12 12"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          />
        </motion.svg>
      </motion.div>
      
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors"
          >
            Dismiss
          </button>
        )}
      </motion.div>
    </motion.div>
  );
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
  const [dropSuccess, setDropSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatETA = (seconds: number): string => {
    if (seconds < 0 || !isFinite(seconds)) return '';
    if (seconds < 60) return `${Math.round(seconds)} seconds left`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)}s left`;
    return `${Math.floor(seconds / 3600)} hr ${Math.floor((seconds % 3600) / 60)}m left`;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: 'pending' as const,
      uploadedBytes: 0,
      startTime: undefined,
    }));

    // Validate file sizes
    const validFiles = uploadFiles.filter((f) => f.file.size <= maxSize);
    const invalidFiles = uploadFiles.filter((f) => f.file.size > maxSize);

    if (invalidFiles.length > 0) {
      console.warn(
        `${invalidFiles.length} file(s) exceed max size of ${formatBytes(maxSize)}`
      );
    }

    // Check for unsupported files
    const unsupportedFiles = validFiles.filter((f) => !isSupportedFile(f.file.name));
    if (unsupportedFiles.length > 0) {
      unsupportedFiles.forEach((f) => {
        f.status = 'error';
        f.error = 'Unsupported file type';
      });
    }

    setFiles((prev) => [...prev, ...validFiles]);
    
    // Show drop success animation
    if (validFiles.length > 0) {
      setDropSuccess(true);
      setTimeout(() => setDropSuccess(false), 500);
    }
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
      prev.map((f) => (f.id === id ? { ...f, status: 'pending', progress: 0, error: undefined, uploadedBytes: 0 } : f))
    );
  }, []);

  const simulateUpload = async (uploadFile: UploadFile) => {
    const startTime = Date.now();
    const totalBytes = uploadFile.file.size;
    let uploadedBytes = 0;

    // Update start time
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, startTime } : f
      )
    );

    // Simulate upload progress
    while (uploadedBytes < totalBytes) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      // Simulate variable upload speed
      const chunkSize = Math.random() * 50000 + 10000; // 10-60KB per chunk
      uploadedBytes = Math.min(uploadedBytes + chunkSize, totalBytes);
      
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = uploadedBytes / elapsed;
      const remaining = totalBytes - uploadedBytes;
      const eta = speed > 0 ? remaining / speed : undefined;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                progress: (uploadedBytes / totalBytes) * 100,
                uploadedBytes,
                speed,
                eta,
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
      // Skip files with errors (unsupported types)
      if (uploadFile.error) continue;

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
              ? { ...f, status: 'completed', progress: 100, eta: undefined }
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

      {/* Drop Zone with Animated Border */}
      <AnimatedBorder isDragging={isDragging}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 overflow-hidden",
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
              : 'border-gray-700 hover:border-gray-600',
            dropSuccess && 'border-green-500 bg-green-500/10'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Drop success flash animation */}
          <AnimatePresence>
            {dropSuccess && (
              <motion.div
                className="absolute inset-0 bg-green-500/20 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
          
          {/* Animated upload icon */}
          <motion.div
            className="text-4xl mb-3 flex justify-center"
            animate={isDragging ? { y: [0, -5, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <Upload className={cn(
              "transition-colors",
              isDragging ? "text-blue-400" : "text-gray-400"
            )} size={48} />
          </motion.div>
          
          <div className="text-gray-300 mb-1">
            {isDragging ? 'Drop files here!' : 'Drag and drop files here, or click to select'}
          </div>
          <div className="text-xs text-gray-500">
            Supported: APK, EXE, ZIP, and more • Max: {formatBytes(maxSize)}
          </div>
          
          {/* Animated dots when dragging */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                className="flex justify-center gap-1 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-blue-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.6,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnimatedBorder>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {pendingCount > 0 && <span className="text-gray-300">{pendingCount} pending • </span>}
              {uploadingCount > 0 && <span className="text-blue-400">{uploadingCount} uploading • </span>}
              {completedCount > 0 && <span className="text-green-400">{completedCount} completed • </span>}
              {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
            </div>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>

          {files.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "bg-gray-800 rounded-lg p-4 flex items-center gap-4 transition-all",
                file.status === 'completed' && "bg-green-900/20",
                file.status === 'error' && "bg-red-900/20"
              )}
            >
              {/* File Type Icon */}
              <div className="flex-shrink-0">
                <FileTypeIcon filename={file.file.name} size={32} />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white truncate">{file.file.name}</span>
                  {!isSupportedFile(file.file.name) && (
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  )}
                </div>
                
                <div className="text-xs text-gray-500 flex items-center gap-3">
                  <span>{formatBytes(file.file.size)}</span>
                  
                  {/* Speed display */}
                  {file.status === 'uploading' && file.speed && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <HardDrive size={10} />
                      {formatSpeed(file.speed)}
                    </span>
                  )}
                  
                  {/* ETA display */}
                  {file.status === 'uploading' && file.eta && file.eta > 0 && (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatETA(file.eta)}
                    </span>
                  )}
                </div>

                {/* Progress Bar (fallback for no-JS or simpler view) */}
                {file.status === 'uploading' && (
                  <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      transition={{ duration: 0.3 }}
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
                  <>
                    <span className="text-xs text-gray-500">Pending</span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                
                {file.status === 'uploading' && (
                  <CircularProgress 
                    progress={file.progress} 
                    size={36} 
                    strokeWidth={3}
                    status="uploading" 
                  />
                )}
                
                {file.status === 'completed' && (
                  <SuccessAnimation size={36} />
                )}
                
                {file.status === 'error' && (
                  <ErrorAnimation 
                    size={36} 
                    onRetry={() => {
                      retryFile(file.id);
                      // Auto-start upload after retry
                      setTimeout(() => uploadFiles(), 100);
                    }}
                    onDismiss={() => removeFile(file.id)}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && pendingCount > 0 && (
        <motion.button
          onClick={uploadFiles}
          disabled={isUploading}
          className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          {isUploading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={16} />
              Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
            </>
          )}
        </motion.button>
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