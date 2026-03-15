/**
 * Application Constants
 * Hardcoded configuration for webhooks, bots, and API endpoints
 * These can be overridden via environment variables
 */

// ============================================================
// AI PROVIDER CONFIGURATION
// ============================================================

/**
 * GLM Free API - https://github.com/LLM-Red-Team/glm-free-api
 * Supports: GLM-4-Plus, GLM-4-Zero, GLM-4-Think
 * Get refresh_token from chatglm.cn cookies
 */
export const GLM_FREE_API = {
  // Public demo instances (may have rate limits)
  baseUrl: process.env.NEXT_PUBLIC_GLM_API_URL || 'https://glm-free-api.vercel.app',
  apiKey: process.env.NEXT_PUBLIC_GLM_API_KEY || '',
  models: ['glm-4-plus', 'glm-4-zero', 'glm-4-think', 'glm-4'],
  description: 'GLM-4 with streaming, multi-turn, image analysis, web search',
};

/**
 * Free-One-API - https://github.com/RockChinQ/free-one-api
 * Multi-provider gateway with automatic load balancing
 * Supports: GPT-4, Claude, Gemini, DeepSeek, and more
 */
export const FREE_ONE_API = {
  baseUrl: process.env.NEXT_PUBLIC_FREE_ONE_API_URL || 'https://free-one-api.vercel.app',
  apiKey: process.env.NEXT_PUBLIC_FREE_ONE_API_KEY || '',
  models: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro', 'deepseek-chat'],
  description: 'Multi-provider gateway with load balancing',
};

/**
 * WebAI-to-API - https://github.com/Amm1rr/WebAI-to-API
 * Gemini to API (no API key needed)
 * Supports: Gemini 2.5 Flash, Gemini 2.5 Pro, ChatGPT, Claude, DeepSeek
 */
export const WEB_AI_API = {
  baseUrl: process.env.NEXT_PUBLIC_WEBAI_API_URL || 'https://webai-to-api.vercel.app',
  apiKey: process.env.NEXT_PUBLIC_WEBAI_API_KEY || '',
  models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.0-pro', 'gpt-4o', 'claude-3.5-sonnet'],
  description: 'Gemini and more without API key',
};

// ============================================================
// CLOUD STORAGE CONFIGURATION
// ============================================================

/**
 * Discord Webhook Storage
 * Used for file uploads via Discord webhooks (25MB per file limit)
 * Create a webhook in your Discord server channel settings
 */
export const DISCORD_WEBHOOK = {
  // Primary webhook URL for file storage
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  // Backup webhook URLs for redundancy
  backupWebhookUrls: (process.env.DISCORD_BACKUP_WEBHOOKS || '').split(',').filter(Boolean),
  // Max file size (Discord limit is 25MB, we use 24MB for safety)
  maxFileSize: 24 * 1024 * 1024,
};

/**
 * Telegram Bot Storage
 * Used for file uploads via Telegram Bot API (50MB per file limit)
 * Create a bot via @BotFather and get the bot token
 * Get your chat ID by messaging @userinfobot
 */
export const TELEGRAM_BOT = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
  // Max file size for bots (50MB)
  maxFileSize: 50 * 1024 * 1024,
  apiBase: 'https://api.telegram.org/bot',
};

// ============================================================
// CDN CONFIGURATION (jsDelivr)
// ============================================================

/**
 * jsDelivr CDN Configuration
 * Free CDN for GitHub repos and npm packages
 * Format: https://cdn.jsdelivr.net/gh/user/repo@version/path
 */
export const JSDELIVR_CDN = {
  baseUrl: 'https://cdn.jsdelivr.net',
  // GitHub raw content via jsDelivr
  github: (repo: string, path: string, version: string = 'main') => 
    `https://cdn.jsdelivr.net/gh/${repo}@${version}/${path}`,
  // npm packages via jsDelivr
  npm: (pkg: string, path: string, version: string = 'latest') => 
    `https://cdn.jsdelivr.net/npm/${pkg}@${version}/${path}`,
  // Game assets CDN
  gamesUrl: process.env.CDN_GAMES_URL || 'https://cdn.jsdelivr.net/gh/xazalea/bellum/games',
  thumbnailsUrl: process.env.CDN_THUMBNAILS_URL || 'https://cdn.jsdelivr.net/gh/xazalea/bellum/thumbnails',
  emulatorsUrl: process.env.CDN_EMULATORS_URL || 'https://cdn.jsdelivr.net/gh/xazalea/bellum/emulators',
};

// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

/**
 * Firebase Project Configuration
 * Project: challengeroooo
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBjrbAulLgYH8gCQO2GwPES3jk7sVmjQ3g",
  authDomain: "challengeroooo.firebaseapp.com",
  projectId: "challengeroooo",
  storageBucket: "challengeroooo.firebasestorage.app",
  messagingSenderId: "704146905294",
  appId: "1:704146905294:web:b00f9b142ef90efc5b589f",
  measurementId: "G-0JH56QWXR3"
};

// ============================================================
// GAMES CONFIGURATION
// ============================================================

/**
 * Games Library Configuration
 */
export const GAMES_CONFIG = {
  // Games data source (JSON or XML sitemap format)
  gamesJsonUrl: process.env.GAMES_XML_URL || '/games.json',
  // Games per page
  batchSize: parseInt(process.env.GAMES_BATCH_SIZE || '50'),
  // Supported platforms
  platforms: ['html5', 'flash', 'nes', 'snes', 'gba', 'n64', 'ps1'],
};

// ============================================================
// FEATURE FLAGS
// ============================================================

export const FEATURES = {
  enableCloudStreaming: process.env.ENABLE_CLOUD_STREAMING !== 'false',
  enableSocialFeatures: process.env.ENABLE_SOCIAL_FEATURES !== 'false',
  enableAchievements: process.env.ENABLE_ACHIEVEMENTS !== 'false',
  enableVoiceChat: process.env.ENABLE_VOICE_CHAT !== 'false',
  enableFreeAI: true, // Always enabled
  enableCloudStorage: true, // Always enabled
};

// ============================================================
// RATE LIMITING
// ============================================================

export const RATE_LIMITS = {
  ai: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  storage: {
    maxUploads: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  games: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
  },
};

// Export all constants as a single object
export const APP_CONFIG = {
  ai: {
    glm: GLM_FREE_API,
    freeOne: FREE_ONE_API,
    webai: WEB_AI_API,
  },
  storage: {
    discord: DISCORD_WEBHOOK,
    telegram: TELEGRAM_BOT,
  },
  cdn: JSDELIVR_CDN,
  firebase: FIREBASE_CONFIG,
  games: GAMES_CONFIG,
  features: FEATURES,
  rateLimits: RATE_LIMITS,
};

export default APP_CONFIG;