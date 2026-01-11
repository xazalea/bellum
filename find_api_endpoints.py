#!/usr/bin/env python3
"""
Find all API endpoints in JavaScript files
"""
import re
import json

def find_apis_in_file(filepath):
    """Extract all API-related information from a file"""
    print(f"\n{'='*70}")
    print(f"Analyzing: {filepath}")
    print(f"{'='*70}")
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    apis = {
        'urls': set(),
        'paths': set(),
        'endpoints': set(),
        'domains': set()
    }
    
    # Pattern 1: Full URLs with 'api' in them
    url_pattern = r'https?://[^\s"\'>]+api[^\s"\'>]*'
    for match in re.finditer(url_pattern, content, re.IGNORECASE):
        apis['urls'].add(match.group(0))
    
    # Pattern 2: URL paths starting with /api
    path_pattern = r'["\'](/[a-z0-9/_-]*api[a-z0-9/_-]*)["\']'
    for match in re.finditer(path_pattern, content, re.IGNORECASE):
        apis['paths'].add(match.group(1))
    
    # Pattern 3: API endpoint configurations
    config_patterns = [
        r'urlToBackend["\']?\s*:\s*["\']([^"\']+)["\']',
        r'apiUrl["\']?\s*:\s*["\']([^"\']+)["\']',
        r'baseUrl["\']?\s*:\s*["\']([^"\']+)["\']',
        r'apiEndpoint["\']?\s*:\s*["\']([^"\']+)["\']',
        r'api["\']?\s*:\s*["\']([^"\']+)["\']',
    ]
    
    for pattern in config_patterns:
        for match in re.finditer(pattern, content, re.IGNORECASE):
            url = match.group(1)
            if 'http' in url or url.startswith('/'):
                apis['endpoints'].add(url)
    
    # Pattern 4: Yandex Games specific domains
    domain_pattern = r'https?://[^\s"\'>]*yandex[^\s"\'>]*games[^\s"\'>]*'
    for match in re.finditer(domain_pattern, content, re.IGNORECASE):
        apis['domains'].add(match.group(0))
    
    # Pattern 5: Games-related API paths
    games_path_pattern = r'["\']([/a-z0-9_-]*games[/a-z0-9_-]*)["\']'
    for match in re.finditer(games_path_pattern, content, re.IGNORECASE):
        path = match.group(1)
        if path.startswith('/') and len(path) > 5:
            apis['paths'].add(path)
    
    return apis

def main():
    print("="*70)
    print("API ENDPOINT FINDER")
    print("="*70)
    
    files_to_check = [
        '/Users/rohan/bellum/stuff.js',
        '/Users/rohan/bellum/stufff.js',
        '/Users/rohan/bellum/state_data.txt'
    ]
    
    all_apis = {
        'urls': set(),
        'paths': set(),
        'endpoints': set(),
        'domains': set()
    }
    
    for filepath in files_to_check:
        try:
            apis = find_apis_in_file(filepath)
            
            # Merge results
            all_apis['urls'].update(apis['urls'])
            all_apis['paths'].update(apis['paths'])
            all_apis['endpoints'].update(apis['endpoints'])
            all_apis['domains'].update(apis['domains'])
            
            print(f"\nFound in this file:")
            print(f"  URLs: {len(apis['urls'])}")
            print(f"  Paths: {len(apis['paths'])}")
            print(f"  Endpoints: {len(apis['endpoints'])}")
            print(f"  Domains: {len(apis['domains'])}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n{'='*70}")
    print("COMBINED RESULTS")
    print(f"{'='*70}")
    
    # Convert sets to sorted lists
    results = {
        'urls': sorted(list(all_apis['urls'])),
        'paths': sorted(list(all_apis['paths'])),
        'endpoints': sorted(list(all_apis['endpoints'])),
        'domains': sorted(list(all_apis['domains']))
    }
    
    # Print results
    if results['urls']:
        print(f"\n🔗 API URLs ({len(results['urls'])}):")
        for url in results['urls'][:20]:
            print(f"  • {url}")
        if len(results['urls']) > 20:
            print(f"  ... and {len(results['urls']) - 20} more")
    
    if results['paths']:
        print(f"\n📁 API Paths ({len(results['paths'])}):")
        for path in results['paths'][:20]:
            print(f"  • {path}")
        if len(results['paths']) > 20:
            print(f"  ... and {len(results['paths']) - 20} more")
    
    if results['endpoints']:
        print(f"\n⚙️  API Endpoints ({len(results['endpoints'])}):")
        for endpoint in results['endpoints']:
            print(f"  • {endpoint}")
    
    if results['domains']:
        print(f"\n🌐 Yandex Games Domains ({len(results['domains'])}):")
        for domain in results['domains'][:15]:
            print(f"  • {domain}")
        if len(results['domains']) > 15:
            print(f"  ... and {len(results['domains']) - 15} more")
    
    # Save to JSON
    output_file = '/Users/rohan/bellum/api_endpoints_found.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Saved to: {output_file}")
    
    # Create a summary of the most important APIs
    print(f"\n{'='*70}")
    print("🎯 KEY API ENDPOINTS FOR GAMES")
    print(f"{'='*70}")
    
    # Filter for game-related APIs
    game_apis = [url for url in results['urls'] if 'games' in url.lower() and 'api' in url.lower()]
    if game_apis:
        print("\nGame-related API URLs:")
        for api in game_apis:
            print(f"  ✓ {api}")
    else:
        print("\n⚠️  No direct game API URLs found in the JavaScript files.")
        print("   The API endpoints are likely loaded dynamically or from server-side.")
    
    # Known Yandex Games API (from previous analysis)
    print(f"\n{'='*70}")
    print("📚 KNOWN YANDEX GAMES APIs (from documentation)")
    print(f"{'='*70}")
    print("\nBase API:")
    print("  • https://games.yandex.com/games/api")
    print("\nCatalog Endpoints:")
    print("  • https://games.yandex.com/games/api/catalog/v2")
    print("  • https://games.yandex.com/games/api/catalog")
    print("\nSDK:")
    print("  • https://games-sdk.yandex.com/games/api/sdk/v1")
    print("\nNote: These APIs require authentication/cookies from an active session.")

if __name__ == '__main__':
    main()
