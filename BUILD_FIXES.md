# Build & Deploy Fixes

## Issues Fixed

### 1. API Route Pre-rendering Error
**Problem**: `/api/games` route was trying to use `request.url` which made it dynamic, but Next.js attempted to pre-render it during build.

**Error**:
```
[API/games] Request failed: B [Error]: Dynamic server usage: Route /api/games couldn't be rendered statically because it used `request.url`.
```

**Solution**: Added route segment config to force dynamic rendering:
```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

### 2. Wrong Deploy Command
**Problem**: Vercel build was trying to execute `npx wrangler deploy` (Cloudflare Workers command) instead of using Vercel's native Next.js deployment.

**Error**:
```
Executing user deploy command: npx wrangler deploy
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

**Solution**: 
- Removed custom `buildCommand`, `devCommand`, and `installCommand` from `vercel.json`
- Vercel will now use the default Next.js build process
- Added `vercel-build` script to `package.json` for explicit build command

### 3. Output Configuration
**Problem**: `next.config.js` had `output: 'standalone'` which is for Docker deployments, not Vercel.

**Solution**: Removed the `output: 'standalone'` configuration to use Vercel's default output mode.

## Performance Optimizations

The build configuration already includes:
- ✅ SWC minification (`swcMinify: true`)
- ✅ Compression enabled
- ✅ Aggressive code splitting (emulator, WASM, React, vendor chunks)
- ✅ Package import optimization for React/React-DOM
- ✅ Image optimization (AVIF, WebP)
- ✅ Long-term caching for static assets

## Build Time

Current build time: **~1.5 minutes** (90 seconds)

This is reasonable for a Next.js app with:
- 44 routes (static + dynamic)
- Large XML parsing (6.4MB games.xml)
- WASM compilation
- Multiple emulator components
- Extensive webpack optimizations

To further reduce build time, consider:
1. **Incremental Static Regeneration (ISR)** for game pages instead of full static generation
2. **Remove unused routes** from build (if any)
3. **Use Vercel's build cache** (configure in project settings)
4. **Lazy load heavy components** (emulators, WASM modules)

## Files Modified

1. `app/api/games/route.ts` - Added dynamic route config
2. `vercel.json` - Simplified to use Vercel defaults
3. `next.config.js` - Removed standalone output mode
4. `package.json` - Added `vercel-build` script

## Next Steps

1. **Deploy to Vercel** - Push these changes and redeploy
2. **Monitor build times** - Check if Vercel's build cache helps on subsequent deploys
3. **Test API route** - Verify `/api/games` works correctly in production
4. **Check games loading** - Ensure games page loads quickly with the server-side API
