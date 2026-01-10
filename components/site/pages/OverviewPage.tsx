'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlobalSearch } from '@/components/nacho-ui/GlobalSearch';
import { Button } from '@/components/nacho-ui/Button';
import { Card } from '@/components/nacho-ui/Card';
import { ProgressBar } from '@/components/nacho-ui/ProgressBar';
import { StatusIndicator } from '@/components/nacho-ui/StatusIndicator';
import { AppCard } from '@/components/nacho-ui/AppCard';
import { IconCard } from '@/components/nacho-ui/IconCard';
import { PageTransition } from '@/components/nacho-ui/PageTransition';
import { Settings, ArrowRight, ChevronRight, Play, HardDrive, Cpu, MoreVertical } from 'lucide-react';
import { useInstalledApps } from '../hooks/useInstalledApps';
import { useClusterPeers } from '../hooks/useClusterPeers';

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function OverviewPage() {
  const router = useRouter();
  const { apps } = useInstalledApps();
  const { peers } = useClusterPeers();
  const [search, setSearch] = useState('');

  const featured = useMemo(() => {
    return [...apps].sort((a, b) => b.installedAt - a.installedAt)[0] ?? null;
  }, [apps]);

  const storageUsed = useMemo(() => apps.reduce((acc, app) => acc + (app.storedBytes || 0), 0), [apps]);
  const storagePercent = Math.min(100, (storageUsed / (5 * 1024 * 1024 * 1024)) * 100); // Assume 5GB quota for demo

  return (
    <PageTransition>
      <div className="flex flex-col gap-10 pb-20">
        {/* Hero Section */}
        <section className="text-center space-y-8 pt-20 pb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-5xl md:text-7xl font-light tracking-tight text-white"
          >
            Play. <span className="font-bold text-nacho-primary">Instantly.</span> Securely.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-nacho-subtext/80 font-light leading-relaxed"
          >
            Your universal runtime for Windows and Android apps, powered by distributed computing.
          </motion.p>
        </section>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column Group */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="flex flex-col gap-4">
            <div className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/60 pl-1">Library Search</div>
            <GlobalSearch 
              placeholder="Find apps, settings, or files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/library?q=${encodeURIComponent(search)}`);
                }
              }}
            />
          </Card>
          </motion.div>

          {/* Split Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Card className="flex flex-col gap-8 h-full justify-between">
              <div className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/60 pl-1">Quick Actions</div>
              
              <div className="flex flex-col gap-4">
                <Button 
                  className="w-full justify-between group"
                  onClick={() => router.push('/library')}
                >
                  Install New App
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Button>
                
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => router.push('/network')}>
                    View Network
                  </Button>
                  <Button variant="secondary" className="px-3 aspect-square">
                    <Settings size={20} />
                  </Button>
                </div>
              </div>
            </Card>
            </motion.div>

            {/* System Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Card className="flex flex-col gap-8 h-full">
              <div className="text-xs font-bold tracking-widest uppercase text-nacho-subtext/60 pl-1">System Status</div>
              
              <div className="space-y-6">
                <ProgressBar value={storagePercent} label="Storage Quota" showValue />
                
                <div className="flex flex-wrap gap-2">
                  <StatusIndicator status={peers.length > 0 ? 'active' : 'pending'} label="Cluster" />
                  <StatusIndicator status="active" label="Runtime" />
                  <StatusIndicator status="info" label={`${apps.length} Apps`} />
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-nacho-border">
                  <span className="text-sm font-medium text-nacho-subtext">Version</span>
                  <span className="text-sm font-mono text-white">v1.0.4</span>
                </div>
              </div>
            </Card>
            </motion.div>

          </div>
        </div>

        {/* Right Column Group */}
        <div className="flex flex-col gap-6">
          
          {/* Featured App (Standard Card) */}
          {featured ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Card className="flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Cpu size={100} />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-nacho-card-hover border border-nacho-border flex items-center justify-center text-nacho-primary mb-2 shadow-glow">
                {featured.type === 'android' ? <span className="material-symbols-outlined">smartphone</span> : <span className="material-symbols-outlined">desktop_windows</span>}
              </div>
              
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-nacho-primary mb-1">Jump Back In</div>
                <h3 className="text-xl font-bold text-white truncate">{featured.name}</h3>
              </div>
              
              <p className="text-sm text-nacho-subtext leading-relaxed line-clamp-2">
                {featured.originalName}
              </p>
              
              <Button 
                onClick={() => router.push(`/play?appId=${encodeURIComponent(featured.id)}`)}
                className="mt-2 w-full gap-2"
              >
                <Play size={18} fill="currentColor" /> Resume
              </Button>
            </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Card className="flex flex-col gap-4">
              <div className="h-12 w-12 rounded-2xl bg-nacho-card-hover border border-nacho-border flex items-center justify-center text-nacho-subtext mb-2">
                <HardDrive size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">No Apps Installed</h3>
              <p className="text-sm text-nacho-subtext leading-relaxed">
                Your library is empty. Install your first app to get started.
              </p>
              <Button onClick={() => router.push('/library')} className="mt-2">Go to Library</Button>
            </Card>
            </motion.div>
          )}

          {/* App Card (Static or Contextual) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <Card className="relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-nacho-subtext/20 to-nacho-subtext/5 backdrop-blur-sm border border-white/5" />
              <button className="text-nacho-subtext hover:text-white transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2 font-display">Nacho Workspace</h3>
            <p className="text-sm text-nacho-subtext leading-relaxed mb-6">
              Manage your distributed compute nodes and storage buckets.
            </p>
            
            <Button variant="secondary" className="w-full uppercase text-xs tracking-wider font-bold py-3 hover:bg-nacho-card-hover hover:border-nacho-border-strong">
              Open Workspace
            </Button>
          </Card>
          </motion.div>

          {/* Icon Card (Stats) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="relative overflow-hidden bg-nacho-primary/90 rounded-[2rem] p-6 md:p-8 text-nacho-bg transition-transform hover:-translate-y-1 duration-300 cursor-pointer"
          >
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xs font-bold tracking-widest uppercase opacity-70 mb-1">Total Storage</div>
                <div className="text-4xl font-black font-display tracking-tight">{formatBytes(storageUsed)}</div>
              </div>
              <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center backdrop-blur-sm">
                <HardDrive className="h-6 w-6 opacity-80" />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
    </PageTransition>
  );
}
