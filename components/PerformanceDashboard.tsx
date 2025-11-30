'use client';

import { useEffect, useState } from 'react';
import { performanceMonitor, PerformanceMetrics } from '@/lib/performance/monitor';
import { adaptivePerformance, AdaptiveConfig } from '@/lib/performance/adaptive';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    mainThreadBlocking: 0,
  });
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptiveConfig>({
    textureScale: 1.0,
    renderResolution: 1.0,
    frameSkip: 0,
    audioQuality: 'high',
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!performanceMonitor || !adaptivePerformance) return;

    // Subscribe to metrics updates
    const handleMetrics = (data: PerformanceMetrics) => {
      setMetrics(data);
    };

    performanceMonitor.on('metrics', handleMetrics);

    // Subscribe to adaptive config changes
    const handleConfig = (config: AdaptiveConfig) => {
      setAdaptiveConfig(config);
    };

    adaptivePerformance.onConfigChange(handleConfig);

    // Toggle with Ctrl+Shift+P
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      performanceMonitor.off('metrics', handleMetrics);
      adaptivePerformance.offConfigChange(handleConfig);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '8px 12px',
          background: 'rgba(0, 255, 136, 0.1)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '8px',
          color: '#00ff88',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
        title="Press Ctrl+Shift+P to toggle"
      >
        Performance
      </button>
    );
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return '#00ff88';
    if (fps >= 30) return '#ffaa00';
    return '#ff4444';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '300px',
        background: 'rgba(17, 17, 17, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Performance</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#808080',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            width: '24px',
            height: '24px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* FPS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#b0b0b0' }}>FPS</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: getFPSColor(metrics.fps) }}>
              {metrics.fps}
            </span>
          </div>
          <div
            style={{
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (metrics.fps / 60) * 100)}%`,
                background: getFPSColor(metrics.fps),
                transition: 'width 150ms ease',
              }}
            />
          </div>
        </div>

        {/* Frame Time */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#b0b0b0' }}>Frame Time</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
              {metrics.frameTime.toFixed(2)}ms
            </span>
          </div>
        </div>

        {/* Main Thread Blocking */}
        {metrics.mainThreadBlocking > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#b0b0b0' }}>Main Thread Blocking</span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: metrics.mainThreadBlocking > 50 ? '#ff4444' : '#ffaa00',
                }}
              >
                {metrics.mainThreadBlocking.toFixed(2)}ms
              </span>
            </div>
          </div>
        )}

        {/* Adaptive Settings */}
        <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontSize: '12px', color: '#b0b0b0', marginBottom: '8px' }}>Adaptive Quality</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#808080' }}>Texture Scale</span>
              <span style={{ color: '#ffffff' }}>{(adaptiveConfig.textureScale * 100).toFixed(0)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#808080' }}>Render Resolution</span>
              <span style={{ color: '#ffffff' }}>{(adaptiveConfig.renderResolution * 100).toFixed(0)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#808080' }}>Frame Skip</span>
              <span style={{ color: '#ffffff' }}>{adaptiveConfig.frameSkip}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#808080' }}>Audio Quality</span>
              <span style={{ color: '#ffffff' }}>{adaptiveConfig.audioQuality}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

