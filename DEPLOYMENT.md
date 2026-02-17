# 🚀 Deployment Quick Start Guide

This guide will help you deploy Challenger Deep to production in minutes.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- ✅ `node scripts/verify-features.js` shows 100% success rate
- ✅ `npm run build` completes without errors
- ✅ Environment variables are configured
- ✅ Firebase project is set up (if using authentication)
- ✅ Discord/Telegram bot is configured (if using cloud storage)
- ✅ All 20,865 games are in `public/games.json`

---

## 🎯 Option 1: Vercel (Recommended - Easiest)

**Perfect for:** Production deployments with zero configuration

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy

```bash
# From the project root
cd bellum

# Deploy to production
vercel --prod

# Follow the prompts:
# - Project name: challenger-deep
# - Framework: Next.js
# - Build command: npm run build
# - Output directory: .next
```

### Step 4: Configure Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from `.env.example`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef
JWT_SECRET=your_random_secret_key_min_32_chars
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_channel_id
```

### Step 5: Redeploy

```bash
vercel --prod
```

### ✅ Done!

Your app is now live at `https://your-project.vercel.app`

**Vercel Advantages:**
- ✅ Automatic HTTPS/SSL
- ✅ Global CDN (Edge Network)
- ✅ Automatic deployments on git push
- ✅ Preview deployments for PRs
- ✅ Zero configuration
- ✅ Free tier available

---

## ⚡ Option 2: Cloudflare Pages (Best Performance)

**Perfect for:** Maximum edge performance and low latency

### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

### Step 3: Build for Cloudflare

```bash
npm run build:cloudflare
```

### Step 4: Deploy

```bash
npm run deploy:cloudflare
```

Or use the combined command:

```bash
npm run build:deploy:cloudflare
```

### Step 5: Configure Environment Variables

1. Go to https://dash.cloudflare.com
2. Select **Pages** → Your Project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from `.env.example`

### Step 6: Configure Custom Domain (Optional)

1. Go to **Custom Domains** in Cloudflare Pages
2. Add your domain
3. Cloudflare will automatically configure DNS

### ✅ Done!

Your app is now live at `https://your-project.pages.dev`

**Cloudflare Advantages:**
- ✅ 275+ edge locations worldwide
- ✅ Fastest CDN performance
- ✅ Built-in DDoS protection
- ✅ Workers for edge computing
- ✅ Free tier with unlimited bandwidth

---

## 🐳 Option 3: Docker (Self-Hosted)

**Perfect for:** Custom infrastructure, VPS, or private cloud

### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Copy necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start the app
CMD ["npm", "start"]
```

### Step 2: Create .dockerignore

```
node_modules
.next
.git
.env.local
.vercel
.wrangler
.cursor
npm-debug.log
```

### Step 3: Build Docker Image

```bash
docker build -t challenger-deep:latest .
```

### Step 4: Run Container

```bash
docker run -d \
  --name challenger-deep \
  -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your_key \
  -e JWT_SECRET=your_secret \
  challenger-deep:latest
```

### Step 5: Using Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY}
      - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}
      - NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    volumes:
      - ./public:/app/public:ro
    networks:
      - challenger-net

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - challenger-net
    restart: unless-stopped

networks:
  challenger-net:
    driver: bridge
```

Run with:

```bash
docker-compose up -d
```

### ✅ Done!

Your app is now running at `http://localhost:3000`

**Docker Advantages:**
- ✅ Full control over infrastructure
- ✅ Reproducible deployments
- ✅ Easy scaling with orchestration
- ✅ Works on any cloud provider
- ✅ Isolated environment

---

## 🔧 Post-Deployment Configuration

### 1. Set Up Custom Domain

**Vercel:**
```bash
# Add domain via CLI
vercel domains add yourdomain.com

# Or use the dashboard
```

**Cloudflare:**
- Add domain in Cloudflare Pages dashboard
- DNS is automatically configured

### 2. Configure SSL/HTTPS

- **Vercel**: Automatic HTTPS with Let's Encrypt
- **Cloudflare**: Automatic HTTPS with Cloudflare SSL
- **Docker**: Use Nginx with Let's Encrypt (certbot)

### 3. Enable Monitoring

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

