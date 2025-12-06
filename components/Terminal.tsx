import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Server, Terminal as TerminalIcon, Globe, ShieldAlert, Copy, Bot, Box, Globe as GlobeIcon, Monitor } from 'lucide-react';

interface LogEntry {
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'system';
    message: string;
}

type ServiceType = 'tunnel' | 'llm' | 'web' | 'minecraft' | 'desktop' | null;

export default function Terminal() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeService, setActiveService] = useState<ServiceType>(null);
    const [serviceUrl, setServiceUrl] = useState<string | null>(null);
    const [command, setCommand] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        addLog('system', 'Nacho Engine Terminal v2.2.0 initialized');
        addLog('info', 'Type "help" for available commands');
        scrollToBottom();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const addLog = (type: LogEntry['type'], message: string) => {
        setLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            type,
            message
        }]);
    };

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim()) return;

        addLog('info', `> ${command}`);
        processCommand(command);
        setCommand('');
    };

    const processCommand = (cmd: string) => {
        const parts = cmd.split(' ');
        const action = parts[0].toLowerCase();

        switch (action) {
            case 'help':
                addLog('system', 'Available commands:');
                addLog('info', '  tunnel start  - Start a secure tunnel server');
                addLog('info', '  desktop start - Launch Ubuntu Desktop LXDE (VNC)');
                addLog('info', '  llm start     - Host a local LLM instance');
                addLog('info', '  web start     - Start a static web server');
                addLog('info', '  mc start      - Host a temporary Minecraft server');
                addLog('info', '  stop          - Stop the current service');
                addLog('info', '  status        - Check system status');
                addLog('info', '  clear         - Clear terminal logs');
                break;
            case 'clear':
                setLogs([]);
                break;
            case 'status':
                addLog('info', `System Status: ONLINE`);
                addLog('info', `Active Service: ${activeService || 'None'}`);
                addLog('info', `Fingerprint: ${localStorage.getItem('nacho_fingerprint') || 'Unknown'}`);
                break;
            case 'tunnel':
                if (parts[1] === 'start') startService('tunnel');
                else addLog('error', 'Usage: tunnel start');
                break;
            case 'llm':
                if (parts[1] === 'start') startService('llm');
                else addLog('error', 'Usage: llm start');
                break;
            case 'web':
                if (parts[1] === 'start') startService('web');
                else addLog('error', 'Usage: web start');
                break;
            case 'mc':
            case 'minecraft':
                if (parts[1] === 'start') startService('minecraft');
                else addLog('error', 'Usage: mc start');
                break;
            case 'desktop':
                if (parts[1] === 'start') startService('desktop');
                else addLog('error', 'Usage: desktop start');
                break;
            case 'stop':
                stopService();
                break;
            default:
                addLog('error', `Command not found: ${action}`);
        }
    };

    const startService = async (type: ServiceType) => {
        if (activeService) {
            addLog('warning', `Service '${activeService}' is already running. Stop it first.`);
            return;
        }

        setActiveService(type);
        
        if (type === 'tunnel') {
            addLog('system', 'Initializing Secure Tunnel Handshake...');
            try {
                addLog('info', 'Generating crypto keys for secure tunnel...');
                const url = await nachoEngine.browserServer.tunnelService.start(3000);
                setServiceUrl(url);
                addLog('success', 'Tunnel established successfully!');
                addLog('success', `Public Access URL: ${url}`);
            } catch (e: any) {
                addLog('error', `Tunnel Failed: ${e.message}`);
            }
        } else if (type === 'llm') {
            addLog('system', 'Booting Local WebGPU LLM Container...');
            try {
                addLog('info', 'Allocating GPU VRAM (WebGPU)...');
                const model = await nachoEngine.browserServer.llmRunner.loadModel('Llama-3');
                const url = 'http://localhost:8000';
                setServiceUrl(url);
                addLog('success', `LLM Engine Loaded: ${model}`);
                addLog('success', `API Endpoint: ${url}`);
            } catch (e: any) {
                addLog('error', `LLM Init Failed: ${e.message}`);
            }
        } else if (type === 'web') {
            addLog('system', 'Starting Static Web Server...');
            try {
                addLog('info', 'Binding to port 8080...');
                const res = await nachoEngine.browserServer.webServerRunner.start('./public');
                setServiceUrl(res.url);
                addLog('success', 'Web Server Online!');
                addLog('success', `Site URL: ${res.url}`);
            } catch (e: any) {
                addLog('error', `Web Server Failed: ${e.message}`);
            }
        } else if (type === 'minecraft') {
            addLog('system', 'Initializing Minecraft Server Instance (JVM via WASM)...');
            try {
                addLog('info', 'Starting JVM (Eaglercraft/Paper)...');
                const res = await nachoEngine.browserServer.minecraftRunner.start('1.20.1');
                setServiceUrl(res.ip);
                addLog('success', 'Minecraft Server Started!');
                addLog('success', `Server IP: ${res.ip}`);
            } catch (e: any) {
                addLog('error', `MC Server Failed: ${e.message}`);
            }
import { nachoEngine } from '@/lib/nacho/engine';

// ... inside component ...

        } else if (type === 'desktop') {
            addLog('system', 'Initializing Ubuntu Desktop (LXDE/VNC) via V86/WASM...');
            addLog('info', 'Pulling docker image: dorowu/ubuntu-desktop-lxde-vnc (Mapped to WASM ISO)...');
            
            try {
                // Call the REAL engine method
                const result = await nachoEngine.browserServer.vncDesktopRunner.start('dorowu/ubuntu-desktop-lxde-vnc');
                setServiceUrl(result.url);
                addLog('success', 'Desktop Environment Ready!');
                addLog('success', `Access URL: ${result.url}`);
                window.open(result.url, '_blank');
            } catch (e: any) {
                addLog('error', `Failed to start desktop: ${e.message}`);
            }
        }
    };

    const stopService = () => {
        if (!activeService) {
            addLog('warning', 'No active service to stop');
            return;
        }
        addLog('system', `Stopping ${activeService}...`);
        setActiveService(null);
        setServiceUrl(null);
        setTimeout(() => addLog('info', 'Service stopped successfully.'), 500);
    };

    const copyUrl = () => {
        if (serviceUrl) {
            navigator.clipboard.writeText(serviceUrl);
            addLog('info', 'URL copied to clipboard');
        }
    };

    return (
        <div className="h-full flex flex-col bg-transparent font-mono text-sm rounded-xl overflow-hidden border border-white/10 shadow-none">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-2 text-slate-300">
                    <TerminalIcon size={16} />
                    <span className="font-bold">Nacho Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => activeService ? stopService() : startService('tunnel')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${activeService === 'tunnel'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                : 'bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600/20'}
                        `}
                        title="Host Secure Tunnel"
                    >
                        <Server size={12} /> Tunnel
                    </button>
                    <button 
                        onClick={() => activeService ? stopService() : startService('llm')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${activeService === 'llm'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' 
                                : 'bg-purple-600/10 text-purple-400 border border-purple-500/30 hover:bg-purple-600/20'}
                        `}
                        title="Host LLM"
                    >
                        <Bot size={12} /> LLM
                    </button>
                    <button 
                        onClick={() => activeService ? stopService() : startService('web')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${activeService === 'web'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' 
                                : 'bg-orange-600/10 text-orange-400 border border-orange-500/30 hover:bg-orange-600/20'}
                        `}
                        title="Host Web Server"
                    >
                        <GlobeIcon size={12} /> Web
                    </button>
                    <button 
                        onClick={() => activeService ? stopService() : startService('minecraft')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${activeService === 'minecraft'
                                ? 'bg-green-600/20 text-green-400 border border-green-500/50' 
                                : 'bg-green-700/10 text-green-400 border border-green-500/30 hover:bg-green-600/20'}
                        `}
                        title="Host Minecraft Server"
                    >
                        <Box size={12} /> MC
                    </button>
                    <button 
                        onClick={() => activeService ? stopService() : startService('desktop')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${activeService === 'desktop'
                                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/50' 
                                : 'bg-cyan-700/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/20'}
                        `}
                        title="Host Ubuntu Desktop"
                    >
                        <Monitor size={12} /> Desktop
                    </button>
                    {activeService && (
                        <button 
                            onClick={stopService}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all ml-2"
                        >
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            Stop
                        </button>
                    )}
                </div>
            </div>

            {/* Output Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 hover:bg-white/5 p-0.5 rounded">
                        <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                        <span className={`
                            ${log.type === 'error' ? 'text-red-400' : ''}
                            ${log.type === 'success' ? 'text-green-400' : ''}
                            ${log.type === 'warning' ? 'text-yellow-400' : ''}
                            ${log.type === 'system' ? 'text-blue-400 font-bold' : ''}
                            ${log.type === 'info' ? 'text-gray-300' : ''}
                        `}>
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>

            {/* Active Service Info */}
            {activeService && serviceUrl && (
                <div className="bg-blue-900/10 border-t border-blue-500/20 p-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Globe size={16} />
                        </div>
                        <div>
                            <div className="text-xs text-blue-300 uppercase font-bold">{activeService} Active</div>
                            <div className="text-white font-medium">{serviceUrl}</div>
                        </div>
                    </div>
                    <button onClick={copyUrl} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors">
                        <Copy size={16} />
                    </button>
                </div>
            )}

            {/* Input Line */}
            <form onSubmit={handleCommand} className="p-3 bg-white/5 border-t border-white/10 flex items-center gap-2">
                <span className="text-green-500 font-bold">➜</span>
                <span className="text-blue-400 font-bold">~</span>
                <input 
                    type="text" 
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter command..."
                    className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 font-mono"
                    autoFocus
                />
            </form>
        </div>
    );
}
