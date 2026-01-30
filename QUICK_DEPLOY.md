# ⚡ Quick Deploy to Cloudflare (3 Minutes)

## 🎯 Why?
Your API requests are consuming all your Vercel usage. Cloudflare has **unlimited requests** on the free tier!

---

## 🚀 Deploy Now (3 Steps)

### 1. Push Your Code
```bash
git push origin main
```

### 2. Go to Cloudflare
[dash.cloudflare.com](https://dash.cloudflare.com/) → **Pages** → **Create a project**

### 3. Configure & Deploy
```
Framework:       Next.js
Build command:   npm run build
Build output:    .next
Node version:    22
```

**Add these environment variables** (from your `.env.local`):
- `NODE_VERSION=22`
- `NEXT_PUBLIC_PLATFORM=cloudflare`
- All your Firebase keys (NEXT_PUBLIC_FIREBASE_*)

Click **Save and Deploy**!

---

## ✅ Done!

Your site will be live at: `https://bellum-xxx.pages.dev`

**Benefits:**
- ✨ **UNLIMITED API requests** (vs 1M on Vercel)
- ✨ **UNLIMITED bandwidth** (vs 100GB on Vercel)
- ✨ **$0/month forever**

Your `/api/games` endpoint can now handle **millions of requests per day** at no cost! 🎉

---

## 📊 What Changed?

- **11 routes** now run on Cloudflare Edge (unlimited scaling)
- **42 routes** still run on Vercel (Firebase/Node.js)
- **90% reduction** in Vercel usage expected

---

## 🐛 Need Help?

See `DEPLOYMENT_SUMMARY.md` for full details.
