## ADDED Requirements

### Requirement: Animation Quality Degradation
The animation system SHALL automatically degrade animation complexity based on runtime performance.

#### Scenario: Full quality mode
- **WHEN** average FPS is above 45 for at least 3 seconds
- **THEN** the animation quality SHALL be `'full'`
- **AND** all animations SHALL play with full effects, spring physics, and stagger delays
- **AND** particle effects and blur transitions SHALL be enabled

#### Scenario: Reduced quality mode
- **WHEN** average FPS drops below 30 for at least 2 seconds
- **THEN** the animation quality SHALL degrade to `'reduced'`
- **AND** spring physics SHALL be replaced with linear easing
- **AND** stagger delays SHALL be reduced to 20ms minimum
- **AND** particle effects SHALL be disabled
- **AND** blur transitions SHALL be replaced with simple opacity fades

#### Scenario: Minimal quality mode
- **WHEN** average FPS drops below 20 for at least 1 second
- **THEN** the animation quality SHALL degrade to `'minimal'`
- **AND** all animations SHALL use instant transitions (duration 0ms)
- **AND** only opacity changes SHALL animate (100ms duration)
- **AND** all decorative animations SHALL be completely disabled

#### Scenario: Quality recovery
- **WHEN** average FPS recovers above 45 for at least 3 seconds
- **THEN** the animation quality SHALL gradually return to `'full'`
- **AND** the transition between quality levels SHALL take 1 second
- **AND** no jarring jumps in animation style SHALL occur

### Requirement: prefers-reduced-motion Support
All animations SHALL respect the user's `prefers-reduced-motion` preference.

#### Scenario: Reduced motion enabled
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** all animations SHALL be disabled (duration 0ms, instant transitions)
- **AND** opacity fades MAY still be used but with duration ≤ 100ms
- **AND** no movement, scale, or rotation animations SHALL play
- **AND** the animation engine SHALL set `reducedMotion = true` on initialization

#### Scenario: Toggle in settings
- **WHEN** the user toggles "Reduce Motion" in settings
- **THEN** the preference SHALL be stored in localStorage
- **AND** all current and future animations SHALL immediately respect the new setting
- **AND** running animations SHALL complete their current frame then stop

### Requirement: Frame Budget Monitoring
The animation system SHALL monitor its own frame budget.

#### Scenario: Animation frame time tracking
- **WHEN** animations are running
- **THEN** the system SHALL track how much frame time animations consume
- **AND** if animation frame time exceeds 8ms (half of 16.67ms budget at 60fps)
- **THEN** the system SHALL trigger quality degradation

#### Scenario: RAF scheduling
- **WHEN** both emulator and UI animations need RAF callbacks
- **THEN** the emulator SHALL get priority scheduling
- **AND** UI animations SHALL use `anime` with `autoplay: false` + manual `tick()`
- **AND** the manual tick SHALL be synchronized to the display refresh

### Requirement: GPU Layer Optimization
Animations SHALL use GPU-accelerated properties only.

#### Scenario: Property whitelist
- **WHEN** any animation is defined
- **THEN** only these properties SHALL be animated:
  - `transform` (translate, scale, rotate)
  - `opacity`
  - `filter` (only `brightness`, `contrast`, `saturate` — no `blur`)
- **AND** animating `width`, `height`, `top`, `left`, `margin`, `padding` SHALL be prohibited
- **AND** animating `box-shadow` SHALL only change opacity, not spread/blur

#### Scenario: Will-change hints
- **WHEN** an element is about to animate
- **THEN** `will-change: transform, opacity` SHALL be applied before animation starts
- **AND** `will-change` SHALL be removed 1 second after animation completes
