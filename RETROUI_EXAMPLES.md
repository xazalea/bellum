# RetroUI Integration Examples

## Quick Start Examples

### 1. Retro Button with Ocean Theme

```tsx
import { RetroButton } from '@/components/ui/RetroButton';

export function GameControls() {
  return (
    <div className="flex gap-4 p-8">
      {/* Primary ocean button */}
      <RetroButton variant="primary" onClick={() => console.log('Start!')}>
        Start Game
      </RetroButton>
      
      {/* Ocean variant with glow */}
      <RetroButton variant="ocean" pixelStyle="glow">
        Deep Dive
      </RetroButton>
      
      {/* Danger variant */}
      <RetroButton variant="danger">
        Abort Mission
      </RetroButton>
      
      {/* Disabled state */}
      <RetroButton variant="secondary" disabled>
        Loading...
      </RetroButton>
    </div>
  );
}
```

### 2. Retro Card with Scanlines

```tsx
import { RetroCard } from '@/components/ui/RetroCard';

export function CreatureCard() {
  return (
    <RetroCard variant="ocean" scanlines className="max-w-md">
      <h2 className="font-minecraft text-2xl mb-4 text-ocean-light">
        Deep Sea Jellyfish
      </h2>
      <p className="font-retro text-sm leading-relaxed">
        A bioluminescent creature that pulses with ethereal light,
        drifting through the darkest depths of the ocean.
      </p>
      <div className="mt-4 flex gap-2">
        <RetroButton variant="ocean" pixelStyle="normal" className="text-xs">
          Observe
        </RetroButton>
        <RetroButton variant="secondary" pixelStyle="normal" className="text-xs">
          Catalog
        </RetroButton>
      </div>
    </RetroCard>
  );
}
```

### 3. Full Page with Pixel-Perfect Layout

```tsx
import { RetroCard } from '@/components/ui/RetroCard';
import { RetroButton } from '@/components/ui/RetroButton';

export default function RetroGamePage() {
  return (
    <div className="min-h-screen bg-[#020406] p-8">
      {/* Header with scanlines effect */}
      <header className="mb-8 scanlines">
        <h1 className="font-minecraft text-4xl text-center text-ocean-light mb-2">
          DEEP OCEAN EXPLORER
        </h1>
        <p className="font-retro text-center text-ocean-mid">
          Press START to begin your journey
        </p>
      </header>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Stats Card */}
        <RetroCard variant="abyss" className="col-span-1">
          <h3 className="font-minecraft text-lg mb-4">STATS</h3>
          <div className="space-y-2 font-retro text-sm">
            <div className="flex justify-between">
              <span>Depth:</span>
              <span className="text-ocean-glow">2,847m</span>
            </div>
            <div className="flex justify-between">
              <span>O2:</span>
              <span className="text-ocean-glow">87%</span>
            </div>
            <div className="flex justify-between">
              <span>Discoveries:</span>
              <span className="text-ocean-glow">12</span>
            </div>
          </div>
        </RetroCard>

        {/* Mission Card with pixel grid */}
        <RetroCard variant="ocean" pixelGrid className="col-span-1">
          <h3 className="font-minecraft text-lg mb-4">CURRENT MISSION</h3>
          <p className="font-retro text-sm mb-4">
            Locate and document the rare bioluminescent jellyfish species
          </p>
          <div className="flex gap-2">
            <RetroButton variant="primary" className="text-xs px-4 py-2">
              Accept
            </RetroButton>
            <RetroButton variant="secondary" className="text-xs px-4 py-2">
              Decline
            </RetroButton>
          </div>
        </RetroCard>

        {/* Equipment Card with glow effect */}
        <RetroCard variant="glow" className="col-span-1">
          <h3 className="font-minecraft text-lg mb-4 text-glow-pixel">
            EQUIPMENT
          </h3>
          <div className="space-y-2">
            <RetroButton 
              variant="ocean" 
              pixelStyle="glow" 
              className="w-full text-xs"
            >
              Sonar Scanner
            </RetroButton>
            <RetroButton 
              variant="ocean" 
              pixelStyle="glow" 
              className="w-full text-xs"
            >
              Depth Gauge
            </RetroButton>
            <RetroButton 
              variant="ocean" 
              pixelStyle="glow" 
              className="w-full text-xs"
            >
              Camera
            </RetroButton>
          </div>
        </RetroCard>
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex justify-center gap-4">
        <RetroButton variant="primary" pixelStyle="thick" className="px-8 py-4">
          START DIVE
        </RetroButton>
        <RetroButton variant="secondary" className="px-8 py-4">
          Settings
        </RetroButton>
      </div>
    </div>
  );
}
```

### 4. Animated Creature Showcase

```tsx
import { RetroCard } from '@/components/ui/RetroCard';
import { SeaLifeBackground } from '@/components/SeaLifeBackground';

export function CreatureShowcase() {
  return (
    <RetroCard variant="abyss" scanlines className="p-0 overflow-hidden">
      {/* Animated background */}
      <div className="h-64 relative">
        <SeaLifeBackground />
      </div>
      
      {/* Info overlay */}
      <div className="p-6 border-t-2 border-[#4A6380]">
        <h3 className="font-minecraft text-xl mb-2">
          Live Ocean Feed
        </h3>
        <p className="font-retro text-sm text-ocean-mid">
          Move your cursor to illuminate creatures
        </p>
      </div>
    </RetroCard>
  );
}
```

