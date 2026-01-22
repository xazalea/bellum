'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NachoLoader } from '@/lib/engine/loaders/nacho-loader';

interface VMInstance {
  id: string;
  type: 'android' | 'windows' | 'linux';
  status: 'running' | 'stopped' | 'booting';
  name: string;
  cpu: number;
  ram: number;
}

export default function VirtualMachinesPage() {
  const [instances, setInstances] = useState<VMInstance[]>([]);
  const [activeInstance, setActiveInstance] = useState<VMInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ cpu: 0, ram: 0, ping: 0 });
  const [vmStatus, setVmStatus] = useState<string>('Idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nachoLoaderRef = useRef<NachoLoader | null>(null);

  useEffect(() => {
    return () => {
      if (nachoLoaderRef.current) {
        nachoLoaderRef.current.stop();
      }
    };
  }, []);

  const launchInstance = async (type: 'android' | 'windows' | 'linux') => {
    setLoading(true);
    setVmStatus('Initializing...');
    
    try {
      const newInstance: VMInstance = {
        id: `vm-${Date.now()}`,
        type,
        status: 'booting',
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} VM`,
        cpu: 0,
        ram: 0
      };
      
      setInstances([...instances, newInstance]);
      setActiveInstance(newInstance);
      
      if (canvasRef.current) {
        if (!nachoLoaderRef.current) {
          nachoLoaderRef.current = new NachoLoader();
        }
        
        const loader = nachoLoaderRef.current;
        
        loader.onStatusUpdate = (status, detail) => {
          setVmStatus(`${status}${detail ? ': ' + detail : ''}`);
        };
        
        loader.onStatsUpdate = (newStats) => {
          setStats(newStats);
        };
        
        try {
          await loader.initialize(type);
          newInstance.status = 'running';
          setInstances(prev => [...prev.filter(i => i.id !== newInstance.id), newInstance]);
          setVmStatus('VM Running - WASM/WebGPU Accelerated');
        } catch (err) {
          console.error(err);
          setVmStatus('Boot Failed');
          setLoading(false);
          return;
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to launch VM:', error);
      setVmStatus('Error: ' + (error as Error).message);
      setLoading(false);
    }
  };

  const stopInstance = (id: string) => {
    setInstances(instances.filter(i => i.id !== id));
    if (activeInstance?.id === id) {
      setActiveInstance(null);
    }
  };

  const systems = [
    { 
      type: 'android' as const, 
      name: 'Android', 
      icon: 'phone_android',
      description: 'Run APKs with native performance',
      features: ['APK Support', 'Touch Controls', 'GPS Simulation']
    },
    { 
      type: 'windows' as const, 
      name: 'Windows', 
      icon: 'desktop_windows',
      description: 'Full desktop environment',
      features: ['DirectX Support', 'File System', 'USB Passthrough']
    },
    { 
      type: 'linux' as const, 
      name: 'Linux', 
      icon: 'terminal',
      description: 'Server & Dev environments',
      features: ['Docker Support', 'SSH Access', 'CLI Tools']
    }
  ];

  return (
    <main className="min-h-screen bg-nacho-bg p-6 pt-24">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-nacho-primary tracking-tight">Virtual Machines</h1>
          <p className="text-nacho-muted text-lg">
            High-performance execution environments powered by WebAssembly.
          </p>
        </header>

        {activeInstance ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Display */}
            <div className="lg:col-span-2 bg-white rounded-nacho shadow-nacho overflow-hidden border border-nacho-border h-[600px] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-nacho-border bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-nacho-secondary">
                    {activeInstance.type === 'android' ? 'phone_android' : 
                     activeInstance.type === 'windows' ? 'desktop_windows' : 'terminal'}
                  </span>
                  <div>
                    <h3 className="font-medium text-nacho-primary">{activeInstance.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${activeInstance.status === 'running' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      <p className="text-xs text-nacho-muted capitalize">{activeInstance.status}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => stopInstance(activeInstance.id)}
                  className="p-2 hover:bg-red-50 text-nacho-muted hover:text-red-500 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">stop_circle</span>
                </button>
              </div>

              <div className="flex-grow bg-black relative flex items-center justify-center">
                {activeInstance.status === 'booting' ? (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-nacho-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-white/70 font-mono text-sm">{vmStatus}</p>
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <canvas 
                      ref={canvasRef} 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                      <p className="text-green-400 font-mono text-xs">{vmStatus}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="bg-white rounded-nacho shadow-nacho p-6 border border-nacho-border">
                <h3 className="text-xs font-bold text-nacho-muted uppercase tracking-wider mb-6">Performance</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-nacho-secondary">CPU Usage</span>
                      <span className="font-mono text-nacho-primary">{stats.cpu}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-nacho-accent transition-all duration-500"
                        style={{ width: `${stats.cpu}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-nacho-secondary">RAM Usage</span>
                      <span className="font-mono text-nacho-primary">{stats.ram} MB</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-nacho-accent transition-all duration-500"
                        style={{ width: `${(stats.ram / 4096) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-nacho-border flex justify-between items-center">
                    <span className="text-sm text-nacho-secondary">Latency</span>
                    <span className="font-mono text-green-600 bg-green-50 px-2 py-1 rounded">{stats.ping}ms</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-nacho shadow-nacho p-6 border border-nacho-border">
                <h3 className="text-xs font-bold text-nacho-muted uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-sm text-nacho-primary transition-colors text-left">
                    <span className="material-symbols-outlined text-nacho-accent">upload_file</span>
                    {activeInstance.type === 'android' ? 'Install APK' : 'Load Executable'}
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-sm text-nacho-primary transition-colors text-left">
                    <span className="material-symbols-outlined text-nacho-accent">settings</span>
                    Configure VM
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-sm text-nacho-primary transition-colors text-left">
                    <span className="material-symbols-outlined text-nacho-accent">terminal</span>
                    Open Console
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Selection Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systems.map((system) => (
              <button
                key={system.type}
                onClick={() => launchInstance(system.type)}
                disabled={loading}
                className="group bg-white p-8 rounded-nacho shadow-nacho hover:shadow-nacho-hover border border-nacho-border text-left transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl text-nacho-accent">
                    {system.icon}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-nacho-primary mb-2">{system.name}</h3>
                <p className="text-nacho-muted mb-6 h-12">{system.description}</p>
                
                <div className="space-y-2 mb-8">
                  {system.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-nacho-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-nacho-accent"></span>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="flex items-center text-nacho-accent font-medium group-hover:gap-2 transition-all">
                  Launch {system.name}
                  <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
