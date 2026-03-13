## 1. Homepage Branding Update

- [x] 1.1 Update HomePage.tsx to remove "Abyss OS" badge text
- [x] 1.2 Add TextHoverEffect component import to HomePage.tsx
- [x] 1.3 Replace badge with "challenger deep." text using TextHoverEffect
- [x] 1.4 Style the "challenger deep." text appropriately for secondary branding
- [x] 1.5 Test homepage renders correctly with new branding

## 2. Games Page Randomization

- [x] 2.1 Verify games.xml is being loaded correctly by the API
- [x] 2.2 Ensure seed-based randomization is working in fetchGames function
- [x] 2.3 Confirm seed is generated on page mount and persisted
- [x] 2.4 Test infinite scroll maintains randomized order without duplicates
- [x] 2.5 Verify search filtering works with randomized display

## 3. AlmostNode Integration for Cloudflare Pages

- [x] 3.1 Install AlmostNode package dependency (already installed)
- [x] 3.2 Update wrangler.toml with AlmostNode configuration
- [x] 3.3 Create or update build script for Cloudflare Pages compatibility
- [x] 3.4 Test local build with AlmostNode
- [ ] 3.5 Deploy to Cloudflare Pages and verify Node.js compatibility

## 4. Final Verification

- [x] 4.1 Run full build to ensure no compilation errors
- [x] 4.2 Test homepage displays "challenger deep." with hover effect
- [x] 4.3 Test games page loads and randomizes correctly
- [ ] 4.4 Verify Cloudflare Pages deployment works
