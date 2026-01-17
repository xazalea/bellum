'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth/auth-context';

interface StoredFile {
  id: string;
  fileName: string;
  size: number;
  type: 'discord' | 'telegram';
  createdAt: number;
  ownerUid: string;
}

export default function StoragePage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [storageType, setStorageType] = useState<'discord' | 'telegram'>('discord');
  const auth = useAuth?.() || { user: null };

  // Load user's files
  const loadFiles = async () => {
    if (!auth.user) {
      setFiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch files from API endpoints
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

      const allFiles = [...discordFiles, ...telegramFiles].sort((a, b) => b.createdAt - a.createdAt);
      setFiles(allFiles);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load storage files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [auth.user]);

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !auth.user) return;

    try {
      setUploading(true);
      setError(null);

      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Upload based on selected storage type
      const endpoint = storageType === 'discord' ? '/api/discord/upload' : '/api/telegram/upload';
      
      const response = await fetch(endpoint, {
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

      const result = await response.json();
      console.log('Upload successful:', result);

      // Reload files
      await loadFiles();
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Download file
  const handleDownload = async (file: StoredFile) => {
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

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

  if (!auth.user) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
        <div className="w-full max-w-6xl space-y-8">
          <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
            <h1 className="text-3xl font-pixel text-[#8B9DB8]">Storage</h1>
            <p className="font-retro text-xl text-[#64748B]">Manage your deep sea archives.</p>
          </header>

          <Card className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-[#4A5A6F] mb-4 inline-block">lock</span>
            <h2 className="text-xl font-pixel text-[#8B9DB8] mb-2">Authentication Required</h2>
            <p className="font-retro text-lg text-[#64748B]">
              Please sign in to access your storage.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-pixel text-[#8B9DB8]">Storage</h1>
          <p className="font-retro text-xl text-[#64748B]">Manage your deep sea archives.</p>
        </header>

        {error && (
          <Card className="p-6 border-[#EF4444]/30 bg-[#EF4444]/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#EF4444]">error</span>
              <p className="font-retro text-lg text-[#EF4444]">{error}</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="col-span-1 h-fit space-y-6 p-6">
            <h3 className="font-pixel text-[10px] text-[#64748B] uppercase tracking-wider">Upload File</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block font-retro text-sm text-[#8B9DB8] mb-2">Storage Type</label>
                <select
                  value={storageType}
                  onChange={(e) => setStorageType(e.target.value as 'discord' | 'telegram')}
                  className="w-full bg-[#1E2A3A] border border-[#2A3648] text-[#8B9DB8] rounded-lg p-2 font-retro"
                >
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>

              <div>
                <label className="block font-retro text-sm text-[#8B9DB8] mb-2">Select File</label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
              </div>

              {selectedFile && (
                <div className="p-3 bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648]">
                  <p className="font-retro text-sm text-[#8B9DB8] truncate">{selectedFile.name}</p>
                  <p className="font-retro text-xs text-[#64748B]">{formatSize(selectedFile.size)}</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
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
                <span>Total Storage</span>
                <span>{formatSize(totalSize)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#4A5A6F] font-retro">
                <span>{files.length} files</span>
                <span>{files.filter(f => f.type === 'discord').length} Discord / {files.filter(f => f.type === 'telegram').length} Telegram</span>
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
                  <span className="material-symbols-outlined text-6xl text-[#4A5A6F]">folder_open</span>
                  <h3 className="font-pixel text-lg text-[#8B9DB8]">No Files Yet</h3>
                  <p className="font-retro text-base text-[#64748B]">Upload files to get started</p>
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
                        {file.type === 'discord' ? 'forum' : 'send'}
                      </span>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-retro text-base text-[#8B9DB8] truncate">{file.fileName}</h4>
                        <p className="font-retro text-sm text-[#64748B]">
                          {formatSize(file.size)} • {formatDate(file.createdAt)} • {file.type}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(file)}
                      className="bg-transparent border-[#2A3648] hover:border-[#64748B] px-3"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                    </Button>
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
