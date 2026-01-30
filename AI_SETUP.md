# AI Chat Setup

This project includes a free AI chat interface powered by gpt4free-ts, providing access to thousands of AI models.

## Features

- 🤖 Access to multiple AI providers (OpenAI, Claude, Gemini, and more)
- 💬 Real-time streaming responses
- 🎨 Beautiful, modern UI matching the existing design system
- 🔄 Model and provider selection
- 📱 Fully responsive design
- 🆓 Completely free to use

## Access

Navigate to `/ai` to access the AI chat interface.

## Optional Environment Variables

Add these to your `.env.local` file if needed:

```bash
# Proxy configuration for AI providers (if needed)
GPT4FREE_HTTP_PROXY=http://your-proxy:port

# RapidAPI key for temp email services (used by some providers like Forefront)
GPT4FREE_RAPID_API_KEY=your_rapidapi_key

# Email type for temporary email services
# Options: temp-email, temp-email44, tempmail-lol
GPT4FREE_EMAIL_TYPE=temp-email44

# Debug mode for AI providers
GPT4FREE_DEBUG=0

# GLM API Configuration (Optional, for GLM provider)
GLM_API_KEY=your_glm_api_key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
```

## API Endpoints

The following API endpoints are available:

### 1. List Supported Models
```
GET /api/ai/supports
```
Returns a list of available providers and their supported models.

### 2. Chat (Non-streaming)
```
POST /api/ai/chat
Body: {
  "prompt": "Your message" | [{ "role": "user", "content": "Your message" }],
  "model": "gpt-3.5-turbo",
  "site": "auto"
}
```

### 3. Chat (Streaming)
```
POST /api/ai/chat/stream
Body: {
  "prompt": "Your message" | [{ "role": "user", "content": "Your message" }],
  "model": "gpt-3.5-turbo",
  "site": "auto"
}
```
Returns Server-Sent Events with streaming responses.

### 4. OpenAI-Compatible Endpoint
```
POST /api/ai/v1/chat/completions
Body: {
  "model": "gpt-3.5-turbo",
  "messages": [{ "role": "user", "content": "Your message" }],
  "stream": false,
  "site": "auto"
}
```
Compatible with OpenAI's API format.

## Available Providers

The system includes support for many providers including:
- Auto (automatically selects best provider)
- FakeOpen
- Phind
- Claude Chat
- Google (Gemini)
- DDG (DuckDuckGo)
- OpenAI
- Groq
- And many more...

## Notes

- Some providers may have rate limits or temporary outages
- The "Auto" provider automatically selects the best available provider
- Different providers support different models
- Some providers may require proxy configuration
- Response times vary by provider

## Troubleshooting

If you encounter issues:

1. **Provider not working**: Try switching to a different provider
2. **Slow responses**: Some providers are slower than others
3. **Connection errors**: Check if you need to configure a proxy
4. **Rate limits**: Try a different provider or wait before retrying

## Development

The AI chat implementation includes:
- `/lib/gpt4free/` - Core gpt4free-ts library
- `/app/api/ai/` - API route handlers
- `/app/ai/page.tsx` - Main chat interface
- `/components/ai/` - Chat UI components

## Dependencies

The following packages were added for AI functionality:
- axios
- cheerio
- form-data
- event-stream
- fake-useragent
- user-agents
- uuid
- dotenv
