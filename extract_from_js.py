#!/usr/bin/env python3
"""
Extract game data from JavaScript files (stuff.js and stufff.js)
"""
import re
import json
from collections import defaultdict

def extract_games_from_js(filepath):
    """Extract all game-related data from a JavaScript file"""
    print(f"\n{'='*70}")
    print(f"Processing: {filepath}")
    print(f"{'='*70}")
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print(f"File size: {len(content):,} bytes")
    
    games = {}
    
    # Pattern 1: Look for numeric IDs (5-6 digits) that could be game IDs
    print("\n[1] Searching for numeric IDs...")
    id_pattern = r'\b(\d{5,6})\b'
    potential_ids = set()
    for match in re.finditer(id_pattern, content):
        app_id = match.group(1)
        if 100000 <= int(app_id) <= 999999:
            potential_ids.add(app_id)
    print(f"   Found {len(potential_ids)} potential game IDs")
    
    # Pattern 2: Look for JSON-like structures with id and title
    print("\n[2] Searching for JSON structures with id+title...")
    json_patterns = [
        r'\{[^}]*?(?:id|appId)["\']?\s*:\s*["\']?(\d{5,6})["\']?[^}]*?(?:title|name)["\']?\s*:\s*["\']([^"\']+)["\'][^}]*?\}',
        r'\{[^}]*?(?:title|name)["\']?\s*:\s*["\']([^"\']+)["\'][^}]*?(?:id|appId)["\']?\s*:\s*["\']?(\d{5,6})["\']?[^}]*?\}',
    ]
    
    for pattern in json_patterns:
        for match in re.finditer(pattern, content):
            if len(match.groups()) == 2:
                if match.group(1).isdigit():
                    app_id = match.group(1)
                    title = match.group(2)
                else:
                    title = match.group(1)
                    app_id = match.group(2)
                
                if app_id not in games:
                    games[app_id] = {
                        'id': app_id,
                        'title': title,
                        'url': f'https://yandex.com/games/app/{app_id}'
                    }
    
    print(f"   Found {len(games)} games with titles")
    
    # Pattern 3: Look for arrays of game objects
    print("\n[3] Searching for game arrays...")
    # Look for patterns like [{...},{...}] with multiple game objects
    array_pattern = r'\[(\{[^\[\]]{100,}\})\]'
    for match in re.finditer(array_pattern, content):
        array_str = '[' + match.group(1) + ']'
        # Try to find individual game objects
        obj_pattern = r'\{[^}]*?(?:id|appId)[^}]*?:\s*(\d{5,6})[^}]*?\}'
        for obj_match in re.finditer(obj_pattern, array_str):
            app_id = obj_match.group(1)
            if app_id not in games:
                games[app_id] = {
                    'id': app_id,
                    'url': f'https://yandex.com/games/app/{app_id}'
                }
    
    print(f"   Total games now: {len(games)}")
    
    # Pattern 4: Look for specific game data patterns
    print("\n[4] Searching for specific data patterns...")
    
    # Look for patterns like: id:123456,title:"Game Name"
    pattern4 = r'(?:id|appId)\s*:\s*(\d{5,6})[,\s}]*(?:title|name)\s*:\s*["\']([^"\']+)["\']'
    for match in re.finditer(pattern4, content):
        app_id = match.group(1)
        title = match.group(2)
        if app_id not in games:
            games[app_id] = {
                'id': app_id,
                'title': title,
                'url': f'https://yandex.com/games/app/{app_id}'
            }
        elif 'title' not in games[app_id]:
            games[app_id]['title'] = title
    
    # Reverse pattern
    pattern5 = r'(?:title|name)\s*:\s*["\']([^"\']+)["\']\s*[,}]*\s*(?:id|appId)\s*:\s*(\d{5,6})'
    for match in re.finditer(pattern5, content):
        title = match.group(1)
        app_id = match.group(2)
        if app_id not in games:
            games[app_id] = {
                'id': app_id,
                'title': title,
                'url': f'https://yandex.com/games/app/{app_id}'
            }
        elif 'title' not in games[app_id]:
            games[app_id]['title'] = title
    
    print(f"   Total games now: {len(games)}")
    
    # Pattern 5: Add remaining IDs without titles
    print("\n[5] Adding remaining IDs...")
    for app_id in potential_ids:
        if app_id not in games:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}'
            }
    
    print(f"   Total games now: {len(games)}")
    
    return games

def main():
    print("="*70)
    print("EXTRACTING GAMES FROM JAVASCRIPT FILES")
    print("="*70)
    
    all_games = {}
    
    # Process both files
    for filepath in ['/Users/rohan/bellum/stuff.js', '/Users/rohan/bellum/stufff.js']:
        try:
            games = extract_games_from_js(filepath)
            
            # Merge games
            for app_id, game_data in games.items():
                if app_id not in all_games:
                    all_games[app_id] = game_data
                else:
                    # Merge, preferring data with titles
                    if 'title' in game_data and 'title' not in all_games[app_id]:
                        all_games[app_id]['title'] = game_data['title']
        except Exception as e:
            print(f"\n❌ Error processing {filepath}: {e}")
    
    print(f"\n{'='*70}")
    print(f"TOTAL UNIQUE GAMES FOUND: {len(all_games)}")
    print(f"{'='*70}")
    
    # Convert to list and sort
    games_list = sorted(all_games.values(), key=lambda x: int(x['id']))
    
    # Statistics
    games_with_titles = sum(1 for g in games_list if 'title' in g)
    
    print(f"\nStatistics:")
    print(f"  Total games:       {len(games_list)}")
    print(f"  With titles:       {games_with_titles} ({games_with_titles*100//len(games_list) if games_list else 0}%)")
    print(f"  Without titles:    {len(games_list) - games_with_titles}")
    
    # Save to JSON
    output_file = '/Users/rohan/bellum/yandex_games_from_js.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_games': len(games_list),
            'extracted_at': '2026-01-11',
            'source': 'stuff.js + stufff.js',
            'statistics': {
                'with_titles': games_with_titles,
                'without_titles': len(games_list) - games_with_titles
            },
            'games': games_list
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Saved to: {output_file}")
    
    # Print sample
    print(f"\n{'='*70}")
    print("SAMPLE GAMES (first 50):")
    print(f"{'='*70}")
    for i, game in enumerate(games_list[:50], 1):
        title = game.get('title', '<no title>')
        has_title = '✓' if 'title' in game else ' '
        print(f"{i:3d}. {has_title} [{game['id']:6s}] {title[:60]}")
    
    if len(games_list) > 50:
        print(f"\n... and {len(games_list) - 50} more games")
    
    # Save games with titles separately
    games_with_titles_list = [g for g in games_list if 'title' in g]
    if games_with_titles_list:
        with open('/Users/rohan/bellum/yandex_games_from_js_titled.json', 'w', encoding='utf-8') as f:
            json.dump({
                'total_games': len(games_with_titles_list),
                'games': games_with_titles_list
            }, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Games with titles saved to: yandex_games_from_js_titled.json")
    
    # Save all IDs
    with open('/Users/rohan/bellum/game_ids_from_js.txt', 'w') as f:
        for game in games_list:
            f.write(f"{game['id']}\n")
    print(f"✓ All IDs saved to: game_ids_from_js.txt")
    
    print(f"\n{'='*70}")
    print("EXTRACTION COMPLETE")
    print(f"{'='*70}")

if __name__ == '__main__':
    main()
