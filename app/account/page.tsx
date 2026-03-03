"use client";

import { useCallback, useEffect, useState } from "react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface User {
  uid: string;
  username?: string;
  createdAt?: number;
}

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════

function UserIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CloudIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  );
}

function HubIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function FingerprintIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
    </svg>
  );
}

function CheckIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function LogoutIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

function DivingIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem("cd_user");
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Claim username
  const handleClaimUsername = useCallback(async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      // Simulate user creation
      const newUser: User = {
        uid: `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        username: username.trim(),
        createdAt: Date.now(),
      };

      localStorage.setItem("cd_user", JSON.stringify(newUser));
      setUser(newUser);
    } catch (err: any) {
      console.error("Claim username error:", err);
      setError(err?.message || "Failed to claim username");
    } finally {
      setIsSigningIn(false);
    }
  }, [username]);

  // Sign out
  const handleSignOut = useCallback(() => {
    localStorage.removeItem("cd_user");
    setUser(null);
    setUsername("");
  }, []);

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleClaimUsername();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cd-abyss)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--cd-border-default)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                background: "var(--cd-cyan-muted)",
                border: "1px solid var(--cd-cyan-border)"
              }}
            >
              <UserIcon className="w-6 h-6" style={{ color: "var(--cd-cyan)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--cd-text-primary)" }}>
                Account
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--cd-text-muted)" }}>
                View and manage your account details
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="cd-alert cd-alert-error mb-6">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="cd-btn cd-btn-ghost text-xs">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="cd-card text-center py-12">
            <div className="cd-spinner cd-spinner-lg mx-auto mb-4" />
            <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>Loading...</p>
          </div>
        ) : user ? (
          /* Logged In View */
          <div className="cd-card">
            {/* User Info */}
            <div className="flex items-start gap-4 mb-8">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--cd-cyan-muted)" }}
              >
                <UserIcon className="w-7 h-7" style={{ color: "var(--cd-cyan)" }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: "var(--cd-text-primary)" }}>
                  {user.username || "Explorer"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--cd-text-muted)" }}>
                  UID: {user.uid.substring(0, 16)}...
                </p>
                {user.createdAt && (
                  <p className="text-xs mt-1" style={{ color: "var(--cd-text-subtle)" }}>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-3 mb-8">
              <ServiceItem
                icon={<CloudIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />}
                label="Challenger Deep Storage"
                detail="4GB free per device"
                active
              />
              <ServiceItem
                icon={<HubIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />}
                label="Cluster Network"
                detail="P2P file sharing"
                active
              />
              <ServiceItem
                icon={<FingerprintIcon className="w-5 h-5" style={{ color: "var(--cd-cyan)" }} />}
                label="Device Fingerprint"
                detail="Secure identification"
                active
              />
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="cd-btn cd-btn-danger w-full flex items-center justify-center gap-2"
            >
              <LogoutIcon className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          /* Sign In View */
          <div className="cd-card">
            {/* Welcome */}
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--cd-cyan-muted)" }}
              >
                <DivingIcon className="w-8 h-8" style={{ color: "var(--cd-cyan)" }} />
              </div>
              <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--cd-text-primary)" }}>
                Welcome, Explorer
              </h2>
              <p className="text-sm" style={{ color: "var(--cd-text-muted)" }}>
                Claim a username to get started
              </p>
            </div>

            {/* Username Input */}
            <div className="space-y-4 mb-6">
              <div>
                <label
                  className="block text-xs uppercase tracking-wider mb-2"
                  style={{ color: "var(--cd-text-muted)" }}
                >
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your username"
                  disabled={isSigningIn}
                  className="w-full px-3 py-2.5 text-sm bg-[var(--cd-surface)] border border-[var(--cd-border-default)] rounded-md text-[var(--cd-text-primary)] placeholder:text-[var(--cd-text-muted)] focus:outline-none focus:border-[var(--cd-cyan-border)] disabled:opacity-50"
                />
              </div>

              <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>
                No email or password required. Uses device fingerprinting for secure authentication.
              </p>
            </div>

            {/* Claim Button */}
            <button
              onClick={handleClaimUsername}
              disabled={isSigningIn || !username.trim()}
              className="cd-btn cd-btn-primary w-full"
            >
              {isSigningIn ? "Claiming..." : "Claim Username"}
            </button>

            {/* Features */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--cd-border-muted)" }}>
              <p
                className="text-xs uppercase tracking-wider mb-3"
                style={{ color: "var(--cd-text-muted)" }}
              >
                Included with your account:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <FeatureItem text="4GB Storage" />
                <FeatureItem text="Cluster Network" />
                <FeatureItem text="Game Sync" />
                <FeatureItem text="VM Support" />
              </div>
            </div>
          </div>
        )}

        {/* About Auth */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--cd-border-muted)" }}>
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--cd-text-muted)" }}
          >
            About Authentication
          </h3>
          <div className="space-y-2 text-sm" style={{ color: "var(--cd-text-secondary)" }}>
            <p>
              <span style={{ color: "var(--cd-text-primary)" }}>No Passwords:</span>{" "}
              Uses device fingerprinting + username.
            </p>
            <p>
              <span style={{ color: "var(--cd-text-primary)" }}>No Email Required:</span>{" "}
              No personal information collected.
            </p>
            <p>
              <span style={{ color: "var(--cd-text-primary)" }}>Device-Bound:</span>{" "}
              Each device gets its own secure identity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function ServiceItem({ icon, label, detail, active }: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b"
      style={{ borderColor: "var(--cd-border-muted)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "var(--cd-elevated)" }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm" style={{ color: "var(--cd-text-primary)" }}>{label}</p>
          <p className="text-xs" style={{ color: "var(--cd-text-muted)" }}>{detail}</p>
        </div>
      </div>
      {active && (
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--cd-success)" }}
        >
          Active
        </span>
      )}
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--cd-text-secondary)" }}>
      <CheckIcon className="w-3 h-3" style={{ color: "var(--cd-cyan)" }} />
      {text}
    </div>
  );
}