### 5. Pixel-Perfect Game UI

```tsx
import { RetroCard } from '@/components/ui/RetroCard';
import { RetroButton } from '@/components/ui/RetroButton';

export function GameHUD() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-auto">
        {/* Health */}
        <RetroCard variant="abyss" className="px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-minecraft text-xs">HP</span>
            <div className="w-32 h-4 pixel-border border-ocean-mid bg-ocean-darker">
              <div 
                className="h-full bg-ocean-glow transition-none"
                style={{ width: '75%' }}
              />
            </div>
          </div>
        </RetroCard>

        {/* Score */}
        <RetroCard variant="glow" className="px-4 py-2">
          <span className="font-minecraft text-xs text-glow-pixel">
            SCORE: 12,500
          </span>
        </RetroCard>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex gap-4">
          <RetroButton variant="ocean" pixelStyle="thick">
            ↑
          </RetroButton>
          <RetroButton variant="ocean" pixelStyle="thick">
            →
          </RetroButton>
          <RetroButton variant="primary" pixelStyle="glow">
            ACTION
          </RetroButton>
        </div>
      </div>
    </div>
  );
}
```

### 6. Retro Notification System

```tsx
import { RetroCard } from '@/components/ui/RetroCard';
import { useState } from 'react';

export function RetroNotification() {
  return (
    <div className="fixed top-4 right-4 w-80">
      <RetroCard variant="ocean" scanlines className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl text-blink">⚠️</span>
          <div>
            <h4 className="font-minecraft text-sm mb-1">
              Warning!
            </h4>
            <p className="font-retro text-xs text-ocean-mid">
              Oxygen levels critically low. Surface immediately.
            </p>
          </div>
        </div>
      </RetroCard>
    </div>
  );
}
```

### 7. Pixel-Perfect Progress Bars

```tsx
import { RetroCard } from '@/components/ui/RetroCard';

export function ProgressDisplay() {
  return (
    <RetroCard variant="abyss" className="space-y-4">
      <h3 className="font-minecraft text-lg">Mission Progress</h3>
      
      {/* Simple progress bar */}
      <div>
        <div className="flex justify-between font-retro text-xs mb-1">
          <span>Exploration</span>
          <span>87%</span>
        </div>
        <div className="h-6 pixel-border border-ocean-mid bg-ocean-darker">
          <div 
            className="h-full bg-ocean-light pixel-shadow-sm transition-none"
            style={{ width: '87%' }}
          />
        </div>
      </div>

      {/* Stepped progress (pixel-perfect) */}
      <div>
        <div className="flex justify-between font-retro text-xs mb-1">
          <span>Creatures Found</span>
          <span>6/10</span>
        </div>
        <div className="flex gap-1">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`h-6 flex-1 pixel-border transition-none ${
                i < 6 
                  ? 'bg-ocean-glow border-ocean-light' 
                  : 'bg-ocean-darker border-ocean-dark'
              }`}
            />
          ))}
        </div>
      </div>
    </RetroCard>
  );
}
```

### 8. Retro Menu System

```tsx
import { RetroCard } from '@/components/ui/RetroCard';
import { RetroButton } from '@/components/ui/RetroButton';

export function RetroMenu() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020406]">
      <RetroCard variant="ocean" scanlines className="w-96">
        <h1 className="font-minecraft text-2xl text-center mb-8 text-glow-pixel">
          MAIN MENU
        </h1>
        
        <div className="space-y-4">
          <RetroButton variant="primary" pixelStyle="thick" className="w-full">
            Continue
          </RetroButton>
          <RetroButton variant="ocean" className="w-full">
            New Game
          </RetroButton>
          <RetroButton variant="secondary" className="w-full">
            Load Game
          </RetroButton>
          <RetroButton variant="secondary" className="w-full">
            Options
          </RetroButton>
          <RetroButton variant="danger" className="w-full">
            Exit
          </RetroButton>
        </div>
        
        <p className="font-retro text-xs text-center mt-8 text-ocean-mid">
          © 2026 Deep Ocean Explorer
        </p>
      </RetroCard>
    </div>
  );
}
```

## Integration with Existing Components

You can gradually replace your existing components:

### Replace existing Button:
```tsx
// Before:
<Button className="bg-blue-500">Click</Button>

// After:
<RetroButton variant="ocean">Click</RetroButton>
```

### Replace existing Card:
```tsx
// Before:
<Card className="p-6">Content</Card>

// After:
<RetroCard variant="ocean" scanlines>Content</RetroCard>
```

## Next Steps

1. Install pixel-retroui: `pnpm install`
2. Uncomment RetroUI imports in `globals.css`
3. Use `RetroButton` and `RetroCard` in your pages
4. Apply pixel-perfect utilities (`pixel-border`, `pixel-shadow`, etc.)
5. Add `font-minecraft` to headings for authentic retro feel

---

**Resources:**
- [RetroUI GitHub](https://github.com/Dksie09/RetroUI)
- [Pixel-Perfect Tailwind](https://github.com/epicweb-dev/pixel-perfect-tailwind)
- [RetroUI Documentation](https://retroui.io)
