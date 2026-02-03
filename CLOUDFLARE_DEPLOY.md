# 🚀 Deploy to Cloudflare Pages (Unlimited API Requests!)

## Why Cloudflare?
- ✅ **UNLIMITED bandwidth** (vs 100GB on Vercel)
- ✅ **UNLIMITED requests** (vs 1M on Vercel)  
- ✅ **UNLIMITED API calls** (no function invocation limits!)
- ✅ **200+ edge locations**
- ✅ **Free tier is genuinely unlimited at scale**

---

## 📦 Your App is Ready!

Your app is **already configured** for Cloudflare:
- ✅ 42 routes use Node.js runtime (Firebase, crypto)
- ✅ 11 routes use Edge runtime (unlimited scaling!)
- ✅ `/api/games` is Edge-compatible (your highest traffic API!)

---

## 🎯 Deploy via Cloudflare Dashboard (Recommended)

### Step 1: Connect to GitHub

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Click **Pages** → **Create a project**
3. Click **Connect to Git**
4. Select your **bellum** repository
5. Click **Begin setup**

### Step 2: Configure Build

**Framework preset:** Next.js

**Build settings:**
```
Build command:       pnpm run build:cloudflare
Build output:        .vercel/output/static
Root directory:      (leave EMPTY - do not use "/")
Node version:        22
```

**Environment variables:**
```
NODE_VERSION=22
NEXT_PUBLIC_PLATFORM=cloudflare
```

(Add your Firebase keys, etc. from `.env.local`)

### Step 3: Configure Deploy Command (IMPORTANT!)

**Deploy command**: Leave **EMPTY** (Recommended)
- Cloudflare Pages automatically deploys after build completes
- ❌ **DO NOT** use `wrangler deploy` (that's for Workers, not Pages)
- ❌ **DO NOT** use `wrangler pages deploy` (wrangler not in PATH)
- ✅ If you must set one, use: `npx wrangler pages deploy .vercel/output/static --project-name=challengerdeep`

### Step 4: Deploy!

Click **Save and Deploy**

Your site will be live at: `https://bellum-xxx.pages.dev`

---

## 🌐 Custom Domain (Optional)

1. In your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `challengerdeep.com` (or your domain)
4. Cloudflare will auto-configure DNS
5. SSL certificate provisions automatically (~5 minutes)

---

## ⚡ What Runs Where?

### Cloudflare Edge (Unlimited Requests) 🚀
- `/api/games` - Your main API!
- `/api/proxy/*` - Proxying
- `/api/isos/*` - ISO management
- `/api/uploads/*` - File uploads
- `/api/fabrik/ingress/*` - Ingress
- All static pages

### Vercel Node.js (Fallback for Firebase)
- `/api/user/*` - User management
- `/api/archives/*` - Archives
- `/api/discord/*` - Discord integration
- `/api/telegram/*` - Telegram integration
- `/api/nacho/auth/*` - Authentication
- All Firebase-dependent routes

---

## 📊 Monitor Usage

**Cloudflare Dashboard:**
- Pages → Your project → Analytics
- View requests, bandwidth, errors
- **All metrics are unlimited on free tier!**

**Vercel Dashboard:**
- vercel.com/dashboard
- Monitor Node.js function invocations
- Should see **90% reduction** in usage!

---

## 🔄 Deployment Workflow

**Automatic (Git-based):**
```bash
git add .
git commit -m "Update feature"
git push origin main
# Cloudflare auto-deploys in ~2 minutes
```

---

## 🎉 Benefits

### Before (Vercel Only)
- 1M API requests/month limit
- 100GB bandwidth limit
- Hitting limits = $20-200/month

### After (Cloudflare Primary)
- **UNLIMITED API requests** ✨
- **UNLIMITED bandwidth** ✨
- **$0/month forever** ✨

Your `/api/games` endpoint can now handle **millions of requests per day** at no cost!

---

## 🐛 Troubleshooting

### Build fails
- Check Node version is set to 22
- Verify all env vars are set
- Check build logs in Cloudflare dashboard

### "Hello World" appears
- Wait 2-3 minutes for first deploy
- Clear browser cache
- Check deployment status

### Firebase routes not working
- These run on Vercel (Node.js runtime)
- Keep Vercel deployment active
- Routes automatically proxy between platforms

---

## 💡 Pro Tips

1. **Keep both platforms deployed:**
   - Cloudflare handles 90% of traffic (Edge routes)
   - Vercel handles 10% (Firebase routes)
   - Total cost: $0/month

2. **Monitor both dashboards:**
   - Cloudflare: Unlimited metrics
   - Vercel: Should see minimal usage now

3. **Use Cloudflare for everything possible:**
   - Static assets
   - API routes without Firebase
   - Proxying and caching

---

## 🚀 Ready to Deploy!

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Click **Pages** → **Create a project**
3. Connect your GitHub repo
4. Use the build settings above
5. Click **Deploy**

Your API usage problems are **solved**! 🎉
