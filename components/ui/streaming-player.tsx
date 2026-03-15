/**
 * Streaming Player Component
 * Renders cloud-streamed game video with input handling
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  WebRTCStreamingClient,
  StreamingConfig,
  StreamingStats,
  InputEvent,
  createStreamingClient,
} from "@/lib/streaming/webrtc-client";
import {
  Wifi, WifiOff, Settings, Maximize, Minimize, Volume2, VolumeX,
  AlertCircle, Loader2, Gauge, Clock, Signal
} from "lucide-react";

export interface StreamingPlayerProps {
  gameId: string;
  serverUrl: string;
  sessionId?: string;
  autoConnect?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function StreamingPlayer({
  gameId,
  serverUrl,
  sessionId,
  autoConnect = true,
  onConnectionChange,
  onError,
}: StreamingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<WebRTCStreamingClient | null>(null);
  
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [stats, setStats] = useState<StreamingStats | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connect to streaming server
  const connect = useCallback(async () => {
    if (clientRef.current?.isActive()) return;

    setStatus('connecting');
    setError(null);

    try {
      const config: StreamingConfig = {
        serverUrl,
        gameId,
        sessionId,
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setStatus('connected');
            onConnectionChange?.(true);
          } else if (state === 'disconnected' || state === 'failed') {
            setStatus('disconnected');
            onConnectionChange?.(false);
          }
        },
        onTrack: (track, stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
        },
        onError: (err) => {
          setStatus('error');
          setError(err.message);
          onError?.(err);
        },
        onLatencyUpdate: (lat) => {
          setLatency(lat);
        },
      };

      clientRef.current = createStreamingClient(config);
      await clientRef.current.connect();
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Connection failed');
      onError?.(err);
    }
  }, [gameId, serverUrl, sessionId, onConnectionChange, onError]);

  // Disconnect from streaming server
  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
      clientRef.current = null;
    }
    setStatus('disconnected');
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      void connect();
    }
    return () => {
      void disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Stats polling
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(async () => {
      if (clientRef.current) {
        const s = await clientRef.current.getStats();
        setStats(s);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Input handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || status !== 'connected') return;

    const sendInput = (event: InputEvent) => {
      clientRef.current?.sendInput(event);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      sendInput({
        type: 'keydown',
        timestamp: Date.now(),
        data: {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        },
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      sendInput({
        type: 'keyup',
        timestamp: Date.now(),
        data: {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
        },
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      sendInput({
        type: 'mousemove',
        timestamp: Date.now(),
        data: {
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
          clientX: e.clientX,
          clientY: e.clientY,
        },
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      sendInput({
        type: 'mousedown',
        timestamp: Date.now(),
        data: {
          button: e.button,
          x: e.clientX,
          y: e.clientY,
        },
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      sendInput({
        type: 'mouseup',
        timestamp: Date.now(),
        data: {
          button: e.button,
          x: e.clientX,
          y: e.clientY,
        },
      });
    };

    const handleWheel = (e: WheelEvent) => {
      sendInput({
        type: 'wheel',
        timestamp: Date.now(),
        data: {
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
        },
      });
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('keyup', handleKeyUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [status]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  // Quality change
  const setQuality = useCallback(async (quality: 'low' | 'medium' | 'high' | 'auto') => {
    await clientRef.current?.setQuality(quality);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-xl overflow-hidden focus:outline-none"
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-contain"
      />

      {/* Connection Overlay */}
      <AnimatePresence>
        {status === 'connecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80"
          >
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Connecting to stream...</p>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80"
          >
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-white text-lg mb-2">Connection Failed</p>
              <p className="text-neutral-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => void connect()}
                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-neutral-200"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}

        {status === 'disconnected' && !autoConnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80"
          >
            <button
              onClick={() => void connect()}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-neutral-200"
            >
              Start Stream
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Overlay */}
      <AnimatePresence>
        {status === 'connected' && showStats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-4 right-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">Connected</span>
              </div>

              {/* Latency */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                <Clock className="w-3 h-3 text-neutral-400" />
                <span className={`text-xs ${
                  latency < 50 ? 'text-green-400' :
                  latency < 100 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {latency}ms
                </span>
              </div>

              {/* Resolution */}
              {stats && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                  <Signal className="w-3 h-3 text-neutral-400" />
                  <span className="text-xs text-neutral-300">
                    {stats.frameWidth}x{stats.frameHeight}
                  </span>
                </div>
              )}

              {/* FPS */}
              {stats && stats.framesPerSecond > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                  <Gauge className="w-3 h-3 text-neutral-400" />
                  <span className="text-xs text-neutral-300">
                    {stats.framesPerSecond} FPS
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Gauge className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quality Selector */}
          <select
            onChange={(e) => void setQuality(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20"
          >
            <option value="auto">Auto</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 text-white" />
            ) : (
              <Maximize className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}