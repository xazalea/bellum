# Yandex Games API - Complete Guide

## 🎯 Main API Endpoints Found

### Base APIs
```
https://games.yandex.com/games/api
https://games-sdk.yandex.com/games/api/sdk/v1
https://sse.games.yandex.com/games/notifyapi/v1
```

## 📚 Catalog API Endpoints

### Catalog V2 (Primary)
```
Base: https://games.yandex.com/games/api

Endpoints:
/catalogue/v2/all_games/          - Get all games
/catalogue/v2/best_games/         - Get best/top games
/catalogue/v2/developer_games     - Get games by developer
/catalogue/v2/get_games           - Get games (general endpoint)
/catalogue/v2/similar_games/      - Get similar games
```

### Example API Calls

#### Get All Games
```bash
curl "https://games.yandex.com/games/api/catalogue/v2/all_games/?limit=100&offset=0" \
  -H "User-Agent: Mozilla/5.0" \
  -H "Accept: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIES"
```

#### Get Best Games
```bash
curl "https://games.yandex.com/games/api/catalogue/v2/best_games/?limit=100" \
  -H "User-Agent: Mozilla/5.0" \
  -H "Accept: application/json"
```

#### Get Games (General)
```bash
curl "https://games.yandex.com/games/api/catalogue/v2/get_games?limit=100&offset=0" \
  -H "User-Agent: Mozilla/5.0" \
  -H "Accept: application/json"
```

## 🔑 Authentication

These APIs require:
1. **Valid session cookies** from an active Yandex Games session
2. **CSRF token** for write operations
3. **User-Agent header** to mimic a browser

### Getting Session Cookies
1. Open https://yandex.com/games/ in your browser
2. Open DevTools → Application → Cookies
3. Copy the following cookies:
   - `Session_id`
   - `sessionid2`
   - `yandexuid`
   - `i`

## 📊 API Parameters

### Common Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | integer | Number of games to return | `100` |
| `offset` | integer | Pagination offset | `0`, `100`, `200` |
| `lang` | string | Language code | `en`, `ru` |
| `platform` | string | Platform type | `desktop`, `mobile` |

## 🌐 Additional Endpoints

### OAuth
```
/api/oauth/v1/web/token/renew/
```

### CDN & Assets
```
https://avatars.mds.yandex.net/get-games/{GAME_ID}/{HASH}/
https://yandex.com/games/cdn/
```

### SDK
```
https://games-sdk.yandex.com/games/api/sdk/v1
```

### Notifications
```
https://sse.games.yandex.com/games/notifyapi/v1
```

## 💡 Usage Example (Python)

### Using urllib (No dependencies)
```python
import urllib.request
import json

# Set up headers
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Cookie': 'YOUR_COOKIES_HERE'
}

# Fetch all games
url = 'https://games.yandex.com/games/api/catalogue/v2/all_games/?limit=100&offset=0'
req = urllib.request.Request(url, headers=headers)

with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))
    games = data['games']  # or data['items'], depending on response
    print(f"Found {len(games)} games")
```

### Using requests
```python
import requests

headers = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
}

# Fetch with pagination
all_games = []
offset = 0
limit = 100

while True:
    response = requests.get(
        'https://games.yandex.com/games/api/catalogue/v2/all_games/',
        params={'limit': limit, 'offset': offset},
        headers=headers
    )
    
    data = response.json()
    games = data.get('games', [])
    
    if not games:
        break
    
    all_games.extend(games)
    offset += limit
    
    print(f"Fetched {len(all_games)} games so far...")

print(f"Total: {len(all_games)} games")
```

## 🚀 Headless Browser Approach (Recommended)

For the most reliable results, use a headless browser to:
1. Load the page
2. Scroll to trigger lazy loading
3. Extract data from the DOM

### Using Puppeteer (Node.js)
```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://yandex.com/games/');
  
  // Scroll to load all games
  await autoScroll(page);
  
  // Extract game data
  const games = await page.evaluate(() => {
    const gameElements = document.querySelectorAll('[data-game-id]');
    return Array.from(gameElements).map(el => ({
      id: el.getAttribute('data-game-id'),
      title: el.querySelector('.game-title')?.textContent,
      url: el.querySelector('a')?.href
    }));
  });
  
  console.log(`Found ${games.length} games`);
  await browser.close();
})();

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
```

## 📝 Response Format

Expected response structure:
```json
{
  "games": [
    {
      "id": 123456,
      "title": "Game Name",
      "description": "Game description",
      "url": "https://yandex.com/games/app/123456",
      "image": "https://avatars.mds.yandex.net/get-games/...",
      "developer": "Developer Name",
      "rating": 4.5,
      "plays": 1000000
    }
  ],
  "total": 1500,
  "offset": 0,
  "limit": 100
}
```

## ⚠️ Important Notes

1. **Rate Limiting**: Yandex may rate-limit API requests. Add delays between requests.
2. **Authentication**: Most endpoints require valid session cookies.
3. **CORS**: Direct browser requests will be blocked by CORS. Use a proxy or server-side requests.
4. **SSL Certificates**: Ensure your environment has up-to-date SSL certificates.
5. **User-Agent**: Always include a valid User-Agent header.

## 🔍 Alternative: Browser DevTools Method

1. Open https://yandex.com/games/ in Chrome
2. Open DevTools (F12) → Network tab
3. Filter by "XHR" or "Fetch"
4. Scroll through the catalog
5. Look for requests to `/catalogue/v2/`
6. Copy the request as cURL
7. Modify and replay the requests

## 📦 Summary

**Main Catalog API:**
```
https://games.yandex.com/games/api/catalogue/v2/all_games/
```

**Parameters:**
- `limit`: 100 (max per request)
- `offset`: 0, 100, 200, ... (for pagination)

**Expected Total Games:** 1,000+

**Best Method:** Headless browser (Puppeteer/Playwright) or authenticated API requests with proper cookies.

---

**Created:** 2026-01-11  
**Source:** Extracted from stufff.js and state_data.txt
