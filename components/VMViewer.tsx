import React, { useRef, useState, useEffect } from 'react';
import { vmManager } from '@/lib/vm/manager';
import { VMInstance, VMType } from '@/lib/vm/types';
import { colors } from '@/lib/ui/design-system';

interface VMViewerProps {
  vmId?: string;
  vmType?: VMType;
  gameId?: string;
  style?: React.CSSProperties;
}

export function VMViewer({ vmId, vmType, gameId, style }: VMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vm, setVM] = useState<VMInstance | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');

  useEffect(() => {
    const initializeVM = async () => {
      if (vmId) {
        // Use existing VM
        const vmInstance = vmManager.getVM(vmId);
        setVM(vmInstance);
        if (vmInstance && containerRef.current) {
          setStatusMessage('Mounting VM...');
          await vmInstance.mount(containerRef.current).catch((error) => {
            console.error('Failed to mount VM:', error);
            setStatusMessage('Failed to mount');
          });
          setStatusMessage(vmInstance.state.isRunning ? 'Running' : 'Ready');
        }
      } else if (vmType) {
        // Create new VM from type
        try {
          setStatusMessage(`Creating ${vmType} VM...`);
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
              setStatusMessage('Failed to mount');
            });
            setStatusMessage('Ready to Start');
          }
        } catch (error) {
          console.error('Failed to create VM:', error);
          setStatusMessage('Initialization Failed');
        }
      } else {
        setVM(null);
      }
    };

    initializeVM();
  }, [vmId, vmType, gameId]);

  useEffect(() => {
    if (!vm) return;
    
    const onStateChange = () => {
        if (vm.state.isRunning) setStatusMessage('Running');
        else if (vm.state.isPaused) setStatusMessage('Paused');
        else setStatusMessage('Stopped');
    };

    // Poll status if no event emitter (simplified)
    const interval = setInterval(onStateChange, 500);
    return () => clearInterval(interval);
  }, [vm]);

  const handleStart = async () => {
    if (!vm || isStarting) return;

    setIsStarting(true);
    setStatusMessage('Booting System...');
    try {
      await vm.start();
      setStatusMessage('System Online');
    } catch (error) {
      console.error('Failed to start VM:', error);
      setStatusMessage('Boot Failed');
      alert('Failed to start VM. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!vm) return;
    setStatusMessage('Shutting Down...');
    try {
      await vm.stop();
      setStatusMessage('System Offline');
    } catch (error) {
      console.error('Failed to stop VM:', error);
      setStatusMessage('Shutdown Error');
    }
  };

  if (!vmId && !vmType) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        background: colors.bg.primary,
        color: colors.text.primary,
        fontSize: '24px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🖥️</div>
        <div>No VM Selected</div>
        <div style={{ fontSize: '16px', color: colors.text.secondary }}>Please select a game or system to boot.</div>
      </div>
    );
  }

  return (
    <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#000', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...style 
    }}>
      {/* VM Display Container */}
      <div 
        ref={containerRef} 
        style={{ 
            flex: 1, 
            width: '100%', 
            height: '100%',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            background: '#000'
        }} 
      />

      {/* Overlay / Controls if not running or strictly system UI */}
      {(!vm?.state.isRunning || vm?.state.isPaused) && (
          <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10
          }}>
              <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '32px' }}>
                  {vm?.config.name || 'System Halted'}
              </h2>
              <div style={{ color: colors.accent.primary, marginBottom: '40px', fontSize: '18px' }}>
                  STATUS: {statusMessage.toUpperCase()}
              </div>
              
              <button
                onClick={handleStart}
                disabled={isStarting}
                style={{
                    padding: '16px 48px',
                    fontSize: '20px',
                    background: colors.accent.primary,
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: isStarting ? 'wait' : 'pointer',
                    boxShadow: `0 0 20px ${colors.accent.primary}40`,
                    transition: 'transform 0.2s'
                }}
              >
                  {isStarting ? 'INITIALIZING...' : 'START SYSTEM'}
              </button>
          </div>
      )}
    </div>
  );
}
