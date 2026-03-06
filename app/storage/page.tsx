"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlowingCard } from "@/components/ui/glowing-effect";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import { Cloud, Upload, HardDrive, Server } from "lucide-react";

const storageProviders = [
  { id: "telegram", name: "Telegram", used: "12.4 GB", limit: "2 GB/file", icon: "📨" },
  { id: "discord", name: "Discord", used: "8.2 GB", limit: "25 MB/file", icon: "💬" },
  { id: "local", name: "Local Storage", used: "5.1 GB", limit: "Unlimited", icon: "💾" },
];

export default function StoragePage() {
  return (
    <div className="min-h-screen bg-black">
      <BackgroundPaths className="fixed inset-0 opacity-30" />
      
      <div className="relative z-10 pt-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cloud className="w-8 h-8 text-white/70" />
              <h1 className="text-4xl md:text-5xl font-light text-white/90">
                Storage
              </h1>
            </div>
            <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
              Manage your cloud storage providers. Connect multiple services for seamless file access.
            </p>
          </div>

          {/* Storage Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <GlowingCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white/90 font-medium mb-1">Total Storage</h3>
                  <p className="text-white/50 text-sm">Across all providers</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-light text-white/90">25.7 GB</div>
                  <div className="text-white/40 text-sm">used</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "35%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                />
              </div>
            </GlowingCard>
          </motion.div>

          {/* Storage Providers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Connected Providers
            </h2>
            
            <div className="space-y-3">
              {storageProviders.map((provider, index) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlowingCard className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                          {provider.icon}
                        </div>
                        <div>
                          <h3 className="text-white/90 font-medium">{provider.name}</h3>
                          <div className="flex items-center gap-2 text-white/40 text-sm">
                            <span>{provider.used} used</span>
                            <span>•</span>
                            <span>{provider.limit}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-white/50 text-sm">Connected</span>
                      </div>
                    </div>
                  </GlowingCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Add Provider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8"
          >
            <GlowingCard className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-white/90 font-medium mb-1">Add Storage Provider</h3>
                  <p className="text-white/50 text-sm">
                    Connect additional cloud storage services
                  </p>
                </div>
                <GradientButton variant="secondary">
                  <Upload className="w-4 h-4 mr-2" />
                  Add Provider
                </GradientButton>
              </div>
            </GlowingCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}