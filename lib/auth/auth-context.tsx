"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getFingerprint } from "@/lib/tracking";
import { signUpUsername, signInUsername, getCachedUsername, setCachedUsername } from "@/lib/auth/challenger-auth";
import { syncIdentityToCloud, recoverIdentityFromCloud, autoSyncIdentity, getSyncStatus } from "@/lib/storage/identity-sync";

export interface User {
  username: string;
  fingerprint: string;
  createdAt?: number;
  lastLogin?: number;
}

interface AuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsUsername: boolean;
  error: string | null;
  
  // Actions
  signUp: (username: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (username: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  
  // Modal control
  showUsernameModal: boolean;
  setShowUsernameModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "challenger_user_identity";
const ACCOUNTS_KEY = "challenger_saved_accounts";

interface StoredIdentity {
  username: string;
  fingerprint: string;
  createdAt: number;
  lastLogin: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Load user identity from localStorage
  const loadStoredIdentity = useCallback((): StoredIdentity | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as StoredIdentity;
      }
    } catch (e) {
      console.error("Failed to load stored identity:", e);
    }
    return null;
  }, []);

  // Save user identity to localStorage
  const saveIdentity = useCallback((identity: StoredIdentity) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
      
      // Also add to saved accounts list
      const accountsStr = localStorage.getItem(ACCOUNTS_KEY) || "[]";
      const accounts = JSON.parse(accountsStr) as StoredIdentity[];
      const existingIndex = accounts.findIndex(a => a.fingerprint === identity.fingerprint);
      if (existingIndex >= 0) {
        accounts[existingIndex] = identity;
      } else {
        accounts.push(identity);
      }
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error("Failed to save identity:", e);
    }
  }, []);

  // Clear user identity from localStorage
  const clearIdentity = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get device fingerprint
        const fp = await getFingerprint();
        setFingerprint(fp);
        
        // Check for existing identity
        const storedIdentity = loadStoredIdentity();
        
        if (storedIdentity && storedIdentity.fingerprint === fp) {
          // Auto-login: fingerprint matches stored identity
          const updatedIdentity: StoredIdentity = {
            ...storedIdentity,
            lastLogin: Date.now(),
          };
          saveIdentity(updatedIdentity);
          setUser({
            username: updatedIdentity.username,
            fingerprint: updatedIdentity.fingerprint,
            createdAt: updatedIdentity.createdAt,
            lastLogin: updatedIdentity.lastLogin,
          });
          setNeedsUsername(false);
        } else {
          // Check if we have a cached username from the old auth system
          const cachedUsername = getCachedUsername();
          if (cachedUsername && fp) {
            // Migrate to new identity format
            const newIdentity: StoredIdentity = {
              username: cachedUsername,
              fingerprint: fp,
              createdAt: Date.now(),
              lastLogin: Date.now(),
            };
            saveIdentity(newIdentity);
            setUser({
              username: newIdentity.username,
              fingerprint: newIdentity.fingerprint,
              createdAt: newIdentity.createdAt,
              lastLogin: newIdentity.lastLogin,
            });
            setNeedsUsername(false);
          } else {
            // New user - needs to select username
            setNeedsUsername(true);
            setShowUsernameModal(true);
          }
        }
      } catch (e) {
        console.error("Auth initialization failed:", e);
        setError(e instanceof Error ? e.message : "Authentication failed");
        setNeedsUsername(true);
        setShowUsernameModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [loadStoredIdentity, saveIdentity]);

  // Sign up with username
  const signUp = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!fingerprint) {
      return { success: false, error: "Device fingerprint not available. Please refresh the page." };
    }

    try {
      setError(null);
      const result = await signUpUsername(username);
      
      if (result.status === "ok") {
        const identity: StoredIdentity = {
          username: result.username,
          fingerprint,
          createdAt: Date.now(),
          lastLogin: Date.now(),
        };
        saveIdentity(identity);
        setUser({
          username: identity.username,
          fingerprint: identity.fingerprint,
          createdAt: identity.createdAt,
          lastLogin: identity.lastLogin,
        });
        setNeedsUsername(false);
        setShowUsernameModal(false);
        
        // Sync identity to cloud in background
        syncIdentityToCloud(identity).catch(console.error);
        
        return { success: true };
      } else {
        return { success: false, error: "Failed to create account. Please try a different username." };
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Sign up failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fingerprint, saveIdentity]);

  // Sign in with username
  const signIn = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!fingerprint) {
      return { success: false, error: "Device fingerprint not available. Please refresh the page." };
    }

    try {
      setError(null);
      const result = await signInUsername(username);
      
      if (result.status === "ok") {
        const identity: StoredIdentity = {
          username: result.username,
          fingerprint,
          createdAt: Date.now(),
          lastLogin: Date.now(),
        };
        saveIdentity(identity);
        setUser({
          username: identity.username,
          fingerprint: identity.fingerprint,
          createdAt: identity.createdAt,
          lastLogin: identity.lastLogin,
        });
        setNeedsUsername(false);
        setShowUsernameModal(false);
        return { success: true };
      } else {
        return { success: false, error: "Failed to sign in. Please check your username." };
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Sign in failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fingerprint, saveIdentity]);

  // Sign out
  const signOut = useCallback(() => {
    clearIdentity();
    setCachedUsername(null);
    setUser(null);
    setNeedsUsername(true);
    setShowUsernameModal(true);
  }, [clearIdentity]);

  // Refresh user state
  const refreshUser = useCallback(async () => {
    const storedIdentity = loadStoredIdentity();
    if (storedIdentity) {
      setUser({
        username: storedIdentity.username,
        fingerprint: storedIdentity.fingerprint,
        createdAt: storedIdentity.createdAt,
        lastLogin: storedIdentity.lastLogin,
      });
    }
  }, [loadStoredIdentity]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    needsUsername,
    error,
    signUp,
    signIn,
    signOut,
    refreshUser,
    showUsernameModal,
    setShowUsernameModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for getting saved accounts (for switch account functionality)
export function useSavedAccounts(): StoredIdentity[] {
  if (typeof window === "undefined") return [];
  try {
    const accountsStr = localStorage.getItem(ACCOUNTS_KEY) || "[]";
    return JSON.parse(accountsStr) as StoredIdentity[];
  } catch {
    return [];
  }
}