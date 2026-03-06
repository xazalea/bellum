"use client";

import { motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { GlowingCard } from "@/components/ui/glowing-effect";
import { GradientButton } from "@/components/ui/hover-border-gradient";
import { User, Mail, Key, Shield, LogOut, Settings } from "lucide-react";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-black">
      <BackgroundPaths className="fixed inset-0 opacity-30" />
      
      <div className="relative z-10 pt-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <User className="w-8 h-8 text-white/70" />
              <h1 className="text-4xl md:text-5xl font-light text-white/90">
                Account
              </h1>
            </div>
            <p className="text-white/50 text-lg font-light max-w-2xl mx-auto">
              Manage your account settings and preferences.
            </p>
          </div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <GlowingCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-2xl font-light text-white">U</span>
                </div>
                <div>
                  <h2 className="text-xl font-light text-white/90">User</h2>
                  <p className="text-white/50 text-sm">user@example.com</p>
                </div>
              </div>
            </GlowingCard>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-white/70 text-sm uppercase tracking-wider mb-4">
              Settings
            </h2>

            <GlowingCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-white/50" />
                  <div>
                    <h3 className="text-white/90 font-medium">Email</h3>
                    <p className="text-white/40 text-sm">user@example.com</p>
                  </div>
                </div>
                <button className="text-white/50 hover:text-white text-sm">Change</button>
              </div>
            </GlowingCard>

            <GlowingCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Key className="w-5 h-5 text-white/50" />
                  <div>
                    <h3 className="text-white/90 font-medium">Password</h3>
                    <p className="text-white/40 text-sm">Last changed 30 days ago</p>
                  </div>
                </div>
                <button className="text-white/50 hover:text-white text-sm">Update</button>
              </div>
            </GlowingCard>

            <GlowingCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Shield className="w-5 h-5 text-white/50" />
                  <div>
                    <h3 className="text-white/90 font-medium">Two-Factor Auth</h3>
                    <p className="text-white/40 text-sm">Not enabled</p>
                  </div>
                </div>
                <button className="text-white/50 hover:text-white text-sm">Enable</button>
              </div>
            </GlowingCard>

            <GlowingCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Settings className="w-5 h-5 text-white/50" />
                  <div>
                    <h3 className="text-white/90 font-medium">Preferences</h3>
                    <p className="text-white/40 text-sm">Theme, notifications, etc.</p>
                  </div>
                </div>
                <button className="text-white/50 hover:text-white text-sm">Edit</button>
              </div>
            </GlowingCard>
          </motion.div>

          {/* Sign Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            <GradientButton variant="ghost" className="w-full justify-center text-red-400 hover:text-red-300">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </GradientButton>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}