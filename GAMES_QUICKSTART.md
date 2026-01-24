# Games Feature - Quick Start Guide

## 🎮 Overview

Bellum now includes a fully functional games arcade with **20,865 HTML5 games** from GameDistribution. All games are playable directly in the browser with no downloads required.

## 🚀 Quick Start

### 1. Start the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

### 2. Navigate to Games

Open your browser and go to:
```
http://localhost:3000/games
```

### 3. Browse and Play

- **Browse**: Scroll through the grid of games
- **Search**: Use the search bar to find games by ID
- **Load More**: Click "Load More Games" to see additional pages
- **Play**: Click any game card to launch it full-screen
- **Install**: Click the download icon to save to your library

## 📁 Key Files

| File | Purpose |
|------|---------|
| `/public/games.xml` | 20,865 game entries (187K lines) |
| `/lib/games-parser.ts` | XML parser with caching |
| `/app/games/page.tsx` | Games UI and player |
| `/public/nacho-proxy-sw.js` | CORS proxy service worker |
| `/test-games-parser.html` | Standalone test page |

## 🔧 How It Works

### Architecture

```
User Browser
    ↓
Next.js App (/games)
    ↓
games-parser.ts (loads games.xml)
    ↓
DOMParser (parses XML)
    ↓
Cache (in-memory, 10 min TTL)
    ↓
Paginated Results (24 per page)
    ↓
Game Grid UI
    ↓
User clicks game
    ↓
Full-screen iframe
    ↓
Service Worker (nacho-proxy-sw.js)
    ↓
CORS Proxy + Cache
    ↓
Game loads from gamedistribution.com
```

### Performance

- **Initial Load**: 2-3 seconds (downloads & parses 15MB XML)
- **Subsequent Pages**: <100ms (uses cached XML)
- **Game Launch**: 1-2 seconds (first time), instant (cached)
- **Memory**: ~50MB for cached XML
- **Storage**: Up to 500MB for game assets

### Caching Strategy

1. **XML Cache**: In-memory, 10-minute TTL
2. **Service Worker Cache**: Persistent, 7-day TTL, 500MB max
3. **LRU Eviction**: Oldest entries removed when cache is full

## 🎯 Features

### ✅ Implemented

- [x] Load 20,865 games from XML
- [x] Pagination (24 games per page)
- [x] Search by game ID
- [x] Full-screen game player
- [x] CORS proxy (automatic)
- [x] Caching (XML + game assets)
- [x] Install to library
- [x] Loading indicators
- [x] Error handling
- [x] Responsive design

### 🔜 Coming Soon

- [ ] Game metadata (titles, descriptions)
- [ ] Categories and filtering
- [ ] Full-text search
- [ ] Favorites
- [ ] Recently played
- [ ] User ratings
- [ ] WASM parser (10-20x faster)

## 🧪 Testing

### Option 1: Test in Next.js App

1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000/games`
3. Browse and play games

### Option 2: Standalone Test Page

1. Start a local server in the project root
2. Visit: `http://localhost:3000/test-games-parser.html`
3. Click "Test Parser" to verify functionality

### Test Checklist

- [ ] XML loads without errors
- [ ] Total count shows 20,865 games
- [ ] First page displays 24 games
- [ ] "Load More" appends next 24 games
- [ ] Search filters games correctly
- [ ] Clicking a game opens full-screen player
- [ ] Game loads in iframe
- [ ] Service Worker registers
- [ ] Console shows proxy logs
- [ ] Back button returns to grid
- [ ] Install to library works

## 🐛 Troubleshooting

### Games XML Not Loading

**Symptom**: "No Games Loaded" message

**Solutions**:
1. Check that `/public/games.xml` exists
2. Verify file size (~15MB)
3. Check browser console for errors
4. Try clearing cache and reloading

### Service Worker Not Registering

**Symptom**: CORS errors in console

**Solutions**:
1. Ensure you're using HTTPS or localhost
2. Check that `/public/nacho-proxy-sw.js` exists
3. Open DevTools → Application → Service Workers
4. Verify "nacho-proxy-sw.js" is registered
5. Try unregistering and reloading

### Games Not Loading in Iframe

**Symptom**: Blank iframe or error message

**Solutions**:
1. Check Service Worker is active
2. Verify game URL is correct
3. Check browser console for errors
4. Try a different game
5. Clear Service Worker cache

### Slow Performance

**Symptom**: Long load times, freezing

**Solutions**:
1. Check XML cache is working (should only load once)
2. Verify Service Worker is caching assets
3. Check browser memory usage
4. Try reducing page size in code
5. Clear browser cache

## 📊 Performance Monitoring

### Console Logs

The parser logs useful metrics:

```
🎮 Loading games.xml (20,000+ games)...
📦 Downloaded 14.52MB XML file
✅ Games XML loaded and parsed in 2341ms
📄 Loading page 1 (games 1-24 of 20865)
```

### Service Worker Logs

The proxy logs intercepted requests:

```
[NachoProxy] Intercepting: html5.gamedistribution.com
[NachoProxy] Cache hit: https://img.gamedistribution.com/...
[NachoProxy] Fetching: https://html5.gamedistribution.com/...
```

## 🔐 Security

### Iframe Sandbox

Games run in a sandboxed iframe with limited permissions:

```html
<iframe 
  sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
  allowFullScreen
/>
```

### Service Worker Scope

The Service Worker only intercepts external requests to known game domains:

- `gamedistribution.com`
- `html5.gamedistribution.com`
- `img.gamedistribution.com`
- Common CDNs (cloudflare, jsdelivr, etc.)

## 📱 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Edge | ✅ Full | Chromium-based |
| Firefox | ✅ Full | Works well |
| Safari | ⚠️ Partial | Service Workers may be limited |
| Mobile | ✅ Full | Responsive design |

## 🎨 Customization

### Change Page Size

Edit `/lib/games-parser.ts`:

```typescript
const data = await fetchGames(pageToLoad, 24); // Change 24 to desired size
```

### Change Cache Duration

Edit `/lib/games-parser.ts`:

```typescript
const CACHE_DURATION = 10 * 60 * 1000; // Change to desired duration (ms)
```

### Add More Proxy Domains

Edit `/public/nacho-proxy-sw.js`:

```javascript
function shouldProxy(url) {
  if (url.hostname.includes('your-domain.com')) return true;
  // ... existing checks
}
```

## 📈 Analytics

To track game plays, add analytics to the game player:

```typescript
// In app/games/page.tsx
const handleGamePlay = (game: Game) => {
  setSelectedGame(game);
  setGameLoading(true);
  
  // Add your analytics here
  analytics.track('game_played', {
    game_id: game.id,
    game_title: game.title,
    timestamp: Date.now()
  });
};
```

## 🤝 Contributing

To add more games:

1. Add entries to `/public/games.xml`
2. Follow the sitemap format
3. Test with the parser
4. Verify games load correctly

## 📝 License

Games are provided by GameDistribution. Please respect their terms of service.

## 🆘 Support

If you encounter issues:

1. Check this guide
2. Review console logs
3. Test with standalone test page
4. Check browser compatibility
5. Clear all caches and try again

## ✅ Success Criteria

Your games feature is working correctly if:

- ✅ All 20,865 games load
- ✅ Pagination works smoothly
- ✅ Games play without CORS errors
- ✅ Loading is fast (<3s initial)
- ✅ Caching reduces subsequent loads
- ✅ UI is responsive and user-friendly

---

**Status**: ✅ Fully Functional

**Last Updated**: January 23, 2026

**Version**: 1.0.0
