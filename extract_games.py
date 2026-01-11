#!/usr/bin/env python3
"""
Extract all games from Yandex Games HTML file
"""
import re
import json
from html.parser import HTMLParser
from urllib.parse import urlparse, parse_qs

class GameExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.games = {}
        self.current_game_data = {}
        self.in_game_card = False
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        # Look for game URLs
        if tag == 'a' and 'href' in attrs_dict:
            href = attrs_dict.get('href', '')
            
            # Extract app ID from URL
            app_id_match = re.search(r'/games/app/(\d+)', href)
            if app_id_match:
                app_id = app_id_match.group(1)
                
                # Get game title from aria-label
                title = attrs_dict.get('aria-label', f'Game {app_id}')
                
                # Parse query parameters for additional data
                parsed_url = urlparse(href)
                params = parse_qs(parsed_url.query)
                fragment_params = {}
                if parsed_url.fragment:
                    for param in parsed_url.fragment.split('&'):
                        if '=' in param:
                            key, value = param.split('=', 1)
                            fragment_params[key] = value
                
                self.games[app_id] = {
                    'id': app_id,
                    'title': title,
                    'url': href.split('?')[0].split('#')[0],  # Clean URL
                    'full_url': href
                }
        
        # Look for game images
        if tag == 'img' and 'src' in attrs_dict:
            src = attrs_dict.get('src', '')
            # Match game ID in avatar URLs
            avatar_match = re.search(r'/get-games/(\d+)/', src)
            if avatar_match:
                app_id = avatar_match.group(1)
                if app_id in self.games:
                    self.games[app_id]['image'] = src
                else:
                    # Create entry if not exists
                    self.games[app_id] = {
                        'id': app_id,
                        'title': f'Game {app_id}',
                        'url': f'https://yandex.com/games/app/{app_id}',
                        'image': src
                    }

def extract_from_json(html_content):
    """Extract game data from embedded JSON"""
    games = {}
    
    # Look for JSON data patterns
    json_patterns = [
        r'"id"\s*:\s*(\d+).*?"title"\s*:\s*"([^"]+)"',
        r'"appId"\s*:\s*(\d+)',
        r'app-id["\']?\s*:\s*["\']?(\d+)',
    ]
    
    for pattern in json_patterns:
        matches = re.finditer(pattern, html_content, re.IGNORECASE)
        for match in matches:
            if len(match.groups()) >= 1:
                app_id = match.group(1)
                title = match.group(2) if len(match.groups()) >= 2 else f'Game {app_id}'
                
                if app_id not in games:
                    games[app_id] = {
                        'id': app_id,
                        'title': title,
                        'url': f'https://yandex.com/games/app/{app_id}'
                    }
    
    return games

def extract_from_urls(html_content):
    """Extract all game URLs and IDs"""
    games = {}
    
    # Find all /games/app/{ID} patterns
    url_pattern = r'(?:href=["\'](.*?/games/app/(\d+)[^"\']*)["\']|/games/app/(\d+))'
    matches = re.finditer(url_pattern, html_content)
    
    for match in matches:
        app_id = match.group(2) if match.group(2) else match.group(3)
        if app_id:
            full_url = match.group(1) if match.group(1) else f'https://yandex.com/games/app/{app_id}'
            
            if app_id not in games:
                games[app_id] = {
                    'id': app_id,
                    'title': f'Game {app_id}',
                    'url': full_url.split('?')[0].split('#')[0]
                }
    
    # Find titles from aria-label
    title_pattern = r'aria-label=["\']([^"\']+)["\'].*?/games/app/(\d+)'
    title_matches = re.finditer(title_pattern, html_content)
    
    for match in title_matches:
        title = match.group(1)
        app_id = match.group(2)
        if app_id in games:
            games[app_id]['title'] = title
    
    # Find images
    image_pattern = r'(https://avatars\.mds\.yandex\.net/get-games/(\d+)/[^"\']+)'
    image_matches = re.finditer(image_pattern, html_content)
    
    for match in matches:
        image_url = match.group(1)
        app_id = match.group(2)
        if app_id in games:
            games[app_id]['image'] = image_url
        else:
            games[app_id] = {
                'id': app_id,
                'title': f'Game {app_id}',
                'url': f'https://yandex.com/games/app/{app_id}',
                'image': image_url
            }
    
    return games

def main():
    print("Reading file.html...")
    with open('/Users/rohan/bellum/file.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    print(f"File size: {len(html_content):,} bytes")
    
    # Method 1: HTML Parser
    print("\n[1] Parsing with HTMLParser...")
    parser = GameExtractor()
    parser.feed(html_content)
    games_from_parser = parser.games
    print(f"   Found {len(games_from_parser)} games")
    
    # Method 2: JSON extraction
    print("\n[2] Extracting from JSON patterns...")
    games_from_json = extract_from_json(html_content)
    print(f"   Found {len(games_from_json)} games")
    
    # Method 3: URL extraction
    print("\n[3] Extracting from URLs...")
    games_from_urls = extract_from_urls(html_content)
    print(f"   Found {len(games_from_urls)} games")
    
    # Merge all results
    all_games = {}
    for games_dict in [games_from_parser, games_from_json, games_from_urls]:
        for app_id, game_data in games_dict.items():
            if app_id not in all_games:
                all_games[app_id] = game_data
            else:
                # Merge data
                all_games[app_id].update({k: v for k, v in game_data.items() if v and (k not in all_games[app_id] or not all_games[app_id][k])})
    
    print(f"\n{'='*60}")
    print(f"TOTAL UNIQUE GAMES FOUND: {len(all_games)}")
    print(f"{'='*60}")
    
    # Convert to list and sort by ID
    games_list = sorted(all_games.values(), key=lambda x: int(x['id']))
    
    # Save to JSON
    output_file = '/Users/rohan/bellum/yandex_games.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_games': len(games_list),
            'games': games_list
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {output_file}")
    
    # Print first 10 games as sample
    print("\nFirst 10 games:")
    for i, game in enumerate(games_list[:10], 1):
        print(f"{i:3d}. [{game['id']:6s}] {game['title']}")
    
    print(f"\n... and {len(games_list) - 10} more")
    
    # Print summary stats
    games_with_images = sum(1 for g in games_list if 'image' in g)
    print(f"\nGames with images: {games_with_images}/{len(games_list)}")

if __name__ == '__main__':
    main()
