import React, { useState, useEffect } from 'react';
import { clusterService, UserAccount } from '@/lib/nacho/modules/distributed-compute';
import { X, Shield, Cpu, Smartphone, LogOut } from 'lucide-react';

interface ClusterAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ClusterAccountModal({ isOpen, onClose }: ClusterAccountModalProps) {
    const [user, setUser] = useState<UserAccount | null>(null);
    const [usernameInput, setUsernameInput] = useState('');
    const [linkCodeInput, setLinkCodeInput] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [error, setError] = useState('');
    const [activeView, setActiveView] = useState<'login' | 'register' | 'link'>('login');

    useEffect(() => {
        if (isOpen) {
            setUser(clusterService.getCurrentUser());
            setError('');
            setGeneratedCode('');
        }
    }, [isOpen]);

    const handleLogin = async () => {
        const res = await clusterService.login(usernameInput);
        if (res.success) {
            setUser(clusterService.getCurrentUser());
            setError('');
        } else {
            setError(res.message);
        }
    };

    const handleRegister = async () => {
        const res = await clusterService.register(usernameInput);
        if (res.success) {
            setUser(clusterService.getCurrentUser());
            setError('');
        } else {
            setError(res.message);
        }
    };

    const handleLinkDevice = async () => {
        const success = await clusterService.linkDevice(linkCodeInput);
        if (success) {
            setUser(clusterService.getCurrentUser());
            setError('');
        } else {
            setError("Invalid or expired code");
        }
    };

    const generateCode = () => {
        try {
            const code = clusterService.generateLinkCode();
            setGeneratedCode(code);
        } catch (e) {
            setError("Login required");
        }
    };

    const toggleOptOut = (val: boolean) => {
        clusterService.setOptOut(val);
        setUser({ ...user!, isOptedOut: val }); // Optimistic update
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Cpu className="text-purple-400" size={20} />
                        Distributed Cluster
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {user ? (
                        // Logged In View
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold text-white">
                                    {user.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{user.username}</div>
                                    <div className="text-xs text-purple-300">Verified Device</div>
                                </div>
                            </div>

                            {/* Opt Out Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <div className="text-sm font-medium text-white">Cluster Contribution</div>
                                    <div className="text-xs text-gray-400">Share idle resources to speed up network</div>
                                </div>
                                <button 
                                    onClick={() => toggleOptOut(!user.isOptedOut)}
                                    className={`
                                        w-12 h-6 rounded-full transition-colors relative
                                        ${!user.isOptedOut ? 'bg-green-500' : 'bg-gray-600'}
                                    `}
                                >
                                    <div className={`
                                        absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                                        ${!user.isOptedOut ? 'left-7' : 'left-1'}
                                    `} />
                                </button>
                            </div>

                            {/* Add Device */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-gray-400 uppercase">Multi-Device</h3>
                                <button 
                                    onClick={generateCode}
                                    className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Smartphone size={16} />
                                    Link New Device
                                </button>
                                {generatedCode && (
                                    <div className="p-3 bg-black/50 rounded-lg border border-white/10 break-all text-xs font-mono text-gray-300">
                                        {generatedCode}
                                        <div className="text-center text-[10px] text-gray-500 mt-1">
                                            Copy this code to your new device
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => { clusterService.logout(); setUser(null); }}
                                className="w-full py-2 text-sm text-red-400 hover:bg-red-900/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        // Auth View
                        <div className="space-y-6">
                            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                                <button 
                                    onClick={() => setActiveView('login')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeView === 'login' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Login
                                </button>
                                <button 
                                    onClick={() => setActiveView('register')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeView === 'register' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Create
                                </button>
                                <button 
                                    onClick={() => setActiveView('link')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeView === 'link' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Link
                                </button>
                            </div>

                            {activeView === 'link' ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-400">
                                        Enter the code generated from your main device to add this browser to your account.
                                    </p>
                                    <input 
                                        type="text" 
                                        placeholder="Paste Link Code..."
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        value={linkCodeInput}
                                        onChange={(e) => setLinkCodeInput(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleLinkDevice}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Verify & Link
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 uppercase font-bold">Username</label>
                                        <input 
                                            type="text" 
                                            placeholder="Unique username"
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                            value={usernameInput}
                                            onChange={(e) => setUsernameInput(e.target.value)}
                                        />
                                    </div>
                                    
                                    {activeView === 'register' && (
                                        <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg flex gap-3">
                                            <Shield className="text-blue-400 shrink-0" size={16} />
                                            <p className="text-xs text-blue-200">
                                                No password required. Your account is secured by your device&apos;s unique hardware fingerprint.
                                            </p>
                                        </div>
                                    )}

                                    <button 
                                        onClick={activeView === 'login' ? handleLogin : handleRegister}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-medium transition-colors"
                                    >
                                        {activeView === 'login' ? 'Sign In' : 'Create Account'}
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="text-red-400 text-sm text-center bg-red-900/10 p-2 rounded-lg border border-red-500/20">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
