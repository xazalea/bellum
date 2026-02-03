# Cloudflare Pages Deploy Command Fix

## Problem
Build succeeds but deployment fails with:
```
✘ [ERROR] It looks like you've run a Workers-specific command in a Pages project.
For Pages, please run `wrangler pages deploy` instead.
```

## Solution

### Option 1: Remove Deploy Command (Recommended)

Cloudflare Pages **automatically deploys** after a successful build. You don't need a deploy command.

1. Go to your Pages project → **Settings** → **Builds & deployments**
2. Find the **Deploy command** field
3. **Leave it EMPTY** or **delete any value**
4. Save settings
5. Retry deployment

### Option 2: Use Correct Deploy Command (If Required)

If you must have a deploy command (not recommended), use:

```
npx wrangler pages deploy .vercel/output/static --project-name=challengerdeep
```

**OR** if using pnpm:

```
pnpm exec wrangler pages deploy .vercel/output/static --project-name=challengerdeep
```

**NOT** `wrangler deploy` (that's for Workers, not Pages)
**NOT** `wrangler pages deploy` (wrangler not in PATH - use `npx wrangler` or `pnpm exec wrangler`)

### Why This Happens

- `wrangler deploy` → For Cloudflare **Workers**
- `wrangler pages deploy` → For Cloudflare **Pages**

Cloudflare Pages automatically deploys the build output from `.vercel/output/static`, so a deploy command is usually unnecessary.

### Verification

After fixing:
1. Build should complete successfully ✅
2. Deployment should happen automatically ✅
3. Your site should be live at `https://bellum-xxx.pages.dev` ✅
