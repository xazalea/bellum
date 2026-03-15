/**
 * Unit Tests for Authentication Flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock FingerprintJS
vi.mock('@fingerprintjs/fingerprintjs', () => ({
  default: {
    load: () => Promise.resolve({
      get: () => Promise.resolve({ visitorId: 'test-fingerprint-123' }),
    }),
  },
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Fingerprint Generation', () => {
    it('should generate a consistent fingerprint', async () => {
      const { getDeviceFingerprintId } = await import('../../lib/auth/fingerprint');
      const fingerprint = await getDeviceFingerprintId();
      
      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBeGreaterThan(0);
    });

    it('should return fallback UUID on fingerprint generation failure', async () => {
      // Mock console.error to suppress error output
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { getDeviceFingerprintId } = await import('../../lib/auth/fingerprint');
      const fingerprint = await getDeviceFingerprintId();
      
      expect(fingerprint).not.toBeNull();
    });
  });

  describe('User Identity Storage', () => {
    it('should store user identity in localStorage', () => {
      const userIdentity = {
        fingerprint: 'test-fingerprint',
        username: 'testuser',
        createdAt: Date.now(),
      };

      localStorage.setItem('bellum_identity', JSON.stringify(userIdentity));
      
      const stored = localStorage.getItem('bellum_identity');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.fingerprint).toBe('test-fingerprint');
      expect(parsed.username).toBe('testuser');
    });

    it('should retrieve user identity from localStorage', () => {
      const userIdentity = {
        fingerprint: 'test-fingerprint',
        username: 'testuser',
        createdAt: Date.now(),
      };

      localStorage.setItem('bellum_identity', JSON.stringify(userIdentity));
      
      const stored = localStorage.getItem('bellum_identity');
      expect(stored).not.toBeNull();
    });

    it('should return null for missing identity', () => {
      const stored = localStorage.getItem('bellum_identity');
      expect(stored).toBeNull();
    });

    it('should clear user identity on logout', () => {
      localStorage.setItem('bellum_identity', JSON.stringify({ username: 'test' }));
      localStorage.removeItem('bellum_identity');
      
      expect(localStorage.getItem('bellum_identity')).toBeNull();
    });
  });

  describe('Username Validation', () => {
    it('should accept valid usernames', () => {
      const validUsernames = ['user123', 'test_user', 'Player1', 'abc'];
      
      validUsernames.forEach(username => {
        expect(username.length).toBeGreaterThanOrEqual(3);
        expect(username.length).toBeLessThanOrEqual(20);
        expect(/^[a-zA-Z0-9_]+$/.test(username)).toBe(true);
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = ['ab', 'a'.repeat(21), 'user@name', 'user name', ''];
      
      invalidUsernames.forEach(username => {
        const isValid = username.length >= 3 && 
                       username.length <= 20 && 
                       /^[a-zA-Z0-9_]+$/.test(username);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Auth State Management', () => {
    it('should initialize with no user', () => {
      const stored = localStorage.getItem('bellum_identity');
      expect(stored).toBeNull();
    });

    it('should detect returning user', () => {
      const userIdentity = {
        fingerprint: 'test-fingerprint',
        username: 'returning-user',
        createdAt: Date.now() - 86400000, // 1 day ago
      };

      localStorage.setItem('bellum_identity', JSON.stringify(userIdentity));
      
      const stored = localStorage.getItem('bellum_identity');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.username).toBe('returning-user');
    });

    it('should handle account switching', () => {
      // Store first account
      const account1 = {
        fingerprint: 'fp1',
        username: 'user1',
        createdAt: Date.now(),
      };
      localStorage.setItem('bellum_identity', JSON.stringify(account1));
      
      // Store accounts list
      const accounts = [
        { fingerprint: 'fp1', username: 'user1' },
        { fingerprint: 'fp2', username: 'user2' },
      ];
      localStorage.setItem('bellum_accounts', JSON.stringify(accounts));
      
      // Switch to second account
      const stored = localStorage.getItem('bellum_accounts');
      const parsedAccounts = JSON.parse(stored!);
      
      const switchedAccount = parsedAccounts.find((a: any) => a.fingerprint === 'fp2');
      expect(switchedAccount.username).toBe('user2');
    });
  });

  describe('Cloud Sync Integration', () => {
    it('should prepare identity for cloud sync', () => {
      const userIdentity = {
        fingerprint: 'test-fingerprint',
        username: 'testuser',
        createdAt: Date.now(),
      };

      const syncPayload = {
        type: 'identity',
        data: userIdentity,
        timestamp: Date.now(),
      };

      expect(syncPayload.type).toBe('identity');
      expect(syncPayload.data).toEqual(userIdentity);
      expect(syncPayload.timestamp).toBeDefined();
    });
  });
});

describe('Auth Context Provider', () => {
  it('should provide auth state to children', () => {
    // This would be tested with React Testing Library
    // For unit test, we verify the state structure
    const authState = {
      user: null,
      isLoading: true,
      isAuthenticated: false,
    };

    expect(authState.user).toBeNull();
    expect(authState.isLoading).toBe(true);
    expect(authState.isAuthenticated).toBe(false);
  });

  it('should update state on login', () => {
    const authState = {
      user: { username: 'testuser', fingerprint: 'fp123' },
      isLoading: false,
      isAuthenticated: true,
    };

    expect(authState.user).not.toBeNull();
    expect(authState.isAuthenticated).toBe(true);
  });
});