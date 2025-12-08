#!/usr/bin/env python

import sys
import os
import logging
from fuse import FUSE
from fs import SheetFS

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <mountpoint>")
        sys.exit(1)

    mountpoint = sys.argv[1]
    
    # Check for credentials
    if not os.path.exists('credentials.json') and not os.path.exists('token.json'):
        print("Error: credentials.json not found.")
        print("Please download your OAuth 2.0 Client ID JSON from Google Cloud Console")
        print("and save it as 'credentials.json' in this directory.")
        sys.exit(1)

    logging.basicConfig(level=logging.INFO)

    if not os.path.exists(mountpoint):
        os.makedirs(mountpoint)

    print(f"Mounting Google Sheet FS at {mountpoint}")
    print("Press Ctrl+C to unmount")
    
    try:
        FUSE(SheetFS(mountpoint), mountpoint, foreground=True, nothreads=True)
    except Exception as e:
        print(f"FUSE Error: {e}")
        print("Make sure FUSE is installed (e.g., macFUSE on macOS)")

if __name__ == '__main__':
    main()

