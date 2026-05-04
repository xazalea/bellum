## ADDED Requirements

### Requirement: Hover State Animations
All interactive elements SHALL have animated hover states using spring physics.

#### Scenario: Card hover
- **WHEN** the user hovers over a game card
- **THEN** the card SHALL animate `translateY: [0, -3px]` and `boxShadow` to an elevated state
- **AND** the border color SHALL transition to `hsl(var(--primary) / 0.15)`
- **AND** the animation SHALL use spring physics with stiffness 200 and damping 12
- **AND** the duration SHALL be approximately 200ms

#### Scenario: Button hover
- **WHEN** the user hovers over a primary button
- **THEN** the button SHALL animate `brightness: [1, 1.08]`
- **AND** the background SHALL shift subtly toward the accent color
- **AND** the animation SHALL be instant (no duration) for the color, 150ms for brightness

#### Scenario: Link hover
- **WHEN** the user hovers over a text link
- **THEN** an underline SHALL animate in from left to right using `scaleX: [0, 1]`
- **AND** the underline origin SHALL be `transform-origin: left`
- **AND** the duration SHALL be 200ms

### Requirement: Press/Active State Animations
Interactive elements SHALL provide tactile feedback on press.

#### Scenario: Button press
- **WHEN** the user presses (mousedown/touchstart) a button
- **THEN** the button SHALL animate `scale: [1, 0.97]` over 80ms
- **AND** on release, it SHALL animate `scale: [0.97, 1]` with spring physics

#### Scenario: Card press
- **WHEN** the user presses a card
- **THEN** the card SHALL animate `scale: [1, 0.985]` over 100ms
- **AND** the shadow SHALL reduce intensity to simulate depression

### Requirement: Focus State Animations
Focus indicators SHALL animate smoothly for keyboard navigation.

#### Scenario: Input focus
- **WHEN** an input receives keyboard focus
- **THEN** a ring SHALL animate in with `opacity: [0, 1]` and `scale: [0.96, 1]`
- **AND** the ring color SHALL be `hsl(var(--primary) / 0.3)`
- **AND** the duration SHALL be 150ms

#### Scenario: Focus blur
- **WHEN** focus leaves an input
- **THEN** the ring SHALL fade out over 100ms

### Requirement: Loading State Animations
Loading states SHALL use animated indicators.

#### Scenario: Spinner animation
- **WHEN** a loading spinner is displayed
- **THEN** it SHALL rotate continuously using anime.js
- **AND** one full rotation SHALL take 700ms
- **AND** the easing SHALL be linear

#### Scenario: Skeleton shimmer
- **WHEN** skeleton placeholders are shown during content loading
- **THEN** a shimmer gradient SHALL sweep across the skeleton
- **AND** the sweep SHALL move from left to right
- **AND** the cycle SHALL take 1.5s with ease-in-out easing
- **AND** the animation SHALL loop until content loads

### Requirement: Error State Animations
Error states SHALL provide clear animated feedback.

#### Scenario: Form error shake
- **WHEN** a form validation error occurs
- **THEN** the form field SHALL shake horizontally
- **AND** the shake SHALL be `translateX: [0, -4px, 4px, -2px, 2px, 0]`
- **AND** the duration SHALL be 350ms

#### Scenario: Error banner slide
- **WHEN** an error message appears
- **THEN** the banner SHALL slide in from top with `translateY: [-20px, 0]`
- **AND** `opacity: [0, 1]`
- **AND** the duration SHALL be 300ms
