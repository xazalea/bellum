"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Trash2, Download, Smartphone, Monitor } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { WASMApp } from "@/lib/apps/wasm-app-library";

interface AppCardProps {
  app: WASMApp;
  index?: number;
  onLaunch?: (app: WASMApp) => void;
  className?: string;
}

export function AppCard({ app, index = 0, onLaunch, className }: AppCardProps) {
  return (
    <motion.div
      className={cn("group relative", className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
    >
      <GlowingEffect
        blur={10}
        proximity={50}
        spread={30}
        variant="center"
        className="rounded-xl"
      >
        <div className="relative overflow-hidden rounded-xl bg-card border border-white/5 p-4">
          {/* Icon */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-3xl mb-4">
            {app.icon}
          </div>

          {/* Info */}
          <h3 className="font-medium text-white truncate">{app.name}</h3>
          <p className="text-sm text-white/50 mt-1 line-clamp-2">{app.description}</p>

          {/* Category badge */}
          <div className="mt-3 flex items-center justify-between">
            <span className="px-2 py-1 text-xs font-medium bg-white/10 rounded-full text-white/60 capitalize">
              {app.category}
            </span>
            <span className="text-xs text-white/30">
              {(app.size / 1024).toFixed(0)}KB
            </span>
          </div>

          {/* Launch button */}
          <motion.button
            className="mt-4 w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
            onClick={() => onLaunch?.(app)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Launch
          </motion.button>
        </div>
      </GlowingEffect>
    </motion.div>
  );
}

// Installed app card (for imported apps)
interface InstalledAppCardProps {
  app: {
    id: string;
    name: string;
    type: "android" | "windows";
    icon?: string;
    storedBytes: number;
  };
  index?: number;
  onLaunch?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function InstalledAppCard({
  app,
  index = 0,
  onLaunch,
  onRemove,
  className,
}: InstalledAppCardProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <motion.div
      className={cn("group relative", className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
    >
      <GlowingEffect
        blur={10}
        proximity={50}
        spread={30}
        variant="center"
        className="rounded-xl"
      >
        <div className="relative overflow-hidden rounded-xl bg-card border border-white/5 p-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden">
            {app.icon ? (
              <img
                src={app.icon}
                alt={app.name}
                className="w-full h-full object-cover"
              />
            ) : app.type === "android" ? (
              <Smartphone className="w-7 h-7 text-white/40" />
            ) : (
              <Monitor className="w-7 h-7 text-white/40" />
            )}
          </div>

          {/* Info */}
          <h3 className="font-medium text-white truncate mt-3">{app.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/30">{formatSize(app.storedBytes)}</span>
            <span className="text-xs text-white/20">•</span>
            <span className="text-xs text-white/30 capitalize">{app.type}</span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <motion.button
              className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2"
              onClick={onLaunch}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4" />
              Launch
            </motion.button>
            <motion.button
              className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              onClick={onRemove}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </GlowingEffect>
    </motion.div>
  );
}

// App category section
interface AppCategoryProps {
  title: string;
  apps: WASMApp[];
  onLaunchApp: (app: WASMApp) => void;
  className?: string;
}

export function AppCategory({ title, apps, onLaunchApp, className }: AppCategoryProps) {
  return (
    <div className={cn("mb-8", className)}>
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {apps.map((app, index) => (
          <AppCard
            key={app.id}
            app={app}
            index={index}
            onLaunch={onLaunchApp}
          />
        ))}
      </div>
    </div>
  );
}