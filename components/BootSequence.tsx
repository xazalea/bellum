'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function BootSequence({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const sequence = async () => {
            // 1. BIOS/Kernel Init
            await new Promise(r => setTimeout(r, 800)); 
            setStep(1);
            
            // 2. GPU Handshake
            await new Promise(r => setTimeout(r, 600)); 
            setStep(2);

            // 3. VFS Mount
            await new Promise(r => setTimeout(r, 500)); 
            setStep(3);
            
            // 4. Ready
            await new Promise(r => setTimeout(r, 400)); 
            onComplete();
        };
        sequence();
    }, []);

    return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center font-mono text-white overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8"
                >
                    <span className="text-6xl font-bold tracking-tighter">
                        nacho<span className="text-blue-500">.</span>
                    </span>
                </motion.div>

                <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
                    <motion.div 
                        className="h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2.3, ease: "circOut" }}
                    />
                </div>

                <div className="h-8 text-xs text-zinc-500 flex flex-col items-center">
                    <AnimatePresence mode="wait">
                        {step === 0 && <motion.span key="0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>INITIALIZING KERNEL...</motion.span>}
                        {step === 1 && <motion.span key="1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>LINKING WEBGPU COMPUTE...</motion.span>}
                        {step === 2 && <motion.span key="2" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>MOUNTING INFINITE VFS...</motion.span>}
                        {step === 3 && <motion.span key="3" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>SYSTEM ONLINE</motion.span>}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Background Grid Effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle at center, #111 0%, #000 100%)' }}>
                <div className="absolute inset-0" 
                     style={{ 
                         backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', 
                         backgroundSize: '40px 40px' 
                     }} 
                />
            </div>
        </div>
    );
}

