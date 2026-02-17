# ⚡ Quick Start Guide

Get Challenger Deep running in **5 minutes**!

---

## 🎯 TL;DR

```bash
# Clone, install, and run
git clone https://github.com/yourusername/challenger-deep.git
cd challenger-deep
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 - **Done!** 🎉

---

## 📋 Prerequisites

- **Node.js 18+** (check: `node -v`)
- **npm, pnpm, or bun** (pick one)
- **Modern browser** (Chrome 113+, Edge 113+, Firefox 115+)

---

## 🚀 Step-by-Step Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/challenger-deep.git
cd challenger-deep
```

### 2️⃣ Install Dependencies

**Using npm:**
```bash
npm install
```

**Using pnpm (recommended):**
```bash
pnpm install
```

**Using bun (fastest):**
```bash
bun install
```

### 3️⃣ Configure Environment

```bash
# Copy the template
cp .env.example .env.local

# Edit with your values (optional for local dev)
nano .env.local
```

**Minimum required for local testing:**
```bash
# Generate a random JWT secret
JWT_SECRET=your_random_secret_key_minimum_32_characters_here
```

**For full functionality, add Firebase config:**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... etc
```

### 4️⃣ Run Development Server

```bash
npm run dev
```

Wait for:
```
✓ Ready in 2.3s
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000
```

### 5️⃣ Open in Browser

Navigate to: **http://localhost:3000**

You should see:
- 🏠 **Homepage** with feature cards
- 🎮 **20,865 games** in the games library
- 📱 **Android** APK runner
- 💻 **Windows** EXE runner

---

## ✅ Verify Installation

Run the comprehensive verification:

```bash
node scripts/verify-features.js
```

You should see:
```
✓ Passed:       59
✗ Failed:       0
Success Rate:   100.0%

🎉 All critical features are operational!
```

---

## 🎮 Try It Out

### Play a Game

1. Click **"Games"** in the sidebar
2. Browse 20,865+ HTML5 games
3. Click any game to play instantly
4. Enjoy! 🎉

### Run an Android APK

1. Click **"Android"** in the sidebar
2. Drag and drop an `.apk` file
3. Watch it boot and run
4. Check the logs for details

### Run a Windows EXE

1. Click **"Windows"** in the sidebar
2. Drag and drop an `.exe` file
3. Watch it execute
4. See it render on canvas

---

## 🔧 Common Issues

### Port 3000 Already in Use?

```bash
# Use a different port
PORT=3001 npm run dev
```

### Build Errors?

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Games Not Loading?

Check that `public/games.json` exists:
```bash
ls -lh public/games.json
# Should show: -rw-r--r--  7.4M  games.json
```

### Material Icons Not Showing?

Check the browser console. If you see font errors, the CDN might be blocked. The icons are loaded from Google Fonts in `app/layout.tsx`.

---

## 🚀 Next Steps

### 1. Deploy to Production

**Easiest (Vercel):**
```bash
npm install -g vercel
vercel --prod
```

**Fastest (Cloudflare):**
```bash
npm run build:cloudflare
npm run deploy:cloudflare
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides.

### 2. Customize

- **Theme**: Edit `app/globals.css` colors
- **Logo**: Replace assets in `public/`
- **Features**: Toggle in `.env.local`

### 3. Add Content

- **Games**: Replace `public/games.json` with your catalog
- **Apps**: Add to the library system
- **Pages**: Create new routes in `app/`

---

## 📚 Learn More

- **Full Documentation**: [README.md](README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Feature Status**: [FEATURE_STATUS.md](FEATURE_STATUS.md)
- **API Reference**: Check `/app/api/` folders

---

## 🆘 Need Help?

1. **Check logs**: Browser console and terminal
2. **Run verification**: `node scripts/verify-features.js`
3. **Read docs**: [README.md](README.md)
4. **Open issue**: GitHub Issues
5. **Join Discord**: Community support

---

## 🎉 You're Ready!

Your Challenger Deep installation is complete. Here's what you can do:

✅ **Play 20,865+ games** instantly  
✅ **Run Android APKs** in the browser  
✅ **Execute Windows EXEs** client-side  
✅ **Deploy to production** in minutes  
✅ **Customize everything** to your needs  

**Enjoy the deepest execution layer on the web!** 🌊

---

**Built with ❤️ by the Abyss OS Team**

[🌊 Visit Challenger Deep](https://your-domain.com) | [⭐ Star on GitHub](https://github.com/yourusername/challenger-deep)