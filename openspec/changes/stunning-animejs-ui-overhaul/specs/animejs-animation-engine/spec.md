## ADDED Requirements

### Requirement: Engine Initialization
The anime.js animation engine SHALL initialize with anime.js v4 and expose a scoped animation system.

#### Scenario: Engine boots on app mount
- **WHEN** the application first renders
- **THEN** `initAnimeEngine()` creates a root anime.js scope
- **AND** the scope registers all animation presets (spring, fade, slide, scale)
- **AND** the engine checks `prefers-reduced-motion` and sets `reducedMotion = true` if enabled

#### Scenario: Engine handles cleanup on unmount
- **WHEN** a component using `useAnimeScope()` unmounts
- **THEN** all animations in that scope are automatically removed
- **AND** no memory leaks or dangling RAF callbacks remain

### Requirement: Animation Presets
The engine SHALL provide reusable animation presets with consistent timing tokens.

#### Scenario: Preset lookup
- **WHEN** a component calls `animatePreset('cardHover', elementRef)`
- **THEN** the animation uses the preset's defined properties (translateY, boxShadow, duration, easing)
- **AND** the preset respects the current animation quality level

#### Scenario: Token consistency
- **WHEN** any animation runs
- **THEN** durations SHALL use the `DURATIONS` token set (instant: 0, fast: 150ms, base: 300ms, reveal: 450ms, page: 600ms, cinematic: 900ms)
- **AND** easings SHALL use the `EASINGS` token set (default, spring, bounce, exit, enter)

### Requirement: React Integration
The engine SHALL provide React hooks that safely bridge refs to anime.js.

#### Scenario: useAnime hook
- **WHEN** a functional component calls `useAnime(elementRef, { translateY: [20, 0], opacity: [0, 1] })`
- **THEN** anime.js animates the referenced DOM node
- **AND** on component unmount, the animation is cleaned up

#### Scenario: useAnimeTimeline hook
- **WHEN** a component calls `useAnimeTimeline()`
- **THEN** it returns a timeline instance with `.add()`, `.play()`, `.pause()` methods
- **AND** child animations can be sequenced with offsets

### Requirement: Performance Monitoring
The engine SHALL expose FPS data for the degradation system.

#### Scenario: FPS tracking
- **WHEN** `usePerfMonitor()` is active
- **THEN** it tracks frame delta times via `requestAnimationFrame`
- **AND** it reports average FPS every 500ms
- **AND** it triggers `onQualityChange` callback when thresholds are crossed
