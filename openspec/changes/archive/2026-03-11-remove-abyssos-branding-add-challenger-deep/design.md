## Context

This project is a Next.js application deployed on Cloudflare Pages. The current homepage displays "Abyss OS" branding that needs to be replaced with "challenger deep." The application includes a games library with 20,000+ games loaded from `/public/games.xml` (which contains JSON data despite the .xml extension).

Cloudflare Pages does not natively support Node.js runtime, which causes issues with certain Next.js features. AlmostNode (https://github.com/macaly/almostnode) provides a compatibility layer to enable Node.js functionality on Cloudflare Pages.

## Goals / Non-Goals

**Goals:**
- Replace "Abyss OS" branding with "challenger deep." text using `TextHoverEffect` component
- Ensure games page loads from `public/games.xml` with proper randomization
- Enable Cloudflare Pages deployment with AlmostNode for Node.js compatibility
- Maintain existing functionality (navigation, infinite scroll, search)

**Non-Goals:**
- Complete UI redesign
- Changes to other pages (Android, Windows, AI)
- Modification of game proxy functionality

## Decisions

### 1. Homepage Branding Implementation
**Decision**: Replace the "Abyss OS" badge with "challenger deep." using the existing `TextHoverEffect` component.

**Rationale**: The `TextHoverEffect` component already exists in `components/ui/text-hover-effect.tsx` with multiple variants. We'll use the base `TextHoverEffect` component with hover gradient overlay for the branding text.

**Alternatives considered**:
- `TextHoverEffectShimmer` - Too flashy for secondary branding
- `MagneticText` - Interactive but may distract from main hero
- Plain text - Misses opportunity for visual polish

### 2. Games Randomization Strategy
**Decision**: Use seeded randomization with a seed generated on initial page load, passed to the API for consistent shuffling.

**Rationale**: The current implementation already supports randomization via the `seed` parameter in `fetchGames()`. We ensure this is properly utilized during infinite scroll.

**Implementation**:
- Generate random seed on mount
- Pass seed to API calls for consistent ordering per session
- Re-randomize by regenerating seed (optional user action)

### 3. Cloudflare Pages Node.js Compatibility
**Decision**: Integrate AlmostNode to provide Node.js runtime compatibility on Cloudflare Pages.

**Rationale**: Cloudflare Pages Workers have limited Node.js support. AlmostNode provides a polyfill layer that enables Node.js APIs to work in the edge environment.

**Alternatives considered**:
- Vercel deployment - Would require infrastructure change
- Cloudflare Workers with Node.js compat flag - Limited support
- Refactoring to remove Node.js dependencies - Time-consuming

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| AlmostNode may not support all Node.js APIs used | Test thoroughly in staging; identify and polyfill missing APIs |
| TextHoverEffect may need styling adjustments | Test on multiple screen sizes; adjust text size for "challenger deep." |
| Randomization could affect caching | Use seed-based randomization for deterministic results per session |
| games.xml JSON format confusion | Keep .xml extension but document it contains JSON; or rename to games.json |

## Migration Plan

1. **Phase 1 - Homepage Branding**
   - Update HomePage.tsx to use TextHoverEffect for "challenger deep."
   - Remove "Abyss OS" badge reference

2. **Phase 2 - Games Randomization**
   - Verify games.xml (JSON) is loaded correctly
   - Ensure seed-based randomization works with infinite scroll

3. **Phase 3 - AlmostNode Integration**
   - Add AlmostNode package
   - Update wrangler.toml and deployment configuration
   - Test deployment to Cloudflare Pages

## Open Questions

- Should we rename `games.xml` to `games.json` to avoid confusion? (Currently contains JSON data)
- What font size should "challenger deep." use relative to the main "CHALLENGER" title?