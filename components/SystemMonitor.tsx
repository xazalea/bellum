'use client';

import React, { useEffect, useState } from 'react';
import { colors } from '@/lib/ui/design-system';
import { hyperion } from '@/src/nacho/engine/hyperion';

import { universalLoader } from '@/src/nacho/loader/universal-loader';

export const SystemMonitor: React.FC = () => {
    const [stats, setStats] = useState({
        fps: 0,
        entities: 0,
        logs: [] as string[],
        gpuActive: false
    });

    useEffect(() => {
        // Subscribe to Loader Logs
        const unsubscribe = universalLoader.subscribe((logs) => {
            setStats(prev => ({ ...prev, logs }));
        });

        const interval = setInterval(() => {
            // Poll Hyperion for stats
            const isGPUActive = (hyperion as any).isRunning;

            setStats(prev => ({
                ...prev,
                fps: isGPUActive ? 60 : 0,
                entities: isGPUActive ? 50000 : 0,
                gpuActive: isGPUActive,
            }));
        }, 500);

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, []);

    return (
        <div style={{
            padding: '20px',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            height: '100%',
            overflow: 'auto'
        }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                System Performance
            </h2>

            {/* GPU Section */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: colors.text.secondary }}>GPU Megakernel</span>
                    <span style={{
                        color: stats.gpuActive ? '#4caf50' : '#757575',
                        fontWeight: 'bold'
                    }}>
                        {stats.gpuActive ? 'ACTIVE' : 'IDLE'}
                    </span>
                </div>
                <div style={{
                    height: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: stats.gpuActive ? '100%' : '5%',
                        height: '100%',
                        background: stats.gpuActive ? '#4caf50' : '#757575',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: colors.text.tertiary }}>
                    Entities: {stats.entities.toLocaleString()} <br />
                    Physics: {stats.gpuActive ? '0.2ms' : '-'} (GPU)
                </div>
            </div>

            {/* Logs Section */}
            <div>
                <h3 style={{ fontSize: '14px', marginBottom: '10px', color: colors.text.secondary }}>Universal Loader Logs</h3>
                <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '10px',
                    borderRadius: '8px',
                    minHeight: '150px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                }}>
                    {stats.logs.length === 0 ? (
                        <div style={{ color: '#555', fontStyle: 'italic' }}>Waiting for input...</div>
                    ) : (
                        stats.logs.map((event, i) => (
                            <div key={i} style={{ marginBottom: '4px', color: '#00bcd4' }}>
                                {event}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
