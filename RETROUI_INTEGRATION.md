# RetroUI & Pixel-Perfect Tailwind Integration

## Overview
This project now integrates **RetroUI** ([GitHub](https://github.com/Dksie09/RetroUI)) for pixel-perfect retro gaming aesthetics combined with principles from **Pixel-Perfect Tailwind** ([GitHub](https://github.com/epicweb-dev/pixel-perfect-tailwind)).

## Installation

The package is added to `package.json`. After the next deployment, run:

```bash
pnpm install
```

## Setup

### 1. Import RetroUI Styles

Add to your `app/globals.css`:

```css
/* RetroUI Core Styles */
@import 'pixel-retroui/dist/index.css';

/* RetroUI Fonts (Minecraft font) */
@import 'pixel-retroui/dist/fonts.css';
```

### 2. Initialize in Layout

Already configured in `lib/pixel-retroui-setup.js` and imported in your layout.

## Available RetroUI Components

### Button
```tsx
import { Button } from 'pixel-retroui';

<Button 
  bg="#1E3A5F"      // Deep ocean blue
  textColor="#E2E8F0" 
  shadow="#0A1F3D"   // Darker shadow
  className="px-6 py-3"
>
  Deep Sea Action
</Button>
```

### Card
```tsx
import { Card } from 'pixel-retroui';

<Card className="p-6 bg-ocean-dark border-ocean-light">
  <h2 className="font-minecraft text-ocean-light">Ocean Card</h2>
  <p>Pixel-perfect deep sea content</p>
</Card>
```

### Input
```tsx
import { Input } from 'pixel-retroui';

<Input 
  placeholder="Enter coordinates..."
  className="bg-ocean-darker text-ocean-light"
/>
```

### Progress Bar
```tsx
import { ProgressBar } from 'pixel-retroui';

<ProgressBar 
  progress={75}
  bg="#1E3A5F"
  progressColor="#4A90E2"
  className="w-full"
/>
```

### Dropdown
```tsx
import { Dropdown } from 'pixel-retroui';

<Dropdown
  options={['Shallow', 'Mid-depth', 'Deep Ocean', 'Abyss']}
  onSelect={(val) => console.log(val)}
  placeholder="Select depth..."
/>
```

### Other Components
- **Accordion**: Collapsible sections
- **Bubble**: Speech/thought bubbles for sea creatures
- **Popup**: Modal dialogs
- **TextArea**: Multi-line inputs

## Pixel-Perfect Design Principles

### From Pixel-Perfect Tailwind Workshop

#### 1. **Consistent Pixel Grid**
All spacing should align to a pixel grid (multiples of 4px):

```tsx
// Good - aligns to 4px grid
className="p-4 m-8 gap-12"

// Avoid - breaks pixel alignment
className="p-3 m-7 gap-11"
```

#### 2. **Sharp Borders**
Use pixel-perfect borders instead of rounded corners for retro aesthetic:

```css
.pixel-border {
  border-width: 2px;
  border-style: solid;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
```

#### 3. **Pixel Fonts**
Use the Minecraft font for authentic retro feel:

```tsx
<h1 className="font-minecraft text-4xl">Deep Ocean Explorer</h1>
```

#### 4. **Limited Color Palette**
Stick to your ocean theme colors:

```css
/* Deep Ocean Palette */
--ocean-darkest: #020406;  /* Abyss */
--ocean-darker: #0A1F3D;   /* Deep water */
--ocean-dark: #1E3A5F;     /* Mid-depth */
--ocean-mid: #2D4A6E;      /* Shallow */
--ocean-light: #4A6380;    /* Surface shimmer */
--ocean-glow: #5F85A5;     /* Bioluminescence */
```

#### 5. **Pixel-Perfect Shadows**
Use hard shadows (not blurred) for 8-bit aesthetic:

```tsx
<div className="shadow-[4px_4px_0px_0px_rgba(10,31,61,1)]">
  Pixel shadow box
</div>
```

#### 6. **Scanline Effects**
Add authentic CRT monitor scanlines:

```css
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}
```

## Integration with Existing Components

### Enhance Current UI Components

Replace your existing components with RetroUI equivalents:

#### Before:
```tsx
<button className="bg-blue-500 rounded-lg px-4 py-2">
  Click
</button>
```

#### After:
```tsx
<Button bg="#1E3A5F" textColor="#E2E8F0">
  Click
</Button>
```

### Hybrid Approach

You can also enhance existing components with RetroUI principles:

```tsx
// Your existing Button with RetroUI styling
<button className="
  pixel-border
  font-minecraft
  bg-ocean-dark
  text-ocean-light
  px-6 py-3
  shadow-[3px_3px_0px_0px_rgba(10,31,61,1)]
  hover:translate-x-[1px]
  hover:translate-y-[1px]
  hover:shadow-[2px_2px_0px_0px_rgba(10,31,61,1)]
  active:translate-x-[3px]
  active:translate-y-[3px]
  active:shadow-none
  transition-none
">
  Pixel Perfect Button
</button>
```

## Deep Ocean Theme Integration

### Custom RetroUI Styling

Create ocean-themed variants:

```tsx
// lib/retroui-ocean-theme.ts
export const oceanTheme = {
  button: {
    primary: {
      bg: '#1E3A5F',
      text: '#E2E8F0',
      shadow: '#0A1F3D'
    },
    secondary: {
      bg: '#2D4A6E',
      text: '#CBD5E1',
      shadow: '#1E3A5F'
    },
    danger: {
      bg: '#7F3F3F',
      text: '#FEE2E2',
      shadow: '#5A2A2A'
    }
  },
  card: {
    bg: '#1E3A5F',
    border: '#4A6380',
    text: '#E2E8F0'
  }
};
```

### Usage:
```tsx
import { oceanTheme } from '@/lib/retroui-ocean-theme';

<Button {...oceanTheme.button.primary}>
  Dive Deeper
</Button>
```

## Font Usage

### Minecraft Font (Included with RetroUI)

```tsx
<h1 className="font-minecraft">Pixel Perfect Title</h1>
<p className="font-minecraft text-sm">Retro gaming text</p>
```

### Add to Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        minecraft: ['Minecraft', 'monospace'],
      }
    }
  }
}
```

## Animations

RetroUI works great with pixel-perfect animations:

```tsx
<Button className="
  animate-[bounce_1s_ease-in-out_infinite]
  animation-timing-function: steps(4)  /* Stepwise animation */
