"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlowingCard } from "@/components/ui/glowing-effect";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import { Badge } from "@/components/ui/badge";
import { Monitor, Upload, Trash2, Play } from "lucide-react";
import type { ImportedApp } from "@/types/ui";

// Mock imported Windows apps
const mockImportedApps: ImportedApp[] = [
  {
    id: "1",
    name: "Notepad++",
    type: "windows",
    size: 15000000,
    uploadedAt: new Date("2024-01-12"),
    storageRef: "telegram:windows_1",
  },
  {
    id: "2",
    name: "VLC Media Player",
    type: "windows",
    size: 45000000,
    uploadedAt: new Date("2024-01-08"),
    storageRef: "discord:windows_2",
  },
  {
    id: "3",
    name: "7-Zip",
    type: "windows",
    size: 5000000,
    uploadedAt: new Date("2024-01-03"),
    storageRef: "telegram:windows_3",
  },
];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function WindowsPage() {
  const [importedApps, setImportedApps] = useState<ImportedApp[]>(mockImportedApps);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const newApp: ImportedApp = {
      id: Date.now().toString(),
      name: `Windows App ${importedApps.length + 1}`,
      type: "windows",
      size: Math.floor(Math.random() * 100000000) + 20000000,
      uploadedAt: new Date(),
      storageRef: `discord:windows_${Date.now()}`,
    };
    
    setImportedApps((prev) => [newApp, ...prev]);
    setIsImporting(false);
  };

  const handleDelete = (id: string) => {
    setImportedApps((prev) => prev.filter((app) => app.id !== id));
  };

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
              <Monitor className="w-8 h-8 text-white/70" />
              <h1 className="text-4xl md:text-5xl font-light text-white/90">
                Windows
              </h1>
            </div>
            <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
              Run Windows applications in your browser. Import executables and 
              launch them instantly from cloud storage.
            </p>
          </div>

          {/* Import Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <GlowingCard className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-white/90 font-medium mb-1">Import Executable</h3>
                  <p className="text-white/50 text-sm">
                    Upload Windows executables to run them in the cloud
                  </p>
                </div>
                <GradientButton
                  variant="primary"
                  onClick={handleImport}
                  disabled={isImporting}
                  className="min-w-[140px]"
                >
                  {isImporting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </>
                  )}
                </GradientButton>
              </div>
            </GlowingCard>
          </motion.div>

          {/* Apps List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Imported Applications ({importedApps.length})
            </h2>
            
            <div className="space-y-3">
              {importedApps.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlowingCard className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                          <Monitor className="w-6 h-6 text-white/50" />
                        </div>
                        <div>
                          <h3 className="text-white/90 font-medium">{app.name}</h3>
                          <div className="flex items-center gap-2 text-white/40 text-sm">
                            <span>{formatBytes(app.size)}</span>
                            <span>•</span>
                            <span>{app.uploadedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {app.storageRef.split(":")[0]}
                        </Badge>
                        <button
                          onClick={() => {}}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <Play className="w-4 h-4 text-white/70" />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-white/70" />
                        </button>
                      </div>
                    </div>
                  </GlowingCard>
                </motion.div>
              ))}
            </div>

            {importedApps.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No applications imported yet</p>
                <p className="text-sm">Import an executable to get started</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}