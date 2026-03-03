/**
 * Telegram Storage Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  telegramSendDocumentWithRetry,
  telegramDownloadFileBytesWithRetry,
  TelegramError,
  TelegramErrorType,
  sha256Hash
} from '../../../server/telegram';

describe('Telegram Storage', () => {
  describe('Hash Functions', () => {
    it('should generate consistent SHA256 hashes', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash1 = sha256Hash(data);
      const hash2 = sha256Hash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 = 64 hex chars
    });

    it('should generate different hashes for different data', () => {
      const data1 = new Uint8Array([1, 2, 3]);
      const data2 = new Uint8Array([4, 5, 6]);
      
      const hash1 = sha256Hash(data1);
      const hash2 = sha256Hash(data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Error Classification', () => {
    it('should classify rate limit errors', () => {
      const error = new TelegramError('Rate limited', TelegramErrorType.RATE_LIMIT, 429, true);
      
      expect(error.type).toBe(TelegramErrorType.RATE_LIMIT);
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(429);
    });

    it('should classify invalid token errors as non-retryable', () => {
      const error = new TelegramError('Invalid token', TelegramErrorType.INVALID_TOKEN, 401, false);
      
      expect(error.type).toBe(TelegramErrorType.INVALID_TOKEN);
      expect(error.retryable).toBe(false);
    });
  });

  // Note: Actual upload/download tests would require mocking or integration testing
  // with real Telegram API credentials
});
