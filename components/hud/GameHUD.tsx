'use client';

import React, { useState, useEffect, useRef } from 'react';
import { hyperion } from '@/src/nacho/engine/hyperion';

export const GameHUD: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [fps, setFps] = useState(60);
    const [frameTime, setFrameTime] = useState(16.6);
    const [memory, setMemory] = useState(0);
    const [status, setStatus] = useState('OPTIMAL');

    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());

    useEffect(() => {
        // Toggle with Shift+F1
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key === 'F1') {
                setIsVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Performance loop
        const interval = setInterval(() => {
            if (!isVisible) return;

            const now = performance.now();
            const delta = now - lastTime.current;
            
            if (delta >= 1000) {
                const currentFps = Math.round((frameCount.current * 1000) / delta);
                setFps(currentFps);
                setFrameTime(1000 / currentFps);
                frameCount.current = 0;
                lastTime.current = now;

                // Mock memory usage (simulated WASM heap)
                setMemory(Math.round(256 + Math.random() * 128));
                
                // Status logic
                if (currentFps < 30) setStatus('STRAINED');
                else if (currentFps < 55) setStatus('GOOD');
                else setStatus('OPTIMAL');
            }
            frameCount.current++;
        }, 1000 / 60);

        // Hook into Hyperion for real frame counting
        // In a real impl, we'd use hyperion.onFrame(...)
        const updateHook = () => { frameCount.current++; };
        hyperion.setCallbacks(updateHook, () => {}); // Simplified hook

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearInterval(interval);
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '280px',
            backgroundColor: 'rgba(11, 17, 33, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#fff',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            zIndex: 9999,
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.1)',
            pointerEvents: 'none', // Let clicks pass through
        }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '8px'
            }}>
                <span style={{ color: '#38BDF8', fontWeight: 'bold' }}>NACHO :: HYPERION</span>
                <span style={{ 
                    color: status === 'OPTIMAL' ? '#4ADE80' : status === 'GOOD' ? '#FBBF24' : '#FB7185' 
                }}>● {status}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                    <div style={{ color: '#94A3B8', marginBottom: '2px' }}>FPS</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{fps}</div>
                </div>
                <div>
                    <div style={{ color: '#94A3B8', marginBottom: '2px' }}>FRAME TIME</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{frameTime.toFixed(1)}ms</div>
                </div>
                <div>
                    <div style={{ color: '#94A3B8', marginBottom: '2px' }}>VRAM</div>
                    <div style={{ fontSize: '16px' }}>{memory} MB</div>
                </div>
                <div>
                    <div style={{ color: '#94A3B8', marginBottom: '2px' }}>JIT CACHE</div>
                    <div style={{ fontSize: '16px' }}>WARM</div>
                </div>
            </div>

            <div style={{ 
                marginTop: '12px', 
                paddingTop: '8px', 
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '4px'
            }}>
                {[...Array(20)].map((_, i) => (
                    <div key={i} style={{
                        flex: 1,
                        height: '20px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}>
                        <div style={{
                            width: '100%',
                            height: `${30 + Math.random() * 70}%`,
                            backgroundColor: '#38BDF8',
                            opacity: 0.5
                        }} />
                    </div>
                ))}
            </div>
        </div>
    );
};


