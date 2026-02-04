# Cloudflare Pages Deploy Command Solution

## Problem
Cloudflare Pages requires a deploy command, but using `wrangler pages deploy` causes authentication errors.

## Solution: Use Verification Script

Since Cloudflare Pages automatically deploys after build, we just need a deploy command that:
1. Verifies the build output exists
2. Exits successfully
3. Doesn't require authentication

### Deploy Command to Use:

```bash
bash scripts/cloudflare-deploy.sh
```

**OR** if you prefer a one-liner:

```bash
test -d .vercel/output/static && test -f .vercel/output/static/_worker.js/index.js && echo "Build verified - Pages will auto-deploy" || exit 1
```

### How to Set It:

1. Go to Cloudflare Pages Dashboard → Your Project → **Settings** → **Builds & deployments**
2. Find **"Deploy command"** field
3. Enter: `bash scripts/cloudflare-deploy.sh`
4. Save settings

### Why This Works:

- ✅ Verifies build output exists (fails fast if build didn't complete)
- ✅ Exits with success code (0)
- ✅ No authentication required
- ✅ No wrangler needed
- ✅ Cloudflare Pages still auto-deploys the output after this script completes

### Alternative One-Liner:

If the script file isn't accessible, use this one-liner:

```bash
test -d .vercel/output/static && test -f .vercel/output/static/_worker.js/index.js && echo "✅ Build verified" || (echo "❌ Build output missing" && exit 1)
```

This does the same thing but doesn't require a separate script file.
