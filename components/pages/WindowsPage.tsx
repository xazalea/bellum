"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { DynamicIslandNav } from "@/components/layout/DynamicIslandNav";
import { HoverBorderGradient, GradientButton } from "@/components/ui/hover-border-gradient";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { wasmAppLibrary, WASMApp } from "@/lib/apps/wasm-app-library";
import { Monitor, Upload, Play, MonitorPlay } from "lucide-react";

export function WindowsPage() {
  const [apps, setApps] = useState<WASMApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [launchedApp, setLaunchedApp] = useState<WASMApp | null>(null);

  useEffect(() => {
    // Load apps from library
    const allApps = wasmAppLibrary.getAllApps();
    setApps(allApps);
    setIsLoading(false);
  }, []);

  const handleLaunchApp = async (app: WASMApp) => {
    setLaunchedApp(app);
    
    // Create container for app
    const container = document.createElement("div");
    container.id = `app-container-${app.id}`;
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90vw;
      height: 85vh;
      background: #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
      z-index: 1000;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    `;
    
    document.body.appendChild(container);
    
    try {
      await wasmAppLibrary.launchApp(app.id, container);
    } catch (error) {
      console.error("Failed to launch app:", error);
    }
  };

  const handleCloseApp = () => {
    const container = document.getElementById(`app-container-${launchedApp?.id}`);
    if (container) {
      container.remove();
    }
    setLaunchedApp(null);
  };

  // Get featured apps (first 6)
  const featuredApps = apps.slice(0, 6);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background */}
      <BackgroundPaths />

      {/* Navigation */}
      <DynamicIslandNav />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Icon */}
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <Monitor className="w-10 h-10 text-blue-400" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Windows Apps
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Run Windows applications directly in your browser. Experience the power of desktop software, no installation required.
          </motion.p>

          {/* Center Launch Button */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <GlowingEffect
              blur={20}
              proximity={100}
              spread={40}
              className="rounded-full"
            >
              <motion.button
                className="relative w-40 h-40 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 rounded-full bg-blue-500/5 animate-pulse" />
                <div className="relative flex flex-col items-center gap-2">
                  <Play className="w-12 h-12 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  <span className="text-blue-400 font-medium text-sm">Launch App</span>
                </div>
              </motion.button>
            </GlowingEffect>
          </motion.div>
        </motion.div>

        {/* Apps arranged around center button */}
        {!isLoading && (
          <motion.div
            className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl w-full"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            {featuredApps.map((app, index) => (
              <AppIconButton
                key={app.id}
                app={app}
                index={index}
                onClick={() => handleLaunchApp(app)}
              />
            ))}
          </motion.div>
        )}

        {/* Windows 98 Feature Card */}
        <motion.div
          className="mt-12 max-w-2xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <GlowingEffect className="rounded-2xl">
            <div className="relative p-6 rounded-2xl bg-card/50 border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center shrink-0">
                  <MonitorPlay className="w-7 h-7 text-teal-400" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Windows 98 Emulator
                  </h3>
                  <p className="text-sm text-white/50">
                    Experience the nostalgia of Windows 98 right in your browser.
                  </p>
                </div>
                <HoverBorderGradient containerClassName="shrink-0">
                  <button className="flex items-center gap-2">
                    Launch
                    <MonitorPlay className="w-4 h-4" />
                  </button>
                </HoverBorderGradient>
              </div>
            </div>
          </GlowingEffect>
        </motion.div>

        {/* Upload EXE Button */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <HoverBorderGradient>
            <button className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload EXE
            </button>
          </HoverBorderGradient>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex items-center justify-center gap-8 md:gap-16 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <Stat value="16" label="Built-in Apps" />
          <Stat value="Win98" label="Emulator" />
          <Stat value="∞" label="Uploads" />
        </motion.div>
      </div>

      {/* App modal overlay */}
      {launchedApp && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleCloseApp}
        />
      )}
    </div>
  );
}

// App icon button component
function AppIconButton({
  app,
  index,
  onClick,
}: {
  app: WASMApp;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 + index * 0.05 }}
      whileHover={{ y: -5, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="text-3xl">{app.icon}</div>
      <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors truncate max-w-[80px]">
        {app.name}
      </span>
    </motion.button>
  );
}

// Stat component
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  );
}