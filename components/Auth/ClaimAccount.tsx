'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, ArrowRight, Loader2, AtSign } from 'lucide-react';
import { authService } from '@/lib/firebase/auth-service';

interface ClaimAccountProps {
    isOpen: boolean;
    onSuccess: () => void;
}

export function ClaimAccount({ isOpen, onSuccess }: ClaimAccountProps) {
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;

        const val = username.trim();
        if (!val) {
            setError('Please enter a username.');
            return;
        }

        if (!/^[a-z0-9_]{3,20}$/.test(val.toLowerCase())) {
            setError('Use 3-20 characters: a-z, 0-9, and underscore.');
            return;
        }

        setBusy(true);
        setError(null);
        try {
            await authService.claimUsername(val);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'That username might be taken.');
        } finally {
            setBusy(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bellum-card max-w-md w-full p-8 border-2 border-white/10 shadow-2xl relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[100px] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                                <Shield className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Claim Identity</h2>
                                <p className="text-sm text-white/40">Link a username to this device.</p>
                            </div>
                        </div>

                        <form onSubmit={handleClaim} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-white/40 font-bold ml-1">
                                    Username
                                </label>
                                <div className="relative">
                                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                    <input
                                        autoFocus
                                        className="bellum-input pl-12 h-14 text-lg font-medium tracking-tight"
                                        placeholder="e.g. rohan_dev"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={busy}
                                    />
                                </div>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-sm text-rose-400 font-medium ml-1 mt-2"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={busy || !username.trim()}
                                className="w-full h-14 bellum-btn text-lg font-bold flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {busy ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        Continue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <div className="text-center">
                                <p className="text-[11px] text-white/30 leading-relaxed uppercase tracking-tighter font-bold">
                                    No password required. Your identity is cryptographically linked to your hardware fingerprint.
                                </p>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
