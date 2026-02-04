# Fix: node:child_process and node:net Build Errors

## Problem
When `next-on-pages` runs without the `-s` flag, it executes `vercel build`, which runs `next build` again. During this build, webpack tries to analyze files that import Node.js built-in modules like:
- `node:child_process` (from `lib/gpt4free/utils/file.ts`)
- `node:net` (from `lib/gpt4free/utils/log.ts`)

This causes errors:
```
Module build failed: UnhandledSchemeError: Reading from "node:child_process" is not handled by plugins
```

## Solution
Use the `-s` (skip-build) flag with `next-on-pages` since we already ran `next build` successfully:

```json
"build:cloudflare": "CF_PAGES=1 next build --no-lint && mkdir -p .vercel/output && echo '{\"version\":3,\"framework\":\"nextjs\"}' > .vercel/output/config.json && pnpm exec next-on-pages -s && node scripts/copy-static-assets.js"
```

## Why This Works

1. **`next build`** - Builds the Next.js app (handles Node.js modules correctly)
2. **`next-on-pages -s`** - Processes the existing `.next` output without rebuilding
3. **`copy-static-assets.js`** - Copies HTML files and public assets to output

The `-s` flag tells `next-on-pages` to:
- Skip running `vercel build` (which would rebuild everything)
- Use the existing `.next` output from our `next build` command
- Just process and convert it for Cloudflare Pages

## Build Process

```
1. next build          → Creates .next/ with all pages
2. next-on-pages -s    → Converts .next/ to Cloudflare format (no rebuild)
3. copy-static-assets  → Copies HTML files and public/ folder
```

This avoids the double-build issue and Node.js module analysis errors.
