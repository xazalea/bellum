# Cloudflare Pages Deployment Guide

## Quick Deploy

The build process creates output in `.vercel/output/static` which Cloudflare Pages automatically deploys.

## Build Configuration

In Cloudflare Pages dashboard:

1. **Build command**: `pnpm run build:cloudflare`
2. **Build output directory**: `.vercel/output/static`
3. **Root directory**: Leave **EMPTY** (or use `.`)
4. **Deploy command**: 
   - **Option 1 (Recommended)**: Leave **EMPTY** - Cloudflare auto-deploys after build
   - **Option 2 (If auto-deploy fails)**: `npx wrangler pages deploy .vercel/output/static --project-name=bellum`

## Manual Deployment

If you need to manually deploy:

```bash
# Build first
pnpm run build:cloudflare

# Then deploy
pnpm run deploy:cloudflare
# Or use the combined command:
pnpm run build:deploy:cloudflare
```

## Troubleshooting

### Build succeeds but no deployment

1. **Check deploy command**: Should be **EMPTY** in Cloudflare Pages dashboard
   - Settings → Builds & deployments → Deploy command: Leave empty

2. **Verify output directory**: Should be `.vercel/output/static`
   - Check that `_worker.js` and `_routes.json` exist in output

3. **Check build logs**: Ensure build completes successfully
   - Look for "✅ Static assets copied successfully"
   - Look for "✅ Updated _routes.json"

### If auto-deploy doesn't work

You can add deployment to the build script by setting deploy command to:
```
npx wrangler pages deploy .vercel/output/static --project-name=bellum
```

However, **it's recommended to leave deploy command empty** for automatic deployment.

## Build Output Structure

After build, `.vercel/output/static` should contain:
- `_worker.js/` - Cloudflare Worker code
- `_routes.json` - Route configuration
- `index.html` and other HTML files
- `_next/static/` - Next.js static assets
- `public/` assets (copied from public folder)

## Environment Variables

Set in Cloudflare Pages dashboard:
- `NODE_VERSION=22`
- `NEXT_PUBLIC_PLATFORM=cloudflare` (optional)
