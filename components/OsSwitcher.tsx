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
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(5px)',
                padding: '5px',
                borderRadius: '8px',
                display: 'flex',
                gap: '5px',
                zIndex: 2000,
            }}
        >
            {skins.map(skin => (
                <button
                    key={skin.type}
                    onClick={() => onSwitch(skin.type)}
                    title={`Switch to ${skin.label}`}
                    style={{
                        background: currentSkin === skin.type ? 'rgba(255,255,255,0.2)' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'background 0.2s',
                    }}
                >
                    <span>{skin.icon}</span>
                    <span style={{ fontSize: '12px' }}>{skin.label}</span>
                </button>
            ))}
        </div>
    );
};
