# Cloudflare Pages Deploy Command Fix

## Problem
Build succeeds but deployment fails with either:

**Error 1:**
```
✘ [ERROR] A request to the Cloudflare API failed.
Authentication error [code: 10000]
```

**Error 2:**
```
/bin/sh: 1: wrangler: not found
```

**Error 3:**
```
✘ [ERROR] It looks like you've run a Workers-specific command in a Pages project.
```

## Solution

### Option 1: Remove Deploy Command (Recommended)

Cloudflare Pages **automatically deploys** after a successful build. You don't need a deploy command.

1. Go to your Pages project → **Settings** → **Builds & deployments**
2. Find the **Deploy command** field
3. **Leave it EMPTY** or **delete any value**
4. Save settings
5. Retry deployment

### Why Deploy Commands Fail

Deploy commands require:
- API token with correct permissions
- Proper authentication setup
- Wrangler in PATH or using npx/pnpm exec

**But you don't need any of this!** Cloudflare Pages automatically deploys after build.

### Why This Happens

- `wrangler deploy` → For Cloudflare **Workers**
- `wrangler pages deploy` → For Cloudflare **Pages**

Cloudflare Pages automatically deploys the build output from `.vercel/output/static`, so a deploy command is usually unnecessary.

### Verification

After fixing:
1. Build should complete successfully ✅
2. Deployment should happen automatically ✅
3. Your site should be live at `https://bellum-xxx.pages.dev` ✅
