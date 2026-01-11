#!/usr/bin/env python3
"""
Comprehensive game extraction from Yandex Games HTML
"""
import re
import json
from html import unescape
from collections import defaultdict

def extract_games_comprehensive(html_content):
    """Extract all game data comprehensively"""
    games = {}
    
    # Step 1: Find all app IDs in /games/app/ URLs
    print("Step 1: Extracting from /games/app/ URLs...")
    url_pattern = r'/games/app/(\d+)'
    for match in re.finditer(url_pattern, html_content):
        app_id = match.group(1)
        if app_id not in games:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}',
                'title': None,
                'image': None
            }
    print(f"   Found {len(games)} games from URLs")
    
    # Step 2: Extract titles from aria-label attributes
    print("Step 2: Extracting titles from aria-labels...")
    # Pattern: aria-label="Title"...href="/games/app/ID"
    title_pattern1 = r'aria-label=["\']([^"\']+)["\'][^>]{0,500}?href=["\'][^"\']*?/games/app/(\d+)'
    for match in re.finditer(title_pattern1, html_content):
        title = unescape(match.group(1))
        app_id = match.group(2)
        if app_id in games:
            games[app_id]['title'] = title
        else:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}',
                'title': title,
                'image': None
            }
    
    # Pattern: href="/games/app/ID"...aria-label="Title"
    title_pattern2 = r'href=["\'][^"\']*?/games/app/(\d+)[^>]{0,500}?aria-label=["\']([^"\']+)["\']'
    for match in re.finditer(title_pattern2, html_content):
        app_id = match.group(1)
        title = unescape(match.group(2))
        if app_id in games and not games[app_id]['title']:
            games[app_id]['title'] = title
    
    titles_found = sum(1 for g in games.values() if g['title'])
    print(f"   Found {titles_found} titles")
    
    # Step 3: Extract images from avatar URLs
    print("Step 3: Extracting images...")
    image_pattern = r'(https://avatars\.mds\.yandex\.net/get-games/(\d+)/[^"\'\s>]+)'
    for match in re.finditer(image_pattern, html_content):
        image_url = match.group(1)
        app_id = match.group(2)
        if app_id in games:
            games[app_id]['image'] = image_url
        else:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}',
                'title': None,
                'image': image_url
            }
    
    images_found = sum(1 for g in games.values() if g['image'])
    print(f"   Found {images_found} images")
    
    # Step 4: Look for app-id in fragment identifiers
    print("Step 4: Extracting from fragment identifiers...")
    fragment_pattern = r'[#&]app-id=(\d+)'
    for match in re.finditer(fragment_pattern, html_content):
        app_id = match.group(1)
        if app_id not in games:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}',
                'title': None,
                'image': None
            }
    print(f"   Total games now: {len(games)}")
    
    # Step 5: Extract from potential JSON structures
    print("Step 5: Searching for JSON game data...")
    # Look for patterns like {"id":123456,"title":"..."}
    json_pattern = r'\{[^}]*?"(?:id|appId)"[^}]*?:\s*(\d{5,6})[^}]*?"(?:title|name)"[^}]*?:\s*"([^"]+)"[^}]*?\}'
    for match in re.finditer(json_pattern, html_content):
        app_id = match.group(1)
        title = unescape(match.group(2))
        if app_id in games:
            if not games[app_id]['title']:
                games[app_id]['title'] = title
        else:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}',
                'title': title,
                'image': None
            }
    
    # Reverse pattern
    json_pattern_rev = r'\{[^}]*?"(?:title|name)"[^}]*?:\s*"([^"]+)"[^}]*?"(?:id|appId)"[^}]*?:\s*(\d{5,6})[^}]*?\}'
    for match in re.finditer(json_pattern_rev, html_content):
        title = unescape(match.group(1))
        app_id = match.group(2)
        if app_id in games:
            if not games[app_id]['title']:
                games[app_id]['title'] = title
        else:
            games[app_id] = {
                'id': app_id,
                'url': f'https://yandex.com/games/app/{app_id}',
                'title': title,
                'image': None
            }
    
    print(f"   Total games now: {len(games)}")
    
    # Step 6: Look for game data in the large state object
    print("Step 6: Analyzing embedded state data...")
    # Find lines with multiple game references
    lines = html_content.split('\n')
    for line_num, line in enumerate(lines):
        if line.count('/games/app/') > 5 or line.count('app-id') > 5:
            # This line likely contains game data
            for match in re.finditer(url_pattern, line):
                app_id = match.group(1)
                if app_id not in games:
                    games[app_id] = {
                        'id': app_id,
                        'url': f'https://yandex.com/games/app/{app_id}',
                        'title': None,
                        'image': None
                    }
    
    print(f"   Total games now: {len(games)}")
    
    return games

