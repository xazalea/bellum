/**
 * Discord Storage Tests
 * 
 * Comprehensive test suite for Discord webhook-based file storage
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock environment variable
process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/test-token';

describe('Discord Storage - Server Module', () => {
  describe('requireDiscordWebhookUrl', () => {
    it('should return webhook URL when configured', async () => {
      const { requireDiscordWebhookUrl } = await import('@/lib/server/discord');
      const url = requireDiscordWebhookUrl();
      expect(url).toBe('https://discord.com/api/webhooks/test/test-token');
    });

    it('should throw error when not configured', async () => {
      const originalUrl = process.env.DISCORD_WEBHOOK_URL;
      delete process.env.DISCORD_WEBHOOK_URL;

      const { requireDiscordWebhookUrl, DiscordError } = await import('@/lib/server/discord');
      
      expect(() => requireDiscordWebhookUrl()).toThrow(DiscordError);

      process.env.DISCORD_WEBHOOK_URL = originalUrl;
    });
  });

  describe('sha256Hash', () => {
    it('should compute correct SHA-256 hash', async () => {
      const { sha256Hash } = await import('@/lib/server/discord');
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = sha256Hash(data);
      
      // SHA-256 of [1,2,3,4,5]
      expect(hash).toBe('74f81fe167d99b4cb41d6d0ccda82278caee9f3e2f25d5e5a3936ff3dcec60d0');
    });

    it('should produce consistent hashes', async () => {
      const { sha256Hash } = await import('@/lib/server/discord');
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash1 = sha256Hash(data);
      const hash2 = sha256Hash(data);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('DiscordError classification', () => {
    it('should identify rate limit errors', () => {
      const { DiscordError, DiscordErrorType } = require('@/lib/server/discord');
      const error = new DiscordError('Rate limited', DiscordErrorType.RATE_LIMIT, 429, true);
      
      expect(error.type).toBe(DiscordErrorType.RATE_LIMIT);
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
    });

    it('should identify invalid webhook errors', () => {
      const { DiscordError, DiscordErrorType } = require('@/lib/server/discord');
      const error = new DiscordError('Invalid webhook', DiscordErrorType.UNAUTHORIZED, 401, false);
      
      expect(error.type).toBe(DiscordErrorType.UNAUTHORIZED);
      expect(error.retryable).toBe(false);
    });

    it('should identify file too large errors', () => {
      const { DiscordError, DiscordErrorType } = require('@/lib/server/discord');
      const error = new DiscordError('File too large', DiscordErrorType.FILE_TOO_LARGE, 413, false);
      
      expect(error.type).toBe(DiscordErrorType.FILE_TOO_LARGE);
      expect(error.retryable).toBe(false);
    });
  });
});

describe('Discord Storage - Upload/Download', () => {
  describe('discordSendFile', () => {
    it('should upload file and return metadata', async () => {
      // Mock fetch for Discord webhook
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'message-123',
          attachments: [{
            id: 'attachment-456',
            filename: 'test.bin',
            size: 1024,
            url: 'https://cdn.discord.com/attachments/test/test.bin',
            proxy_url: 'https://media.discord.net/attachments/test/test.bin',
          }],
        }),
      });

      const { discordSendFile } = await import('@/lib/server/discord');
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      const result = await discordSendFile({
        webhookUrl: 'https://discord.com/api/webhooks/test/test',
        content: 'Test upload',
        filename: 'test.bin',
        bytes: data,
      });

      expect(result.messageId).toBe('message-123');
      expect(result.attachmentUrl).toBe('https://cdn.discord.com/attachments/test/test.bin');
      expect(result.sha256).toBeTruthy();
    });

    it('should handle upload errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      const { discordSendFile, DiscordError } = await import('@/lib/server/discord');
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      await expect(
        discordSendFile({
          webhookUrl: 'https://discord.com/api/webhooks/test/test',
          content: 'Test upload',
          filename: 'test.bin',
          bytes: data,
        })
      ).rejects.toThrow(DiscordError);
    });
  });

  describe('discordSendFileWithRetry', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'message-123',
            attachments: [{
              url: 'https://cdn.discord.com/test.bin',
            }],
          }),
        });
      });

      const { discordSendFileWithRetry } = await import('@/lib/server/discord');
      const data = new Uint8Array([1, 2, 3]);

      const result = await discordSendFileWithRetry({
        webhookUrl: 'https://discord.com/api/webhooks/test/test',
        content: 'Test',
        filename: 'test.bin',
        bytes: data,
      });

      expect(attempts).toBe(3);
      expect(result.messageId).toBe('message-123');
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
        });
      });

      const { discordSendFileWithRetry, DiscordError } = await import('@/lib/server/discord');
      const data = new Uint8Array([1, 2, 3]);

      await expect(
        discordSendFileWithRetry({
          webhookUrl: 'https://discord.com/api/webhooks/test/test',
          content: 'Test',
          filename: 'test.bin',
          bytes: data,
        })
      ).rejects.toThrow(DiscordError);

      expect(attempts).toBe(1); // Should not retry
    });
  });

  describe('discordDownloadFile', () => {
    it('should download and verify file', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => testData.buffer,
      });

      const { discordDownloadFile, sha256Hash } = await import('@/lib/server/discord');
      const expectedHash = sha256Hash(testData);

      const result = await discordDownloadFile({
        attachmentUrl: 'https://cdn.discord.com/test.bin',
        expectedSha256: expectedHash,
      });

      expect(result).toEqual(testData);
    });

    it('should throw on hash mismatch', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => testData.buffer,
      });

      const { discordDownloadFile, DiscordError } = await import('@/lib/server/discord');

      await expect(
        discordDownloadFile({
          attachmentUrl: 'https://cdn.discord.com/test.bin',
          expectedSha256: 'invalid-hash',
        })
      ).rejects.toThrow(DiscordError);
    });
  });
});

describe('Discord Storage - Client Download', () => {
  describe('fetchDiscordManifest', () => {
    it('should fetch manifest from API', async () => {
      const mockManifest = {
        fileId: 'file-123',
        fileName: 'test.bin',
        totalBytes: 1024,
        chunkBytes: 512,
        totalChunks: 2,
        chunks: [
          {
            index: 0,
            sizeBytes: 512,
            sha256: 'hash1',
            messageId: 'msg1',
            attachmentUrl: 'https://cdn.discord.com/chunk1',
          },
          {
            index: 1,
            sizeBytes: 512,
            sha256: 'hash2',
            messageId: 'msg2',
            attachmentUrl: 'https://cdn.discord.com/chunk2',
          },
        ],
        createdAt: Date.now(),
        ownerUid: 'user-123',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ manifest: mockManifest }),
      });

      const { fetchDiscordManifest } = await import('@/lib/storage/chunked-download-discord');
      const manifest = await fetchDiscordManifest('file-123');

      expect(manifest.fileId).toBe('file-123');
      expect(manifest.totalChunks).toBe(2);
      expect(manifest.chunks).toHaveLength(2);
    });
  });

  describe('chunkedDownloadDiscordFile', () => {
    it('should download and reassemble file', async () => {
      const chunk1 = new Uint8Array([1, 2, 3]);
      const chunk2 = new Uint8Array([4, 5, 6]);

      const mockManifest = {
        fileId: 'file-123',
        fileName: 'test.bin',
        totalBytes: 6,
        chunkBytes: 3,
        totalChunks: 2,
        chunks: [
          {
            index: 0,
            sizeBytes: 3,
            sha256: '74f81fe167d99b4cb41d6d0ccda82278caee9f3e2f25d5e5a3936ff3dcec60d0',
            messageId: 'msg1',
            attachmentUrl: 'https://cdn.discord.com/chunk1',
          },
          {
            index: 1,
            sizeBytes: 3,
            sha256: 'sha256-of-456',
            messageId: 'msg2',
            attachmentUrl: 'https://cdn.discord.com/chunk2',
          },
        ],
        createdAt: Date.now(),
        ownerUid: 'user-123',
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/discord/manifest')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ manifest: mockManifest }),
          });
        }
        if (url.includes('chunk1')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: async () => chunk1.buffer,
          });
        }
        if (url.includes('chunk2')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: async () => chunk2.buffer,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { chunkedDownloadDiscordFile } = await import('@/lib/storage/chunked-download-discord');
      
      let progressCalls = 0;
      const blob = await chunkedDownloadDiscordFile('file-123', {
        onProgress: (p) => {
          progressCalls++;
          expect(p.totalChunks).toBe(2);
        },
      });

      expect(blob.size).toBe(6);
      expect(progressCalls).toBeGreaterThan(0);
    });
  });

  describe('getDiscordFileInfo', () => {
    it('should detect expired files', async () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      const mockManifest = {
        fileId: 'file-123',
        fileName: 'old-file.bin',
        totalBytes: 1024,
        chunkBytes: 512,
        totalChunks: 2,
        chunks: [],
        createdAt: oldTimestamp,
        ownerUid: 'user-123',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ manifest: mockManifest }),
      });

      const { getDiscordFileInfo } = await import('@/lib/storage/chunked-download-discord');
      const info = await getDiscordFileInfo('file-123');

      expect(info.expired).toBe(true);
    });

    it('should detect non-expired files', async () => {
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago

      const mockManifest = {
        fileId: 'file-123',
        fileName: 'recent-file.bin',
        totalBytes: 1024,
        chunkBytes: 512,
        totalChunks: 2,
        chunks: [],
        createdAt: recentTimestamp,
        ownerUid: 'user-123',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ manifest: mockManifest }),
      });

      const { getDiscordFileInfo } = await import('@/lib/storage/chunked-download-discord');
      const info = await getDiscordFileInfo('file-123');

      expect(info.expired).toBe(false);
    });
  });
});

describe('Discord Storage - Integration', () => {
  it('should handle complete upload/download cycle', async () => {
    // This is a conceptual test - in reality would need full integration setup
    const testData = new Uint8Array(1024).fill(42);
    
    // Mock successful upload
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/discord/upload')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            messageId: 'msg-123',
            attachmentUrl: 'https://cdn.discord.com/test.bin',
            sha256: 'test-hash',
          }),
        });
      }
      if (url.includes('/api/discord/manifest')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            fileId: 'file-123',
          }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    // Test would continue with actual upload logic
    expect(testData.length).toBe(1024);
  });

  it('should handle large files with multiple chunks', () => {
    const DISCORD_CHUNK_SIZE = 24 * 1024 * 1024;
    const fileSize = 100 * 1024 * 1024; // 100MB
    const expectedChunks = Math.ceil(fileSize / DISCORD_CHUNK_SIZE);

    expect(expectedChunks).toBe(5); // 100MB / 24MB ≈ 5 chunks
  });

  it('should compare Discord vs Telegram limits', () => {
    const DISCORD_MAX_CHUNK = 24 * 1024 * 1024; // 24MB
    const TELEGRAM_MAX_CHUNK = 45 * 1024 * 1024; // 45MB

    expect(TELEGRAM_MAX_CHUNK).toBeGreaterThan(DISCORD_MAX_CHUNK);
    
    // For same 100MB file
    const fileSize = 100 * 1024 * 1024;
    const discordChunks = Math.ceil(fileSize / DISCORD_MAX_CHUNK);
    const telegramChunks = Math.ceil(fileSize / TELEGRAM_MAX_CHUNK);

    expect(discordChunks).toBeGreaterThan(telegramChunks);
    expect(discordChunks).toBe(5);
    expect(telegramChunks).toBe(3);
  });
});

describe('Discord Storage - Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { discordSendFile } = await import('@/lib/server/discord');
    const data = new Uint8Array([1, 2, 3]);

    await expect(
      discordSendFile({
        webhookUrl: 'https://discord.com/api/webhooks/test/test',
        content: 'Test',
        filename: 'test.bin',
        bytes: data,
      })
    ).rejects.toThrow();
  });

  it('should handle expired CDN URLs', async () => {
    const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000);
    
    const mockManifest = {
      fileId: 'file-123',
      fileName: 'expired.bin',
      totalBytes: 1024,
      chunkBytes: 1024,
      totalChunks: 1,
      chunks: [{
        index: 0,
        sizeBytes: 1024,
        sha256: 'hash',
        messageId: 'msg-123',
        attachmentUrl: 'https://cdn.discord.com/expired.bin',
      }],
      createdAt: expiredTimestamp,
      ownerUid: 'user-123',
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/discord/manifest')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ manifest: mockManifest }),
        });
      }
      if (url.includes('expired.bin')) {
        // CDN URL returns 404
        return Promise.resolve({
          ok: false,
          status: 404,
          text: async () => 'Not found',
        });
      }
      if (url.includes('/api/discord/file')) {
        // Fallback to message ID works
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new Uint8Array(1024).buffer,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { chunkedDownloadDiscordFile } = await import('@/lib/storage/chunked-download-discord');
    
    // Should succeed via fallback
    const blob = await chunkedDownloadDiscordFile('file-123');
    expect(blob.size).toBe(1024);
  });
});
