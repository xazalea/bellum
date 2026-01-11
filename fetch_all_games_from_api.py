#!/usr/bin/env python3
"""
Fetch ALL games from Yandex Games API
"""
import requests
import json
import time
from typing import List, Dict

BASE_API = "https://games.yandex.com/games/api"

def fetch_catalog_page(offset=0, limit=100):
    """Fetch a page of games from the catalog"""
    url = f"{BASE_API}/catalog/v2"
    
    params = {
        'offset': offset,
        'limit': limit,
        'lang': 'en',
        'platform': 'desktop'
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://yandex.com/games/',
        'Origin': 'https://yandex.com'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching page at offset {offset}: {e}")
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
        print(f"Fetching page {page} (offset {offset}, limit {limit})...", end=' ')
        
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
            print(f"❌ No games found (response keys: {list(data.keys()) if isinstance(data, dict) else 'list'})")
            # Save the response for debugging
            with open(f'/Users/rohan/bellum/api_response_page_{page}.json', 'w') as f:
                json.dump(data, f, indent=2)
            print(f"   Response saved to api_response_page_{page}.json for debugging")
            break
        
        print(f"✓ {len(games_in_page)} games")
        
        all_games.extend(games_in_page)
        
        # Check if we've reached the end
        if len(games_in_page) < limit:
            print(f"\n✓ Reached end of catalog (last page had {len(games_in_page)} games)")
            break
        
        offset += limit
        page += 1
        
        # Be nice to the API
        time.sleep(0.5)
    
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
        "/all"
    ]
    
    print("\nTrying alternative endpoints...")
    print("="*70)
    
    for endpoint in endpoints:
        url = f"{BASE_API}{endpoint}"
        print(f"\nTrying: {url}")
        
        try:
            response = requests.get(
                url,
                params={'limit': 10, 'lang': 'en'},
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://yandex.com/games/'
                },
                timeout=10
            )
            
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"  Response type: {type(data)}")
                    if isinstance(data, dict):
                        print(f"  Keys: {list(data.keys())[:10]}")
                    elif isinstance(data, list):
                        print(f"  List length: {len(data)}")
                    
                    # Save response
                    filename = f"/Users/rohan/bellum/api_test_{endpoint.replace('/', '_')}.json"
                    with open(filename, 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"  ✓ Saved to {filename}")
                    
                except json.JSONDecodeError:
                    print(f"  ⚠️  Not JSON: {response.text[:100]}")
            
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
        print(f"\nFirst 10 games:")
        for i, game in enumerate(games[:10], 1):
            game_id = game.get('id', game.get('appId', 'N/A'))
            title = game.get('title', game.get('name', 'N/A'))
            print(f"{i:3d}. [{game_id}] {title}")
    else:
        print("\n⚠️  No games fetched. Trying alternative endpoints...")
        try_alternative_endpoints()

if __name__ == '__main__':
    main()
