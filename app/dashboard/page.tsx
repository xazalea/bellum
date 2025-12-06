'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '@/lib/ui/design-system';
import { hiberFile } from '@/lib/storage/hiberfile';
import { AppLibraryManager, StoredApp } from '@/lib/storage/app-library';
import { useRouter } from 'next/navigation';
import { Box, Grid, Layout, Search, Upload, Gamepad2, FileCode, Package, Clock, Terminal, Cpu } from 'lucide-react';

const getIcon = (app: StoredApp) => {
    if (app.icon) return <img src={app.icon} alt="" className="w-full h-full object-cover rounded-xl" />;
    const ext = app.name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'apk': return <span className="text-green-400 text-2xl">🤖</span>;
        case 'exe': return <span className="text-blue-400 text-2xl">🪟</span>;
        case 'iso': return <span className="text-yellow-400 text-2xl">💿</span>;
        case 'zip': return <span className="text-orange-400 text-2xl">📦</span>;
        default: return <Package className="text-white" />;
    }
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </div>
);

const AppCard = ({ app, onDelete, onPlay }: { app: StoredApp; onDelete: (id: string) => void; onPlay: (app: StoredApp) => void }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 relative group overflow-hidden backdrop-blur-sm hover:border-blue-500/30 transition-colors"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl flex items-center justify-center shadow-lg border border-white/5 group-hover:scale-105 transition-transform">
          {getIcon(app)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{app.name}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {(app.size / (1024 * 1024)).toFixed(1)} MB • {app.type?.split('/').pop()?.toUpperCase() || 'APP'}
          </p>
        </div>
      </div>

      <button 
        onClick={() => onPlay(app)}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm uppercase tracking-wide transition-colors shadow-lg shadow-blue-900/20"
      >
        Launch
      </button>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
      >
        <span className="sr-only">Delete</span>
        🗑️
      </button>
    </motion.div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [library, setLibrary] = useState<AppLibraryManager | null>(null);
  const [apps, setApps] = useState<StoredApp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const initLibrary = async () => {
        try {
            const lib = new AppLibraryManager(hiberFile);
            setLibrary(lib);
            
            // Timeout protection for critical storage failures
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Storage system timed out. Please refresh.')), 8000)
            );

            await Promise.race([
                lib.init(),
                timeout
            ]);
            
            setApps([...lib.getApps()]);
            setIsLoading(false);
        } catch (err: any) {
            console.error('Dashboard Initialization Error:', err);
            setError(err.message || 'Critical Storage Failure');
            setIsLoading(false);
        }
    };
    
    initLibrary();
  }, []);

  if (error) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center pt-24 font-mono">
            <div className="max-w-md w-full p-8 bg-red-950/20 border border-red-500/30 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-6 text-red-500">
                    <Terminal size={32} />
                    <h1 className="text-xl font-bold">SYSTEM FAILURE</h1>
                </div>
                <div className="bg-black/50 p-4 rounded-lg border border-red-500/10 mb-6 font-mono text-sm text-red-200">
                    {'>'} ERROR: {error}<br/>
                    {'>'} STATUS: CRITICAL<br/>
                    {'>'} ACTION: RESTART REQUIRED
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20"
                >
                    REBOOT SYSTEM
                </button>
            </div>
        </div>
      );
  }

  if (isLoading) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center pt-24">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <div className="text-blue-500 font-mono text-sm tracking-wider animate-pulse">INITIALIZING CORE...</div>
            </div>
        </div>
      );
  }

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

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
        className="min-h-screen bg-black text-white flex pt-24"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
    >
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 p-6 flex flex-col gap-2 hidden md:flex">
        <div className="mb-8 px-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Library</div>
            <SidebarItem icon={Layout} label="All Apps" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
            <SidebarItem icon={Clock} label="Recent" active={activeTab === 'recent'} onClick={() => setActiveTab('recent')} />
            <SidebarItem icon={Gamepad2} label="Games" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />
        </div>
        
        <div className="mt-auto px-4">
            <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-gray-400">SYSTEM ONLINE</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>CPU</span>
                        <span>4 CORES</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>MEM</span>
                        <span>256 MB</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Drag Overlay */}
        {dragActive && (
            <div className="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-md flex flex-col items-center justify-center border-4 border-blue-500 border-dashed m-8 rounded-3xl pointer-events-none">
                <Upload size={64} className="text-blue-400 mb-4 animate-bounce" />
                <div className="text-4xl font-bold text-white">DROP TO INSTALL</div>
            </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input 
                    type="text" 
                    placeholder="Search library..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
            </div>
            
            <div className="flex gap-3 ml-4">
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Processing...
                      </>
                  ) : (
                      <>
                        <Upload size={18} />
                        Install App
                      </>
                  )}
                </button>
            </div>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredApps.map(app => (
              <AppCard 
                key={app.id} 
                app={app} 
                onDelete={handleDelete}
                onPlay={handlePlay}
              />
            ))}
          </AnimatePresence>
          
          {/* Empty State */}
          {filteredApps.length === 0 && !isUploading && (
              <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl text-gray-500">
                  <Package size={48} className="mb-4 opacity-50" />
                  <p className="font-medium">No apps found</p>
                  <p className="text-sm mt-1">Drag and drop files to install</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
