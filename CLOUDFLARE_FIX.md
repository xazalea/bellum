# Cloudflare "Hello World" Fix

If you're seeing "Hello World" on Cloudflare Pages, it means the Next.js app isn't being properly deployed. Here's how to fix it:

## 🔧 Changes Made

### 1. **Edge Runtime for API Routes**
Changed API routes from `nodejs` runtime to `edge` runtime for Cloudflare compatibility:

```typescript
// app/api/games/route.ts
export const runtime = 'edge'; // Was: 'nodejs'
```

### 2. **Removed File System Access**
Cloudflare Edge runtime doesn't have access to the file system. Changed from:
```typescript
const xmlContent = await readFile(xmlPath, 'utf-8'); // ❌ Won't work on Cloudflare
```

To:
```typescript
const response = await fetch(`${baseUrl}/games.xml`); // ✅ Works on both platforms
const xmlContent = await response.text();
```

### 3. **Added Node.js Compatibility Flag**
Updated `wrangler.toml`:
```toml
compatibility_flags = ["nodejs_compat"]
```

### 4. **Added Cloudflare Headers & Redirects**
- `public/_headers` - HTTP headers for Cloudflare Pages
- `public/_redirects` - SPA routing configuration

### 5. **Added Middleware**
Created `middleware.ts` to detect the platform and handle routing.

### 6. **Added Next-on-Pages Config**
Created `next-on-pages.config.js` for build configuration.

---

## 🚀 How to Deploy

### Option 1: Rebuild and Redeploy

```bash
# Clean previous build
rm -rf .next .vercel node_modules/.cache

# Install dependencies
pnpm install

# Build for Cloudflare
npm run build:cloudflare

# Verify the output directory exists
ls -la .vercel/output/static/

# Deploy
npm run deploy:cloudflare
```

### Option 2: Cloudflare Dashboard

1. **Go to Cloudflare Pages dashboard**
2. **Project Settings → Build & deployments**
3. **Build configuration:**
   ```
   Build command: npm run build:cloudflare
   Build output directory: .vercel/output/static
   Root directory: /
   ```
4. **Environment variables:**
   ```
   NODE_VERSION=22
   ```
5. **Retry deployment**

---

## 🔍 Troubleshooting

### Still seeing "Hello World"?

1. **Check build output:**
   ```bash
   npm run build:cloudflare
   ls -la .vercel/output/static/
   ```
   
   You should see:
   ```
   _worker.js/         # Cloudflare Worker
   _next/              # Next.js build
   index.html          # Static HTML
   ```

2. **Check build logs on Cloudflare:**
   - Go to your Pages project → Deployments
   - Click on the latest deployment
   - Check for errors in the build log

3. **Verify @cloudflare/next-on-pages is running:**
   Look for this in build logs:
   ```
   ⚡️ @cloudflare/next-on-pages CLI v1.x.x
   ⚙️ Detected Package Manager: pnpm (10.x.x)
   ⚙️ Detected Next.js version: 14.x.x
   ```

### Common Issues

#### Error: "Could not find a production build"
**Solution:** Make sure `next build` runs before `@cloudflare/next-on-pages`:
```bash
npm run build:cloudflare
# Should run: next build && npx @cloudflare/next-on-pages
```

#### Error: "Unsupported Node.js builtin"
**Solution:** Add `nodejs_compat` flag to `wrangler.toml`:
```toml
compatibility_flags = ["nodejs_compat"]
```

#### Error: "Dynamic imports not supported"
**Solution:** Some Next.js features aren't supported on Cloudflare Edge. Check the [compatibility guide](https://github.com/cloudflare/next-on-pages/blob/main/packages/next-on-pages/docs/supported.md).

---

## 📊 Platform Detection

The app now auto-detects which platform it's running on:

```typescript
// Server-side
const isCloudflare = process.env.CF_PAGES === '1';

// Client-side
const platform = process.env.NEXT_PUBLIC_PLATFORM; // 'cloudflare' or 'vercel'
```

---

## ⚠️ Cloudflare Limitations

Some Next.js features don't work on Cloudflare Edge:

| Feature | Vercel | Cloudflare |
|---------|--------|------------|
| Node.js APIs | ✅ Full | ⚠️ Limited (with nodejs_compat) |
| File System | ✅ Yes | ❌ No |
| Streaming SSR | ✅ Yes | ⚠️ Experimental |
| Edge Runtime | ✅ Yes | ✅ Yes |
| Middleware | ✅ Yes | ✅ Yes |
| Image Optimization | ✅ Yes | ⚠️ Via Cloudflare Images |
| ISR | ✅ Yes | ⚠️ Limited |

**Recommendation:** Use Vercel as primary, Cloudflare as CDN/backup.

---

## ✅ Verification

After deployment, check:

1. **Home page** - Should show the actual app, not "Hello World"
2. **Games page** - `/games` should load the games list
3. **API endpoint** - `/api/games` should return JSON (not "Hello World")
4. **Console** - No errors in browser console

If you still see "Hello World", the issue is with the Cloudflare Pages build/deployment configuration, not the code.

---

## 🔗 Resources

- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [@cloudflare/next-on-pages Docs](https://github.com/cloudflare/next-on-pages)
- [Supported Features](https://github.com/cloudflare/next-on-pages/blob/main/packages/next-on-pages/docs/supported.md)
- [Platform Compatibility](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
