# 🚀 Quick Start: Dual Deployment (Vercel + Cloudflare)

Your app is now configured to deploy to **both Vercel and Cloudflare Pages**!

## 📦 Install Dependencies

First, install the new Cloudflare dependencies:

```bash
pnpm install
```

This adds:
- `@cloudflare/next-on-pages` - Next.js adapter for Cloudflare
- `wrangler` - Cloudflare CLI
- `vercel` - Vercel CLI

---

## 🔷 Deploy to Vercel (Primary)

### Automatic (Recommended)
```bash
git push origin main
```
Vercel auto-deploys on push to main.

### Manual
```bash
npx vercel --prod
```

**Live URL**: `https://challengerdeep.vercel.app`

---

## ☁️ Deploy to Cloudflare Pages (Secondary)

### Option 1: Automatic via Git (Recommended)

1. **Connect to Cloudflare Pages**:
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Pages → Create a project → Connect to Git
   - Select your `bellum` repository

2. **Build Settings**:
   ```
   Build command: npm run build:cloudflare
   Build output: .vercel/output/static
   Root directory: /
   ```

3. **Push to deploy**:
   ```bash
   git push origin main
   ```

### Option 2: Manual Deploy

```bash
# Build for Cloudflare
npm run build:cloudflare

# Deploy
npm run deploy:cloudflare
```

**Live URL**: `https://bellum.pages.dev` (or your custom domain)

---

## 🧪 Local Testing

### Vercel Environment
```bash
npm run dev
# or
npx vercel dev
```

### Cloudflare Environment
```bash
# Build and preview with Cloudflare Workers runtime
npm run preview:cloudflare
```

This runs your app in the **actual Cloudflare Workers runtime** locally, so you can test Cloudflare-specific features.

---

## 🔑 Environment Variables

### Set in Vercel
```bash
# Via dashboard: Settings → Environment Variables
# or via CLI:
vercel env add NEXT_PUBLIC_CLUSTER_SERVER_URL
```

### Set in Cloudflare
```bash
# Via dashboard: Pages → Settings → Environment variables
# or via CLI:
wrangler pages secret put NEXT_PUBLIC_CLUSTER_SERVER_URL
```

---

## 📊 Feature Comparison

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| **Build Time** | ~1.5 min | ~1.5 min |
| **Cold Start** | 50-200ms | <1ms |
| **Edge Network** | Global | 200+ cities |
| **Free Bandwidth** | 100GB/mo | **Unlimited** |
| **Free Builds** | 6,000 min/mo | 500 builds/mo |
| **Function Runtime** | Node.js | V8 isolates |
| **WebSockets** | ✅ | ✅ |
| **Best For** | Full-stack apps | Static + edge compute |

---

## 🎯 Recommended Strategy

1. **Primary: Vercel**
   - Better DX, easier debugging
   - Use for development and staging
   - Main production deployment

2. **Secondary: Cloudflare**
   - Better performance (sub-ms cold starts)
   - Unlimited bandwidth (cost savings at scale)
   - Use as a CDN/backup
   - Deploy for geo-distributed users

---

## 📝 New Scripts

```json
{
  "build:cloudflare": "Build for Cloudflare Pages",
  "preview:cloudflare": "Test locally with Cloudflare runtime",
  "deploy:cloudflare": "Deploy to Cloudflare Pages"
}
```

---

## 🔗 Next Steps

1. **Push changes**:
   ```bash
   git push origin main
   ```

2. **Vercel** will auto-deploy (already connected)

3. **Cloudflare**: Connect your repo or run:
   ```bash
   npm run deploy:cloudflare
   ```

4. **Test both deployments**:
   - Vercel: `https://challengerdeep.vercel.app/games`
   - Cloudflare: `https://bellum.pages.dev/games`

---

## 📚 Full Documentation

See `DEPLOYMENT.md` for comprehensive deployment guide, troubleshooting, and advanced configuration.

---

## 🐛 Troubleshooting

### Build fails on Cloudflare?
```bash
# Clear cache and rebuild
rm -rf .next .vercel node_modules/.cache
pnpm install
npm run build:cloudflare
```

### API routes not working on Cloudflare?
- Check that routes have `export const runtime = 'edge'` for Cloudflare Workers
- Or use `export const runtime = 'nodejs'` with nodejs_compat flag

### Want to test Cloudflare-specific features locally?
```bash
npm run preview:cloudflare
```

---

**That's it!** Your app now deploys to both platforms. 🎉
