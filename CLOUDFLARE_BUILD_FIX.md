# Cloudflare Pages "Root Directory Not Found" Fix

## Problem
Cloudflare Pages build fails with: `Failed: root directory not found`

## Solution

### In Cloudflare Pages Dashboard:

1. Go to your Pages project → **Settings** → **Builds & deployments**

2. **Update Build Configuration:**
   - **Build command**: `pnpm run build:cloudflare`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: Leave **EMPTY** (or use `.` if empty is not allowed)
   - **Node version**: `22`

3. **Environment Variables:**
   ```
   NODE_VERSION=22
   NEXT_PUBLIC_PLATFORM=cloudflare
   ```

### Important Notes:

- ❌ **DO NOT** use `/` as root directory (this is an absolute path that doesn't exist)
- ✅ **DO** leave root directory empty or use `.` (current directory)
- ✅ **DO** use `pnpm` instead of `npm` if your project uses pnpm (check for `pnpm-lock.yaml`)

### Alternative: Use Wrangler Configuration

If the dashboard doesn't work, you can also configure via `wrangler.toml`:

```toml
name = "bellum"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

Then in Cloudflare Pages dashboard:
- Root directory: Leave empty
- Build command: `pnpm run build:cloudflare`
- Build output: `.vercel/output/static`

### Verify Build Locally

Before deploying, test the build locally:

```bash
# Clean previous builds
rm -rf .next .vercel

# Run the build
pnpm run build:cloudflare

# Verify output exists
ls -la .vercel/output/static/
```

You should see:
- `_worker.js/` directory
- `_routes.json` file
- Other static assets

### After Fixing Configuration

1. Save the build settings in Cloudflare dashboard
2. Trigger a new deployment (push a commit or click "Retry deployment")
3. The build should now succeed
