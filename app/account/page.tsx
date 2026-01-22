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
          <Card className="p-6 border-[#EF4444]/30 bg-[#EF4444]/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#EF4444]">error</span>
              <p className="font-sans text-lg text-[#EF4444]">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-[#EF4444] hover:text-[#DC2626]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </Card>
        )}

        {user ? (
          <Card className="p-8 bg-gradient-to-br from-[#0F172A] to-[#1E2A3A]">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-white">person</span>
                </div>
                <div>
                  <h2 className="text-2xl font-sans font-semibold text-[#8B9DB8] mb-1">
                    {user.username || 'Explorer'}
                  </h2>
                  <p className="font-sans text-base text-[#64748B]">UID: {user.uid.substring(0, 16)}...</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-[#3B82F6]">cloud</span>
                    <div>
                      <p className="font-sans text-sm text-[#8B9DB8]">Challenger Storage</p>
                      <p className="font-sans text-xs text-[#64748B]">4GB free per device</p>
                    </div>
                  </div>
                  <span className="font-sans text-sm text-[#10B981]">Active</span>
                </div>
              </div>

              <div className="p-4 bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-[#8B5CF6]">hub</span>
                    <div>
                      <p className="font-sans text-sm text-[#8B9DB8]">Cluster Network</p>
                      <p className="font-sans text-xs text-[#64748B]">P2P file sharing</p>
                    </div>
                  </div>
                  <span className="font-sans text-sm text-[#10B981]">Active</span>
                </div>
              </div>

              <div className="p-4 bg-[#1E2A3A]/50 rounded-lg border border-[#2A3648]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-[#F59E0B]">fingerprint</span>
                    <div>
                      <p className="font-sans text-sm text-[#8B9DB8]">Device Fingerprint</p>
                      <p className="font-sans text-xs text-[#64748B]">Secure identification</p>
                    </div>
                  </div>
                  <span className="font-sans text-sm text-[#10B981]">Active</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] border-[#DC2626]"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </Button>
          </Card>
        ) : (
          <Card className="p-8 bg-gradient-to-br from-[#0F172A] to-[#1E2A3A]">
            <div className="text-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-5xl text-white">scuba_diving</span>
              </div>
              <h2 className="text-2xl font-sans font-semibold text-[#8B9DB8] mb-2">Welcome, Explorer</h2>
              <p className="font-sans text-base text-[#64748B]">
                Dive into the deep sea with your identity
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-sans text-sm text-[#8B9DB8] mb-2">Username</label>
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

            <div className="mt-6 p-4 bg-[#3B82F6]/10 rounded-lg border border-[#3B82F6]/30">
              <h3 className="font-sans font-medium text-xs text-[#3B82F6] mb-2">Features Unlocked:</h3>
              <ul className="space-y-1">
                <li className="font-sans text-xs text-[#8B9DB8]">• 4GB Challenger Storage</li>
                <li className="font-sans text-xs text-[#8B9DB8]">• P2P Cluster Network</li>
                <li className="font-sans text-xs text-[#8B9DB8]">• Game Save Sync</li>
                <li className="font-sans text-xs text-[#8B9DB8]">• Virtual Machines</li>
              </ul>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-[#0F172A]/50">
          <h3 className="font-sans font-medium text-sm text-[#8B9DB8] mb-4">About Nacho Auth</h3>
          <div className="space-y-3 font-sans text-sm text-[#64748B]">
            <p>
              <strong className="text-[#8B9DB8]">No Passwords:</strong> Uses device fingerprinting + username for secure authentication.
            </p>
            <p>
              <strong className="text-[#8B9DB8]">No Email Required:</strong> Your privacy is paramount. No personal information collected.
            </p>
            <p>
              <strong className="text-[#8B9DB8]">Device-Bound:</strong> Each device gets its own secure identity with separate storage quotas.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
