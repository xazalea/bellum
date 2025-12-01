
import React, { useEffect, useRef, useState } from 'react';
import { RuntimeManager } from '../lib/engine/runtime-manager';
import { FileType } from '../lib/engine/analyzers/binary-analyzer';

interface AppRunnerProps {
    filePath: string;
    onExit: () => void;
}

export const AppRunner: React.FC<AppRunnerProps> = ({ filePath, onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<string>('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        const launch = async () => {
            try {
                setStatus('Analyzing binary structure...');
                const runtime = RuntimeManager.getInstance();
                
                setStatus('Transpiling to WebAssembly...');
                const { type, config, loader } = await runtime.prepareRuntime(filePath);
                
                setStatus(`Optimization Complete. Launching ${type}...`);
                
                // Simulate "Zero Lag" Instant Launch for now
                // In a real implementation, this would mount the WASM module
                setTimeout(() => {
                    setIsRunning(true);
                    setStatus('');
                }, 800); // Fake 800ms "compilation" time

            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to launch application');
            }
        };

        launch();

        return () => {
            // Cleanup runtime
        };
    }, [filePath]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden">
            {/* Fullscreen Canvas */}
            <canvas 
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full object-contain ${isRunning ? 'opacity-100' : 'opacity-0'}`}
                style={{ imageRendering: 'pixelated' }} // For sharp retro look
            />

            {/* Loading / Status Overlay */}
            {!isRunning && !error && (
                <div className="relative z-10 text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto"></div>
                    <div className="font-mono text-blue-400 text-lg tracking-wider">{status}</div>
                    <div className="text-xs text-gray-500 font-mono">Nacho Universal Transpiler v1.0</div>
                </div>
            )}

            {/* Error Overlay */}
            {error && (
                <div className="relative z-10 max-w-md p-6 bg-red-900/20 border border-red-500/50 rounded-lg text-center backdrop-blur-sm">
                    <div className="text-red-500 font-bold text-xl mb-2">Conversion Failed</div>
                    <p className="text-red-400 font-mono text-sm mb-6">{error}</p>
                    <button 
                        onClick={onExit}
                        className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-mono transition-colors"
                    >
                        Return to Library
                    </button>
                </div>
            )}
            
            {/* In-Game Overlay Controls (Hidden by default) */}
            {isRunning && (
                <div className="absolute top-4 right-4 z-20 opacity-0 hover:opacity-100 transition-opacity">
                    <button 
                        onClick={onExit}
                        className="bg-gray-900/80 text-white px-3 py-1 rounded border border-gray-700 hover:bg-gray-800 text-xs font-mono"
                    >
                        EXIT RUNTIME
                    </button>
                </div>
            )}
        </div>
    );
};

