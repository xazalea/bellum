# Project Knowledge: Challenger Deep (Abyss OS)

**The deepest execution layer on the web** - Run Android APKs, Windows EXEs, and 20,000+ HTML5 games directly in the browser.

## Quickstart

- **Setup**: `npm install` (or `pnpm install`, `bun install`)
- **Dev**: `npm run dev` → http://localhost:3000
- **Build**: `npm run build` for production build
- **Test features**: `node scripts/verify-features.js`
- **Lint**: `npm run lint`

## Architecture

### Key Directories
- `app/` - Next.js 14 App Router pages and API routes
- `lib/` - Core libraries (engines, parsers, Firebase, storage adapters)
- `components/` - React components (UI components in components/ui/)
- `public/` - Static assets (games.json with 20K+ games, optimizers, WASM)
- `scripts/` - Build scripts and utilities
- `workers/` - Web Workers for background processing

### Data Flow
1. User visits page → Next.js App Router handles routing
2. Games loaded from `public/games.json` → parsed via `lib/games-parser.ts`
3. APK/EXE execution runs in Web Workers, rendered to Canvas/WebGPU
4. Cloud storage uses Discord/Telegram bots via `lib/persistence/`

## Conventions

### Code Style
- TypeScript strict mode enabled (`tsconfig.json`)
- Use `@/*` path aliases (e.g., `@/lib/games-parser`)
- Tailwind CSS with custom theme in `tailwind.config.ts`
- CSS variables for theming in `app/globals.css`

### Component Patterns
- Radix UI primitives for accessible components
- Framer Motion for animations
- CVA (class-variance-authority) for variant components

### API Routes
- Edge runtime by default (configured in `next.config.js`)
- Node.js modules shimmed for edge compatibility

## Feature Flags (in .env.local)

```bash
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_CLUSTER=true
NEXT_PUBLIC_ENABLE_GPU_RENTAL=false
NEXT_PUBLIC_ENABLE_VPS=true
```

## Gotchas & Constraints

1. **Edge Runtime**: API routes use edge runtime with Node.js module shims via Almostnode
2. **WebGPU Required**: APK/EXE runners need WebGPU (Chrome 113+, Edge 113+)
3. **Large Games Catalog**: `public/games.json` is 7.4MB - virtualized rendering required
4. **Firebase Config**: Requires valid Firebase project for full functionality
5. **Discord Bot**: Storage via Discord needs valid bot token and channel
6. **Build Order**: Run `node scripts/copy-optimizers.js` after install (postinstall hook)

## Scripts Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run build:cloudflare` | Build for Cloudflare Pages |
| `npm run build:wasm` | Build WebAssembly modules |
| `node scripts/verify-features.js` | Run feature verification |

## Environment Variables

Required in `.env.local`:
- `JWT_SECRET` - Session encryption key (min 32 chars)
- Firebase config (`NEXT_PUBLIC_FIREBASE_*`) for auth/storage

Optional:
- `DISCORD_BOT_TOKEN` / `DISCORD_CHANNEL_ID` - Cloud storage
- `TELEGRAM_BOT_TOKEN` - Alternative storage
- `GOOGLE_AI_API_KEY` - AI chat features
- `REDIS_URL` - Caching