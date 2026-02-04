# Fix: Cloudflare Pages Showing "Hello World"

## Problem
After deployment, Cloudflare Pages shows "Hello World" instead of your Next.js app.

## Root Cause
The build output is missing static HTML files and public assets. `next-on-pages` reported "No static assets detected" because:
1. Static HTML files weren't being copied from `.next/server/app/`
2. Public folder assets weren't being included in the output
3. The `-s` (skip-build) flag was preventing proper asset processing

## Solution Applied

### 1. Removed `-s` Flag
Changed build script to let `next-on-pages` process the build:
```json
"build:cloudflare": "CF_PAGES=1 next build --no-lint && mkdir -p .vercel/output && echo '{\"version\":3,\"framework\":\"nextjs\"}' > .vercel/output/config.json && pnpm exec next-on-pages && node scripts/copy-static-assets.js"
```

### 2. Added Static Assets Copy Script
Created `scripts/copy-static-assets.js` to:
- Copy `public/` folder to output directory
- Copy static HTML files from `.next/server/app/` to output
- Preserve `_worker.js` and `_routes.json` (don't overwrite)

### 3. Updated next-on-pages Config
Added `minify: false` to ensure assets aren't minified incorrectly.

## Verification

After rebuilding, check:
```bash
# Verify HTML files exist
find .vercel/output/static -name "*.html"

# Verify public assets exist
ls -la .vercel/output/static/

# Verify worker exists
ls -la .vercel/output/static/_worker.js/
```

You should see:
- ✅ HTML files (index.html, etc.)
- ✅ Public folder assets
- ✅ `_worker.js/index.js`
- ✅ `_routes.json`

## Next Steps

1. **Rebuild locally:**
   ```bash
   rm -rf .next .vercel
   pnpm run build:cloudflare
   ```

2. **Verify output:**
   ```bash
   ls -la .vercel/output/static/
   ```

3. **Redeploy to Cloudflare Pages:**
   - Push changes to trigger new build
   - Or retry deployment in Cloudflare dashboard

## Expected Result

After this fix:
- ✅ Site shows your Next.js app (not "Hello World")
- ✅ Static pages load correctly
- ✅ API routes work via Edge runtime
- ✅ Public assets (images, etc.) are served
