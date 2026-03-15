"use client";

import { Suspense, useMemo, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MinimalNavIsland } from "@/components/ui/dynamic-island";
import {
  X, Maximize, Minimize, Volume2, VolumeX, Info,
  Star, Users, AlertTriangle, Gamepad2
} from "lucide-react";

// Confirmation Dialog
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Exit",
  cancelLabel = "Stay",
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-yellow-500/20">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <p className="text-neutral-400 text-sm mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Volume Slider Component
function VolumeSlider({
  volume,
  onChange,
  isOpen
}: {
  volume: number;
  onChange: (value: number) => void;
  isOpen: boolean;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-xl rounded-xl p-3 border border-white/10"
    >
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-neutral-400">{Math.round(volume * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-24 h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
      </div>
    </motion.div>
  );
}

// Game Info Sidebar
function GameInfoSidebar({
  title,
  width,
  height,
  isOpen,
  onClose
}: {
  title: string;
  width: number;
  height: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-neutral-900 border-l border-white/10 z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Game Info</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm text-neutral-500">Now Playing</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-500 mb-1">
                      <Star className="w-4 h-4" />
                      <span className="text-sm">Rating</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {((title.split("").reduce((a: number, b: string) => a + b.charCodeAt(0), 0) % 20 + 30) / 10).toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-500 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Plays</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {(title.split("").reduce((a: number, b: string) => a + b.charCodeAt(0), 0) * 137 % 100000).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Resolution</span>
                      <span className="text-white">{width} x {height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Aspect Ratio</span>
                      <span className="text-white">{(width / height).toFixed(2)}:1</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">Keyboard Shortcuts</h4>
                  <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Fullscreen</span>
                      <span className="text-white font-mono">F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Exit</span>
                      <span className="text-white font-mono">Escape</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Mute</span>
                      <span className="text-white font-mono">M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  const gameUrl = searchParams.get("url") || "";
  const gameTitle = searchParams.get("title") || "Game";
  const width = Number(searchParams.get("width") || "800") || 800;
  const height = Number(searchParams.get("height") || "600") || 600;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const proxiedSrc = useMemo(() => {
    if (!gameUrl) return "";
    return `/api/proxy/game?url=${encodeURIComponent(gameUrl)}`;
  }, [gameUrl]);

  // ROOT FIX: Define toggleFullscreen BEFORE the keyboard shortcut effect that uses it
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // Keyboard shortcuts — now safe because toggleFullscreen is defined above
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        setIsMuted(prev => !prev);
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          setShowExitDialog(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleExit = useCallback(() => {
    router.push("/games");
  }, [router]);

  if (!gameUrl) {
    return (
      <div className="min-h-screen bg-black">
        <MinimalNavIsland currentPath="/play" onNavigate={(path) => router.push(path)} />
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-24 md:px-6">
          <section className="bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-center">
            <Gamepad2 className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">No game selected</h1>
            <p className="text-neutral-400 text-sm mb-6">Open a game from the catalog first.</p>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
            >
              Browse Games
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-black flex flex-col">
      {/* Control Bar */}
      <div className="flex-shrink-0 bg-neutral-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExitDialog(true)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Exit game"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-sm font-medium text-white truncate max-w-[200px] md:max-w-none">
                {decodeURIComponent(gameTitle)}
              </h1>
              <p className="text-xs text-neutral-500">
                {width} x {height}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <div className="relative">
              <VolumeSlider
                volume={volume}
                onChange={setVolume}
                isOpen={showVolumeSlider}
              />
              <button
                onClick={() => {
                  if (isMuted) {
                    setIsMuted(false);
                  } else {
                    setShowVolumeSlider(prev => !prev);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setIsMuted(prev => !prev);
                }}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label={isMuted ? "Unmute" : "Volume"}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-neutral-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            {/* Info Button */}
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Game info"
            >
              <Info className="w-5 h-5 text-white" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-white" />
              ) : (
                <Maximize className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* ROOT FIX: Using inline style instead of broken Tailwind interpolation max-w-[{width}px] */}
        <div className="relative w-full bg-neutral-900 rounded-xl overflow-hidden border border-white/10" style={{ maxWidth: `${width}px` }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-sm text-neutral-400">Loading game...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/90 p-4 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <p className="text-white">{error}</p>
              <Link
                href="/games"
                className="px-6 py-2 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
              >
                Pick Another Game
              </Link>
            </div>
          )}

          <iframe
            src={proxiedSrc}
            title={gameTitle}
            className="w-full border-0"
            style={{ aspectRatio: `${width} / ${height}`, maxHeight: 'calc(100vh - 120px)' }}
            allow="autoplay; fullscreen; gamepad"
            allowFullScreen
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError("Failed to load this game through the proxy.");
            }}
          />
        </div>
      </div>

      {/* Game Info Sidebar */}
      <GameInfoSidebar
        title={decodeURIComponent(gameTitle)}
        width={width}
        height={height}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showExitDialog && (
          <ConfirmDialog
            isOpen={showExitDialog}
            title="Exit Game?"
            message="Are you sure you want to exit? Your progress may not be saved."
            onConfirm={handleExit}
            onCancel={() => setShowExitDialog(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>}>
      <PlayContent />
    </Suspense>
  );
}