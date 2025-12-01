'use client';

import React from 'react';
import { VMType } from '@/lib/vm/types';

interface TaskbarProps {
    activeSkin: VMType;
    activeVMs: string[];
}

export const Taskbar: React.FC<TaskbarProps> = ({ activeSkin, activeVMs }) => {
    const getTaskbarStyle = () => {
        switch (activeSkin) {
            case VMType.WINDOWS:
                return {
                    background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.2))',
                    backdropFilter: 'blur(20px)',
                    borderTop: '2px solid rgba(255, 0, 255, 0.5)',
                    boxShadow: '0 -5px 30px rgba(255, 0, 255, 0.3)',
                };
            case VMType.LINUX:
                return {
                    backgroundColor: '#333',
                    borderTop: '2px solid #ff6b6b', // Accent color
                };
            case VMType.ANDROID:
                return {
                    backgroundColor: 'transparent',
                    justifyContent: 'center',
                    bottom: '10px',
                    width: 'auto',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderRadius: '20px',
                    padding: '0 20px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                };
            case VMType.XBOX:
                return {
                    backgroundColor: '#107c10',
                    height: '60px',
                };
            default:
                return { backgroundColor: '#222' };
        }
    };

    return (
        <div
            className="taskbar"
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                zIndex: 1000,
                transition: 'all 0.3s ease',
                ...getTaskbarStyle(),
            }}
        >
            {/* Start Button / App Drawer */}
            <button 
                className="taskbar-start-button"
                style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 0, 255, 0.5)',
                    background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.3), rgba(0, 255, 255, 0.3))',
                    color: '#fff',
                    cursor: 'pointer',
                    marginRight: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 15px rgba(255, 0, 255, 0.4)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 0, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.4)';
                }}
            >
                {activeSkin === VMType.WINDOWS ? '⊞' : activeSkin === VMType.ANDROID ? '⋮⋮⋮' : '●'}
            </button>

            {/* Task List */}
            <div style={{ flex: 1, display: 'flex', gap: '5px' }}>
                {activeVMs.map(vmId => (
                    <button
                        key={vmId}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 0, 255, 0.3)',
                            color: '#fff',
                            padding: '0 15px',
                            height: '36px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            maxWidth: '150px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.2))';
                            e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.6)';
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <span style={{ fontSize: '12px' }}>💻</span>
                        <span style={{ fontSize: '12px', textOverflow: 'ellipsis', overflow: 'hidden' }}>{vmId}</span>
                    </button>
                ))}
            </div>

            {/* System Tray */}
            <div style={{ color: '#fff', fontSize: '12px' }}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};
