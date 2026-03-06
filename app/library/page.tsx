"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlowingCard } from "@/components/ui/glowing-effect";
import { Database, Folder, File, Clock } from "lucide-react";

const libraryItems = [
  { id: "1", name: "Documents", type: "folder", items: 24, size: "1.2 GB" },
  { id: "2", name: "Projects", type: "folder", items: 8, size: "3.4 GB" },
  { id: "3", name: "Media", type: "folder", items: 156, size: "12.8 GB" },
  { id: "4", name: "Backups", type: "folder", items: 5, size: "8.2 GB" },
  { id: "5", name: "config.json", type: "file", size: "2.4 KB" },
  { id: "6", name: "notes.md", type: "file", size: "8.1 KB" },
];

const recentFiles = [
  { id: "1", name: "project_final.zip", accessed: "2 hours ago" },
  { id: "2", name: "presentation.pptx", accessed: "5 hours ago" },
  { id: "3", name: "report.pdf", accessed: "1 day ago" },
];

export default function LibraryPage() {
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
              <Database className="w-8 h-8 text-white/70" />
              <h1 className="text-4xl md:text-5xl font-light text-white/90">
                Library
              </h1>
            </div>
            <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
              Your personal file library. Organize, access, and manage all your files in one place.
            </p>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {[
              { label: "Total Files", value: "1,234" },
              { label: "Storage Used", value: "25.6 GB" },
              { label: "Folders", value: "42" },
            ].map((stat, index) => (
              <GlowingCard key={index} className="p-4 text-center">
                <div className="text-2xl font-light text-white/90">{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </GlowingCard>
            ))}
          </motion.div>

          {/* Recent Files */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Recent Files
            </h2>
            <div className="space-y-2">
              {recentFiles.map((file, index) => (
                <GlowingCard key={file.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-white/50" />
                      <span className="text-white/80">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <Clock className="w-4 h-4" />
                      {file.accessed}
                    </div>
                  </div>
                </GlowingCard>
              ))}
            </div>
          </motion.div>

          {/* Library Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Browse
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {libraryItems.map((item, index) => (
                <GlowingCard key={item.id} className="p-4 cursor-pointer hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-3">
                    {item.type === "folder" ? (
                      <Folder className="w-8 h-8 text-white/50" />
                    ) : (
                      <File className="w-8 h-8 text-white/50" />
                    )}
                    <div>
                      <div className="text-white/90 font-medium">{item.name}</div>
                      <div className="text-white/40 text-sm">
                        {item.type === "folder" ? `${item.items} items` : item.size}
                      </div>
                    </div>
                  </div>
                </GlowingCard>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}