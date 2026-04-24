/**
 * Edge-compatible AI wrapper
 * 
 * This module provides a lightweight, edge-compatible interface for AI chat.
 * It uses native fetch and Web Streams instead of heavy Node.js packages.
 * 
 * For Cloudflare Pages deployment, this replaces the gpt4free dependency.
 */

import 'server-only';

export type AIMessage = {
  role: string;
  content: string;
};

export type ChatCompletionOptions = {
  prompt?: string | AIMessage[];
  messages?: AIMessage[];
  site?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
};

// Model types supported by this edge-compatible implementation
export const EdgeModelType = {
  GPT3p5Turbo: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
  GPT4Turbo: 'gpt-4-turbo-preview',
  GPT4o: 'gpt-4o',
  GPT4oMini: 'gpt-4o-mini',
  Claude3Sonnet: 'claude-3-sonnet-20240229',
  Claude3Opus: 'claude-3-opus-20240229',
  Claude3Haiku: 'claude-3-haiku-20240307',
  GeminiPro: 'gemini-pro',
  Gemini1p5Flash: 'gemini-1.5-flash',
} as const;

// Site types (for compatibility with existing code)
export const EdgeSite = {
  Auto: 'auto',
  OpenAI: 'openai',
  Google: 'google',
  Gemini: 'gemini',
  Anthropic: 'anthropic',
} as const;

type EdgeSiteType = typeof EdgeSite[keyof typeof EdgeSite];
type EdgeModelTypeValue = typeof EdgeModelType[keyof typeof EdgeModelType];

interface ChatResponse {
  content: string;
  role: string;
  site: string;
  model: string;
  error?: string;
}

// Default API keys from environment
const getApiKey = (site?: string): string | undefined => {
  switch (site) {
    case EdgeSite.OpenAI:
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case EdgeSite.Google:
    case 'gemini':
      return process.env.GEMINI_API_KEY;
    case EdgeSite.Anthropic:
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    default:
      return process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  }
};

const getBaseUrl = (site?: string): string => {
  const siteStr = String(site || '').toLowerCase();
  if (siteStr === 'google' || siteStr === 'gemini') {
    return 'https://generativelanguage.googleapis.com';
  }
  if (siteStr === 'anthropic') {
    return 'https://api.anthropic.com';
  }
  return 'https://api.openai.com';
};

function normalizeMessages(input: string | AIMessage[] | unknown): AIMessage[] {
  if (typeof input === 'string') {
    const prompt = input.trim();
    if (!prompt) throw new Error('Missing prompt parameter');
    return [{ role: 'user', content: prompt }];
  }

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('Missing prompt parameter');
  }

  const normalized = input
    .map((m: any) => ({ role: String(m?.role || 'user'), content: String(m?.content || '') }))
    .filter((m) => m.content.trim().length > 0);

  if (!normalized.length) throw new Error('Missing prompt parameter');
  return normalized;
}

function resolveModel(model?: string, site?: string): string {
  if (model) return model;
  
  // Default models per site
  switch (site) {
    case EdgeSite.Google:
    case 'gemini':
      return EdgeModelType.Gemini1p5Flash;
    case EdgeSite.Anthropic:
    case 'anthropic':
      return EdgeModelType.Claude3Haiku;
    default:
      return EdgeModelType.GPT3p5Turbo;
  }
}

function resolveSite(site?: string): EdgeSiteType {
  const validSites = ['auto', 'openai', 'google', 'gemini', 'anthropic'] as const;
  if (!site || site === 'auto') return EdgeSite.OpenAI;
  if (validSites.includes(site as typeof validSites[number])) {
    return site as EdgeSiteType;
  }
  return EdgeSite.OpenAI;
}

