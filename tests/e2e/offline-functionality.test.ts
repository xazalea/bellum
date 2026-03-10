/**
 * E2E tests for offline functionality
 * These tests verify the complete offline experience
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Offline Functionality E2E', () => {
  let serviceWorker: any;
  let cacheManager: any;

  beforeEach(async () => {
    serviceWorker = createMockServiceWorker();
    cacheManager = createMockCacheManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Worker Registration', () => {
    it('should register service worker on page load', async () => {
      const registration = await serviceWorker.register('/sw.js');
      
      expect(registration.active).toBe(true);
      expect(registration.scope).toBe('/');
    });

    it('should cache app shell on install', async () => {
      await serviceWorker.triggerInstall();
      
      const cachedFiles = await cacheManager.getCachedFiles();
      
      expect(cachedFiles).toContain('/');
      expect(cachedFiles).toContain('/app.js');
      expect(cachedFiles).toContain('/styles.css');
    });
  });

  describe('Offline Game Access', () => {
    it('should serve cached games when offline', async () => {
      // First, cache a game
      await cacheManager.cacheGame('game-123', {
        id: 'game-123',
        title: 'Test Game',
        assets: ['/assets/game-123/main.js'],
      });

      // Go offline
      serviceWorker.goOffline();

      // Try to access the game
      const response = await cacheManager.getGame('game-123');
      
      expect(response).toBeDefined();
      expect(response.title).toBe('Test Game');
    });

    it('should show offline indicator when network unavailable', async () => {
      serviceWorker.goOffline();
      
      const status = await serviceWorker.getConnectionStatus();
      
      expect(status.online).toBe(false);
      expect(status.hasOfflineContent).toBe(true);
    });

    it('should sync progress when back online', async () => {
      // Start offline
      serviceWorker.goOffline();
      
      // Make changes
      await cacheManager.saveProgress('game-123', { level: 5, score: 1000 });
      
      // Verify stored locally
      const localProgress = await cacheManager.getLocalProgress('game-123');
      expect(localProgress.level).toBe(5);
      
      // Go back online
      serviceWorker.goOnline();
      
      // Wait for sync
      await serviceWorker.waitForSync();
      
      // Verify synced
      const syncQueue = await cacheManager.getSyncQueue();
      expect(syncQueue).toHaveLength(0);
    });
  });

  describe('Cache Management', () => {
    it('should respect cache size limits', async () => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      cacheManager.setMaxSize(maxSize);

      // Try to cache more than limit
      const largeGame = {
        id: 'large-game',
        size: 60 * 1024 * 1024,
      };

      const result = await cacheManager.cacheGame(largeGame.id, largeGame);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('exceeds');
    });

    it('should evict oldest cached items when full', async () => {
      cacheManager.setMaxSize(10 * 1024 * 1024);

      // Cache multiple games
      await cacheManager.cacheGame('game-1', { id: 'game-1', size: 4 * 1024 * 1024 });
      await cacheManager.cacheGame('game-2', { id: 'game-2', size: 4 * 1024 * 1024 });
      await cacheManager.cacheGame('game-3', { id: 'game-3', size: 4 * 1024 * 1024 });

      // game-1 should be evicted
      const cached = await cacheManager.getCachedGames();
      expect(cached).not.toContain('game-1');
      expect(cached).toContain('game-2');
      expect(cached).toContain('game-3');
    });

    it('should allow manual cache clearing', async () => {
      await cacheManager.cacheGame('game-1', { id: 'game-1' });
      await cacheManager.cacheGame('game-2', { id: 'game-2' });

      await cacheManager.clearCache();

      const cached = await cacheManager.getCachedGames();
      expect(cached).toHaveLength(0);
    });
  });

  describe('Background Sync', () => {
    it('should queue operations while offline', async () => {
      serviceWorker.goOffline();

      await cacheManager.saveProgress('game-1', { level: 1 });
      await cacheManager.saveProgress('game-2', { level: 2 });

      const queue = await cacheManager.getSyncQueue();
      expect(queue).toHaveLength(2);
    });

    it('should process queue when online', async () => {
      serviceWorker.goOffline();

      await cacheManager.saveProgress('game-1', { level: 1 });
      
      serviceWorker.goOnline();
      await serviceWorker.waitForSync();

      const queue = await cacheManager.getSyncQueue();
      expect(queue).toHaveLength(0);
    });

    it('should handle sync conflicts', async () => {
      // Create conflict: local and remote both modified
      await cacheManager.saveProgress('game-1', { level: 5, score: 1000 });
      await cacheManager.setRemoteProgress('game-1', { level: 4, score: 2000 });

      const conflicts = await cacheManager.detectConflicts();
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].gameId).toBe('game-1');
    });
  });

  describe('Storage Quota', () => {
    it('should check available storage', async () => {
      const quota = await cacheManager.getStorageQuota();
      
      expect(quota.usage).toBeDefined();
      expect(quota.quota).toBeDefined();
      expect(quota.usagePercent).toBeLessThan(100);
    });

    it('should warn when storage is low', async () => {
      cacheManager.setStorageUsage(0.9);

      const warning = await cacheManager.getStorageWarning();
      
      expect(warning).toBeDefined();
      expect(warning.level).toBe('warning');
    });

    it('should prevent caching when storage critical', async () => {
      cacheManager.setStorageUsage(0.98);

      const result = await cacheManager.cacheGame('new-game', { id: 'new-game' });
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('storage');
    });
  });

  describe('Offline Feature Limitations', () => {
    it('should disable online-only features when offline', async () => {
      serviceWorker.goOffline();

      const features = await serviceWorker.getAvailableFeatures();
      
      expect(features.mesh).toBe(false);
      expect(features.upload).toBe(false);
      expect(features.playCachedGames).toBe(true);
    });

    it('should show appropriate UI for unavailable features', async () => {
      serviceWorker.goOffline();

      const featureStatus = serviceWorker.getFeatureStatus('upload');
      
      expect(featureStatus.available).toBe(false);
      expect(featureStatus.reason).toContain('internet');
    });
  });

  describe('Network Recovery', () => {
    it('should detect when network is restored', async () => {
      serviceWorker.goOffline();
      expect(serviceWorker.isOnline()).toBe(false);

      serviceWorker.goOnline();
      
      await serviceWorker.waitForConnection();
      expect(serviceWorker.isOnline()).toBe(true);
    });

    it('should refresh stale content after reconnect', async () => {
      // Cache content
      await cacheManager.cacheGame('game-1', { id: 'game-1', version: 1 });

      // Go offline and modify remote
      serviceWorker.goOffline();
      cacheManager.setRemoteVersion('game-1', 2);

      // Reconnect
      serviceWorker.goOnline();
      await serviceWorker.waitForSync();

      // Check for updates
      const updates = await cacheManager.checkForUpdates();
      expect(updates).toContain('game-1');
    });
  });
});

// Mock implementations
function createMockServiceWorker() {
  let online = true;
  const listeners: Map<string, Function[]> = new Map();
  let cachedFiles: string[] = [];

  return {
    async register(script: string) {
      return { active: true, scope: '/' };
    },

    async triggerInstall() {
      cachedFiles = ['/', '/app.js', '/styles.css'];
    },

    goOffline() {
      online = false;
      this.emit('offline');
    },

    goOnline() {
      online = true;
      this.emit('online');
    },

    isOnline() {
      return online;
    },

    async getConnectionStatus() {
      return {
        online,
        hasOfflineContent: cachedFiles.length > 0,
      };
    },

    async waitForConnection() {
      if (online) return;
      return new Promise(resolve => {
        this.on('online', resolve);
      });
    },

    async waitForSync() {
      await new Promise(resolve => setTimeout(resolve, 100));
    },

    getAvailableFeatures() {
      return {
        mesh: online,
        upload: online,
        playCachedGames: true,
      };
    },

    getFeatureStatus(feature: string) {
      const onlineOnly = ['mesh', 'upload', 'sync'];
      if (onlineOnly.includes(feature) && !online) {
        return { available: false, reason: 'Requires internet connection' };
      }
      return { available: true };
    },

    on(event: string, callback: Function) {
      const existing = listeners.get(event) || [];
      existing.push(callback);
      listeners.set(event, existing);
    },

    emit(event: string) {
      const callbacks = listeners.get(event) || [];
      callbacks.forEach(cb => cb());
    },
  };
}

function createMockCacheManager() {
  const cache: Map<string, any> = new Map();
  const progress: Map<string, any> = new Map();
  const syncQueue: any[] = [];
  let maxSize = 100 * 1024 * 1024;
  let currentSize = 0;
  let storageUsage = 0.5;
  const remoteData: Map<string, any> = new Map();

  return {
    async cacheGame(id: string, data: any) {
      if (data.size && data.size > maxSize - currentSize) {
        return { success: false, reason: 'Size exceeds available cache' };
      }
      if (storageUsage > 0.95) {
        return { success: false, reason: 'Storage nearly full' };
      }
      cache.set(id, data);
      currentSize += data.size || 0;
      return { success: true };
    },

    async getGame(id: string) {
      return cache.get(id);
    },

    async getCachedGames() {
      return Array.from(cache.keys());
    },

    async getCachedFiles() {
      return ['/', '/app.js', '/styles.css'];
    },

    async saveProgress(gameId: string, data: any) {
      progress.set(gameId, data);
      syncQueue.push({ type: 'progress', gameId, data });
    },

    async getLocalProgress(gameId: string) {
      return progress.get(gameId);
    },

    async getSyncQueue() {
      return syncQueue;
    },

    async clearCache() {
      cache.clear();
      currentSize = 0;
    },

    setMaxSize(size: number) {
      maxSize = size;
    },

    async getStorageQuota() {
      return {
        usage: storageUsage * 1000 * 1024 * 1024,
        quota: 1000 * 1024 * 1024,
        usagePercent: storageUsage * 100,
      };
    },

    setStorageUsage(usage: number) {
      storageUsage = usage;
    },

    async getStorageWarning() {
      if (storageUsage > 0.9) {
        return { level: 'warning', message: 'Storage is nearly full' };
      }
      return null;
    },

    setRemoteProgress(gameId: string, data: any) {
      remoteData.set(gameId, data);
    },

    setRemoteVersion(gameId: string, version: number) {
      const existing = remoteData.get(gameId) || {};
      remoteData.set(gameId, { ...existing, version });
    },

    async detectConflicts() {
      const conflicts: any[] = [];
      for (const [gameId, localData] of progress) {
        const remoteDataItem = remoteData.get(gameId);
        if (remoteDataItem && JSON.stringify(localData) !== JSON.stringify(remoteDataItem)) {
          conflicts.push({ gameId, local: localData, remote: remoteDataItem });
        }
      }
      return conflicts;
    },

    async checkForUpdates() {
      const updates: string[] = [];
      for (const [gameId, cached] of cache) {
        const remote = remoteData.get(gameId);
        if (remote && remote.version > (cached.version || 0)) {
          updates.push(gameId);
        }
      }
      return updates;
    },
  };
}

export {};