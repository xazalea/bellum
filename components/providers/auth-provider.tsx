'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authAPI } from '@/lib/api/auth';
import type { User, LoginCredentials, SignupCredentials } from '@/lib/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  signup: (credentials: SignupCredentials) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authAPI.getSession();
        setUser(session.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authAPI.login(credentials);
    setUser(response.user);
    return response.user;
  };

  const signup = async (credentials: SignupCredentials) => {
    const response = await authAPI.signup(credentials);
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
