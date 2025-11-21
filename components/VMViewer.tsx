'use client';

import { useEffect, useRef, useState } from 'react';
import { VMInstance } from '@/lib/vm/types';
import { vmManager } from '@/lib/vm/manager';

interface VMViewerProps {
  vmId: string | null;
  style?: React.CSSProperties;
}

export function VMViewer({ vmId, style }: VMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vm, setVM] = useState<VMInstance | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!vmId) {
      setVM(null);
      return;
    }

    const vmInstance = vmManager.getVM(vmId);
    setVM(vmInstance);

    if (vmInstance && containerRef.current) {
      // Mount VM to container
      vmInstance.mount(containerRef.current).catch((error) => {
        console.error('Failed to mount VM:', error);
      });
    }
  }, [vmId]);

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0a0a0a',
      ...style
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #333',
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          minWidth: '200px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#fff',
            marginBottom: '4px'
          }}>
            {vm.config.name}
          </h2>
          <div style={{
            fontSize: '12px',
            color: '#888'
          }}>
            {vm.config.type.toUpperCase()} • {vm.config.memory}MB RAM
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {!vm.state.isRunning ? (
            <button
              onClick={handleStart}
              disabled={isStarting}
              style={{
                padding: '8px 16px',
                background: '#0f0',
                color: '#000',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isStarting ? 'not-allowed' : 'pointer',
                opacity: isStarting ? 0.6 : 1
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
                  background: vm.state.isPaused ? '#0f0' : '#ffaa00',
                  color: '#000',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {vm.state.isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 16px',
                  background: '#ffaa00',
                  color: '#000',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ↻ Reset
              </button>
              <button
                onClick={handleStop}
                style={{
                  padding: '8px 16px',
                  background: '#ff4444',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500'
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
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#666',
            zIndex: 10
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              💻
            </div>
            <div style={{
              fontSize: '18px',
              marginBottom: '8px',
              color: '#888'
            }}>
              VM is stopped
            </div>
            <div style={{
              fontSize: '14px',
              color: '#555'
            }}>
              Click "Start" to boot the virtual machine
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

