# Component Showcase

This document provides usage examples for all the enhanced UI components.

## Button Component

### Usage Examples

```tsx
import { Button } from '@/components/ui/Button'

// Default variant
<Button>Default Button</Button>

// Shimmer variant (recommended for primary actions)
<Button variant="shimmer">Primary Action</Button>

// Outline variant (for secondary actions)
<Button variant="outline">Secondary Action</Button>

// Ghost variant (for tertiary actions)
<Button variant="ghost">Tertiary Action</Button>
```

### Visual States
- **Hover**: Scale up slightly (1.02x) with enhanced shadows
- **Active**: Scale down (0.98x) for tactile feedback
- **Disabled**: Reduced opacity (50%) with pointer events disabled

## Card Component

### Usage Examples

```tsx
import { Card } from '@/components/ui/Card'

// Default variant
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

// Hover variant (with lift animation)
<Card variant="hover">
  <h3>Interactive Card</h3>
  <p>Lifts on hover</p>
</Card>

// Magic variant (with glow effect)
<Card variant="magic">
  <h3>Premium Card</h3>
  <p>Glows on hover</p>
</Card>
```

### Visual Effects
- **Default**: Standard styling with backdrop blur
- **Hover**: Translates up and adds shadow on hover
- **Magic**: Spotlight glow effect following cursor

## Shimmer Button

### Usage Example

```tsx
import { ShimmerButton } from '@/components/ui/shimmer-button'

<ShimmerButton
  shimmerColor="#ffffff"
  shimmerSize="0.05em"
  borderRadius="100px"
  shimmerDuration="3s"
  background="rgba(99, 102, 241, 1)"
>
  Click Me
</ShimmerButton>
```

### Props
- `shimmerColor`: Color of the shimmer effect (default: "#ffffff")
- `shimmerSize`: Size of the shimmer (default: "0.05em")
- `borderRadius`: Border radius (default: "100px")
- `shimmerDuration`: Animation duration (default: "3s")
- `background`: Background color (default: "rgba(0, 0, 0, 1)")

## Animated Gradient Text

### Usage Example

```tsx
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'

<AnimatedGradientText
  speed={1}
  colorFrom="#6366f1"
  colorTo="#818cf8"
  className="text-4xl font-bold"
>
  Animated Heading
</AnimatedGradientText>
```

### Props
- `speed`: Animation speed multiplier (default: 1)
- `colorFrom`: Starting gradient color (default: "#6366f1")
- `colorTo`: Ending gradient color (default: "#818cf8")

### Best Use Cases
- Page headings
- Hero section titles
- Call-to-action text
- Emphasis text

## Animated Grid Pattern

### Usage Example

```tsx
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'

<div className="relative">
  <AnimatedGridPattern
    numSquares={30}
    maxOpacity={0.1}
    duration={3}
    repeatDelay={1}
    className="fixed inset-0 -z-10 h-screen w-screen fill-nacho-accent/20 stroke-nacho-accent/20"
  />
  <div className="relative z-10">
    {/* Your content here */}
  </div>
</div>
```

### Props
- `width`: Grid cell width (default: 40)
- `height`: Grid cell height (default: 40)
- `numSquares`: Number of animated squares (default: 50)
- `maxOpacity`: Maximum opacity of squares (default: 0.5)
- `duration`: Animation duration (default: 4)
- `repeatDelay`: Delay between animations (default: 0.5)

### Best Use Cases
- Page backgrounds
- Section backgrounds
- Hero sections
- Landing pages

## Magic Card

### Usage Example

```tsx
import { MagicCard } from '@/components/ui/magic-card'

<MagicCard
  gradientSize={200}
  gradientColor="#262626"
  gradientOpacity={0.8}
  gradientFrom="#6366f1"
  gradientTo="#818cf8"
  className="p-6"
>
  <h3>Interactive Card</h3>
  <p>Move your cursor over this card to see the effect</p>
</MagicCard>
```

### Props
- `gradientSize`: Size of the spotlight gradient (default: 200)
- `gradientColor`: Base gradient color (default: "#262626")
- `gradientOpacity`: Opacity of the gradient (default: 0.8)
- `gradientFrom`: Starting gradient color (default: "#6366f1")
- `gradientTo`: Ending gradient color (default: "#818cf8")

### Best Use Cases
- Feature cards
- Pricing cards
- Product showcases
- Interactive panels

## Particles

### Usage Example

```tsx
import { Particles } from '@/components/ui/particles'

<div className="relative h-screen">
  <Particles
    className="absolute inset-0"
    quantity={100}
    ease={50}
    color="#6366f1"
    refresh={false}
  />
  <div className="relative z-10">
    {/* Your content here */}
  </div>
</div>
```

### Props
- `quantity`: Number of particles (default: 100)
- `staticity`: How static particles are (default: 50)
- `ease`: Easing factor for movement (default: 50)
- `size`: Base size of particles (default: 0.4)
- `color`: Particle color (default: "#6366f1")
- `vx`: Horizontal velocity (default: 0)
- `vy`: Vertical velocity (default: 0)