">
  Bouncing Pixel Button
</Button>
```

## Best Practices

1. **No Gradients**: Use solid colors for authentic 8-bit feel
2. **No Border Radius**: Keep all corners sharp (90° angles)
3. **No Blur**: Use hard shadows and edges only
4. **Grid Alignment**: Everything snaps to 4px grid
5. **Limited Palette**: Stick to 8-16 colors max
6. **Pixel Fonts**: Use monospace or pixel fonts exclusively
7. **Instant Transitions**: No smooth transitions (or use `steps()`)

## Combining with Existing Animations

Your animated fish sprites work perfectly with RetroUI's aesthetic:

```tsx
// Sea creature cards with RetroUI
<Card className="p-4 bg-ocean-dark">
  <h3 className="font-minecraft text-ocean-light mb-2">
    Jellyfish
  </h3>
  <div className="w-32 h-32">
    {/* Your animated sprite canvas */}
    <SeaLifeBackground />
  </div>
  <ProgressBar 
    progress={jellyfish.health} 
    bg="#1E3A5F"
    progressColor="#4A6380"
  />
</Card>
```

## Resources

- [RetroUI Documentation](https://retroui.io)
- [RetroUI Components](https://retroui.io/components)
- [Pixel-Perfect Tailwind Workshop](https://pixel-perfect-tailwind.epicweb.dev)
- [RetroUI GitHub](https://github.com/Dksie09/RetroUI)
- [Pixel-Perfect Tailwind GitHub](https://github.com/epicweb-dev/pixel-perfect-tailwind)

## Next Steps

1. Run `pnpm install` to install pixel-retroui
2. Add RetroUI imports to `globals.css`
3. Replace existing components with RetroUI equivalents
4. Apply pixel-perfect principles to custom components
5. Test the integrated retro aesthetic with your animated sprites

## Troubleshooting

### Fonts Not Loading
Ensure you've imported `pixel-retroui/dist/fonts.css` in your globals.css

### Components Not Styled
Check that `pixel-retroui/dist/index.css` is imported

### Tailwind Conflicts
Add to your `tailwind.config.js`:
```js
module.exports = {
  important: true,  // Force Tailwind specificity
}
```

---

**Result**: Your deep ocean pixel art theme now has authentic retro gaming UI components with pixel-perfect precision! 🎮🌊
