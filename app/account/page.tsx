'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService, type User } from '@/lib/firebase/auth-service';

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return () => unsubscribe();
  }, []);

  const handleClaimUsername = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);
      await authService.claimUsername(username);
      // Auth context will update automatically
    } catch (err: any) {
      console.error('Claim username error:', err);
      setError(err?.message || 'Failed to claim username');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUsername('');
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err?.message || 'Failed to sign out');
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="space-y-8">
        <header className="space-y-2 border-b border-nacho-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-nacho-primary">Account</h1>
          <p className="text-sm text-nacho-secondary">View account details.</p>
        </header>

        {error && (
          <Card className="p-6 border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-red-500">error</span>
              <p className="font-sans text-lg text-red-500">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </Card>
        )}

        {user ? (
          <Card className="p-8 bg-gradient-to-br from-nacho-bg to-nacho-surface/20">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-nacho-accent to-blue-600 flex items-center justify-center shadow-glow">
                  <span className="material-symbols-outlined text-4xl text-white">person</span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-nacho-primary mb-1">
                    {user.username || 'Explorer'}
                  </h2>
                  <p className="text-base text-nacho-secondary">UID: {user.uid.substring(0, 16)}...</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-nacho-surface/30 rounded-xl border border-nacho-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-blue-400">cloud</span>
                    <div>
                      <p className="text-sm font-medium text-nacho-primary">Bellum Storage</p>
                      <p className="text-xs text-nacho-muted">4GB free per device</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">Active</span>
                </div>
              </div>

              <div className="p-4 bg-nacho-surface/30 rounded-xl border border-nacho-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-purple-400">hub</span>
                    <div>
                      <p className="text-sm font-medium text-nacho-primary">Cluster Network</p>
                      <p className="text-xs text-nacho-muted">P2P file sharing</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">Active</span>
                </div>
              </div>

              <div className="p-4 bg-nacho-surface/30 rounded-xl border border-nacho-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-amber-400">fingerprint</span>
                    <div>
                      <p className="text-sm font-medium text-nacho-primary">Device Fingerprint</p>
                      <p className="text-xs text-nacho-muted">Secure identification</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">Active</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </Button>
          </Card>
        ) : (
          <Card className="p-8 bg-gradient-to-br from-nacho-bg to-nacho-surface/20">
            <div className="text-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-nacho-accent to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
                <span className="material-symbols-outlined text-5xl text-white">scuba_diving</span>
              </div>
              <h2 className="text-2xl font-semibold text-nacho-primary mb-2">Welcome, Explorer</h2>
              <p className="text-base text-nacho-secondary">
                Dive into the deep sea with your identity
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-nacho-secondary mb-2">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  onKeyDown={(e) => e.key === 'Enter' && handleClaimUsername()}
                  disabled={isSigningIn}
                  className="w-full"
                />
              </div>

              <div className="p-4 bg-[#1E2A3A]/30 rounded-lg border border-[#2A3648]/50">
                <p className="font-sans text-xs text-[#64748B]">
                  🔐 <strong>Privacy First:</strong> You already have a device identity. Claim a username 
                  to personalize your account. No email or password required!
                </p>
              </div>
            </div>

            <Button
              onClick={handleClaimUsername}
              disabled={isSigningIn || !username.trim()}
              className="w-full flex items-center justify-center gap-2"
            >
              {isSigningIn ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#64748B] border-t-transparent rounded-full animate-spin"></span>
                  <span>Claiming Username...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">badge</span>
                  <span>Claim Username</span>
                </>
              )}
            </Button>

            <div className="mt-6 p-4 bg-nacho-accent/10 rounded-xl border border-nacho-accent/30">
              <h3 className="font-medium text-xs text-nacho-accent mb-2 uppercase tracking-wider">Features Unlocked:</h3>
              <ul className="grid grid-cols-2 gap-2">
                <li className="text-xs text-nacho-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    4GB Storage
                </li>
                <li className="text-xs text-nacho-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Cluster Network
                </li>
                <li className="text-xs text-nacho-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Game Sync
                </li>
                <li className="text-xs text-nacho-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    VM Support
                </li>
              </ul>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-nacho-surface/20 border-nacho-border">
          <h3 className="font-medium text-sm text-nacho-primary mb-4 uppercase tracking-wider">About Nacho Auth</h3>
          <div className="space-y-3 text-sm text-nacho-secondary leading-relaxed">
            <p>
              <strong className="text-nacho-primary">No Passwords:</strong> Uses device fingerprinting + username for secure authentication.
            </p>
            <p>
              <strong className="text-nacho-primary">No Email Required:</strong> Your privacy is paramount. No personal information collected.
            </p>
            <p>
              <strong className="text-nacho-primary">Device-Bound:</strong> Each device gets its own secure identity with separate storage quotas.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
