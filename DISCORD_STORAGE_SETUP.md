# Discord Storage Setup Guide

This document explains how to configure Discord webhook-based file storage for Bellum.

## Overview

Discord storage uses Discord webhooks to store files as message attachments in a Discord channel. This provides unlimited free storage alongside the existing Telegram backend.

## Features

- **Unlimited Storage**: Discord webhooks support unlimited file storage
- **Large Files**: Up to 25MB per chunk (24MB used for safety margin)
- **Fast Downloads**: Direct CDN URLs for fast retrieval
- **Redundancy**: Works alongside Telegram as a backup storage option
- **Free**: No cost, no limits

## Setup Instructions

### 1. Create a Discord Server (if you don't have one)

1. Open Discord
2. Click the + button in the server list
3. Choose "Create My Own"
4. Name your server (e.g., "Bellum Storage")

### 2. Create a Webhook

1. Right-click on a text channel in your Discord server
2. Select "Edit Channel"
3. Go to "Integrations" tab
4. Click "Create Webhook" or "New Webhook"
5. Give it a name (e.g., "Bellum File Storage")
6. Copy the Webhook URL

The webhook URL will look like:
```
https://discord.com/api/webhooks/1459752473412501535/QrV1i49fpFoXnjIEWoEH6Hj4lT9sG18DCasnSo2NzxLRdZcZaa0PNh0GDsRaO5_PgN2b
```

### 3. Configure Environment Variable

#### Single Webhook Configuration

For single webhook setup:

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

#### Multiple Webhooks (Load Balancing) - Recommended!

For better performance and reliability, use multiple webhooks (comma-separated):

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1459752473412501535/QrV1i49fpFoXnjIEWoEH6Hj4lT9sG18DCasnSo2NzxLRdZcZaa0PNh0GDsRaO5_PgN2b,https://discord.com/api/webhooks/1459752716174622896/zUGn35BG6MsTnF3zwG43pVacpCrpGxWJK4EuL5PMc7rSbcZN4FQ9DkBnr1EhylJeXsgo,https://discord.com/api/webhooks/1459914606356074586/-ZvYvq0PmDXJmC-4lM7hYh9ntQXMQU-3uqTfdxGK29JV-gMiDh9hQD3j8KSR1fxs96nj,https://discord.com/api/webhooks/1459914873382375582/xDFd7jgRMm9Dg4UOWz6nObabEMBybzUF3abq30Tbbhg4oYGagEdapKr3uYpwSPbdxk97,https://discord.com/api/webhooks/1459914904516694120/7mIF4ZC4kGCg7ooZNpYvxr55uQhXbVAejgcYhJk_B0FvsPTze8wS4Ya6uRsb8oHrWlZq
```

**Benefits of Multiple Webhooks:**
- **Load Balancing**: Distributes uploads across webhooks
- **Higher Rate Limits**: 50 req/min × 5 webhooks = **250 req/min total** 🚀
- **Redundancy**: If one webhook fails, others continue working
- **Better Performance**: Parallel uploads to different channels (~100 MB/s)
- **Extreme Reliability**: 5x redundancy across multiple Discord servers

#### For Local Development

Create a `.env.local` file in the project root (if it doesn't exist) and add:

```bash
# Single webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# OR multiple webhooks (recommended - 5 webhooks for maximum performance)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1459752473412501535/QrV1i49fpFoXnjIEWoEH6Hj4lT9sG18DCasnSo2NzxLRdZcZaa0PNh0GDsRaO5_PgN2b,https://discord.com/api/webhooks/1459752716174622896/zUGn35BG6MsTnF3zwG43pVacpCrpGxWJK4EuL5PMc7rSbcZN4FQ9DkBnr1EhylJeXsgo,https://discord.com/api/webhooks/1459914606356074586/-ZvYvq0PmDXJmC-4lM7hYh9ntQXMQU-3uqTfdxGK29JV-gMiDh9hQD3j8KSR1fxs96nj,https://discord.com/api/webhooks/1459914873382375582/xDFd7jgRMm9Dg4UOWz6nObabEMBybzUF3abq30Tbbhg4oYGagEdapKr3uYpwSPbdxk97,https://discord.com/api/webhooks/1459914904516694120/7mIF4ZC4kGCg7ooZNpYvxr55uQhXbVAejgcYhJk_B0FvsPTze8wS4Ya6uRsb8oHrWlZq
```

#### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add a new variable:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Value**: Your webhook URL(s) - comma-separated for multiple webhooks
   - **Example (single)**: `https://discord.com/api/webhooks/1459752473412501535/QrV1i49fpFoXnjIEWoEH6Hj4lT9sG18DCasnSo2NzxLRdZcZaa0PNh0GDsRaO5_PgN2b`
   - **Example (5 webhooks)**: `https://discord.com/api/webhooks/1459752473412501535/QrV1i49fpFoXnjIEWoEH6Hj4lT9sG18DCasnSo2NzxLRdZcZaa0PNh0GDsRaO5_PgN2b,https://discord.com/api/webhooks/1459752716174622896/zUGn35BG6MsTnF3zwG43pVacpCrpGxWJK4EuL5PMc7rSbcZN4FQ9DkBnr1EhylJeXsgo,https://discord.com/api/webhooks/1459914606356074586/-ZvYvq0PmDXJmC-4lM7hYh9ntQXMQU-3uqTfdxGK29JV-gMiDh9hQD3j8KSR1fxs96nj,https://discord.com/api/webhooks/1459914873382375582/xDFd7jgRMm9Dg4UOWz6nObabEMBybzUF3abq30Tbbhg4oYGagEdapKr3uYpwSPbdxk97,https://discord.com/api/webhooks/1459914904516694120/7mIF4ZC4kGCg7ooZNpYvxr55uQhXbVAejgcYhJk_B0FvsPTze8wS4Ya6uRsb8oHrWlZq`
   - **Environment**: Production, Preview, Development (select all)
