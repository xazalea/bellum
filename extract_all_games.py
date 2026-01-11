#!/usr/bin/env python3
"""
Extract ALL games from Yandex Games HTML file by parsing embedded JSON state
"""
import re
import json
from html import unescape

def extract_state_data(html_content):
    """Extract the embedded state data from the HTML"""
    # Find the script tag with window.__NEXT_DATA__ or similar
    # Look for large JSON objects in the HTML
    
    # Pattern 1: Look for large JSON objects
    json_pattern = r'\{["\w]+:[^}]{1000,}\}'
    
    # Pattern 2: Look for specific state initialization
    state_patterns = [
        r'<script[^>]*>([^<]*allGames[^<]*)</script>',
        r'window\.__[A-Z_]+__\s*=\s*(\{.*?\});',
        r'self\.__next[^=]*=\s*(\{.*?\});',
    ]
    
    for pattern in state_patterns:
        matches = re.finditer(pattern, html_content, re.DOTALL)
        for match in matches:
            try:
                json_str = match.group(1)
                data = json.loads(json_str)
                return data
            except:
                continue
    
    return None

def find_all_game_references(html_content):
    """Find all game references in the HTML"""
    games = {}
    
    # Pattern 1: Direct app IDs in URLs
    url_pattern = r'/games/app/(\d+)'
    for match in re.finditer(url_pattern, html_content):
        app_id = match.group(1)
        if app_id not in games:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}'
            }
    
    # Pattern 2: Game titles from aria-labels
    title_pattern = r'aria-label=["\']([^"\']+)["\'][^>]*href=["\'][^"\']*?/games/app/(\d+)'
    for match in re.finditer(title_pattern, html_content):
        title = unescape(match.group(1))
        app_id = match.group(2)
        if app_id in games:
            games[app_id]['title'] = title
        else:
            games[app_id] = {
                'id': app_id,
                'title': title,
                'url': f'https://yandex.com/games/app/{app_id}'
            }
    
    # Pattern 3: Reverse - find app ID after title
    reverse_pattern = r'/games/app/(\d+)[^>]*>[^<]*aria-label=["\']([^"\']+)["\']'
    for match in re.finditer(reverse_pattern, html_content):
        app_id = match.group(1)
        title = unescape(match.group(2))
        if app_id in games:
            games[app_id]['title'] = title
    
    # Pattern 4: Images
    image_pattern = r'(https://avatars\.mds\.yandex\.net/get-games/(\d+)/[^"\'\s]+)'
    for match in re.finditer(image_pattern, html_content):
        image_url = match.group(1)
        app_id = match.group(2)
        if app_id in games:
            games[app_id]['image'] = image_url
        else:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}',
                'image': image_url
            }
    
    return games

def extract_json_from_line(line):
    """Extract and parse JSON data from a line"""
    games = {}
    
    # Try to find JSON objects in the line
    # Look for patterns like {"id":123,"title":"Game Name"}
    
    # First, try to find the entire JSON structure
    try:
        # Remove HTML entities
        line = unescape(line)
        
        # Try to find JSON arrays
        array_pattern = r'\[(\{[^\]]{100,}\})\]'
        for match in re.finditer(array_pattern, line):
            try:
                json_str = '[' + match.group(1) + ']'
                data = json.loads(json_str)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and 'id' in item:
                            app_id = str(item['id'])
                            games[app_id] = {
                                'id': app_id,
                                'title': item.get('title', item.get('name', f'Game {app_id}')),
                                'url': f'https://yandex.com/games/app/{app_id}'
                            }
                            if 'image' in item:
                                games[app_id]['image'] = item['image']
            except:
                pass
        
        # Look for individual game objects
        game_pattern = r'\{[^}]*"id"\s*:\s*(\d+)[^}]*"title"\s*:\s*"([^"]+)"[^}]*\}'
        for match in re.finditer(game_pattern, line):
            app_id = match.group(1)
            title = match.group(2)
            games[app_id] = {
                'id': app_id,
                'title': unescape(title),
                'url': f'https://yandex.com/games/app/{app_id}'
            }
        
        # Reverse pattern
        reverse_game_pattern = r'\{[^}]*"title"\s*:\s*"([^"]+)"[^}]*"id"\s*:\s*(\d+)[^}]*\}'
        for match in re.finditer(reverse_game_pattern, line):
            title = match.group(1)
            app_id = match.group(2)
            if app_id not in games:
                games[app_id] = {
                    'id': app_id,
                    'title': unescape(title),
                    'url': f'https://yandex.com/games/app/{app_id}'
                }
    
    except Exception as e:
        pass
    
    return games

def main():
    print("Reading file.html...")
    with open('/Users/rohan/bellum/file.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    print(f"File size: {len(html_content):,} bytes")
    
    # Extract from state data file
    print("\n[1] Analyzing state data...")
    with open('/Users/rohan/bellum/state_data.txt', 'r', encoding='utf-8') as f:
        state_line = f.read()
    
    games_from_state = extract_json_from_line(state_line)
    print(f"   Found {len(games_from_state)} games in state data")
    
    # Extract from full HTML
    print("\n[2] Scanning full HTML for game references...")
    games_from_html = find_all_game_references(html_content)
    print(f"   Found {len(games_from_html)} games in HTML")
    
    # Merge results
    all_games = {}
    for games_dict in [games_from_state, games_from_html]:
        for app_id, game_data in games_dict.items():
            if app_id not in all_games:
                all_games[app_id] = game_data
            else:
                # Merge, preferring non-empty values
                for key, value in game_data.items():
                    if value and (key not in all_games[app_id] or not all_games[app_id].get(key)):
                        all_games[app_id][key] = value
    
    print(f"\n{'='*60}")
    print(f"TOTAL UNIQUE GAMES FOUND: {len(all_games)}")
    print(f"{'='*60}")
    
    # Convert to list and sort by ID
    games_list = sorted(all_games.values(), key=lambda x: int(x['id']))
    
    # Save to JSON
    output_file = '/Users/rohan/bellum/yandex_games_complete.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_games': len(games_list),
            'extracted_at': '2026-01-11',
            'source': 'file.html',
            'games': games_list
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {output_file}")
    
    # Print sample
    print("\nFirst 20 games:")
    for i, game in enumerate(games_list[:20], 1):
        title = game.get('title', 'N/A')
        print(f"{i:3d}. [{game['id']:6s}] {title[:50]}")
    
    if len(games_list) > 20:
        print(f"\n... and {len(games_list) - 20} more")
    
    # Stats
    games_with_titles = sum(1 for g in games_list if 'title' in g and g['title'] != f"Game {g['id']}")
    games_with_images = sum(1 for g in games_list if 'image' in g)
    
    print(f"\nStatistics:")
    print(f"  Games with titles: {games_with_titles}/{len(games_list)}")
    print(f"  Games with images: {games_with_images}/{len(games_list)}")
    
    # Save just IDs for reference
    with open('/Users/rohan/bellum/game_ids.txt', 'w') as f:
        for game in games_list:
            f.write(f"{game['id']}\n")
    
    print(f"\nGame IDs saved to: /Users/rohan/bellum/game_ids.txt")

if __name__ == '__main__':
    main()
