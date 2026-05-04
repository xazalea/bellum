## ADDED Requirements

### Requirement: Staggered Card Reveal
Game cards SHALL animate into view with choreographed staggered reveals.

#### Scenario: Grid load
- **WHEN** a game grid renders (initial load or route navigation)
- **THEN** cards animate in with a timeline
- **AND** each card SHALL animate `opacity: [0, 1], translateY: [20px, 0], scale: [0.96, 1]`
- **AND** the stagger between cards SHALL be 60ms
- **AND** the duration SHALL be 400ms per card
- **AND** the easing SHALL be `ease.out`

#### Scenario: Category filter
- **WHEN** the user filters games by category or platform
- **THEN** matching cards SHALL animate to new positions (FLIP animation)
- **AND** removed cards SHALL fade out with `opacity: [1, 0], scale: [1, 0.95]`
- **AND** new cards SHALL fade in with the standard reveal animation
- **AND** the transition SHALL complete within 500ms

### Requirement: Card Hover Theater
Game cards SHALL have immersive hover effects.

#### Scenario: Hover lift
- **WHEN** the user hovers over a game card
- **THEN** the card SHALL lift with `translateY: [0, -4px]`
- **AND** the shadow SHALL intensify to `0 8px 24px -4px hsl(var(--foreground) / 0.08)`
- **AND** the border SHALL transition to `hsl(var(--primary) / 0.2)`
- **AND** the animation SHALL use spring physics

#### Scenario: Thumbnail zoom
- **WHEN** the user hovers over a game card
- **THEN** the thumbnail image SHALL scale with `scale: [1, 1.05]`
- **AND** the zoom SHALL be contained within the card bounds (`overflow: hidden`)
- **AND** the duration SHALL be 500ms

#### Scenario: Play button reveal
- **WHEN** the user hovers over a game card
- **THEN** a play button overlay SHALL fade in with `opacity: [0, 1]`
- **AND** the play icon SHALL scale in with `scale: [0.8, 1]` using spring bounce
- **AND** the overlay SHALL have a subtle backdrop blur

### Requirement: Card Parallax Effect
Featured game cards MAY have parallax depth effects.

#### Scenario: Mouse parallax
- **WHEN** the user moves their mouse over a featured card
- **THEN** the thumbnail SHALL subtly shift in the opposite direction
- **AND** the shift SHALL be limited to ±8px on both axes
- **AND** the movement SHALL follow the mouse with 150ms lag (spring damping)

### Requirement: Card Selection Feedback
Selected/active game cards SHALL have distinct animated states.

#### Scenario: Card selection
- **WHEN** a user clicks to select a game card
- **THEN** the card SHALL pulse with a border glow animation
- **AND** the glow SHALL be `boxShadow: [0 0 0 0, 0 0 0 2px hsl(var(--primary) / 0.3)]`
- **AND** the pulse SHALL last 400ms
- **AND** the card SHALL remain elevated while selected
