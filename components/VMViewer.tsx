'use client';

import { useEffect, useRef, useState } from 'react';
import { VMInstance } from '@/lib/vm/types';
import { vmManager } from '@/lib/vm/manager';

interface VMViewerProps {
  vmId?: string | null;
  vmType?: import('@/lib/vm/types').VMType;
  gameId?: string;
  style?: React.CSSProperties;
}

export function VMViewer({ vmId, vmType, gameId, style }: VMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vm, setVM] = useState<VMInstance | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLowSpec, setIsLowSpec] = useState(false);

  useEffect(() => {
    const initializeVM = async () => {
      if (vmId) {
        // Use existing VM
        const vmInstance = vmManager.getVM(vmId);
        setVM(vmInstance);
        if (vmInstance && containerRef.current) {
          await vmInstance.mount(containerRef.current).catch((error) => {
            console.error('Failed to mount VM:', error);
          });
        }
      } else if (vmType) {
        // Create new VM from type
        try {
          const vmId = `vm-${vmType}-${Date.now()}`;
          const vmInstance = await vmManager.createVM({
            id: vmId,
            type: vmType,
            name: `${vmType} VM`,
            memory: 2048,
            executionMode: gameId ? 'game' : 'system',
          });
          setVM(vmInstance);
          if (containerRef.current) {
            await vmInstance.mount(containerRef.current).catch((error) => {
              console.error('Failed to mount VM:', error);
            });
          }
        } catch (error) {
          console.error('Failed to create VM:', error);
        }
      } else {
        setVM(null);
      }
    };

    initializeVM();
  }, [vmId, vmType, gameId]);

  const handleStart = async () => {
    if (!vm || isStarting) return;

    setIsStarting(true);
    try {
      await vm.start();
    } catch (error) {
      console.error('Failed to start VM:', error);
      alert('Failed to start VM. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!vm) return;

    try {
      await vm.stop();
    } catch (error) {
      console.error('Failed to stop VM:', error);
      alert('Failed to stop VM. Please try again.');
    }
  };

  const handlePause = async () => {
    if (!vm) return;

    try {
      if (vm.state.isPaused) {
        await vm.resume();
      } else {
        await vm.pause();
      }
    } catch (error) {
      console.error('Failed to pause/resume VM:', error);
      alert('Failed to pause/resume VM. Please try again.');
    }
  };

  const handleReset = async () => {
    if (!vm) return;

    if (!confirm('Are you sure you want to reset this VM? All unsaved progress will be lost.')) {
      return;
    }

    try {
      await vm.reset();
    } catch (error) {
      console.error('Failed to reset VM:', error);
      alert('Failed to reset VM. Please try again.');
    }
  };

  // Handle Low Spec Mode toggle
  const toggleLowSpec = () => {
    setIsLowSpec(!isLowSpec);
    // In a real implementation, this would reconfigure the VM
    // e.g., vm.setConfig({ lowSpec: !isLowSpec });
    // For now, it's a visual toggle that we can hook into later
    console.log(`Low Spec Mode for ${vmId}: ${!isLowSpec}`);
  };

  if (!vmId || !vm) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        color: '#666',
        fontSize: '16px',
        ...style
      }}>
        Select a VM to get started
      </div>
    );
  }

  return (
    <div 
      className="glass gpu-accelerated"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(17, 17, 17, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Toolbar */}
      <div 
        className="glass-strong"
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{
          flex: 1,
          minWidth: '200px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '4px'
          }}>
            {vm.config.name}
          </h2>
          <div style={{
            fontSize: '12px',
            color: '#b0b0b0'
          }}>
            {vm.config.type.toUpperCase()} • {vm.config.memory}MB RAM
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {/* Low Spec Mode Toggle */}
          <label 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#b0b0b0', 
              fontSize: '13px', 
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              background: isLowSpec ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
              border: `1px solid ${isLowSpec ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              transition: 'all 250ms ease'
            }}
          >
            <input
              type="checkbox"
              checked={isLowSpec}
              onChange={toggleLowSpec}
              style={{ 
                transform: 'scale(1.2)',
                accentColor: '#00ff88'
              }}
            />
            Low Spec
          </label>

          {!vm.state.isRunning ? (
            <button
              onClick={handleStart}
              disabled={isStarting}
              style={{
                padding: '8px 16px',
                background: isStarting ? 'rgba(0, 255, 136, 0.3)' : '#00ff88',
                color: '#000',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isStarting ? 'not-allowed' : 'pointer',
                opacity: isStarting ? 0.6 : 1,
                transition: 'all 250ms ease',
                boxShadow: isStarting ? 'none' : '0 0 20px rgba(0, 255, 136, 0.3)'
              }}
            >
              {isStarting ? 'Starting...' : '▶ Start'}
            </button>
          ) : (
            <>
              <button
                onClick={handlePause}
                style={{
                  padding: '8px 16px',
                  background: vm.state.isPaused ? '#00ff88' : '#ffaa00',
                  color: '#000',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 250ms ease',
                  boxShadow: vm.state.isPaused 
                    ? '0 0 20px rgba(0, 255, 136, 0.3)' 
                    : '0 0 20px rgba(255, 170, 0, 0.3)'
                }}
              >
                {vm.state.isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 170, 0, 0.2)',
                  color: '#ffaa00',
                  border: '1px solid rgba(255, 170, 0, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 250ms ease'
                }}
              >
                ↻ Reset
              </button>
              <button
                onClick={handleStop}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 68, 68, 0.2)',
                  color: '#ff4444',
                  border: '1px solid rgba(255, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 250ms ease'
                }}
              >
                ⏹ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* VM Display */}
      <div
        ref={containerRef}
        className="gpu-accelerated"
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#000',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {!vm.state.isRunning && (
          <div 
            className="glass"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#b0b0b0',
              zIndex: 10,
              padding: '32px',
              borderRadius: '16px',
              background: 'rgba(17, 17, 17, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.3))'
            }}>
              💻
            </div>
            <div style={{
              fontSize: '18px',
              marginBottom: '8px',
              color: '#ffffff',
              fontWeight: '600'
            }}>
              VM is stopped
            </div>
            <div style={{
              fontSize: '14px',
              color: '#808080'
            }}>
              Click &quot;Start&quot; to boot the virtual machine
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