/**
 * Simple chat completion using OpenAI-compatible API
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<ChatResponse> {
  const messages = normalizeMessages(options.messages ?? options.prompt ?? '');
  const site = resolveSite(options.site);
  const model = resolveModel(options.model, site);
  const apiKey = options.apiKey || getApiKey(site);
  const baseUrl = options.baseUrl || getBaseUrl(site);

  if (!apiKey) {
    return {
      content: '',
      role: 'assistant',
      site,
      model,
      error: 'No API key configured. Please set OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY environment variable.',
    };
  }

  try {
    // Handle different AI providers
    const siteStr = String(site).toLowerCase();
    if (siteStr === 'google' || siteStr === 'gemini') {
      return await chatWithGemini(messages, model, apiKey, baseUrl);
    }

    if (siteStr === 'anthropic') {
      return await chatWithClaude(messages, model, apiKey);
    }

    // Default: OpenAI-compatible
    return await chatWithOpenAI(messages, model, apiKey, baseUrl);
  } catch (error: any) {
    return {
      content: '',
      role: 'assistant',
      site,
      model,
      error: error?.message || 'Unknown error occurred',
    };
  }
}

async function chatWithOpenAI(
  messages: AIMessage[],
  model: string,
  apiKey: string,
  baseUrl: string
): Promise<ChatResponse> {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string; role?: string } }>;
  };

  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || '',
    role: choice?.message?.role || 'assistant',
    site: EdgeSite.OpenAI,
    model,
  };
}

async function chatWithGemini(
  messages: AIMessage[],
  model: string,
  apiKey: string,
  baseUrl: string
): Promise<ChatResponse> {
  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          topK: 1,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    content: text,
    role: 'model',
    site: EdgeSite.Google,
    model,
  };
}

async function chatWithClaude(
  messages: AIMessage[],
  model: string,
  apiKey: string
): Promise<ChatResponse> {
  // Convert messages to Claude format
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages: conversationMessages,
      system: systemMessage?.content,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json() as {
    content?: Array<{ text?: string }>;
  };

  const text = data.content?.[0]?.text || '';
  return {
    content: text,
    role: 'assistant',
    site: EdgeSite.Anthropic,
    model,
  };
}

/**
 * Get supported models for a given site
 */
export async function getSupports(): Promise<Array<{ site: string; models: string[] }>> {
  const apiKey = getApiKey();
  const supports: Array<{ site: string; models: string[] }> = [];

  // Always include OpenAI models if API key is available
  if (apiKey || process.env.OPENAI_API_KEY) {
    supports.push({
      site: EdgeSite.OpenAI,
      models: [
        EdgeModelType.GPT3p5Turbo,
        EdgeModelType.GPT4oMini,
        EdgeModelType.GPT4o,
        EdgeModelType.GPT4Turbo,
      ],
    });
  }

  // Include Gemini if API key available
  if (process.env.GEMINI_API_KEY) {
    supports.push({
      site: EdgeSite.Google,
      models: [
        EdgeModelType.Gemini1p5Flash,
        EdgeModelType.GeminiPro,
      ],
    });
  }

  // Include Claude if API key available
  if (process.env.ANTHROPIC_API_KEY) {
    supports.push({
      site: EdgeSite.Anthropic,
      models: [
        EdgeModelType.Claude3Haiku,
        EdgeModelType.Claude3Sonnet,
        EdgeModelType.Claude3Opus,
      ],
    });
  }

  return supports;
}

/**
 * Stream chat completion (for streaming endpoints)
 */
export async function* streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<{
  type: 'message' | 'done' | 'error';
  content?: string;
  error?: string;
}> {
  const messages = normalizeMessages(options.messages ?? options.prompt ?? '');
  const site = resolveSite(options.site);
  const model = resolveModel(options.model, site);
  const siteStr = String(site).toLowerCase();
  const apiKey = options.apiKey || getApiKey(siteStr);
  const baseUrl = options.baseUrl || getBaseUrl(siteStr);

  if (!apiKey) {
    yield { type: 'error', error: 'No API key configured' };
    return;
  }

  try {
    // OpenAI-compatible streaming
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{
                delta?: { content?: string };
                finish_reason?: string;
              }>;
            };

            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { type: 'message', content: delta };
            }

            if (parsed.choices?.[0]?.finish_reason === 'stop') {
              yield { type: 'done' };
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    yield { type: 'done' };
  } catch (error: any) {
    yield { type: 'error', error: error?.message || 'Unknown error' };
  }
}