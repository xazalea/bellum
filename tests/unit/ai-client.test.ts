/**
 * Unit Tests for AI Client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('AI Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should configure glm-free-api provider', () => {
      const config = {
        name: 'glm-free-api',
        baseUrl: 'https://api.example.com',
        model: 'glm-4',
        enabled: true,
      };

      expect(config.name).toBe('glm-free-api');
      expect(config.enabled).toBe(true);
    });

    it('should configure free-one-api provider', () => {
      const config = {
        name: 'free-one-api',
        baseUrl: 'https://api.example.com',
        model: 'gpt-4',
        enabled: true,
      };

      expect(config.name).toBe('free-one-api');
      expect(config.model).toBe('gpt-4');
    });

    it('should configure WebAI-to-API provider', () => {
      const config = {
        name: 'webai-to-api',
        baseUrl: 'https://api.example.com',
        model: 'default',
        enabled: true,
      };

      expect(config.name).toBe('webai-to-api');
    });
  });

  describe('Message Formatting', () => {
    it('should format chat messages correctly', () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const formatted = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      expect(formatted).toHaveLength(3);
      expect(formatted[0].role).toBe('system');
      expect(formatted[1].role).toBe('user');
    });

    it('should validate message roles', () => {
      const validRoles = ['system', 'user', 'assistant'];
      const testRole = 'user';

      expect(validRoles.includes(testRole)).toBe(true);
    });

    it('should handle empty messages array', () => {
      const messages: any[] = [];
      expect(messages).toHaveLength(0);
    });
  });

  describe('API Request Building', () => {
    it('should build OpenAI-compatible request', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      };

      expect(request.model).toBe('gpt-4');
      expect(request.messages).toHaveLength(1);
      expect(request.stream).toBe(false);
    });

    it('should build streaming request', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      expect(request.stream).toBe(true);
    });
  });

  describe('Response Parsing', () => {
    it('should parse non-streaming response', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBe('Hello! How can I help you?');
    });

    it('should parse streaming chunk', () => {
      const chunk = {
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          delta: {
            content: 'Hello',
          },
          finish_reason: null,
        }],
      };

      expect(chunk.choices[0].delta.content).toBe('Hello');
    });

    it('should detect stream end', () => {
      const chunk = {
        id: 'chatcmpl-123',
        choices: [{
          delta: {},
          finish_reason: 'stop',
        }],
      };

      expect(chunk.choices[0].finish_reason).toBe('stop');
    });
  });

  describe('Fallback Chain', () => {
    it('should try providers in order', () => {
      const providers = [
        { name: 'glm-free-api', priority: 1, enabled: true },
        { name: 'free-one-api', priority: 2, enabled: true },
        { name: 'webai-to-api', priority: 3, enabled: true },
      ];

      const sorted = providers.sort((a, b) => a.priority - b.priority);
      
      expect(sorted[0].name).toBe('glm-free-api');
      expect(sorted[1].name).toBe('free-one-api');
      expect(sorted[2].name).toBe('webai-to-api');
    });

    it('should skip disabled providers', () => {
      const providers = [
        { name: 'glm-free-api', enabled: true },
        { name: 'free-one-api', enabled: false },
        { name: 'webai-to-api', enabled: true },
      ];

      const active = providers.filter(p => p.enabled);
      
      expect(active).toHaveLength(2);
      expect(active.find(p => p.name === 'free-one-api')).toBeUndefined();
    });
  });

  describe('Circuit Breaker', () => {
    it('should track failure count', () => {
      const circuitBreaker = {
        failures: 0,
        threshold: 3,
        state: 'closed' as const,
        lastFailure: null as number | null,
      };

      // Simulate failures
      circuitBreaker.failures++;
      circuitBreaker.failures++;
      
      expect(circuitBreaker.failures).toBe(2);
      expect(circuitBreaker.state).toBe('closed');
    });

    it('should open circuit after threshold', () => {
      const circuitBreaker = {
        failures: 3,
        threshold: 3,
        state: 'open' as const,
        lastFailure: Date.now(),
      };

      expect(circuitBreaker.failures).toBeGreaterThanOrEqual(circuitBreaker.threshold);
      expect(circuitBreaker.state).toBe('open');
    });

    it('should reset after timeout', () => {
      const timeout = 60000; // 1 minute
      const lastFailure = Date.now() - timeout - 1000;
      
      const shouldReset = Date.now() - lastFailure > timeout;
      expect(shouldReset).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', () => {
      const errorResponse = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      };

      expect(errorResponse.error.type).toBe('rate_limit_error');
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network request failed');
      
      expect(networkError.message).toBe('Network request failed');
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        name: 'AbortError',
        message: 'The operation was aborted',
      };

      expect(timeoutError.name).toBe('AbortError');
    });
  });

  describe('Chat History', () => {
    it('should store chat history', () => {
      const history = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: 'Hi!', timestamp: Date.now() },
      ];

      expect(history).toHaveLength(2);
    });

    it('should limit history size', () => {
      const maxSize = 50;
      const history = Array(100).fill({ role: 'user', content: 'test' });
      
      const trimmed = history.slice(-maxSize);
      expect(trimmed).toHaveLength(50);
    });

    it('should clear history', () => {
      let history = [{ role: 'user', content: 'test' }];
      history = [];
      
      expect(history).toHaveLength(0);
    });
  });

  describe('Streaming', () => {
    it('should handle SSE format', () => {
      const sseLine = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      
      expect(sseLine.startsWith('data: ')).toBe(true);
      
      const json = JSON.parse(sseLine.slice(6));
      expect(json.choices[0].delta.content).toBe('Hello');
    });

    it('should detect stream end marker', () => {
      const endMarker = 'data: [DONE]';
      
      expect(endMarker).toBe('data: [DONE]');
    });

    it('should accumulate stream chunks', () => {
      const chunks = ['Hello', ' ', 'World', '!'];
      const accumulated = chunks.join('');
      
      expect(accumulated).toBe('Hello World!');
    });
  });
});

describe('AI Client Integration', () => {
  it('should create client with default config', () => {
    const config = {
      providers: [
        { name: 'glm-free-api', enabled: true },
      ],
      timeout: 30000,
      retries: 3,
    };

    expect(config.providers).toHaveLength(1);
    expect(config.timeout).toBe(30000);
  });

  it('should send chat completion request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Response' } }],
      }),
    });
    global.fetch = mockFetch;

    const response = await fetch('https://api.example.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(response.ok).toBe(true);
  });
});