def main():
    print("="*70)
    print("COMPREHENSIVE GAME EXTRACTION FROM YANDEX GAMES HTML")
    print("="*70)
    
    print("\nReading file.html...")
    with open('/Users/rohan/bellum/file.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    print(f"File size: {len(html_content):,} bytes")
    print(f"Lines: {html_content.count(chr(10)):,}")
    
    print("\n" + "="*70)
    games = extract_games_comprehensive(html_content)
    print("="*70)
    
    print(f"\n{'='*70}")
    print(f"TOTAL UNIQUE GAMES FOUND: {len(games)}")
    print(f"{'='*70}")
    
    # Convert to list and sort by ID
    games_list = sorted(games.values(), key=lambda x: int(x['id']))
    
    # Statistics
    games_with_titles = sum(1 for g in games_list if g['title'])
    games_with_images = sum(1 for g in games_list if g['image'])
    games_complete = sum(1 for g in games_list if g['title'] and g['image'])
    
    print(f"\nStatistics:")
    print(f"  Total games:       {len(games_list)}")
    print(f"  With titles:       {games_with_titles} ({games_with_titles*100//len(games_list)}%)")
    print(f"  With images:       {games_with_images} ({games_with_images*100//len(games_list)}%)")
    print(f"  Complete data:     {games_complete} ({games_complete*100//len(games_list)}%)")
    
    # Save to JSON
    output_file = '/Users/rohan/bellum/yandex_games_all.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_games': len(games_list),
            'extracted_at': '2026-01-11',
            'source': 'file.html',
            'statistics': {
                'with_titles': games_with_titles,
                'with_images': games_with_images,
                'complete': games_complete
            },
            'games': games_list
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {output_file}")
    
    # Print sample
    print("\n" + "="*70)
    print("SAMPLE GAMES (first 30):")
    print("="*70)
    for i, game in enumerate(games_list[:30], 1):
        title = game['title'] if game['title'] else '<no title>'
        has_img = '🖼️ ' if game['image'] else '   '
        print(f"{i:3d}. {has_img}[{game['id']:6s}] {title[:50]}")
    
    if len(games_list) > 30:
        print(f"\n... and {len(games_list) - 30} more games")
    
    # Save just IDs
    with open('/Users/rohan/bellum/all_game_ids.txt', 'w') as f:
        for game in games_list:
            f.write(f"{game['id']}\n")
    
    print(f"\nAll game IDs saved to: /Users/rohan/bellum/all_game_ids.txt")
    
    # Save games with titles to a separate file
    games_with_titles_list = [g for g in games_list if g['title']]
    with open('/Users/rohan/bellum/yandex_games_titled.json', 'w', encoding='utf-8') as f:
        json.dump({
            'total_games': len(games_with_titles_list),
            'games': games_with_titles_list
        }, f, indent=2, ensure_ascii=False)
    
    print(f"Games with titles saved to: /Users/rohan/bellum/yandex_games_titled.json")
    
    print("\n" + "="*70)
    print("EXTRACTION COMPLETE")
    print("="*70)

if __name__ == '__main__':
    main()
