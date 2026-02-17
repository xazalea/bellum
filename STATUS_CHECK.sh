#!/bin/bash
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        CHALLENGER DEEP - COMPREHENSIVE STATUS CHECK       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Node.js
echo -e "${BLUE}[1/10]${NC} Checking Node.js..."
if command -v node &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
else
    echo -e "  ${RED}✗${NC} Node.js not found"
fi

# Check npm
echo -e "${BLUE}[2/10]${NC} Checking package manager..."
if command -v npm &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} npm $(npm -v)"
fi
if command -v pnpm &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} pnpm $(pnpm -v)"
fi

# Check dependencies
echo -e "${BLUE}[3/10]${NC} Checking node_modules..."
if [ -d "node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Dependencies installed"
else
    echo -e "  ${RED}✗${NC} Run: npm install"
fi

# Check games
echo -e "${BLUE}[4/10]${NC} Checking games catalog..."
if [ -f "public/games.json" ]; then
    size=$(ls -lh public/games.json | awk '{print $5}')
    echo -e "  ${GREEN}✓${NC} games.json ($size)"
else
    echo -e "  ${RED}✗${NC} games.json missing"
fi

# Check key files
echo -e "${BLUE}[5/10]${NC} Checking core files..."
files=(
    "app/games/page.tsx"
    "app/android/page.tsx"
    "app/windows/page.tsx"
    "lib/games-parser.ts"
    "lib/engine/loaders/apk-loader.ts"
    "lib/nacho/windows/runtime.ts"
)
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file missing"
    fi
done

# Check build
echo -e "${BLUE}[6/10]${NC} Checking build status..."
if [ -d ".next" ]; then
    echo -e "  ${GREEN}✓${NC} .next build directory exists"
else
    echo -e "  ${YELLOW}⚠${NC} No build found - run: npm run build"
fi

# Check env
echo -e "${BLUE}[7/10]${NC} Checking environment..."
if [ -f ".env.local" ]; then
    echo -e "  ${GREEN}✓${NC} .env.local configured"
elif [ -f ".env.example" ]; then
    echo -e "  ${YELLOW}⚠${NC} Copy .env.example to .env.local"
else
    echo -e "  ${RED}✗${NC} No environment config"
fi

# Check TypeScript
echo -e "${BLUE}[8/10]${NC} Checking TypeScript..."
if [ -f "tsconfig.json" ]; then
    echo -e "  ${GREEN}✓${NC} TypeScript configured"
else
    echo -e "  ${RED}✗${NC} tsconfig.json missing"
fi

# Check docs
echo -e "${BLUE}[9/10]${NC} Checking documentation..."
docs=("README.md" "DEPLOYMENT.md" "FEATURE_STATUS.md" "QUICKSTART.md" ".env.example")
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "  ${GREEN}✓${NC} $doc"
    fi
done

# Run feature verification
echo -e "${BLUE}[10/10]${NC} Running feature verification..."
if [ -f "scripts/verify-features.js" ]; then
    echo ""
    node scripts/verify-features.js
else
    echo -e "  ${RED}✗${NC} verify-features.js not found"
fi
