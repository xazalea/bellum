import React, { useState, useRef } from 'react';
import { os } from '@/src/nacho_os';

/**
 * Launcher UI
 * Premium Mac/iOS-style desktop interface for NachoOS.
 */

const APP_ICONS = {
    'Brave': 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Brave_lion_icon.svg',
    'Terminal': 'https://upload.wikimedia.org/wikipedia/commons/a/af/Adobe_Photoshop_CC_icon.svg', // Placeholder
    'Files': 'https://upload.wikimedia.org/wikipedia/commons/5/59/OneDrive_Folder_Icon.svg',
    'Settings': 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Settings_icon_-_The_Noun_Project.svg',
    'Android': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg'
};

export function Launcher() {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && os) {
            await os.run(files[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && os) {
            await os.run(e.target.files[0]);
        }
    };

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                background: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop) center/cover no-repeat', // Abstract dark wallpaper
                overflow: 'hidden',
                fontFamily: 'Inter, sans-serif'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Overlay for drag effect */}
            {isDragging && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 50
                }}>
                    <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 600 }}>Drop to Launch</h2>
                </div>
            )}

            {/* Desktop Grid Area */}
            <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 80px)', gap: '30px' }}>
                <DesktopIcon name="My Computer" icon={APP_ICONS.Files} />
                <DesktopIcon name="Chrome" icon={APP_ICONS.Brave} />
                <DesktopIcon name="Recycle Bin" icon={APP_ICONS.Settings} />
            </div>

            {/* Dock */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                padding: '12px 20px',
                borderRadius: '24px',
                display: 'flex',
                gap: '20px',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <DockItem icon={APP_ICONS.Android} onClick={() => fileInputRef.current?.click()} tooltip="Install APK" />
                <DockItem icon={APP_ICONS.Files} tooltip="Files" />
                <DockItem icon={APP_ICONS.Terminal} tooltip="Terminal" />
                <DockItem icon={APP_ICONS.Settings} tooltip="Settings" />
            </div>

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".apk,.exe,.iso"
                onChange={handleFileSelect}
            />

            {/* Fabrik Status Widget (Top Right) */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                padding: '10px 16px',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 8px #4CAF50' }} />
                <span>Fabrik: Active</span>
            </div>
        </div>
    );
}

function DesktopIcon({ name, icon }: { name: string, icon: string }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            cursor: 'pointer', transition: 'transform 0.2s',
            color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
            <img src={icon} alt={name} style={{ width: '48px', height: '48px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{name}</span>
        </div>
    );
}

function DockItem({ icon, tooltip, onClick }: { icon: string, tooltip: string, onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            title={tooltip}
            style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.2) translateY(-10px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; }}
        >
            <img src={icon} style={{ width: '32px', height: '32px' }} />
        </div>
    );
}
