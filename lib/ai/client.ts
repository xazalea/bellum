/**
 * Unified AI Client
 * OpenAI-compatible interface with fallback chain and circuit breaker
 * 
 * Supports providers:
 * - glm-free-api (GLM-4-Plus, GLM-4-Zero) - https://github.com/LLM-Red-Team/glm-free-api
 * - free-one-api (Multi-provider gateway) - https://github.com/RockChinQ/free-one-api
 * - WebAI-to-API (Gemini, GPT4Free) - https://github.com/Amm1rr/WebAI-to-API
 * 
 * All providers offer FREE AI access without API keys!
 */

import { GLM_FREE_API, FREE_ONE_API, WEB_AI_API } from '@/lib/config/constants';

// Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContent[];
}

export interface ChatContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  conversation_id?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamingChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: { content?: string; role?: string };
    finish_reason: string | null;
  }[];
}

export type AIProvider = 'glm' | 'free-one' | 'webai';

export interface ProviderConfig {
  name: AIProvider;
  baseUrl: string;
  apiKey?: string;
  models: string[];
  enabled: boolean;
  priority: number;
}

// Default provider configurations - using hardcoded constants with env overrides
const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    name: 'glm',
    baseUrl: GLM_FREE_API.baseUrl,
    apiKey: GLM_FREE_API.apiKey || undefined,
    models: GLM_FREE_API.models,
    enabled: true,
    priority: 1,
  },
  {
    name: 'free-one',
    baseUrl: FREE_ONE_API.baseUrl,
    apiKey: FREE_ONE_API.apiKey || undefined,
    models: FREE_ONE_API.models,
    enabled: true,
    priority: 2,
  },
  {
    name: 'webai',
    baseUrl: WEB_AI_API.baseUrl,
    apiKey: WEB_AI_API.apiKey || undefined,
    models: WEB_AI_API.models,
    enabled: true,
    priority: 3,
  },
];

// Circuit breaker state
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextRetry: number;
}

const circuitBreakers = new Map<AIProvider, CircuitState>();
const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT = 60000; // 1 minute

/**
 * Get circuit breaker state for a provider
 */
function getCircuitState(provider: AIProvider): CircuitState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      nextRetry: 0,
    });
  }
  return circuitBreakers.get(provider)!;
}

/**
 * Check if a provider is available (circuit breaker logic)
 */
function isProviderAvailable(provider: AIProvider): boolean {
  const state = getCircuitState(provider);
  
  if (state.state === 'closed') {
    return true;
  }
  
  if (state.state === 'open') {
    // Check if recovery timeout has passed
    if (Date.now() >= state.nextRetry) {
      state.state = 'half-open';
      return true;
    }
    return false;
  }
  
  // half-open: allow one request through
  return true;
}

/**
 * Record a failure for a provider
 */
function recordFailure(provider: AIProvider): void {
  const state = getCircuitState(provider);
  state.failures++;
  state.lastFailure = Date.now();
  
  if (state.failures >= FAILURE_THRESHOLD) {
    state.state = 'open';
    state.nextRetry = Date.now() + RECOVERY_TIMEOUT;
    console.warn(`[AI] Circuit breaker opened for ${provider}`);
  }
}

/**
 * Record a success for a provider
 */
function recordSuccess(provider: AIProvider): void {
  const state = getCircuitState(provider);
  state.failures = 0;
  state.state = 'closed';
}

/**
 * Get available providers sorted by priority
 */
