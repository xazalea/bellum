## Why

The project currently displays "Abyss OS" branding on the homepage, which needs to be replaced with "challenger deep." to match the project's new identity. Additionally, the games page should use the real game API from `public/games.xml` with proper randomization during scroll, and Cloudflare Pages deployment needs to be fixed by using AlmostNode for Node.js compatibility.

## What Changes

- **BREAKING**: Remove "Abyss OS" branding from homepage badge
- Add "challenger deep." text with `TextHoverEffect` component on homepage hero section
- Update homepage hero to display "challenger deep." using the `TextHoverEffect` component from `components/ui/text-hover-effect.tsx`
- Ensure games page properly loads from `public/games.xml` (which contains JSON game data)
- Implement randomized game display that shuffles during infinite scroll
- Add AlmostNode integration for Cloudflare Pages Node.js compatibility
- Deploy configuration updates for Cloudflare Pages with AlmostNode

## Capabilities

### New Capabilities

- `challenger-deep-branding`: Homepage branding with "challenger deep." text effect using TextHoverEffect component
- `almostnode-integration`: Cloudflare Pages Node.js compatibility layer using AlmostNode
- `randomized-games-display`: Games page randomization during infinite scroll

### Modified Capabilities

None (no existing specs to modify)

## Impact

- **Frontend**: `components/pages/HomePage.tsx` - branding replacement
- **Frontend**: `components/pages/GamesPage.tsx` - randomization logic
- **Infrastructure**: Cloudflare Pages deployment configuration
- **Dependencies**: AlmostNode package and configuration
- **API**: Games API endpoint behavior for randomization