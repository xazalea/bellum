'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NachoLoader } from '@/lib/engine/loaders/nacho-loader';
import { FileType } from '@/lib/engine/analyzers/binary-analyzer';

interface VMInstance {
  id: string;
  type: 'android' | 'windows' | 'linux';
  status: 'running' | 'stopped' | 'booting';
  name: string;
  cpu: number;
  ram: number;
  uptime?: string;
}

export default function VirtualMachinesPage() {
  const [instances, setInstances] = useState<VMInstance[]>([]);
  const [selectedType, setSelectedType] = useState<'android' | 'windows' | 'linux'>('android');
  const [activeInstance, setActiveInstance] = useState<VMInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ cpu: 0, ram: 0, ping: 0 });
  const [vmStatus, setVmStatus] = useState<string>('Idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nachoLoaderRef = useRef<NachoLoader | null>(null);

  // Simulated stats update (replace with real backend polling)
  useEffect(() => {
    // Stats are now handled by NachoLoader
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
      
      // Initialize Nacho VM
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
        
        // Boot the VM based on type
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
      description: 'Mobile apps in the browser',
      features: ['APK Support', 'Touch Controls', 'GPS Simulation']
    },
    { 
      type: 'windows' as const, 
      name: 'Windows', 
      icon: 'desktop_windows',
      description: 'Full Windows desktop',
      features: ['DirectX Support', 'File System', 'USB Passthrough']
    },
    { 
      type: 'linux' as const, 
      name: 'Linux', 
      icon: 'terminal',
      description: 'Server environments',
      features: ['Docker Support', 'SSH Access', 'CLI Tools']
    }
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 relative z-10">
      <div className="w-full max-w-7xl space-y-8">
        <header className="space-y-3 border-b border-[#2A3648]/50 pb-6">
          <h1 className="text-3xl font-sans font-bold text-[#8B9DB8]">Virtual Machines</h1>
          <p className="font-sans text-xl text-[#64748B]">
            Run Android, Windows, and Linux environments in your browser.
          </p>
        </header>

        {activeInstance ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Display */}
            <Card className="lg:col-span-2 h-[600px] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#2A3648]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-[#8B9DB8]">
                    {activeInstance.type === 'android' ? 'phone_android' : 
                     activeInstance.type === 'windows' ? 'desktop_windows' : 'terminal'}
                  </span>
                  <div>
                    <h3 className="font-sans font-medium text-sm text-[#8B9DB8]">{activeInstance.name}</h3>
                    <p className="font-sans text-sm text-[#64748B]">
                      {activeInstance.status === 'booting' ? 'Booting...' : 
                       activeInstance.status === 'running' ? 'Running' : 'Stopped'}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => stopInstance(activeInstance.id)}
                  className="bg-transparent border-[#2A3648] hover:border-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                >
                  <span className="material-symbols-outlined text-base">stop</span>
                </Button>
              </div>

              <div className="flex-grow bg-gradient-to-br from-[#000000] to-[#0A0E14] flex items-center justify-center relative overflow-hidden">
                {activeInstance.status === 'booting' ? (
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <span className="material-symbols-outlined text-6xl text-[#4A5A6F] animate-spin">hourglass_empty</span>
                      <div className="absolute inset-0 blur-xl bg-[#64748B]/20 animate-pulse"></div>
                    </div>
                    <p className="font-sans text-xs text-[#64748B] tracking-wider">
                      {vmStatus.toUpperCase()}
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <canvas 
                      ref={canvasRef} 
                      className="w-full h-full"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="absolute top-4 left-4 bg-black/80 px-4 py-2 rounded-lg border border-[#2A3648]">
                      <p className="font-sans font-medium text-xs text-[#10B981]">{vmStatus}</p>
                      <p className="font-sans text-xs text-[#64748B] mt-1">
                        {activeInstance.type === 'android' && 'Nacho Android Runtime (WASM)'}
                        {activeInstance.type === 'windows' && 'Nacho Windows Runtime (x86→WASM JIT)'}
                        {activeInstance.type === 'linux' && 'Nacho Linux Runtime (V86)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              {/* System Stats */}
              <Card className="p-6">
                <h3 className="font-sans text-xs mb-5 text-[#64748B] uppercase tracking-wider font-semibold">System Stats</h3>
                <div className="space-y-4 font-sans text-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8B9DB8]">CPU</span>
                    <span className="text-[#64748B] text-base">{stats.cpu}%</span>
                  </div>
                  <div className="w-full bg-[#0C1016] rounded-full h-2 border border-[#2A3648]">
                    <div 
                      className="h-full bg-gradient-to-r from-[#4A5A6F] to-[#64748B] rounded-full transition-all duration-500"
                      style={{ width: `${stats.cpu}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8B9DB8]">RAM</span>
                    <span className="text-[#64748B] text-base">{stats.ram} / 4096 MB</span>
                  </div>
                  <div className="w-full bg-[#0C1016] rounded-full h-2 border border-[#2A3648]">
                    <div 
                      className="h-full bg-gradient-to-r from-[#4A5A6F] to-[#64748B] rounded-full transition-all duration-500"
                      style={{ width: `${(stats.ram / 4096) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8B9DB8]">Latency</span>
                    <span className="text-[#64748B] text-base">{stats.ping} ms</span>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="font-sans text-xs mb-4 text-[#64748B] uppercase tracking-wider font-semibold">Quick Actions</h3>
                <div className="space-y-2">
                  {activeInstance.type === 'android' && (
                    <>
                      <Button className="w-full justify-start text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">upload_file</span>
                        Install APK
                      </Button>
                      <Button className="w-full justify-start text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        GPS Settings
                      </Button>
                    </>
                  )}
                  {activeInstance.type === 'windows' && (
                    <>
                      <Button className="w-full justify-start text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">folder</span>
                        File Manager
                      </Button>
                      <Button className="w-full justify-start text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">videogame_asset</span>
                        DirectX Test
                      </Button>
                    </>
                  )}
                  {activeInstance.type === 'linux' && (
                    <>
                      <Button className="w-full justify-start text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">terminal</span>
                        Open Terminal
                      </Button>
                      <Button className="w-full justify-start text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">code</span>
                        Run Script
                      </Button>
                    </>
                  )}
                  <Button className="w-full justify-start text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">settings</span>
                    Settings
                  </Button>
                </div>
              </Card>

              {/* Active Instances */}
              {instances.length > 1 && (
                <Card className="p-6">
                  <h3 className="font-sans text-xs mb-4 text-[#64748B] uppercase tracking-wider font-semibold">
                    Other Instances
                  </h3>
                  <div className="space-y-2">
                    {instances.filter(i => i.id !== activeInstance.id).map(instance => (
                      <div 
                        key={instance.id}
                        className="flex items-center justify-between p-2 bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648] hover:border-[#4A5A6F] transition-colors cursor-pointer"
                        onClick={() => setActiveInstance(instance)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-[#64748B]">
                            {instance.type === 'android' ? 'phone_android' : 
                             instance.type === 'windows' ? 'desktop_windows' : 'terminal'}
                          </span>
                          <span className="font-sans text-sm text-[#8B9DB8]">{instance.name}</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          // System Selection
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-sans font-bold text-[#8B9DB8]">Choose Your System</h2>
              <p className="font-sans text-lg text-[#64748B]">
                Select an operating system to launch
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {systems.map((system) => (
                <Card 
                  key={system.type}
                  variant="hover" 
                  className="flex flex-col space-y-6 p-8 cursor-pointer group"
                  onClick={() => launchInstance(system.type)}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1E2A3A] to-[#0C1016] border border-[#2A3648] flex items-center justify-center group-hover:border-[#64748B] group-hover:scale-105 transition-all group-hover:shadow-lg group-hover:shadow-[#64748B]/20">
                      <span className="material-symbols-outlined text-6xl text-[#4A5A6F] group-hover:text-[#64748B] transition-colors">
                        {system.icon}
                      </span>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-sans font-semibold text-[#8B9DB8] group-hover:text-[#A0B3CC] transition-colors">
                        {system.name}
                      </h3>
                      <p className="font-sans text-base text-[#64748B]">
                        {system.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex-grow space-y-2">
                    <h4 className="font-sans text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Features</h4>
                    {system.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]"></span>
                        <span className="font-sans text-sm text-[#64748B]">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full flex items-center justify-center gap-2" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#64748B] border-t-transparent rounded-full animate-spin"></span>
                        <span>Launching...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                        <span>Launch {system.name}</span>
                      </>
                    )}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
