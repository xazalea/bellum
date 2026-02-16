'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import * as discordWebhookStorage from '@/lib/storage/discord-webhook-storage';
import { formatBytes } from '@/lib/storage/quota';

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
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<discordWebhookStorage.QuotaInfo | null>(null);

  const loadQuota = async () => {
    try {
      const quota = await discordWebhookStorage.getQuotaInfo();
      setQuotaInfo(quota);
    } catch (err) {
      console.error('Failed to load quota:', err);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const challengerFiles = await discordWebhookStorage.listFiles();
      const challengerStoredFiles: StoredFile[] = challengerFiles.map(file => ({
        id: file.fileId,
        fileName: file.fileName,
        size: file.originalSize,
        type: 'challenger' as const,
        createdAt: file.createdAt,
        compressedSize: file.compressedSize,
      }));
      setFiles(challengerStoredFiles.sort((a, b) => b.createdAt - a.createdAt));
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
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setError(null);
      setUploadProgress({ percent: 0, status: 'Starting upload...' });

      const hasQuota = await discordWebhookStorage.hasQuota(selectedFile.size);
      if (!hasQuota) {
        const quota = await discordWebhookStorage.getQuotaInfo();
        throw new Error(`Not enough storage. Available: ${formatBytes(quota.availableBytes)}, Need: ${formatBytes(selectedFile.size)}`);
      }

      await discordWebhookStorage.uploadFile(selectedFile, (progress) => {
        const percent = Math.round((progress.uploadedBytes / progress.totalBytes) * 100);
        setUploadProgress({
          percent,
          status: `Uploading chunk ${progress.chunkIndex + 1}/${progress.totalChunks}`,
        });
      });

      setUploadProgress({ percent: 100, status: 'Upload complete!' });
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

  const handleDownload = async (fileId: string, fileName: string) => {
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

  const handleDelete = async (file: StoredFile) => {
    if (!confirm(`Delete ${file.fileName}?`)) return;
    try {
      await discordWebhookStorage.deleteFile(file.id);
      await Promise.all([loadFiles(), loadQuota()]);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete file');
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b-2 border-ocean-border pb-6">
          <div className="space-y-2">
            <h1 className="font-pixel text-lg text-ocean-accent retro-glow">💾 CLOUD STORAGE</h1>
            <p className="font-mono text-sm text-ocean-secondary">Secure, distributed file storage</p>
          </div>
          <div className="flex items-center gap-2 font-pixel text-[8px] text-ocean-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>DISTRIBUTED</span>
          </div>
        </header>

        {error && (
          <div className="p-4 border border-red-500/20 rounded-md flex items-center gap-3 text-sm text-red-400">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Upload Sidebar */}
          <Card className="col-span-1 h-fit p-6 space-y-5">
            <h3 className="text-xs font-medium text-ocean-muted uppercase tracking-wider">Upload File</h3>

            <div className="space-y-4">
              <div className="relative group">
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border border-dashed border-ocean-border rounded-md p-6 text-center group-hover:border-ocean-accent/30 transition-colors">
                  <span className="material-symbols-outlined text-2xl text-ocean-muted mb-1">cloud_upload</span>
                  <p className="text-sm text-ocean-secondary truncate">
                    {selectedFile ? selectedFile.name : 'Click or Drag File'}
                  </p>
                  <p className="text-xs text-ocean-muted mt-1">Max 25MB per chunk</p>
                </div>
              </div>

              {selectedFile && (
                <div className="text-xs text-ocean-muted flex justify-between">
                  <span>Size:</span>
                  <span>{formatBytes(selectedFile.size)}</span>
                </div>
              )}

              {uploadProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-ocean-accent">
                    <span>{uploadProgress.status}</span>
                    <span>{uploadProgress.percent}%</span>
                  </div>
                  <div className="h-1 bg-ocean-bg rounded-full overflow-hidden">
                    <div className="h-full bg-ocean-accent transition-all duration-300" style={{ width: `${uploadProgress.percent}%` }} />
                  </div>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                variant="primary"
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            {quotaInfo && (
              <div className="pt-5 border-t border-ocean-border space-y-3">
                <h3 className="text-xs font-medium text-ocean-muted uppercase tracking-wider">Quota</h3>
                <div className="h-1 bg-ocean-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ocean-accent"
                    style={{ width: `${(quotaInfo.usedBytes / quotaInfo.limitBytes) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-ocean-muted">
                  <span>{formatBytes(quotaInfo.usedBytes)} used</span>
                  <span>{formatBytes(quotaInfo.limitBytes)} total</span>
                </div>
              </div>
            )}
          </Card>

          {/* File List */}
          <div className="col-span-1 lg:col-span-3 space-y-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <span className="w-6 h-6 border-2 border-ocean-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-base font-medium text-ocean-primary">No Files Stored</h3>
                <p className="text-sm text-ocean-muted mt-1">Upload files to get started.</p>
              </div>
            ) : (
              <div className="rounded-md border border-ocean-border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="border-b border-ocean-border">
                    <tr>
                      <th className="p-4 text-xs font-medium text-ocean-muted uppercase tracking-wider">Name</th>
                      <th className="p-4 text-xs font-medium text-ocean-muted uppercase tracking-wider">Size</th>
                      <th className="p-4 text-xs font-medium text-ocean-muted uppercase tracking-wider">Date</th>
                      <th className="p-4 text-xs font-medium text-ocean-muted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ocean-border">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-ocean-card-hover transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-ocean-accent text-[18px]">description</span>
                            <span className="text-sm text-ocean-primary">{file.fileName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-ocean-secondary">
                          {formatBytes(file.size)}
                          {file.compressedSize && <span className="text-xs text-ocean-muted ml-1">({formatBytes(file.compressedSize)})</span>}
                        </td>
                        <td className="p-4 text-sm text-ocean-secondary">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDownload(file.id, file.fileName)}
                              className="p-1.5 text-ocean-muted hover:text-ocean-accent transition-colors"
                              title="Download"
                            >
                              <span className="material-symbols-outlined text-[18px]">download</span>
                            </button>
                            <button
                              onClick={() => handleDelete(file)}
                              className="p-1.5 text-ocean-muted hover:text-rose-400 transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
