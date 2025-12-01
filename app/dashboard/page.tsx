'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '@/lib/ui/design-system';
import { hiberFile } from '@/lib/storage/hiberfile';
import { AppLibraryManager, StoredApp, PublicLibrary } from '@/lib/storage/app-library';
import { useRouter } from 'next/navigation';

// --- Components ---

const ProgressBar = ({ progress, color = colors.accent.primary }: { progress: number; color?: string }) => (
  <div style={{ 
    width: '100%', 
    height: '4px', 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '2px', 
    overflow: 'hidden',
    marginTop: '8px'
  }}>
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      style={{ 
        height: '100%', 
        background: color,
        borderRadius: '2px'
      }} 
    />
  </div>
);

const AppCard = ({ 
  app, 
  onActivate, 
  onDeactivate, 
  onDelete, 
  onPlay,
  onSelect,
  selected = false
}: { 
  app: StoredApp; 
  onActivate: (id: string) => void; 
  onDeactivate: (id: string) => void; 
  onDelete: (id: string) => void;
  onPlay: (path: string) => void;
  onSelect?: (id: string) => void;
  selected?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAction = async (action: 'activate' | 'deactivate') => {
    setLoading(true);
    setProgress(0);
    try {
      if (action === 'activate') await onActivate(app.id);
      else await onDeactivate(app.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        borderColor: selected ? colors.accent.primary : (app.isActive ? colors.accent.primary + '40' : colors.border.primary)
      }}
      onClick={() => onSelect && onSelect(app.id)}
      style={{
        background: colors.bg.secondary,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: app.isActive ? `0 4px 20px ${colors.accent.primary}15` : 'none',
        cursor: onSelect ? 'pointer' : 'default'
      }}
    >
      {/* Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: 'bold',
        background: app.isActive ? colors.accent.primary + '20' : colors.bg.tertiary,
        color: app.isActive ? colors.accent.primary : colors.text.secondary,
        border: `1px solid ${app.isActive ? colors.accent.primary + '40' : 'transparent'}`
      }}>
        {app.isActive ? 'ACTIVE' : 'ARCHIVED'}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          background: app.isActive ? `linear-gradient(135deg, ${colors.accent.primary}, ${colors.accent.secondary})` : colors.bg.tertiary,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          fontSize: '24px'
        }}>
          {app.isActive ? '🚀' : '📦'}
        </div>
        <h3 style={{ color: colors.text.primary, fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {app.name}
        </h3>
        <p style={{ color: colors.text.secondary, fontSize: '12px' }}>
          {(app.size / (1024 * 1024)).toFixed(1)} MB
        </p>
      </div>

      {loading && (
        <div style={{ marginBottom: '12px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.text.secondary, marginBottom: '4px' }}>
             <span>{app.isActive ? 'Archiving...' : 'Activating...'}</span>
             <span>{Math.round(progress)}%</span>
           </div>
           <ProgressBar progress={progress} color={app.isActive ? colors.error.primary : colors.accent.primary} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }} onClick={e => e.stopPropagation()}>
        {app.isActive ? (
          <>
            <button 
              onClick={() => onPlay(app.storagePath)}
              style={{
                flex: 2,
                padding: '8px',
                background: colors.accent.primary,
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Play
            </button>
            <button 
              onClick={() => handleAction('deactivate')}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: colors.text.secondary,
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Archive to Cloud Database"
            >
              Archive
            </button>
          </>
        ) : (
          <button 
            onClick={() => handleAction('activate')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${colors.accent.primary}40`,
              borderRadius: '8px',
              color: colors.accent.primary,
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Activate App
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [library, setLibrary] = useState<AppLibraryManager | null>(null);
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [libraries, setLibraries] = useState<PublicLibrary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Library Creation State
  const [isCreatingLib, setIsCreatingLib] = useState(false);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [libName, setLibName] = useState('');
  const [importId, setImportId] = useState('');

  useEffect(() => {
    const lib = new AppLibraryManager(hiberFile);
    setLibrary(lib);
    // Wait a tick for load
    setTimeout(() => {
      setApps([...lib.getApps()]);
      setLibraries([...lib.getPublicLibraries()]);
    }, 100);
  }, []);

  const refreshApps = () => {
    if (library) {
      setApps([...library.getApps()]);
      setLibraries([...library.getPublicLibraries()]);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !library) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      await library.installApp(file);
      refreshApps();
    } catch (err) {
      console.error(err);
      alert('Failed to install app');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleActivate = async (id: string) => {
    if (!library) return;
    await library.activateApp(id);
    refreshApps();
  };

  const handleDeactivate = async (id: string) => {
    if (!library) return;
    await library.deactivateApp(id);
    refreshApps();
  };

  const handleDelete = async (id: string) => {
    if (!library) return;
    if (confirm('Are you sure you want to delete this app?')) {
      await library.deleteApp(id);
      refreshApps();
    }
  };

  const handlePlay = (path: string) => {
    router.push(`/play?file=${encodeURIComponent(path)}`);
  };

  // --- Library Actions ---

  const toggleAppSelection = (id: string) => {
    if (!isCreatingLib) return;
    const newSet = new Set(selectedApps);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedApps(newSet);
  };

  const handleCreateLibrary = async () => {
    if (!library || !libName || selectedApps.size === 0) return;
    const libId = await library.createPublicLibrary(libName, "Custom Collection", Array.from(selectedApps));
    alert(`Library Created! ID: ${libId}`);
    setIsCreatingLib(false);
    setSelectedApps(new Set());
    setLibName('');
    refreshApps();
  };

  const handleImportLibrary = async () => {
    if (!library || !importId) return;
    try {
      await library.importPublicLibrary(importId);
      alert('Library Imported!');
      setImportId('');
      refreshApps();
    } catch (e) {
      alert('Failed to import library');
    }
  };

  const activeApps = apps.filter(a => a.isActive);
  const archivedApps = apps.filter(a => !a.isActive);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bg.primary, 
      color: colors.text.primary,
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: colors.text.primary }}>Game Library</h1>
            <p style={{ color: colors.text.secondary }}>Manage your active games, archives, and public repositories</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
             <div style={{ 
               padding: '10px 20px', 
               background: 'rgba(255,255,255,0.05)', 
               borderRadius: '12px',
               fontSize: '12px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px',
               border: `1px solid ${colors.border.primary}`
             }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71' }} />
               <span>Cloud Database Connected</span>
             </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleUpload} 
              style={{ display: 'none' }} 
              accept=".iso,.bin,.img,.apk,.exe"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: '12px 24px',
                background: colors.accent.primary,
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isUploading ? 0.7 : 1
              }}
            >
              {isUploading ? 'Installing...' : '+ Add Game'}
            </button>
          </div>
        </div>

        {/* Library Management Toolbar */}
        <div style={{ marginBottom: '40px', padding: '20px', background: colors.bg.secondary, borderRadius: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Create Lib */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>Create Public Repository</h3>
            {isCreatingLib ? (
               <div style={{ display: 'flex', gap: '10px' }}>
                 <input 
                   type="text" 
                   placeholder="Repository Name" 
                   value={libName}
                   onChange={e => setLibName(e.target.value)}
                   style={{ flex: 1, padding: '8px', borderRadius: '8px', background: colors.bg.tertiary, border: 'none', color: '#fff' }}
                 />
                 <button onClick={handleCreateLibrary} style={{ padding: '8px 16px', borderRadius: '8px', background: colors.accent.primary, color: '#000', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Save</button>
                 <button onClick={() => setIsCreatingLib(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
               </div>
            ) : (
              <button 
                onClick={() => setIsCreatingLib(true)}
                style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
              >
                + New Repository
              </button>
            )}
          </div>

          {/* Import Lib */}
          <div style={{ flex: 1 }}>
             <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>Import Repository</h3>
             <div style={{ display: 'flex', gap: '10px' }}>
                 <input 
                   type="text" 
                   placeholder="Library ID / Link" 
                   value={importId}
                   onChange={e => setImportId(e.target.value)}
                   style={{ flex: 1, padding: '8px', borderRadius: '8px', background: colors.bg.tertiary, border: 'none', color: '#fff' }}
                 />
                 <button onClick={handleImportLibrary} style={{ padding: '8px 16px', borderRadius: '8px', background: colors.accent.secondary, color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Import</button>
             </div>
          </div>
        </div>

        {/* Active Apps Section */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Active Games 
            <span style={{ fontSize: '12px', padding: '2px 8px', background: colors.bg.tertiary, borderRadius: '10px', color: colors.text.secondary }}>
              {activeApps.length}
            </span>
            {isCreatingLib && <span style={{ fontSize: '12px', color: colors.accent.primary }}>(Select games to add to repository)</span>}
          </h2>
          
          {activeApps.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: colors.bg.secondary, borderRadius: '16px', border: `1px dashed ${colors.border.secondary}` }}>
              <p style={{ color: colors.text.secondary }}>No active games. Upload one or activate from archive.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              <AnimatePresence>
                {activeApps.map(app => (
                  <AppCard 
                    key={app.id} 
                    app={app} 
                    onActivate={handleActivate} 
                    onDeactivate={handleDeactivate} 
                    onDelete={handleDelete}
                    onPlay={handlePlay}
                    onSelect={toggleAppSelection}
                    selected={selectedApps.has(app.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Archived Apps Section */}
        <section>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Cloud Archive
            <span style={{ fontSize: '12px', padding: '2px 8px', background: colors.bg.tertiary, borderRadius: '10px', color: colors.text.secondary }}>
              {archivedApps.length}
            </span>
          </h2>
          
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
             <div style={{ marginBottom: '20px', fontSize: '12px', color: colors.text.secondary }}>
                Archived games are stored in the Unlimited Cloud Database. Activate them to play.
             </div>

             {archivedApps.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: colors.text.secondary }}>
                Archive is empty. Move active games here to save local space.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                <AnimatePresence>
                  {archivedApps.map(app => (
                    <AppCard 
                      key={app.id} 
                      app={app} 
                      onActivate={handleActivate} 
                      onDeactivate={handleDeactivate} 
                      onDelete={handleDelete}
                      onPlay={handlePlay}
                      onSelect={toggleAppSelection}
                      selected={selectedApps.has(app.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
