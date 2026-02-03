# Deployment Guide

This project supports deployment to both **Vercel** and **Cloudflare Pages**.

## 🚀 Vercel Deployment

### Automatic Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect Next.js and deploy on push to `main`
3. Environment variables can be set in Vercel dashboard

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Configuration
- **Config File**: `vercel.json`
- **Build Command**: `next build` (automatic)
- **Output Directory**: `.next` (automatic)
- **Install Command**: `pnpm install` (automatic)

### Environment Variables
Set these in Vercel dashboard:
- `NEXT_PUBLIC_BUILD_COMMIT` (optional, auto-detected)
- `NEXT_PUBLIC_BUILD_VERSION` (optional, auto-detected)
- `NEXT_PUBLIC_CLUSTER_SERVER_URL` (optional)

---

## ☁️ Cloudflare Pages Deployment

### Prerequisites
```bash
# Install dependencies
pnpm install

# This installs:
# - @cloudflare/next-on-pages (Next.js adapter for Cloudflare)
# - wrangler (Cloudflare CLI)
```

### Automatic Deployment via Git
1. **Connect Repository**:
   - Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/?to=/:account/pages)
   - Click "Create a project" → "Connect to Git"
   - Select your repository

2. **Build Configuration**:
   - **Build command**: `pnpm run build:cloudflare`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: Leave **EMPTY** (or use `.` if empty is not allowed)
   - **Environment variables**: (see below)

3. **Deploy**: Push to your branch and Cloudflare will auto-deploy

### Manual Deployment
```bash
# Build for Cloudflare
npm run build:cloudflare

# Deploy
npm run deploy:cloudflare
# or
wrangler pages deploy .vercel/output/static --project-name=bellum
```

### Local Preview (Cloudflare Environment)
```bash
# Build and preview locally with Cloudflare Workers runtime
npm run preview:cloudflare
```

### Configuration Files
- **`wrangler.toml`**: Cloudflare Workers/Pages configuration
- **`.cloudflare-build-config.json`**: Build settings and compatibility flags

### Environment Variables (Cloudflare)
Set these in Cloudflare Pages dashboard or via CLI:
```bash
wrangler pages secret put NEXT_PUBLIC_BUILD_COMMIT
wrangler pages secret put NEXT_PUBLIC_BUILD_VERSION
wrangler pages secret put NEXT_PUBLIC_CLUSTER_SERVER_URL
```

### Cloudflare-Specific Features
Cloudflare Pages provides additional capabilities:

#### Workers KV (Key-Value Storage)
```toml
# Add to wrangler.toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

#### R2 (Object Storage)
```toml
# Add to wrangler.toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "bellum-storage"
```

#### D1 (SQL Database)
```toml
# Add to wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "bellum-db"
database_id = "your-database-id"
```

#### Durable Objects
For real-time features like multiplayer, WebRTC signaling, etc.

---

## 📊 Platform Comparison

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| **Build Time** | ~1.5 min | ~1.5 min |
| **Edge Network** | Global | Global (200+ cities) |
| **Free Tier** | 100GB bandwidth | Unlimited bandwidth |
| **Functions** | Serverless | Workers (V8 isolates) |
| **Cold Starts** | 50-200ms | <1ms (Workers) |
| **Max Function Size** | 50MB | 10MB (Workers) |
| **Execution Time** | 60s (Pro), 10s (Hobby) | Unlimited (Pages) |
| **WebSockets** | Yes | Yes (Durable Objects) |
| **Storage** | KV, Postgres | KV, R2, D1 |
| **Preview Deployments** | Yes | Yes |
| **Analytics** | Yes (built-in) | Yes (Web Analytics) |

---

## 🔧 Build Scripts

```json
{
  "build": "next build",                    // Standard Next.js build
  "build:cloudflare": "next build && npx @cloudflare/next-on-pages",  // Cloudflare build
  "vercel-build": "next build",             // Vercel-specific build
  "deploy:cloudflare": "npm run build:cloudflare && wrangler pages deploy",
  "preview:cloudflare": "npm run build:cloudflare && wrangler pages dev"
}
```

---

## 🐛 Troubleshooting

### Vercel Issues

**Build fails with "Dynamic server usage" error**:
- Ensure API routes have `export const dynamic = 'force-dynamic'`
- Check `next.config.js` for proper route configuration

**Missing environment variables**:
- Set in Vercel dashboard → Settings → Environment Variables
- Redeploy after adding variables

### Cloudflare Issues

**Build fails with "@cloudflare/next-on-pages" error**:
```bash
# Clear cache and rebuild
rm -rf .next .vercel node_modules/.cache
npm install
npm run build:cloudflare
```

**"Node.js compatibility mode required" error**:
- Ensure `wrangler.toml` has `compatibility_flags = ["nodejs_compat"]`
- Or use `--compatibility-flag=nodejs_compat` in CLI

**API routes not working**:
- Cloudflare Pages Functions must be in `functions/` directory OR
- Use Next.js API routes (auto-converted by @cloudflare/next-on-pages)
- Check `app/api/*/route.ts` has proper exports

**Large bundle size**:
- Cloudflare Workers have a 10MB limit (after compression)
- Use dynamic imports for large dependencies
- Consider splitting large components

### Both Platforms

**Games XML parsing slow**:
- Ensure `/api/games` endpoint is working
- Check server-side caching is enabled
- Verify `games.xml` is being parsed once and cached

**WASM modules not loading**:
- Check MIME types are correct
- Verify `asyncWebAssembly` is enabled in `next.config.js`
- Ensure CORS headers allow WASM loading

---

## 🚀 Quick Deploy

### To Vercel:
```bash
git push origin main
# Vercel auto-deploys
```

### To Cloudflare:
```bash
npm run deploy:cloudflare
```

### To Both:
```bash
# Deploy to Vercel (auto via Git)
git push origin main

# Also deploy to Cloudflare
npm run deploy:cloudflare
```

---

## 📝 Notes

- Both platforms support **automatic HTTPS**
- Both platforms support **preview deployments** for PRs
- **Vercel**: Better DX, built-in analytics, easier setup
- **Cloudflare**: Better performance (Workers), unlimited bandwidth, lower cost at scale
- The app detects the platform via `process.env.NEXT_PUBLIC_PLATFORM`
- API routes work on both platforms (auto-converted for Cloudflare)

---

## 🔗 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
