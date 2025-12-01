'use client';

import React from 'react';
import { VMType } from '@/lib/vm/types';

interface OsSwitcherProps {
    currentSkin: VMType;
    onSwitch: (skin: VMType) => void;
}

export const OsSwitcher: React.FC<OsSwitcherProps> = ({ currentSkin, onSwitch }) => {
    const skins = [
        { type: VMType.WINDOWS, label: 'Windows', icon: '⊞' },
        { type: VMType.LINUX, label: 'Linux', icon: '🐧' },
        { type: VMType.ANDROID, label: 'Android', icon: '🤖' },
        { type: VMType.XBOX, label: 'Xbox', icon: '🎮' },
    ];

    return (
        <div
            className="os-switcher"
            style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.2))',
                backdropFilter: 'blur(20px)',
                padding: '8px',
                borderRadius: '12px',
                display: 'flex',
                gap: '6px',
                zIndex: 2000,
                border: '2px solid rgba(255, 0, 255, 0.4)',
                boxShadow: '0 0 30px rgba(255, 0, 255, 0.3), inset 0 0 20px rgba(0, 255, 255, 0.1)',
            }}
        >
            {skins.map(skin => (
                <button
                    key={skin.type}
                    onClick={() => onSwitch(skin.type)}
                    title={`Switch to ${skin.label}`}
                    style={{
                        background: currentSkin === skin.type 
                            ? 'linear-gradient(135deg, rgba(255, 0, 255, 0.4), rgba(0, 255, 255, 0.4))'
                            : 'rgba(255, 255, 255, 0.05)',
                        border: currentSkin === skin.type ? '1px solid rgba(255, 0, 255, 0.6)' : '1px solid transparent',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.3s ease',
                        boxShadow: currentSkin === skin.type ? '0 0 15px rgba(255, 0, 255, 0.5)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                        if (currentSkin !== skin.type) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 0, 255, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (currentSkin !== skin.type) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.boxShadow = 'none';
                        }
                    }}
                >
                    <span>{skin.icon}</span>
                    <span style={{ fontSize: '12px' }}>{skin.label}</span>
                </button>
            ))}
        </div>
    );
};
