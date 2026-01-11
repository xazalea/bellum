#!/usr/bin/env python3
"""
Fetch ALL games from Yandex Games API using urllib (no external dependencies)
"""
import urllib.request
import urllib.parse
import json
import time
from typing import List, Dict

BASE_API = "https://games.yandex.com/games/api"

def fetch_catalog_page(offset=0, limit=100):
    """Fetch a page of games from the catalog"""
    url = f"{BASE_API}/catalog/v2"
    
    params = urllib.parse.urlencode({
        'offset': offset,
        'limit': limit,
        'lang': 'en',
        'platform': 'desktop'
    })
    
    full_url = f"{url}?{params}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://yandex.com/games/',
        'Origin': 'https://yandex.com'
    }
    
    try:
        req = urllib.request.Request(full_url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            return json.loads(data.decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")
        return None

def fetch_all_games():
    """Fetch all games from the API"""
    all_games = []
    offset = 0
    limit = 100
    page = 1
    
    print(f"Fetching games from Yandex Games API...")
    print(f"API: {BASE_API}/catalog/v2")
    print(f"{'='*70}\n")
    
    while True:
        print(f"Page {page} (offset {offset})...", end=' ')
        
        data = fetch_catalog_page(offset, limit)
        
        if not data:
            print("❌ Failed")
            break
        
        # Try different possible response structures
        games_in_page = []
        
        if isinstance(data, dict):
            if 'games' in data:
                games_in_page = data['games']
            elif 'items' in data:
                games_in_page = data['items']
            elif 'data' in data:
                if isinstance(data['data'], list):
                    games_in_page = data['data']
                elif isinstance(data['data'], dict) and 'games' in data['data']:
                    games_in_page = data['data']['games']
                elif isinstance(data['data'], dict) and 'items' in data['data']:
                    games_in_page = data['data']['items']
        elif isinstance(data, list):
            games_in_page = data
        
        if not games_in_page:
            print(f"❌ No games (keys: {list(data.keys()) if isinstance(data, dict) else 'list'})")
            # Save the response for debugging
            with open(f'/Users/rohan/bellum/api_response_page_{page}.json', 'w') as f:
                json.dump(data, f, indent=2)
            print(f"\n   Response saved to api_response_page_{page}.json")
            break
        
        print(f"✓ {len(games_in_page)} games")
        
        all_games.extend(games_in_page)
        
        # Check if we've reached the end
        if len(games_in_page) < limit:
            print(f"\n✓ Reached end (last page: {len(games_in_page)} games)")
            break
        
        offset += limit
        page += 1
        
        # Be nice to the API
        time.sleep(0.5)
        
        # Safety limit
        if page > 100:
            print(f"\n⚠️  Reached page limit (100 pages)")
            break
    
    return all_games

def try_alternative_endpoints():
    """Try alternative API endpoints"""
    endpoints = [
        "/catalog/v2",
        "/catalog",
        "/v1/catalog",
        "/v2/catalog",
        "/games",
        "/list",
        "/all",
        "/search"
    ]
    
    print("\n" + "="*70)
    print("TRYING ALTERNATIVE ENDPOINTS")
    print("="*70)
    
    for endpoint in endpoints:
        url = f"{BASE_API}{endpoint}"
        print(f"\n{endpoint}:")
        print(f"  URL: {url}")
        
        try:
            params = urllib.parse.urlencode({'limit': 10, 'lang': 'en'})
            full_url = f"{url}?{params}"
            
            req = urllib.request.Request(
                full_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://yandex.com/games/'
                }
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                status = response.status
                data = json.loads(response.read().decode('utf-8'))
                
                print(f"  Status: {status}")
                print(f"  Type: {type(data)}")
                
                if isinstance(data, dict):
                    print(f"  Keys: {list(data.keys())[:10]}")
                elif isinstance(data, list):
                    print(f"  Length: {len(data)}")
                
                # Save response
                filename = f"/Users/rohan/bellum/api_test_{endpoint.replace('/', '_')}.json"
                with open(filename, 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"  ✓ Saved: {filename}")
            
        except urllib.error.HTTPError as e:
            print(f"  ❌ HTTP {e.code}: {e.reason}")
        except Exception as e:
            print(f"  ❌ Error: {e}")

def main():
    print("="*70)
    print("YANDEX GAMES API - FETCH ALL GAMES")
    print("="*70)
    print()
    
    # Try to fetch all games
    games = fetch_all_games()
    
    if games:
        print(f"\n{'='*70}")
        print(f"TOTAL GAMES FETCHED: {len(games)}")
        print(f"{'='*70}")
        
        # Save to JSON
        output_file = '/Users/rohan/bellum/yandex_games_from_api.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'total_games': len(games),
                'fetched_at': '2026-01-11',
                'source': 'Yandex Games API',
                'api_url': BASE_API,
                'games': games
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ Saved to: {output_file}")
        
        # Print sample
        print(f"\nFirst 20 games:")
        for i, game in enumerate(games[:20], 1):
            game_id = game.get('id', game.get('appId', 'N/A'))
            title = game.get('title', game.get('name', 'N/A'))
            print(f"{i:3d}. [{game_id}] {title}")
        
        if len(games) > 20:
            print(f"\n... and {len(games) - 20} more")
    else:
        print("\n⚠️  No games fetched. Trying alternative endpoints...")
        try_alternative_endpoints()
    
    print("\n" + "="*70)
    print("DONE")
    print("="*70)

if __name__ == '__main__':
    main()
