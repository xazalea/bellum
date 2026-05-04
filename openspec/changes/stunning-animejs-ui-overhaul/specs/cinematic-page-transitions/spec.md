## ADDED Requirements

### Requirement: Route Transition Orchestration
Every route change SHALL animate with a choreographed entrance/exit sequence.

#### Scenario: Page exit
- **WHEN** the user navigates to a new route
- **THEN** the current page elements animate out using a timeline
- **AND** the exit animation SHALL be `opacity: [1, 0], translateY: [0, -12px]`
- **AND** the exit duration SHALL be 250ms with `ease.out` easing

#### Scenario: Page entrance
- **WHEN** the new route begins rendering
- **THEN** page elements animate in using a timeline with staggered delays
- **AND** the entrance animation SHALL be `opacity: [0, 1], translateY: [16px, 0]`
- **AND** the entrance duration SHALL be 450ms with `ease.out` easing
- **AND** stagger delay between elements SHALL be 80ms

#### Scenario: Enter/exit sequencing
- **WHEN** a route transition occurs
- **THEN** the exit animation MUST complete before the entrance animation begins
- **AND** there SHALL be a 50ms gap between exit and entrance

### Requirement: Layout Transition Support
Layout-level transitions (sidebar collapse, panel resize) SHALL animate smoothly.

#### Scenario: Sidebar collapse
- **WHEN** the sidebar toggles between expanded and collapsed states
- **THEN** the width SHALL animate from expanded width to collapsed width
- **AND** the animation SHALL use spring physics (spring(1, 100, 14, 0))
- **AND** the duration SHALL be approximately 350ms

#### Scenario: Panel slide
- **WHEN** a secondary panel (settings, details) slides in/out
- **THEN** the panel SHALL animate `translateX` from `[100%, 0]` on enter
- **AND** `translateX` from `[0, 100%]` on exit
- **AND** the backdrop SHALL fade in/out with `opacity: [0, 0.5]`

### Requirement: Scroll-Triggered Reveals
Elements entering the viewport SHALL animate with reveal effects.

#### Scenario: Section reveal
- **WHEN** a content section scrolls into the viewport (intersection ratio > 0.15)
- **THEN** child elements animate in with stagger
- **AND** the animation SHALL be `opacity: [0, 1], translateY: [24px, 0]`
- **AND** the stagger SHALL be 60ms between children
- **AND** the animation SHALL trigger only once per page load

#### Scenario: Re-respect
- **WHEN** the user navigates back to a previously visited route
- **THEN** entrance animations SHALL replay
- **AND** scroll-triggered reveals SHALL reset and trigger again
