## ADDED Requirements

### Requirement: FPS Counter Display
The runtime HUD SHALL display real-time FPS with color-coded indicators.

#### Scenario: FPS display
- **WHEN** a game is running
- **THEN** an FPS counter SHALL be visible in the top-right corner
- **AND** the counter SHALL update every 500ms
- **AND** FPS ≥ 40 SHALL display in green (`hsl(142 71% 55%)`)
- **AND** FPS 30-39 SHALL display in yellow (`hsl(38 92% 55%)`)
- **AND** FPS < 30 SHALL display in red (`hsl(0 72% 55%)`)

#### Scenario: FPS history graph
- **WHEN** the user hovers over the FPS counter
- **THEN** a mini sparkline graph SHALL appear showing FPS history over the last 5 seconds
- **AND** the graph SHALL use a bar chart with 20 bars (250ms per bar)
- **AND** the graph SHALL animate in with `opacity: [0, 1], scaleY: [0, 1]`

### Requirement: Execution Loading States
APK/EXE loading SHALL have animated progress indicators.

#### Scenario: Loading steps
- **WHEN** an APK or EXE file is loaded
- **THEN** a loading overlay SHALL display progress steps
- **AND** each step SHALL have an animated indicator
- **AND** active steps SHALL pulse with `opacity: [0.5, 1]`
- **AND** completed steps SHALL show a checkmark with `scale: [0, 1]`

#### Scenario: Progress bar
- **WHEN** a file is being parsed or compiled
- **THEN** a progress bar SHALL animate horizontally
- **AND** the bar SHALL use `scaleX: [0, 1]` with `transform-origin: left`
- **AND** the bar color SHALL be the primary accent

#### Scenario: Step transition
- **WHEN** a loading step completes and the next begins
- **THEN** the completed step SHALL fade to muted
- **AND** the new active step SHALL highlight with `opacity: [0.5, 1]`
- **AND** the transition SHALL take 200ms

### Requirement: Telemetry Dashboard
Runtime telemetry SHALL be displayed in an animated HUD overlay.

#### Scenario: Telemetry bars
- **WHEN** runtime telemetry is active
- **THEN** bars SHALL display CPU, memory, and GPU usage
- **AND** bar fills SHALL animate with `scaleX` from 0 to current value
- **AND** the animation SHALL take 300ms with ease-out

#### Scenario: Live indicator
- **WHEN** the emulator is running
- **THEN** a "LIVE" indicator SHALL pulse
- **AND** the pulse SHALL be `opacity: [0.6, 1]` with 1.2s cycle
- **AND** a small dot SHALL blink alongside the text

### Requirement: Runtime Controls
Runtime control buttons SHALL have animated states.

#### Scenario: Control hover
- **WHEN** the user hovers over a runtime control (pause, stop, fullscreen)
- **THEN** the button SHALL scale to `scale: [1, 1.1]`
- **AND** the icon SHALL animate in with a subtle bounce

#### Scenario: Fullscreen transition
- **WHEN** the user toggles fullscreen
- **THEN** the canvas container SHALL animate to fill the screen
- **AND** the transition SHALL use `scale` and `translate` with 400ms duration
- **AND** the UI chrome SHALL fade out in fullscreen mode
