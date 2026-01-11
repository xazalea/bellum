# Yandex Games Extraction Summary

## Overview
Attempted to extract all games from the Yandex Games platform. The `file.html` is a **static export** of the catalog page, containing only the initially rendered games.

## Results

### Games Found in file.html
- **Total unique games extracted: 67**
- **Games with titles: 43 (64%)**
- **Games with images: 22 (32%)**

### Why Only 67 Games?
The `file.html` is a static HTML export that only contains:
1. The initial page load (first ~24 visible games)
2. Some embedded metadata and category tags
3. References to games in the initial state

The full Yandex Games catalog (1,000+ games) is loaded dynamically via their API as users scroll through the catalog.

## API Information

### Discovered API Endpoint
```
Base URL: https://games.yandex.com/games/api
Catalog: https://games.yandex.com/games/api/catalog/v2
```

### API Access Issues
- The API requires proper authentication/session cookies
- CORS restrictions prevent direct browser access
- SSL certificate verification issues in Python
- The API appears to be protected against scraping

## Extracted Data Files

1. **yandex_games_all.json** - All 67 games extracted from HTML
2. **yandex_games_titled.json** - 43 games with titles
3. **all_game_ids.txt** - List of all game IDs
4. **game_ids.txt** - Alternative game ID list

## Sample Games Extracted

| ID     | Title                                  |
|--------|----------------------------------------|
| 165389 | Friday Night Funkin'                   |
| 280868 | Dustrix                                |
| 165291 | Mr Bullet 2                            |
| 473855 | Soccer Sniper                          |
| 451835 | Extreme Drift: Highway Clash           |
| 288720 | Race Survival: Arena King              |
| 453319 | Pixel Car Racer                        |
| 255242 | Sky Race 3D                            |
| 260481 | Melon Sandbox                          |
| 260534 | Snow Chase                             |

## To Get ALL 1,000+ Games

### Option 1: Use Browser DevTools
1. Open https://yandex.com/games/ in a browser
2. Open DevTools (F12) → Network tab
3. Scroll through the entire catalog (triggering API calls)
4. Export all API responses containing game data

### Option 2: Use a Headless Browser
Use Puppeteer/Playwright to:
1. Load the page
2. Scroll to trigger lazy loading
3. Extract all game data as it loads

### Option 3: Reverse Engineer the API
1. Capture a valid session with cookies
2. Replay API requests with proper authentication
3. Paginate through all catalog pages

### Option 4: Use Existing Datasets
Search for existing Yandex Games datasets or archives that may have already cataloged the games.

## Extraction Scripts Created

1. **extract_games.py** - Initial extraction attempt
2. **extract_all_games.py** - Enhanced extraction
3. **extract_comprehensive.py** - Comprehensive extraction (BEST)
4. **fetch_games_urllib.py** - API fetching attempt (blocked)
5. **fetch_all_games_from_api.py** - API with requests library

## Recommendation

The most reliable way to get all 1,000+ games is to:
1. Use a headless browser (Puppeteer/Playwright)
2. Load the Yandex Games catalog page
3. Scroll programmatically to load all games
4. Extract game data from the DOM as it loads
5. Export to JSON

This would bypass API restrictions and work like a real user browsing the site.
