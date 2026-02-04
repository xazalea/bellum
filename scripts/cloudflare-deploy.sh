#!/bin/bash
# Cloudflare Pages deploy script
# This script verifies the build output and exits successfully
# Cloudflare Pages will automatically deploy the output after this script completes

set -e

echo "🔍 Verifying build output..."

# Verify build output directory exists
if [ ! -d ".vercel/output/static" ]; then
  echo "❌ Build output directory not found: .vercel/output/static"
  exit 1
fi

# Verify worker file exists
if [ ! -f ".vercel/output/static/_worker.js/index.js" ]; then
  echo "❌ Worker file not found: .vercel/output/static/_worker.js/index.js"
  exit 1
fi

echo "✅ Build output verified successfully"
echo "📦 Output directory: .vercel/output/static"
echo "🚀 Cloudflare Pages will automatically deploy this build"

# List output contents for verification
echo ""
echo "📋 Build output contents:"
ls -la .vercel/output/static/ | head -10

exit 0
