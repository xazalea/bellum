"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlowingCard } from "@/components/ui/glowing-effect";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import { Cpu, Play, Square, RefreshCw } from "lucide-react";

const virtualMachines = [
  {
    id: "1",
    name: "Ubuntu 22.04",
    status: "running",
    cpu: 2,
    memory: 4,
    disk: 50,
  },
  {
    id: "2",
    name: "Windows 11",
    status: "stopped",
    cpu: 4,
    memory: 8,
    disk: 100,
  },
  {
    id: "3",
    name: "Debian 12",
    status: "running",
    cpu: 1,
    memory: 2,
    disk: 25,
  },
];

export default function VirtualMachinesPage() {
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
              <Cpu className="w-8 h-8 text-white/70" />
              <h1 className="text-4xl md:text-5xl font-light text-white/90">
                Virtual Machines
              </h1>
            </div>
            <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
              Deploy and manage virtual machines in the cloud. Run any operating system instantly.
            </p>
          </div>

          {/* Create VM */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <GlowingCard className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-white/90 font-medium mb-1">Create New VM</h3>
                  <p className="text-white/50 text-sm">
                    Deploy a new virtual machine in seconds
                  </p>
                </div>
                <GradientButton variant="primary">
                  Create VM
                </GradientButton>
              </div>
            </GlowingCard>
          </motion.div>

          {/* VMs List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Your Virtual Machines
            </h2>
            
            <div className="space-y-3">
              {virtualMachines.map((vm, index) => (
                <motion.div
                  key={vm.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlowingCard className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                          <Cpu className="w-6 h-6 text-white/50" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white/90 font-medium">{vm.name}</h3>
                            <span className={`w-2 h-2 rounded-full ${vm.status === "running" ? "bg-green-500" : "bg-white/30"}`} />
                          </div>
                          <div className="flex items-center gap-2 text-white/40 text-sm">
                            <span>{vm.cpu} vCPU</span>
                            <span>•</span>
                            <span>{vm.memory}GB RAM</span>
                            <span>•</span>
                            <span>{vm.disk}GB Disk</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {vm.status === "running" ? (
                          <button className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors">
                            <Square className="w-4 h-4 text-white/70" />
                          </button>
                        ) : (
                          <button className="p-2 rounded-lg bg-white/5 hover:bg-green-500/20 transition-colors">
                            <Play className="w-4 h-4 text-white/70" />
                          </button>
                        )}
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <RefreshCw className="w-4 h-4 text-white/70" />
                        </button>
                      </div>
                    </div>
                  </GlowingCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}