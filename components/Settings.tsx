"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Shield, Database, Wifi, Cpu, Code, Network } from 'lucide-react';
import { onSettings, setClusterParticipation, type NachoUserSettings } from '@/lib/cluster/settings';
import { NACHO_STORAGE_LIMIT_BYTES } from '@/lib/storage/quota';
import { approveLoginCode, getCachedUsername } from '@/lib/auth/nacho-auth';

function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export const SettingsPanel = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<NachoUserSettings>({ clusterParticipation: true });
  const [storageUsed, setStorageUsed] = useState<number | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpStatus, setOtpStatus] = useState<string | null>(null);
  const [cursorPref, setCursorPref] = useState<'custom' | 'native'>('native');
  const username = getCachedUsername();

  const tabs = useMemo(() => [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'performance', label: 'Performance', icon: Cpu },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'developer', label: 'Developer', icon: Code },
  ], []);

  useEffect(() => {
    let unsub = () => {};
    if (username) unsub = onSettings(username, setSettings);
    return () => unsub();
  }, [username]);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem('nacho.cursor');
      setCursorPref(v === 'custom' ? 'custom' : 'native');
    } catch {
      setCursorPref('native');
    }
  }, []);

  const toggleCluster = async () => {
    if (!username) return;
    const next = !settings.clusterParticipation;
    await setClusterParticipation(username, next);
    setSettings((s) => ({ ...s, clusterParticipation: next }));
  };

  const toggleCursor = () => {
    const next = cursorPref === 'custom' ? 'native' : 'custom';
    setCursorPref(next);
    try {
      window.localStorage.setItem('nacho.cursor', next);
    } catch {
      // ignore
    }
    // Cursor is bootstrapped at app start; reload to apply immediately.
    window.location.reload();
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 flex gap-8 min-h-screen">
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-2">
        <h2 className="text-2xl font-bold mb-6 px-4">Settings</h2>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border-2 ${
              activeTab === tab.id
                ? 'bg-white text-black font-semibold border-white shadow-lg shadow-white/10'
                : 'text-white/60 border-white/10 hover:bg-white/5 hover:text-white hover:border-white/30'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 space-y-6"
      >
        <div className="bellum-card p-8 space-y-8">
          <div>
            <h3 className="text-xl font-bold mb-2">System Configuration</h3>
            <p className="text-white/40 text-sm">These settings are applied immediately and stored per account.</p>
          </div>

          {/* Cluster Participation (functional) */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">Cluster</h4>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border-2 border-white/10 hover:border-white/25 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-10 h-10 rounded-xl border-2 border-white/10 bg-white/5 flex items-center justify-center">
                  <Network size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold">Cluster participation</div>
                  <div className="text-xs text-white/50">
                    Enabled by default. If you opt out, you lose access to cluster-dependent features (cloud install/run).
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleCluster}
                className={`w-14 h-7 rounded-full border-2 transition-all ${
                  settings.clusterParticipation
                    ? 'bg-blue-500/70 border-blue-300/50'
                    : 'bg-white/5 border-white/20'
                }`}
                aria-pressed={settings.clusterParticipation}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.clusterParticipation ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Cursor */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">Cursor</h4>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border-2 border-white/10 hover:border-white/25 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-10 h-10 rounded-xl border-2 border-white/10 bg-white/5 flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold">Custom cursor</div>
                  <div className="text-xs text-white/50">
                    If your cursor feels laggy, keep this off (native cursor is fastest).
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleCursor}
                className={`w-14 h-7 rounded-full border-2 transition-all ${
                  cursorPref === 'custom'
                    ? 'bg-sky-200/40 border-sky-200/40'
                    : 'bg-white/5 border-white/20'
                }`}
                aria-pressed={cursorPref === 'custom'}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    cursorPref === 'custom' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Storage (functional display) */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">Storage</h4>
            <div className="p-4 bg-white/5 rounded-xl border-2 border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">Quota</div>
                  <div className="text-xs text-white/50">Cloud quota is enforced at upload time.</div>
                </div>
                <div className="text-right font-mono text-sm">
                  <div>
                    {storageUsed === null ? 'n/a' : formatBytes(storageUsed)} / {formatBytes(NACHO_STORAGE_LIMIT_BYTES)}
                  </div>
                  <div className="text-white/40">
                    {storageUsed === null
                      ? 'sign in to track usage'
                      : `remaining ${formatBytes(Math.max(0, NACHO_STORAGE_LIMIT_BYTES - storageUsed))}`}
                  </div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${storageUsed === null ? 0 : Math.min(100, (storageUsed / NACHO_STORAGE_LIMIT_BYTES) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pro / Advanced Mode */}
          <div className="pt-6 border-t border-white/10">
            <div className="bg-white/5 p-6 rounded-xl border-2 border-sky-200/15">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={20} className="text-sky-200" />
                <h4 className="font-bold text-white">Advanced mode</h4>
              </div>
              <p className="text-sm text-white/55 mb-4">
                Extra options for power users. If anything feels confusing, you can ignore this section.
              </p>
              <button className="bellum-btn text-sm py-2 px-4">Enable Advanced Features</button>
            </div>
          </div>

          {/* Security: OTP approval for new devices */}
          <div className="pt-6 border-t border-white/10">
            <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-3">Security</h4>
            <div className="p-4 bg-white/5 rounded-xl border-2 border-white/10 space-y-3">
              <div className="text-sm text-white/70">
                Approve a new device login for <span className="font-mono text-white">{username ?? '—'}</span> by entering the 6‑digit code shown on the new device.
              </div>
              <div className="flex gap-2">
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="bellum-input flex-1 py-2 px-3 font-mono"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  disabled={!username || !otpCode || otpCode.trim().length < 6}
                  onClick={async () => {
                    try {
                      setOtpStatus(null);
                      if (!username) throw new Error('No username in this session.');
                      await approveLoginCode(username, otpCode);
                      setOtpStatus('Approved.');
                      setOtpCode('');
                    } catch (e: any) {
                      setOtpStatus(e?.message || 'Approval failed.');
                    }
                  }}
                  className="bellum-btn-secondary px-4 py-2 rounded-xl border-2 border-white/15 hover:border-white/35 disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
              {otpStatus && <div className="text-xs text-white/60">{otpStatus}</div>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
