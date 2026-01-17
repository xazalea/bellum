# RetroUI Integration Guide

## 🎨 Overview

RetroUI (pixel-retroui) has been integrated into Bellum to provide pixel-perfect retro styling components that fit perfectly with the deep sea pixel art theme.

## 📦 Installation

The package is already added to `package.json`:
```json
"pixel-retroui": "^0.1.1"
```

### Local Development Setup

```bash
# Install dependencies (updates pnpm-lock.yaml)
pnpm install

# Start development server
pnpm dev
```

### Vercel Deployment

**Important**: After adding RetroUI, you need to update the lockfile:

```bash
# Option 1: Full install (recommended for local dev)
pnpm install

# Option 2: Update lockfile only (faster)
pnpm install --lockfile-only
```

Then commit both `package.json` and `pnpm-lock.yaml`:
```bash
git add package.json pnpm-lock.yaml
git commit -m "Add RetroUI with updated lockfile"
git push
```

**If you get a Vercel build error about frozen lockfile:**
- Make sure you've committed the updated `pnpm-lock.yaml`
- Or temporarily use `--no-frozen-lockfile` in Vercel build settings

## 🎯 What's Included

### 1. CSS Imports (`app/globals.css`)
```css
@import 'pixel-retroui/dist/index.css';
@import 'pixel-retroui/dist/fonts.css';
```

### 2. Wrapper Components

#### RetroButton (`components/ui/RetroButton.tsx`)
```tsx
import { RetroButton } from '@/components/ui/RetroButton';

<RetroButton onClick={handleClick}>
  Click Me!
</RetroButton>
```

#### RetroCard (`components/ui/RetroCard.tsx`)
```tsx
import { RetroCard } from '@/components/ui/RetroCard';

<RetroCard>
  <h2>Pixel Perfect Card</h2>
  <p>With retro styling!</p>
</RetroCard>
```

### 3. Setup File (`lib/pixel-retroui-setup.js`)
Global configuration for RetroUI (currently logs initialization).

## 🌊 Integration with Challenger Storage

RetroUI complements the existing Challenger Storage implementation:

- **Challenger Storage UI**: Custom-built with Tailwind + Material Symbols
- **RetroUI**: Available for other pages that want pixel-perfect components
- **Both work together**: Use RetroUI where it makes sense, keep custom components where needed

## 🎨 Styling Philosophy

### Current Bellum Theme
- Deep ocean/sea theme
- Pixel art creatures and animations
- Custom gradients and glass-morphism
- Material Symbols icons

### RetroUI Additions
- Pixel-perfect borders and buttons
- Retro fonts (Press Start 2P, VT323)
- Classic gaming aesthetics
- Consistent pixel grid

### Using Both Together
```tsx
// Custom Challenger Storage card (existing)
<Card className="bg-gradient-to-br from-[#0C1016] to-[#1E2A3A]">
  <h3 className="font-pixel">Challenger Storage</h3>
</Card>

// RetroUI card for other pages
<RetroCard>
  <h3>Retro Section</h3>
</RetroCard>
```

## 📚 Available Components

From `pixel-retroui`:
- `Button` - Pixel-perfect buttons
- `Card` - Retro-styled cards
- `Input` - Pixel input fields
- `Modal` - Retro modals
- `Progress` - Pixel progress bars
- And more...

Wrapped components (use these):
- `RetroButton` - `@/components/ui/RetroButton`
- `RetroCard` - `@/components/ui/RetroCard`

## 🚀 Usage Examples

### Basic Button
```tsx
import { RetroButton } from '@/components/ui/RetroButton';

<RetroButton variant="primary">
  Start Game
</RetroButton>
```

### Card with Content
```tsx
import { RetroCard } from '@/components/ui/RetroCard';

<RetroCard>
  <div className="font-pixel text-[#8B9DB8]">
    <h2>Player Stats</h2>
    <p>Level: 42</p>
  </div>
</RetroCard>
```

### Mixed with Challenger Storage
```tsx
// Storage page uses custom components
<div className="storage-container">
  {/* Challenger Storage UI */}
</div>

// Settings page can use RetroUI
<RetroCard>
  <h2 className="font-pixel">Settings</h2>
  <RetroButton>Save</RetroButton>
</RetroCard>
```

## 🎯 Best Practices

### When to Use RetroUI
- Simple retro-styled sections
- Settings pages
- Game UI elements
- Quick pixel-perfect components

### When to Use Custom Components
- Challenger Storage (already custom-built)
- Complex animations
- Deep sea themed sections
- Highly specific designs

### Font Classes
```css
.font-pixel   /* Press Start 2P - headers */
.font-retro   /* VT323 - body text */
```

Both are now available globally via RetroUI fonts.

## 🔧 Troubleshooting

### Build fails with "Cannot install with frozen-lockfile"
**Solution**: Run `pnpm install` locally and commit `pnpm-lock.yaml`

### RetroUI styles not showing
**Solution**: Check that CSS imports are uncommented in `app/globals.css`

### Import errors
**Solution**: Use the wrapper components:
```tsx
// ✅ Good
import { RetroButton } from '@/components/ui/RetroButton';

// ❌ Avoid (direct imports)
import { Button } from 'pixel-retroui';
```

### Vercel deployment issues
1. Commit updated `pnpm-lock.yaml`
2. Push to GitHub
3. Vercel will automatically rebuild

## 📖 Resources

- **RetroUI GitHub**: https://github.com/Dksie09/RetroUI
- **Pixel-Perfect Tailwind**: https://github.com/epicweb-dev/pixel-perfect-tailwind
- **Bellum Storage Docs**: See `DISCORD_WEBHOOK_STORAGE.md`

## 🎊 Summary

RetroUI is now integrated and ready to use! It complements your existing custom Challenger Storage UI while providing quick pixel-perfect components for other pages.

**Next Steps:**
1. Run `pnpm install` locally
2. Commit `pnpm-lock.yaml`
3. Use `RetroButton` and `RetroCard` in your pages
4. Enjoy pixel-perfect retro styling! 🎮
