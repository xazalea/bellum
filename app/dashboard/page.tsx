
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '@/lib/ui/design-system';
import { hiberFile } from '@/lib/storage/hiberfile';
import { AppLibraryManager, StoredApp } from '@/lib/storage/app-library';
import { useRouter } from 'next/navigation';

const AppCard = ({ 
  app, 
  onDelete, 
  onPlay
}: { 
  app: StoredApp; 
  onDelete: (id: string) => void;
  onPlay: (app: StoredApp) => void;
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: colors.bg.secondary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        minHeight: '180px'
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          background: `linear-gradient(135deg, ${colors.accent.primary}, ${colors.accent.secondary})`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          fontSize: '24px',
          boxShadow: `0 4px 12px ${colors.accent.primary}40`
        }}>
          {app.icon || '🚀'}
        </div>
        <h3 style={{ color: colors.text.primary, fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {app.name}
        </h3>
        <p style={{ color: colors.text.secondary, fontSize: '12px', fontFamily: 'monospace' }}>
          {(app.size / (1024 * 1024)).toFixed(1)} MB • {app.type?.toUpperCase() || 'APP'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button 
          onClick={() => onPlay(app)}
          style={{
            flex: 1,
            padding: '10px',
            background: colors.accent.primary,
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          LAUNCH
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
          style={{
            padding: '10px',
            background: 'rgba(255, 50, 50, 0.1)',
            border: '1px solid rgba(255, 50, 50, 0.2)',
            borderRadius: '8px',
            color: colors.accent.error,
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title="Delete App"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [library, setLibrary] = useState<AppLibraryManager | null>(null);
  const [apps, setApps] = useState<StoredApp[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const lib = new AppLibraryManager(hiberFile);
    setLibrary(lib);
    setTimeout(() => {
      setApps([...lib.getApps()]);
    }, 100);
  }, []);

  const refreshApps = () => {
    if (library) {
      setApps([...library.getApps()]);
    }
  };

  const handleFile = async (file: File) => {
      if (!library) return;
      setIsUploading(true);
      try {
          await library.installApp(file);
          refreshApps();
      } catch (err) {
          console.error(err);
          alert('Failed to install app');
      } finally {
          setIsUploading(false);
      }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    await handleFile(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!library) return;
    if (confirm('Permanently delete this app from your library?')) {
      await library.deleteApp(id);
      refreshApps();
    }
  };

  const handlePlay = (app: StoredApp) => {
    router.push(`/play?file=${encodeURIComponent(app.storagePath)}`);
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
          setDragActive(true);
      } else if (e.type === 'dragleave') {
          setDragActive(false);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
      }
  };

  return (
    <div 
        style={{ minHeight: '100vh', background: colors.bg.primary, color: colors.text.primary, padding: '40px 20px' }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {dragActive && (
          <div className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-blue-500 border-dashed m-4 rounded-3xl">
              <div className="text-4xl font-bold text-blue-400">DROP TO INSTALL</div>
          </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: colors.text.primary, letterSpacing: '-1px' }}>
                nacho<span style={{color: colors.accent.primary}}>.</span>engine
            </h1>
            <p style={{ color: colors.text.secondary, fontFamily: 'monospace' }}>High-Performance Web Runtime</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
             <button 
                onClick={() => router.push('/unblocker')}
                style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    color: colors.text.secondary,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                }}
             >
                Web Games
             </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleUpload} 
              style={{ display: 'none' }} 
              accept=".apk,.exe,.iso,.zip"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: '12px 24px',
                background: isUploading ? colors.bg.tertiary : colors.accent.primary,
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: `0 0 20px ${colors.accent.primary}40`
              }}
            >
              {isUploading ? 'Converting...' : 'Install App'}
            </button>
          </div>
        </div>

        {/* App Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
          <AnimatePresence>
            {apps.map(app => (
              <AppCard 
                key={app.id} 
                app={app} 
                onDelete={handleDelete}
                onPlay={handlePlay}
              />
            ))}
          </AnimatePresence>
          
          {/* Empty State */}
          {apps.length === 0 && !isUploading && (
              <div 
                style={{ 
                    gridColumn: '1 / -1', 
                    height: '300px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: `2px dashed ${colors.border.secondary}`,
                    borderRadius: '20px',
                    color: colors.text.secondary
                }}
              >
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📥</div>
                  <p>Drag and drop an .APK or .EXE file here to convert it.</p>
              </div>
          )}
        </div>

      </div>
    </div>
  );
}
