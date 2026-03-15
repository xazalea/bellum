# Production Deployment Guide

## Prerequisites

1. Node.js 18+ installed
2. pnpm package manager
3. Accounts set up for:
   - Vercel (or Cloudflare Pages)
   - Firebase
   - Sentry (error tracking)
   - CDN provider (Cloudflare)

## Environment Setup

1. Copy `.env.production` to `.env.production.local`
2. Fill in all required environment variables

### Required Variables

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI Providers
GLM_FREE_API_URL=
GLM_FREE_API_KEY=
FREE_ONE_API_URL=
FREE_ONE_API_KEY=
WEB_AI_API_URL=
WEB_AI_API_KEY=

# Cloud Storage
DISCORD_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Error Tracking
SENTRY_DSN=

# CDN
CDN_URL=
```

## Deployment Steps

### 1. Build the Application

```bash
pnpm install
pnpm build
```

### 2. Deploy to Vercel

```bash
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 3. Configure Custom Domain

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your domain (e.g., bellum.games)
3. Configure DNS records as instructed

### 4. SSL Configuration

Vercel automatically provisions SSL certificates via Let's Encrypt.

### 5. Configure CDN

1. Set up Cloudflare CDN
2. Configure cache rules:
   - `/games/*`: Cache for 24 hours
   - `/thumbnails/*`: Cache for 7 days
   - `/emulators/*`: Cache for 30 days
   - `/api/*`: No cache

### 6. Set Up Monitoring

1. Create Sentry project
2. Add SENTRY_DSN to environment variables
3. Verify error tracking is working

### 7. Set Up Analytics

1. Create Google Analytics 4 property
2. Add GA_ID to environment variables
3. Verify tracking is working

## Post-Deployment Verification

### Health Checks

1. Visit `/api/health` - Should return 200 OK
2. Test authentication flow
3. Test game loading
4. Test APK/EXE upload
5. Test AI chat
6. Test cloud save sync

### Performance Checks

1. Run Lighthouse audit
2. Check Core Web Vitals
3. Verify CDN is serving assets
4. Check error rates in Sentry

## Rollback Procedure

If issues are detected:

```bash
vercel rollback
```

## Monitoring

- **Errors**: Check Sentry dashboard
- **Performance**: Check Vercel Analytics
- **Uptime**: Configure uptime monitoring (e.g., Pingdom)

## Scaling Considerations

1. **Database**: Consider upgrading Firebase plan
2. **CDN**: Ensure adequate bandwidth
3. **Compute**: Consider Vercel Pro for more resources

## Security Checklist

- [ ] All environment variables set
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation working
- [ ] Authentication flow tested
- [ ] Error messages don't leak sensitive info

## Support

For deployment issues, check:
1. Vercel deployment logs
2. Browser console errors
3. Sentry error reports