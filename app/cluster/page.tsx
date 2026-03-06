"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlowingCard } from "@/components/ui/glowing-effect";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import { Server, Cpu, HardDrive, Activity, Plus, Settings } from "lucide-react";

const clusterNodes = [
  { id: "1", name: "Node US-East", status: "healthy", cpu: 45, memory: 62, region: "us-east-1" },
  { id: "2", name: "Node US-West", status: "healthy", cpu: 32, memory: 48, region: "us-west-2" },
  { id: "3", name: "Node EU-West", status: "warning", cpu: 78, memory: 85, region: "eu-west-1" },
  { id: "4", name: "Node Asia", status: "healthy", cpu: 28, memory: 35, region: "ap-southeast-1" },
];

export default function ClusterPage() {
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
              <Server className="w-8 h-8 text-white/70" />
              <h1 className="text-4xl md:text-5xl font-light text-white/90">
                Cluster
              </h1>
            </div>
            <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
              Manage your distributed computing cluster. Scale resources across multiple regions.
            </p>
          </div>

          {/* Cluster Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Nodes", value: "4", icon: Server },
              { label: "CPU", value: "46%", icon: Cpu },
              { label: "Memory", value: "58%", icon: HardDrive },
              { label: "Status", value: "OK", icon: Activity },
            ].map((stat, index) => (
              <GlowingCard key={index} className="p-4 text-center">
                <stat.icon className="w-5 h-5 mx-auto mb-2 text-white/50" />
                <div className="text-xl font-light text-white/90">{stat.value}</div>
                <div className="text-xs text-white/50">{stat.label}</div>
              </GlowingCard>
            ))}
          </motion.div>

          {/* Add Node */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-8"
          >
            <GlowingCard className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-white/90 font-medium mb-1">Scale Cluster</h3>
                  <p className="text-white/50 text-sm">
                    Add new nodes to increase capacity
                  </p>
                </div>
                <GradientButton variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Node
                </GradientButton>
              </div>
            </GlowingCard>
          </motion.div>

          {/* Nodes List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Cluster Nodes
            </h2>
            
            <div className="space-y-3">
              {clusterNodes.map((node, index) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlowingCard className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                          <Server className="w-6 h-6 text-white/50" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white/90 font-medium">{node.name}</h3>
                            <span className={`w-2 h-2 rounded-full ${
                              node.status === "healthy" ? "bg-green-500" : "bg-yellow-500"
                            }`} />
                          </div>
                          <div className="text-white/40 text-sm">{node.region}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-white/70 text-sm">CPU: {node.cpu}%</div>
                          <div className="text-white/40 text-xs">RAM: {node.memory}%</div>
                        </div>
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <Settings className="w-4 h-4 text-white/50" />
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