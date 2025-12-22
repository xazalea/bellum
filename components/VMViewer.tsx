import React, { useRef, useState, useEffect, useCallback } from 'react';
import { vmManager } from '@/lib/vm/manager';
import { VMInstance, VMType } from '@/lib/vm/types';
import { colors } from '@/lib/ui/design-system';
import { hyperion } from '@/src/nacho/engine/hyperion';
import { runJITTest } from '@/src/nacho/jit/test-jit';
import { Launcher } from './OS/Launcher';

interface VMViewerProps {
  vmId?: string;
  vmType?: VMType;
  gameId?: string;
  style?: React.CSSProperties;
}

const BrowserVM = ({ url }: { url: string }) => {
  const [currentUrl, setCurrentUrl] = useState(url || 'https://google.com/search?q=test&igu=1');
  const [inputUrl, setInputUrl] = useState(currentUrl);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl;
    if (!target.startsWith('http')) target = 'https://' + target;
    setCurrentUrl(target);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '8px', background: '#f1f3f4', display: 'flex', gap: '8px', borderBottom: '1px solid #dadce0' }}>
        <button onClick={() => setCurrentUrl(currentUrl)} style={{ border: 'none', background: 'transparent' }}>↻</button>
        <form onSubmit={handleNavigate} style={{ flex: 1 }}>
          <input
            type="text"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            style={{ width: '100%', padding: '6px 12px', borderRadius: '16px', border: '1px solid #dadce0', background: '#fff' }}
          />
        </form>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src={currentUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
};

export function VMViewer({ vmId, vmType, gameId, style }: VMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vm, setVM] = useState<VMInstance | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');

  const handleStart = useCallback(async () => {
    if (!vm || isStarting) return;
    setIsStarting(true);
    setStatusMessage('Booting...');
    try {
      await vm.start();
      setStatusMessage('Online');
    } catch (error) {
      console.error('Failed to start VM:', error);
      setStatusMessage('Boot Failed');
    } finally {
      setIsStarting(false);
    }
  }, [vm, isStarting]);

  // Auto-start logic
  useEffect(() => {
    if (vm && !vm.state.isRunning && !isStarting) {
      handleStart();
    }
  }, [vm, isStarting, handleStart]);

  useEffect(() => {
    const initializeVM = async () => {
      if (vmId) {
        const vmInstance = vmManager.getVM(vmId);
        setVM(vmInstance);
        if (vmInstance && containerRef.current) {
          await vmInstance.mount(containerRef.current).catch(console.error);
        }
      } else if (vmType) {
        try {
          const vmId = `vm-${vmType}-${Date.now()}`;
          const vmInstance = await vmManager.createVM({
            id: vmId,
            type: vmType,
            name: `${vmType} VM`,
            memory: 2048,
            executionMode: gameId ? 'game' : (vmType === VMType.BROWSER ? 'browser' : 'system'),
          });
          setVM(vmInstance);
          if (containerRef.current) {
            await vmInstance.mount(containerRef.current).catch(console.error);
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
    const interval = setInterval(onStateChange, 500);
    return () => clearInterval(interval);
  }, [vm]);

  if (!vmId && !vmType) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <Launcher />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%', // Fill container, not viewport
      background: '#000',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...style
    }}>
      {/* Hyperion/WebGPU Demo Hook */}
      {vm?.config.type === VMType.PLAYSTATION && (
        <canvas
          ref={(canvas) => {
            // @ts-ignore
            if (canvas && !hyperion['attached']) {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
              hyperion.attachCanvas(canvas);
              hyperion.start();
              // @ts-ignore
              hyperion['attached'] = true;
            }
          }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}

      {/* JIT Pipeline Verification Hook */}
      {vm?.config.type === VMType.XBOX && (
        <div style={{ color: 'white', padding: 20 }}>
          <h3>JIT Pipeline Test Running...</h3>
          <p>Check Developer Console for &quot;Generated WGSL&quot;</p>
          {/* Self-invoking function to run test once */}
          {(() => {
            // @ts-ignore
            if (!window['jit_tested']) {
              runJITTest();
              // @ts-ignore
              window['jit_tested'] = true;
            }
            return null;
          })()}
        </div>
      )}

      {/* VM Display Container */}
      {vm?.config.type !== VMType.PLAYSTATION && vm?.config.type !== VMType.XBOX && (
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
        >
          {vm?.config.type === VMType.BROWSER && vm?.state.isRunning && (
            <BrowserVM url="https://bing.com" />
          )}
        </div>
      )}

      {/* Loading Overlay (only show if strictly initializing, not when stopped/paused if we want instant start) */}
      {isStarting && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{ color: colors.accent.primary, fontSize: '16px', marginBottom: '10px' }}>
            {statusMessage}
          </div>
          {/* Simple Spinner */}
          <div style={{
            width: '30px', height: '30px',
            border: `3px solid ${colors.accent.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