5. Click "Save"
6. Redeploy your project for changes to take effect

**Recommended**: Use multiple webhooks for production deployments to get 2x the rate limits and better reliability!

### 4. Verify Configuration

After setting the environment variable, restart your development server or redeploy to Vercel.

To verify Discord storage is working:

1. Check the status endpoint: `GET /api/discord/status`
   - Should return `{ "enabled": true, "configured": true }`
2. Try uploading a file through the application
3. Check your Discord channel for uploaded file chunks

## How It Works

### Upload Process

1. File is split into chunks (up to 24MB each)
2. Each chunk is uploaded to Discord via webhook
3. Discord returns a message ID and CDN attachment URL
4. Metadata is stored in Firebase (message IDs, URLs, hashes)
5. A manifest is created linking all chunks together

### Download Process

1. Fetch manifest from Firebase
2. Download chunks from Discord CDN URLs in parallel
3. Verify SHA-256 hashes for integrity
4. Reassemble chunks into original file
5. If CDN URL expired (>24 hours), fallback to message ID refresh

## Storage Limits

| Feature | Single Webhook | Multiple Webhooks (5) |
|---------|----------------|----------------------|
| Max chunk size | 25MB (24MB used) | 25MB (24MB used) |
| Total storage | Unlimited | Unlimited |
| Files per channel | Unlimited | Unlimited |
| Rate limit | 50 req/min | **250 req/min** (50 × 5) 🚀 |
| Effective throughput | ~20 MB/s | **~100 MB/s** |
| Redundancy | None | 5x failover protection |

## Comparison with Telegram

| Feature | Discord | Telegram |
|---------|---------|----------|
| Max chunk size | 25MB | 45MB |
| Total storage | Unlimited | Unlimited |
| API method | Webhook (simpler) | Bot API (more complex) |
| Download method | Direct CDN URL | Bot API download |
| URL expiration | ~24 hours | Never (file_id based) |
| Rate limit | 50 req/min | 30 req/min |
| Setup complexity | Easy (webhook only) | Medium (bot token + chat) |

## Backend Selection

The system tries backends in this order:

1. **Discord** (if webhook configured)
2. **Telegram** (if bot token configured)
3. **Local** (fallback)

You can configure preferred backends in the storage pipeline:

```typescript
const pipeline = new StoragePipeline({
  preferredBackends: ['discord', 'telegram', 'local'],
  // ... other options
});
```

## Troubleshooting

### "Discord webhook URL not configured" error

- Make sure `DISCORD_WEBHOOK_URL` is set in your environment variables
- Restart your development server after adding the variable
- For Vercel, redeploy after adding the environment variable

### "Rate limited by Discord API" error

- Discord webhooks have a 50 requests/minute limit
- The system automatically retries with exponential backoff
- Consider reducing concurrent upload workers if you hit this frequently

### "CDN URL expired" error

- Discord CDN URLs expire after ~24 hours
- The system automatically falls back to fetching fresh URLs via message ID
- This is normal behavior for files older than 24 hours

### Webhook returns 401/403

- Verify your webhook URL is correct
- Make sure the webhook hasn't been deleted in Discord
- Check that the channel still exists

## Security Considerations

- **Keep your webhook URL secret**: Anyone with the URL can post to your channel
- Store the webhook URL in environment variables, never in code
- Consider creating a private Discord server for storage
- The system stores file metadata in Firebase with user ownership checks

## Need Help?

- Check Discord Developer Documentation: https://discord.com/developers/docs/resources/webhook
- Review the implementation in `lib/server/discord.ts`
- Check API routes in `app/api/discord/`
