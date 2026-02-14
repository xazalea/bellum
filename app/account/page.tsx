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
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

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
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="space-y-8">
        <header className="space-y-2 border-b-2 border-ocean-border pb-6">
          <h1 className="font-pixel text-lg text-ocean-accent retro-glow">▲ ACCOUNT</h1>
          <p className="font-mono text-sm text-ocean-secondary">View account details.</p>
        </header>

        {error && (
          <div className="p-4 border border-red-500/20 rounded-md flex items-center gap-3 text-sm text-red-400">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {user ? (
          <Card className="p-8">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-14 h-14 rounded-full bg-ocean-accent/15 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl text-ocean-accent">person</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-ocean-primary">
                  {user.username || 'Explorer'}
                </h2>
                <p className="text-sm text-ocean-muted mt-0.5">UID: {user.uid.substring(0, 16)}...</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <ServiceItem icon="cloud" label="Challenger Deep Storage" detail="4GB free per device" />
              <ServiceItem icon="hub" label="Cluster Network" detail="P2P file sharing" />
              <ServiceItem icon="fingerprint" label="Device Fingerprint" detail="Secure identification" />
            </div>

            <Button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 border-rose-500/15 text-rose-400 text-sm"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Sign Out
            </Button>
          </Card>
        ) : (
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-ocean-accent/15 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-ocean-accent">scuba_diving</span>
              </div>
              <h2 className="text-xl font-semibold text-ocean-primary mb-1">Welcome, Explorer</h2>
              <p className="text-sm text-ocean-secondary">
                Claim a username to get started
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-ocean-muted uppercase tracking-wider mb-2">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  onKeyDown={(e) => e.key === 'Enter' && handleClaimUsername()}
                  disabled={isSigningIn}
                />
              </div>

              <p className="text-xs text-ocean-muted leading-relaxed">
                No email or password required. Uses device fingerprinting for secure authentication.
              </p>
            </div>

            <Button
              onClick={handleClaimUsername}
              disabled={isSigningIn || !username.trim()}
              variant="primary"
              className="w-full"
            >
              {isSigningIn ? 'Claiming...' : 'Claim Username'}
            </Button>

            <div className="mt-6 pt-5 border-t border-ocean-border">
              <p className="text-xs text-ocean-muted uppercase tracking-wider mb-3">Included:</p>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-xs text-ocean-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-ocean-accent">check</span>
                  4GB Storage
                </span>
                <span className="text-xs text-ocean-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-ocean-accent">check</span>
                  Cluster Network
                </span>
                <span className="text-xs text-ocean-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-ocean-accent">check</span>
                  Game Sync
                </span>
                <span className="text-xs text-ocean-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-ocean-accent">check</span>
                  VM Support
                </span>
              </div>
            </div>
          </Card>
        )}

        <div className="pt-6 border-t border-ocean-border space-y-3">
          <h3 className="text-xs font-medium text-ocean-muted uppercase tracking-wider">About Auth</h3>
          <div className="space-y-2 text-sm text-ocean-secondary leading-relaxed">
            <p><span className="text-ocean-primary">No Passwords:</span> Uses device fingerprinting + username.</p>
            <p><span className="text-ocean-primary">No Email Required:</span> No personal information collected.</p>
            <p><span className="text-ocean-primary">Device-Bound:</span> Each device gets its own secure identity.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function ServiceItem({ icon, label, detail }: { icon: string; label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-ocean-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[18px] text-ocean-muted">{icon}</span>
        <div>
          <p className="text-sm text-ocean-primary">{label}</p>
          <p className="text-xs text-ocean-muted">{detail}</p>
        </div>
      </div>
      <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Active</span>
    </div>
  );
}