// In layout
<Analytics />
```

**Cloudflare Web Analytics:**
```html
<!-- Add to layout.tsx -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "your-token"}'></script>
```

### 4. Set Up CI/CD

**GitHub Actions** (`.github/workflows/deploy.yml`):

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm run deploy
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 🔍 Testing Your Deployment

### 1. Feature Verification

```bash
# Test all endpoints
curl https://your-domain.com/api/games?page=1&limit=10
curl https://your-domain.com/api/proxy/game?url=https://example.com
```

### 2. Performance Testing

```bash
# Install Lighthouse
npm install -g lighthouse

# Run performance audit
lighthouse https://your-domain.com --view
```

### 3. Load Testing

```bash
# Install Apache Bench
brew install httpd  # macOS
apt-get install apache2-utils  # Linux

# Test with 1000 requests, 10 concurrent
ab -n 1000 -c 10 https://your-domain.com/
```

### 4. Manual Checklist

- [ ] Homepage loads correctly
- [ ] Games library displays 20K+ games
- [ ] Game proxy works (click any game)
- [ ] Android page loads
- [ ] Windows page loads
- [ ] Library page loads
- [ ] Account page loads
- [ ] Material Symbols icons display
- [ ] Mobile responsive design works
- [ ] All API endpoints respond

---

## 🚨 Troubleshooting

### Build Fails on Vercel/Cloudflare

**Error**: "Module not found"
```bash
# Solution: Ensure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

**Error**: "Out of memory"
```bash
# Solution: Increase Node memory in build command
# Vercel: Settings → Build & Development Settings → Build Command
node --max-old-space-size=4096 ./node_modules/.bin/next build
```

### Environment Variables Not Working

1. Check variable names (must start with `NEXT_PUBLIC_` for client-side)
2. Redeploy after adding variables
3. Clear cache: `vercel env pull` or rebuild

### Games Not Loading

1. Verify `public/games.json` exists and is deployed
2. Check API endpoint: `/api/games`
3. Check browser console for CORS errors
4. Verify proxy endpoint works: `/api/proxy/game`

### SSL Certificate Issues

```bash
# Cloudflare: Set SSL mode to "Full"
# Docker: Use certbot
certbot --nginx -d yourdomain.com
```

---

## 📊 Monitoring & Maintenance

### Health Check Endpoints

Create `app/api/health/route.ts`:

```typescript
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: Date.now(),
    version: process.env.npm_package_version
  });
}
```

### Uptime Monitoring

**Free Services:**
- UptimeRobot: https://uptimerobot.com
- StatusCake: https://www.statuscake.com
- Pingdom: https://www.pingdom.com

**Setup:**
1. Create account
2. Add monitor for `https://your-domain.com/api/health`
3. Set alert threshold: 5 minutes downtime
4. Add notification email/Slack/Discord

### Log Aggregation

**Vercel:**
- Built-in logs in dashboard
- Real-time log streaming: `vercel logs`

**Cloudflare:**
- Workers logs in dashboard
- Use Logpush for external services

**Docker:**
- Use `docker logs challenger-deep -f`
- Or integrate with ELK stack, Grafana, etc.

---

## 💰 Cost Optimization

### Free Tier Limits

**Vercel Free:**
- 100 GB bandwidth/month
- 100 deployments/day
- Unlimited team members
- **Perfect for**: Small to medium traffic

**Cloudflare Pages Free:**
- Unlimited bandwidth
- 500 builds/month
- 100,000 requests/day
- **Perfect for**: High traffic sites

### Scaling Recommendations

**0-10K users/month**: Free tier (Vercel/Cloudflare)
**10K-100K users/month**: Vercel Pro ($20/mo) or CF Pages Pro ($20/mo)
**100K+ users/month**: Enterprise plans or self-hosted

---

## 🎉 Success!

Your Challenger Deep deployment is complete! 🌊

**Next Steps:**
1. Share your deployment URL with the team
2. Set up monitoring and alerts
3. Configure custom domain
4. Enable analytics
5. Set up automated backups

**Need Help?**
- Check the main [README.md](README.md)
- Run `node scripts/verify-features.js`
- Open an issue on GitHub
- Join our Discord community

---

**Built with ❤️ by the Abyss OS Team**