### Best Use Cases
- Hero sections
- Landing page backgrounds
- Feature sections
- Decorative backgrounds

## Color Palette Reference

### Primary Colors
```css
--nacho-bg: #0a0e1a;           /* Main background */
--nacho-primary: #f0f4f8;      /* Primary text */
--nacho-accent: #6366f1;       /* Accent color (indigo) */
--nacho-accent-hover: #818cf8; /* Accent hover state */
```

### Secondary Colors
```css
--nacho-secondary: #94a3b8;    /* Secondary text */
--nacho-muted: #64748b;        /* Muted text */
```

### Surface Colors
```css
--nacho-surface: rgba(20, 25, 38, 0.6);   /* Surface background */
--nacho-card: rgba(18, 23, 36, 0.75);     /* Card background */
--nacho-card-hover: rgba(25, 32, 48, 0.85); /* Card hover state */
```

### Border Colors
```css
--nacho-border: rgba(100, 116, 139, 0.15);       /* Default border */
--nacho-border-hover: rgba(100, 116, 139, 0.3);  /* Border hover state */
```

## Animation Classes

### Fade In
```tsx
<div className="animate-fade-in">
  Fades in smoothly
</div>
```

### Slide Up
```tsx
<div className="animate-slide-up">
  Slides up with fade
</div>
```

### Gradient Animation
```tsx
<div className="animate-gradient bg-gradient-to-r from-nacho-accent to-nacho-accent-hover">
  Animated gradient background
</div>
```

## Best Practices

### 1. Component Selection
- Use **Shimmer Button** for primary CTAs
- Use **Outline Button** for secondary actions
- Use **Ghost Button** for tertiary actions
- Use **Magic Card** for premium/featured content
- Use **Animated Grid Pattern** for backgrounds

### 2. Color Usage
- Stick to the defined color palette for consistency
- Use accent colors sparingly for emphasis
- Maintain proper contrast ratios for accessibility
- Use muted colors for less important information

### 3. Animation Guidelines
- Keep animations subtle and purposeful
- Use 300ms as the standard transition duration
- Respect `prefers-reduced-motion` user preferences
- Avoid animating too many elements simultaneously

### 4. Performance
- Use `will-change` for frequently animated properties
- Prefer CSS animations over JavaScript
- Use GPU-accelerated properties (transform, opacity)
- Lazy load heavy components

### 5. Accessibility
- Ensure sufficient color contrast (WCAG AA minimum)
- Provide keyboard navigation for interactive elements
- Include proper ARIA labels where needed
- Test with screen readers

## Integration Examples

### Hero Section
```tsx
<section className="relative min-h-screen flex items-center justify-center">
  <AnimatedGridPattern
    numSquares={30}
    maxOpacity={0.1}
    className="fixed inset-0 -z-10"
  />
  <Particles
    className="absolute inset-0"
    quantity={50}
    color="#6366f1"
  />
  <div className="relative z-10 text-center">
    <AnimatedGradientText className="text-6xl font-bold mb-6">
      Welcome to Bellum
    </AnimatedGradientText>
    <p className="text-xl text-nacho-secondary mb-8">
      Run Android, Windows, and games in your browser
    </p>
    <ShimmerButton>Get Started</ShimmerButton>
  </div>
</section>
```

### Feature Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {features.map((feature) => (
    <MagicCard key={feature.id} className="p-6">
      <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
      <p className="text-nacho-secondary">{feature.description}</p>
    </MagicCard>
  ))}
</div>
```

### Call to Action
```tsx
<Card variant="magic" className="p-8 text-center">
  <h2 className="text-3xl font-bold mb-4">
    <AnimatedGradientText>
      Ready to Get Started?
    </AnimatedGradientText>
  </h2>
  <p className="text-nacho-secondary mb-6">
    Join thousands of users already using Bellum
  </p>
  <div className="flex gap-4 justify-center">
    <Button variant="shimmer">Sign Up Free</Button>
    <Button variant="outline">Learn More</Button>
  </div>
</Card>
```

## Troubleshooting

### Animations Not Working
1. Ensure Tailwind CSS is properly configured
2. Check that `tailwindcss-animate` plugin is installed
3. Verify keyframes are defined in `tailwind.config.ts`

### Framer Motion Errors
1. Ensure `framer-motion` is installed: `pnpm add framer-motion`
2. Check that components are marked as `"use client"`
3. Verify imports are correct

### Performance Issues
1. Reduce `quantity` prop on Particles component
2. Decrease `numSquares` on AnimatedGridPattern
3. Use `will-change` CSS property sparingly
4. Consider lazy loading heavy components

## Support

For issues or questions:
1. Check the component source code in `/components/ui/`
2. Review the Tailwind configuration in `tailwind.config.ts`
3. Consult the color scheme in `app/globals.css`
4. Refer to the implementation in `app/games/page.tsx`
