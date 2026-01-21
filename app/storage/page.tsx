'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth/auth-context';
import * as discordWebhookStorage from '@/lib/storage/discord-webhook-storage';
import { formatBytes, formatPercentage, DISCORD_WEBHOOK_STORAGE_LIMIT_BYTES } from '@/lib/storage/quota';

// Alias for branding
const CHALLENGER_STORAGE_LIMIT_BYTES = DISCORD_WEBHOOK_STORAGE_LIMIT_BYTES;

interface StoredFile {
  id: string;
  fileName: string;
  size: number;
  type: 'discord' | 'telegram' | 'challenger';
  createdAt: number;
  ownerUid?: string;
  compressedSize?: number;
}

export default function StoragePage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    percent: number;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [storageMode, setStorageMode] = useState<'challenger' | 'api'>('challenger');
  const [quotaInfo, setQuotaInfo] = useState<discordWebhookStorage.QuotaInfo | null>(null);
  const auth = useAuth?.() || { user: null };

  // Load quota info
  const loadQuota = async () => {
    try {
      const quota = await discordWebhookStorage.getQuotaInfo();
      setQuotaInfo(quota);
    } catch (err) {
      console.error('Failed to load quota:', err);
    }
  };

  // Load user's files
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load Challenger storage files
      const challengerFiles = await discordWebhookStorage.listFiles();
      const challengerStoredFiles: StoredFile[] = challengerFiles.map(file => ({
        id: file.fileId,
        fileName: file.fileName,
        size: file.originalSize,
        type: 'challenger' as const,
        createdAt: file.createdAt,
        compressedSize: file.compressedSize,
      }));

      // Load API-based storage files (if authenticated)
      let apiFiles: StoredFile[] = [];
      if (auth.user) {
        const [discordRes, telegramRes] = await Promise.all([
          fetch('/api/discord/manifest').then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] })),
          fetch('/api/telegram/manifest').then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] }))
        ]);

        const discordFiles: StoredFile[] = (discordRes.files || []).map((file: any) => ({
          id: file.id || file.messageId,
          fileName: file.fileName || file.filename || 'unknown',
          size: file.size || 0,
          type: 'discord' as const,
          createdAt: file.createdAt || file.timestamp || Date.now(),
          ownerUid: auth.user!.uid
        }));

        const telegramFiles: StoredFile[] = (telegramRes.files || []).map((file: any) => ({
          id: file.id || file.fileId,
          fileName: file.fileName || file.filename || 'unknown',
          size: file.size || file.sizeBytes || 0,
          type: 'telegram' as const,
          createdAt: file.createdAt || file.timestamp || Date.now(),
          ownerUid: auth.user!.uid
        }));

        apiFiles = [...discordFiles, ...telegramFiles];
      }

      const allFiles = [...challengerStoredFiles, ...apiFiles].sort((a, b) => b.createdAt - a.createdAt);
      setFiles(allFiles);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load storage files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuota();
    loadFiles();
  }, [auth.user]);

  // Handle Challenger storage upload
  const handleChallengerUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setUploadProgress({ percent: 0, status: 'Starting upload...' });

      // Check quota first
      const hasQuota = await discordWebhookStorage.hasQuota(selectedFile.size);
      if (!hasQuota) {
        const quota = await discordWebhookStorage.getQuotaInfo();
        throw new Error(`Not enough storage. Available: ${formatBytes(quota.availableBytes)}, Need: ${formatBytes(selectedFile.size)}`);
      }

      await discordWebhookStorage.uploadFile(selectedFile, (progress) => {
        const percent = Math.round((progress.uploadedBytes / progress.totalBytes) * 100);
        setUploadProgress({
          percent,
          status: `Uploading chunk ${progress.chunkIndex + 1}/${progress.totalChunks} (${formatBytes(progress.compressedBytes)} compressed)`,
        });
      });

      setUploadProgress({ percent: 100, status: 'Upload complete!' });
      
      // Reload files and quota
      await Promise.all([loadFiles(), loadQuota()]);
      setSelectedFile(null);
      
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err?.message || 'Upload failed');
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  // Handle API-based upload
  const handleApiUpload = async () => {
    if (!selectedFile || !auth.user) return;

    try {
      setUploading(true);
      setError(null);

      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const response = await fetch('/api/discord/upload', {
        method: 'POST',
        headers: {
          'X-File-Name': selectedFile.name,
          'X-Upload-Id': crypto.randomUUID(),
        },
        body: bytes
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      await loadFiles();
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (storageMode === 'challenger') {
      await handleChallengerUpload();
    } else {
      await handleApiUpload();
    }
  };

  // Download Challenger storage file
  const handleChallengerDownload = async (fileId: string, fileName: string) => {
    try {
      setError(null);
      const blob = await discordWebhookStorage.downloadFile(fileId, (progress) => {
        console.log(`Downloading: ${progress.downloadedBytes}/${progress.totalBytes} bytes`);
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
    }
  };

  // Download API file
  const handleApiDownload = async (file: StoredFile) => {
    try {
      const endpoint = file.type === 'discord' 
        ? `/api/discord/file?messageId=${file.id}`
        : `/api/telegram/file?file_id=${file.id}`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
    }
  };

  const handleDownload = async (file: StoredFile) => {
    if (file.type === 'challenger') {
      await handleChallengerDownload(file.id, file.fileName);
    } else {
      await handleApiDownload(file);
    }
  };

  // Delete Challenger storage file
  const handleDelete = async (file: StoredFile) => {
    if (file.type !== 'challenger') {
      setError('Only Challenger storage files can be deleted from the UI');
      return;
    }

    if (!confirm(`Delete ${file.fileName}?`)) return;

    try {
      await discordWebhookStorage.deleteFile(file.id);
      await Promise.all([loadFiles(), loadQuota()]);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete file');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const challengerFilesCount = files.filter(f => f.type === 'challenger').length;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-pixel text-[#8B9DB8]">App Storage</h1>
          <p className="font-retro text-xl text-[#64748B]">Import and store your games & applications. 4GB free.</p>
        </header>

        {error && (
          <Card className="p-6 border-[#EF4444]/30 bg-[#EF4444]/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#EF4444]">error</span>
              <p className="font-retro text-lg text-[#EF4444]">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-[#EF4444] hover:text-[#DC2626]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </Card>
        )}

        {/* Quota Display */}
        {quotaInfo && (
          <Card className="p-6 bg-gradient-to-br from-[#0F172A] to-[#1E2A3A]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-pixel text-sm text-[#8B9DB8]">Storage Quota</h3>
                <p className="font-retro text-xs text-[#64748B]">
                  Fingerprint: {quotaInfo.fingerprint.substring(0, 12)}...
                </p>
              </div>
              <div className="text-right">
                <p className="font-pixel text-lg text-[#8B9DB8]">
                  {formatBytes(quotaInfo.usedBytes)} / {formatBytes(quotaInfo.limitBytes)}
                </p>
                <p className="font-retro text-xs text-[#64748B]">
                  {formatPercentage(quotaInfo.usedBytes, quotaInfo.limitBytes)} used
                </p>
              </div>
            </div>
            <div className="w-full h-3 bg-[#1E2A3A] rounded-full overflow-hidden border border-[#2A3648]">
              <div 
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] transition-all duration-500"
                style={{ width: `${Math.min(100, (quotaInfo.usedBytes / quotaInfo.limitBytes) * 100)}%` }}
              />
            </div>
            <p className="font-retro text-xs text-[#64748B] mt-2">
              {formatBytes(quotaInfo.availableBytes)} available
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="col-span-1 h-fit space-y-6 p-6">
            <h3 className="font-pixel text-[10px] text-[#64748B] uppercase tracking-wider">Import App/Game</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block font-retro text-sm text-[#8B9DB8] mb-2">Storage Mode</label>
                <select
                  value={storageMode}
                  onChange={(e) => setStorageMode(e.target.value as 'challenger' | 'api')}
                  className="w-full bg-[#1E2A3A] border border-[#2A3648] text-[#8B9DB8] rounded-lg p-2 font-retro"
                >
                  <option value="challenger">Challenger Storage (4GB Free)</option>
                  <option value="api">API Storage (Auth Required)</option>
                </select>
                <p className="mt-2 font-retro text-xs text-[#64748B]">
                  {storageMode === 'challenger' 
                    ? 'Deep sea storage with automatic compression'
                    : 'Requires authentication, stores via API'}
                </p>
              </div>

              <div>
                <label className="block font-retro text-sm text-[#8B9DB8] mb-2">Select File</label>
                <Input
                  type="file"
                  accept=".apk,.exe,.iso,.zip,.html,.jar"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <p className="mt-2 font-retro text-xs text-[#64748B]">
                  Supported: APK, EXE, ISO, ZIP, HTML5
                </p>
              </div>

              {selectedFile && (
                <div className="p-3 bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648]">
                  <p className="font-retro text-sm text-[#8B9DB8] truncate">{selectedFile.name}</p>
                  <p className="font-retro text-xs text-[#64748B]">{formatBytes(selectedFile.size)}</p>
                </div>
              )}

              {uploadProgress && (
                <div className="p-3 bg-[#3B82F6]/10 rounded-lg border border-[#3B82F6]/30">
                  <p className="font-retro text-xs text-[#8B9DB8] mb-2">{uploadProgress.status}</p>
                  <div className="w-full h-2 bg-[#1E2A3A] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#3B82F6] transition-all duration-300"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                  <p className="font-retro text-xs text-[#64748B] mt-1">{uploadProgress.percent}%</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading || (storageMode === 'api' && !auth.user)}
                className="w-full flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#64748B] border-t-transparent rounded-full animate-spin"></span>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">upload</span>
                    <span>Upload File</span>
                  </>
                )}
              </Button>
            </div>
            
            <div className="pt-4 border-t border-[#2A3648]">
              <div className="flex justify-between text-xs text-[#64748B] mb-2 font-retro">
                <span>Total Files</span>
                <span>{files.length}</span>
              </div>
              <div className="flex justify-between text-xs text-[#64748B] mb-2 font-retro">
                <span>Challenger Storage</span>
                <span>{challengerFilesCount} files</span>
              </div>
              <div className="flex justify-between text-xs text-[#64748B] font-retro">
                <span>Total Size</span>
                <span>{formatBytes(totalSize)}</span>
              </div>
            </div>
          </Card>

          {/* File List */}
          <Card className="col-span-1 lg:col-span-3 min-h-[500px] bg-gradient-to-br from-[#0C1016] to-[#1E2A3A] p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#64748B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="font-retro text-lg text-[#64748B]">Loading files...</p>
                </div>
              </div>
            ) : files.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <span className="material-symbols-outlined text-6xl text-[#4A5A6F]">apps</span>
                  <h3 className="font-pixel text-lg text-[#8B9DB8]">No Apps Imported</h3>
                  <p className="font-retro text-base text-[#64748B]">Import games and applications to get started</p>
                  <p className="font-retro text-sm text-[#64748B]">{formatBytes(CHALLENGER_STORAGE_LIMIT_BYTES)} free storage available</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648] hover:border-[#4A5A6F] transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-grow min-w-0">
                      <span className="material-symbols-outlined text-2xl text-[#64748B] group-hover:text-[#8B9DB8] transition-colors">
                        {file.type === 'challenger' ? 'scuba_diving' : file.type === 'discord' ? 'forum' : 'send'}
                      </span>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-retro text-base text-[#8B9DB8] truncate">{file.fileName}</h4>
                        <p className="font-retro text-sm text-[#64748B]">
                          {formatBytes(file.size)}
                          {file.compressedSize && ` (${formatBytes(file.compressedSize)} compressed)`}
                          {' • '}
                          {formatDate(file.createdAt)}
                          {' • '}
                          <span className={
                            file.type === 'challenger' ? 'text-[#3B82F6]' :
                            file.type === 'discord' ? 'text-[#8B5CF6]' :
                            'text-[#10B981]'
                          }>
                            {file.type === 'challenger' ? 'challenger' : file.type}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownload(file)}
                        className="bg-transparent border-[#2A3648] hover:border-[#64748B] px-3"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                      </Button>
                      {file.type === 'challenger' && (
                        <Button
                          onClick={() => handleDelete(file)}
                          className="bg-transparent border-[#2A3648] hover:border-[#EF4444] px-3"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </Button>
                      )}
                    </div>
                 </div>
               ))}
            </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
