# Yandex Games Extraction - Final Report

## Summary

Successfully extracted **85 unique games** from all available sources.

## Sources Analyzed

1. **file.html** (1.2 MB) - Static HTML export of Yandex Games catalog
   - Found: 67 games
   - Contains: Initially rendered games from the catalog page

2. **stuff.js** (347 KB) - Minified JavaScript bundle
   - Found: 0 games
   - Contains: React/Redux library code, no game data

3. **stufff.js** (2.9 MB) - Larger minified JavaScript bundle  
   - Found: 18 games
   - Contains: Additional game references embedded in the code

## Final Results

### Total Extraction
- **85 unique games** identified
- **43 games with titles** (50%)
- **42 games without titles** (50%)

### Data Quality
| Metric | Count | Percentage |
|--------|-------|------------|
| Total Games | 85 | 100% |
| With Titles | 43 | 50% |
| With Images | 22 | 26% |
| ID Only | 42 | 50% |

## Sample Games Extracted

| ID | Title |
|----|-------|
| 165389 | Friday Night Funkin' |
| 165291 | Mr Bullet 2 |
| 280868 | Dustrix |
| 473855 | Soccer Sniper |
| 451835 | Extreme Drift: Highway Clash |
| 288720 | Race Survival: Arena King |
| 453319 | Pixel Car Racer |
| 255242 | Sky Race 3D |
| 260481 | Melon Sandbox |
| 260534 | Snow Chase |
| 197304 | Basket Random |
| 203554 | My Waterpark |
| 223034 | Stickman Spider Superhero with hook |
| 257923 | Obby but You're on a Bike |
| 274415 | Deadly Descent |

## Files Generated

### JSON Files
1. **yandex_games_FINAL.json** - ⭐ **MAIN FILE** - All 85 games combined
2. **yandex_games_all.json** - 67 games from HTML
3. **yandex_games_from_js.json** - 18 games from JS files
4. **yandex_games_titled.json** - 43 games with titles only

### Text Files
1. **all_game_ids.txt** - All game IDs from HTML
2. **game_ids_from_js.txt** - Game IDs from JS files
3. **all_potential_game_ids.txt** - All potential IDs found

### Documentation
1. **GAME_EXTRACTION_SUMMARY.md** - Initial extraction summary
2. **EXTRACTION_FINAL_REPORT.md** - This file

## Why Only 85 Games (Not 1,000+)?

The provided files are **static exports** that only contain:
- Initially rendered content (first page load)
- Embedded library code and configuration
- **NOT** the full dynamic catalog

The complete Yandex Games catalog (1,000+ games) is loaded dynamically via API calls as users scroll through the page. These API calls are not captured in static HTML/JS exports.

## To Get ALL Games

To extract the complete catalog of 1,000+ games, you would need:

### Option 1: Headless Browser Automation
```javascript
// Using Puppeteer
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://yandex.com/games/');
  
  // Scroll to load all games
  await autoScroll(page);
  
  // Extract game data
  const games = await page.evaluate(() => {
    // Extract from DOM
  });
  
  await browser.close();
})();
```

### Option 2: API Access with Authentication
- Capture valid session cookies from a browser
- Make authenticated requests to: `https://games.yandex.com/games/api/catalog/v2`
- Paginate through all results

### Option 3: Browser DevTools
1. Open https://yandex.com/games/ in Chrome
2. Open DevTools → Network tab
3. Scroll through entire catalog
4. Export all API responses containing game data

## Conclusion

Successfully extracted **85 games** from the provided static files. This represents the initially rendered content from the Yandex Games catalog. To obtain the full catalog of 1,000+ games, dynamic scraping methods (headless browser or authenticated API access) would be required.

---

**Extraction Date:** 2026-01-11  
**Main Output File:** `yandex_games_FINAL.json`  
**Total Games:** 85  
**Games with Titles:** 43
