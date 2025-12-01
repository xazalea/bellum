'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VMType } from '@/lib/vm/types';
import { vmManager } from '@/lib/vm/manager';
import { VMViewer } from './VMViewer';

interface WindowManagerProps {
    activeSkin: VMType;
    activeVMs: string[];
}

interface WindowState {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    type?: 'vm' | 'code'; // Window type
}

export const WindowManager: React.FC<WindowManagerProps> = ({ activeSkin, activeVMs }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);

    useEffect(() => {
        setWindows(prev => {
            const newWindows = [...prev];
            let hasChanges = false;

            // Add new VMs
            activeVMs.forEach(vmId => {
                if (!newWindows.find(w => w.id === vmId)) {
                    newWindows.push({
                        id: vmId,
                        x: 50 + (newWindows.length * 30),
                        y: 50 + (newWindows.length * 30),
                        width: 800,
                        height: 600,
                        zIndex: newWindows.length + 1,
                        isMinimized: false,
                        isMaximized: false,
                    });
                    hasChanges = true;
                }
            });

            // Remove stopped VMs
            const filtered = newWindows.filter(w => activeVMs.includes(w.id));
            if (filtered.length !== newWindows.length) {
                hasChanges = true;
            }

            return hasChanges ? filtered : prev;
        });
    }, [activeVMs]);

    const handleMouseDown = (id: string, e: React.MouseEvent) => {
        setActiveWindowId(id);
        // Bring to front
        setWindows(prev => prev.map(w => ({
            ...w,
            zIndex: w.id === id ? Math.max(...prev.map(p => p.zIndex)) + 1 : w.zIndex
        })));

        setDragState({
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: windows.find(w => w.id === id)?.x || 0,
            initialY: windows.find(w => w.id === id)?.y || 0,
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (dragState) {
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;

            setWindows(prev => prev.map(w => {
                if (w.id === dragState.id) {
                    return {
                        ...w,
                        x: dragState.initialX + dx,
                        y: dragState.initialY + dy,
                    };
                }
                return w;
            }));
        }
    }, [dragState]);

    const handleMouseUp = useCallback(() => {
        setDragState(null);
    }, []);

    useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, handleMouseMove, handleMouseUp]);

    return (
        <div
            className="window-manager"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: '48px',
                pointerEvents: 'none',
            }}
        >
            {windows.map(win => (
                <div
                    key={win.id}
                    style={{
                        pointerEvents: 'auto',
                        position: 'absolute',
                        top: win.y,
                        left: win.x,
                        width: win.width,
                        height: win.height,
                        backgroundColor: '#000',
                        boxShadow: activeWindowId === win.id ? '0 15px 40px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.4)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: win.isMinimized ? 'none' : 'flex',
                        flexDirection: 'column',
                        zIndex: win.zIndex,
                        border: activeWindowId === win.id ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                    }}
                    onMouseDown={() => {
                        setActiveWindowId(win.id);
                        setWindows(prev => prev.map(w => ({
                            ...w,
                            zIndex: w.id === win.id ? Math.max(...prev.map(p => p.zIndex)) + 1 : w.zIndex
                        })));
                    }}
                >
                    {/* Window Title Bar */}
                    <div
                        style={{
                            height: '30px',
                            backgroundColor: activeSkin === VMType.WINDOWS ? '#333' : '#222',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 10px',
                            justifyContent: 'space-between',
                            cursor: 'grab',
                            userSelect: 'none',
                        }}
                        onMouseDown={(e) => handleMouseDown(win.id, e)}
                    >
                        <span style={{ fontSize: '12px' }}>VM: {win.id}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>_</button>
                            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>□</button>
                            <button
                                style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    vmManager.getVM(win.id)?.stop();
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* VM Content */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <VMViewer vmId={win.id} />
                    </div>
                </div>
            ))}
        </div>
    );
};
