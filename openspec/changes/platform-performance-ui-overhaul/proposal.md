## Why

The current platform suffers from critical performance issues with APK/EXE compilation achieving well below the target 40+ FPS, making applications unusable. The existing proxy infrastructure is unreliable and the UI implementation is outdated, lacking proper theming support. This overhaul addresses these fundamental issues to deliver a production-ready gaming/application platform.

## What Changes

- **BREAKING**: Complete removal of current UI implementation
- Replace current proxy with boxcars-archived (static web proxy written in Go)
- Optimize APK/EXE compiler to achieve 40+ FPS performance target
- Implement new UI inspired by deep-sea tactical aesthetic with:
  - Glass-morphism cards with backdrop blur effects
  - Gold/amber accent color system with obsidian dark backgrounds
  - Bento-style grid layouts for content organization
  - Responsive sidebar navigation
  - Material Symbols icons integration
- Add tweakcn-based theme system for customizable color schemes
- Maintain Cloudflare Pages deployment with client-side Node.js via almostnode

## Capabilities

### New Capabilities

- `high-performance-compiler`: APK/EXE compilation achieving 40+ FPS through optimized WASM generation, tiered JIT compilation, and GPU-accelerated rendering
- `boxcars-proxy`: Static web proxy integration using boxcars-archived Go implementation for reliable asset delivery
- `themed-ui-system`: Complete UI system with tweakcn theme support, glass-morphism effects, and customizable color palettes
- `bento-dashboard`: Dashboard layout with system monitoring cards, telemetry feeds, and task management panels

### Modified Capabilities

- None (this is a greenfield replacement of existing implementations)

## Impact

### Code Changes
- `lib/compiler/` - Major optimization of WASM generation pipeline
- `lib/transpiler/` - Enhanced dex/PE parsing and lifting performance
- `src/engine/` - GPU runtime and JIT compiler improvements
- `components/` - Complete UI component library replacement
- `app/` - New page layouts and routing structure

### Dependencies
- Add boxcars-archived as proxy backend
- Integrate tweakcn for theme management
- Update Tailwind CSS configuration for custom design tokens

### Systems Affected
- Cloudflare Pages deployment configuration
- Client-side Node.js execution via almostnode
- Game/application rendering pipeline
- Asset proxy and caching infrastructure
