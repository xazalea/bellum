'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function CompilerPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs(prev => [...prev, { id: Date.now(), timestamp, message, type }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setIsCompiling(true);
    setLogs([]);
    setProgress(0);

    // Simulate compilation process
    simulateCompilation(file);
  };

  const simulateCompilation = async (file: File) => {
    const steps = [
      { msg: `Analyzing binary: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`, time: 1000 },
      { msg: 'Detecting architecture... x86_64 detected.', time: 1500 },
      { msg: 'Initializing Rust Binary Lifter...', time: 2000 },
      { msg: 'Disassembling .text section...', time: 3000 },
      { msg: 'Generating Intermediate Representation (IR)...', time: 4500 },
      { msg: 'Optimizing IR blocks (Dead code elimination)...', time: 6000 },
      { msg: 'Running Python Heuristic Analyzer...', time: 7000 },
      { msg: 'Detected graphics API: DirectX 12. Injecting Zig GPU Translator...', time: 8000 },
      { msg: 'Compiling to WebAssembly (multithreaded)...', time: 10000 },
      { msg: 'Linking dynamic imports...', time: 11000 },
      { msg: 'Generating runtime shim...', time: 11500 },
      { msg: 'Compilation successful! Launching runtime...', time: 12000, type: 'success' }
    ];

    let currentStep = 0;
    const totalTime = 12000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / totalTime) * 100, 100);
      setProgress(p);

      if (currentStep < steps.length && elapsed >= steps[currentStep].time) {
        const step = steps[currentStep];
        addLog(step.msg, step.type as any || 'info');
        currentStep++;
      }

      if (elapsed >= totalTime + 1000) {
        clearInterval(interval);
        setIsCompiling(false);
        // Redirect to game runner or show success
        setTimeout(() => {
            // In a real app, we would route to the specific emulator with the compiled WASM
            router.push('/windows?game=compiled-' + file.name);
        }, 1000);
      }
    }, 100);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 30%, #2e0a4e 50%, #1a0a2e 70%, #0a0a0a 100%)',
      position: 'relative',
      overflow: 'hidden',
      color: '#fff',
    }}>
        {/* Background effects */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(255, 0, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 0, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
      }} />

      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '2px solid rgba(255, 0, 255, 0.3)',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/" style={{
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textDecoration: 'none',
        }}>
          nacho.
        </Link>
        <Link href="/dashboard" style={{
            color: 'rgba(255, 255, 255, 0.8)',
            textDecoration: 'none',
            fontSize: '14px',
        }}>
            ← Back to Dashboard
        </Link>
      </nav>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        height: 'calc(100vh - 100px)',
      }}>
        {/* Left Column: Upload Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', background: 'linear-gradient(135deg, #ff00ff, #00ffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Universal Compiler
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                Drag and drop any executable (.exe, .apk, .elf) to compile it into a high-performance WebAssembly module.
                <br />
                <span style={{ fontSize: '12px', color: 'rgba(255, 0, 255, 0.7)' }}>Supported: x86_64, ARM64, Dalvik</span>
            </p>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    flex: 1,
                    border: `2px dashed ${isDragging ? '#00ffff' : 'rgba(255, 0, 255, 0.3)'}`,
                    borderRadius: '16px',
                    background: isDragging ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <input 
                    type="file" 
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                />
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                    {isCompiling ? '⚙️' : '📂'}
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                    {fileName ? fileName : 'Drop Binary Here'}
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    or click to browse
                </p>
            </div>
        </div>

        {/* Right Column: Terminal Output */}
        <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 0, 255, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace',
            boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
        }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '10px', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '10px'
            }}>
                <span style={{ color: '#00ffff', fontWeight: 'bold' }}>TERMINAL</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                {logs.map((log) => (
                    <div key={log.id} style={{ marginBottom: '4px', display: 'flex' }}>
                        <span style={{ color: '#666', marginRight: '10px' }}>[{log.timestamp}]</span>
                        <span style={{ 
                            color: log.type === 'error' ? '#ff4444' : 
                                   log.type === 'success' ? '#00ff88' : 
                                   log.type === 'warning' ? '#ffaa00' : '#e0e0e0' 
                        }}>
                            {log.type === 'info' && '> '}
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>

            {/* Progress Bar */}
            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                    height: '100%', 
                    width: `${progress}%`, 
                    background: 'linear-gradient(90deg, #ff00ff, #00ffff)',
                    transition: 'width 0.1s linear'
                }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '5px' }}>
                {progress.toFixed(0)}%
            </div>
        </div>
      </div>
    </div>
  );
}