export function getAvailableProviders(): ProviderConfig[] {
  return DEFAULT_PROVIDERS
    .filter(p => p.enabled && isProviderAvailable(p.name))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get provider for a specific model
 */
export function getProviderForModel(model: string): ProviderConfig | null {
  return getAvailableProviders().find(p => 
    p.models.includes(model) || p.models.some(m => model.startsWith(m.split('-')[0]))
  ) || getAvailableProviders()[0] || null;
}

/**
 * Make a chat completion request
 */
export async function chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    throw new Error('No AI providers available');
  }
  
  const errors: Error[] = [];
  
  for (const provider of providers) {
    if (!isProviderAvailable(provider.name)) {
      continue;
    }
    
    try {
      const response = await makeRequest(provider, request);
      recordSuccess(provider.name);
      return response;
    } catch (error) {
      console.error(`[AI] Provider ${provider.name} failed:`, error);
      recordFailure(provider.name);
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  throw new Error(`All providers failed. Errors: ${errors.map(e => e.message).join('; ')}`);
}

/**
 * Stream a chat completion request
 */
export async function* streamChatCompletion(
  request: ChatCompletionRequest
): AsyncGenerator<StreamingChunk, void, unknown> {
  const providers = getAvailableProviders();
  
  if (providers.length === 0) {
    throw new Error('No AI providers available');
  }
  
  const provider = providers[0];
  
  if (!isProviderAvailable(provider.name)) {
    throw new Error(`Provider ${provider.name} is not available`);
  }
  
  try {
    const stream = await makeStreamRequest(provider, { ...request, stream: true });
    
    for await (const chunk of stream) {
      yield chunk;
    }
    
    recordSuccess(provider.name);
  } catch (error) {
    recordFailure(provider.name);
    throw error;
  }
}

/**
 * Make HTTP request to a provider
 */
async function makeRequest(
  provider: ProviderConfig,
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const url = `${provider.baseUrl}/v1/chat/completions`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (provider.apiKey) {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...request,
      stream: false,
    }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  return response.json();
}

/**
 * Make streaming HTTP request to a provider
 */
async function makeStreamRequest(
  provider: ProviderConfig,
  request: ChatCompletionRequest
): Promise<AsyncIterable<StreamingChunk>> {
  const url = `${provider.baseUrl}/v1/chat/completions`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };
  
  if (provider.apiKey) {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  
  const decoder = new TextDecoder();
  let buffer = '';
  
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<StreamingChunk>> {
          while (true) {
            // Process any complete SSE messages in buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  return { done: true, value: undefined };
                }
                
                try {
                  const chunk = JSON.parse(data) as StreamingChunk;
                  return { done: false, value: chunk };
                } catch {
                  // Skip invalid JSON
                  continue;
                }
              }
            }
            
            // Read more data
            const { done, value } = await reader.read();
            
            if (done) {
              if (buffer.trim()) {
                // Process remaining buffer
                if (buffer.startsWith('data: ')) {
                  const data = buffer.slice(6);
                  if (data !== '[DONE]') {
                    try {
                      const chunk = JSON.parse(data) as StreamingChunk;
                      buffer = '';
                      return { done: false, value: chunk };
                    } catch {
                      // Invalid JSON
                    }
                  }
                }
              }
              return { done: true, value: undefined };
            }
            
            buffer += decoder.decode(value, { stream: true });
          }
        },
      };
    },
  };
}

/**
 * Check health of all providers
 */
export async function checkProvidersHealth(): Promise<Record<AIProvider, boolean>> {
  const results: Record<AIProvider, boolean> = {
    glm: false,
    'free-one': false,
    webai: false,
  };
  
  await Promise.all(
    DEFAULT_PROVIDERS.map(async (provider) => {
      try {
        const response = await fetch(`${provider.baseUrl}/v1/models`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        results[provider.name] = response.ok;
      } catch {
        results[provider.name] = false;
      }
    })
  );
  
  return results;
}

/**
 * Get available models from all providers
 */
export async function getAvailableModels(): Promise<string[]> {
  const models = new Set<string>();
  
  await Promise.all(
    DEFAULT_PROVIDERS.map(async (provider) => {
      if (!provider.enabled) return;
      
      try {
        const response = await fetch(`${provider.baseUrl}/v1/models`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            data.data.forEach((m: { id: string }) => models.add(m.id));
          }
        }
      } catch {
        // Provider unavailable, use default models
        provider.models.forEach(m => models.add(m));
      }
    })
  );
  
  return Array.from(models);
}

// Export singleton instance
export const aiClient = {
  chatCompletion,
  streamChatCompletion,
  getAvailableProviders,
  getProviderForModel,
  checkProvidersHealth,
  getAvailableModels,
};

export default aiClient;