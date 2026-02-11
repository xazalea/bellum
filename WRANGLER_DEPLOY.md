# Wrangler Deployment Guide

This project now uses Wrangler CLI for Cloudflare Pages deployment, which is more reliable than the previous build process.

## Prerequisites

1. Install Wrangler CLI (if not already installed):
   ```bash
   pnpm add -D wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   npx wrangler login
   ```

3. Ensure you have a Pages project (not Workers):
   ```bash
   # Run the setup script to check/create Pages project
   pnpm run setup:pages
   
   # Or manually:
   # List your Pages projects
   npx wrangler pages project list
   
   # If you don't have a Pages project, create one:
   npx wrangler pages project create bellum
   ```

## Build and Deploy

### Option 1: Build and Deploy Separately

```bash
# Build for Cloudflare Pages
pnpm run build:wrangler

# Deploy to Cloudflare Pages
pnpm run deploy:wrangler
```

### Option 2: Build and Deploy in One Command

```bash
pnpm run build:deploy:wrangler
```

## Manual Deployment

If you prefer to deploy manually:

```bash
# After building
wrangler pages deploy .vercel/output/static --project-name=bellum
```

**Important**: Using `wrangler pages deploy` ensures your site deploys to a `.pages.dev` domain, not `.workers.dev`. If you see a `.workers.dev` URL, you may have deployed to a Workers project instead of a Pages project.

## Pages vs Workers

- **Cloudflare Pages** (`.pages.dev`): Use `wrangler pages deploy` - This is what we're using
- **Cloudflare Workers** (`.workers.dev`): Use `wrangler deploy` - This is NOT what we want

If you accidentally created a Workers project, you can:
1. Create a new Pages project in the Cloudflare dashboard
2. Or use: `wrangler pages project create bellum` to create a Pages project via CLI

## Environment Variables

Set the project name via environment variable:
```bash
CF_PAGES_PROJECT_NAME=bellum pnpm run deploy:wrangler
```

## Troubleshooting

### Build Fails with TypeScript Errors

If you encounter TypeScript errors during build:

1. Clear Next.js cache:
   ```bash
   rm -rf .next
   ```

2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules .next
   pnpm install
   ```

3. Try building again:
   ```bash
   pnpm run build:wrangler
   ```

### Deployment Fails

1. Ensure you're authenticated:
   ```bash
   npx wrangler whoami
   ```

2. Check that the build output exists:
   ```bash
   ls -la .vercel/output/static
   ```

3. Verify `_worker.js` and `_routes.json` are present in the output directory.

## Differences from Previous Build

The new Wrangler workflow:
- Uses a simpler, more maintainable build script
- Separates build and deploy steps for better control
- Provides clearer error messages
- Uses standard Wrangler CLI commands
