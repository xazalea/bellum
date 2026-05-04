## ADDED Requirements

### Requirement: Modal Entrance Animation
The authentication modal SHALL animate in with a cinematic entrance.

#### Scenario: Modal open
- **WHEN** the auth modal triggers (new user, sign out, switch account)
- **THEN** the backdrop SHALL fade in with `opacity: [0, 0.6]` over 250ms
- **AND** the modal card SHALL animate in with `opacity: [0, 1], translateY: [30px, 0], scale: [0.95, 1]`
- **AND** the modal animation SHALL use spring physics with slight overshoot
- **AND** the duration SHALL be approximately 400ms

#### Scenario: Staggered content reveal
- **WHEN** the auth modal opens
- **THEN** modal content elements SHALL stagger in
- **AND** the title SHALL animate first (delay 0ms)
- **AND** the form fields SHALL animate next (delay 80ms stagger)
- **AND** the action buttons SHALL animate last (delay 160ms)
- **AND** each element SHALL use `opacity: [0, 1], translateY: [12px, 0]`

### Requirement: Fingerprint Progress Animation
The fingerprint scanning step SHALL have animated progress indicators.

#### Scenario: Fingerprint scanning
- **WHEN** the fingerprint scan begins
- **THEN** a scanning ring SHALL animate around the fingerprint icon
- **AND** the ring SHALL rotate continuously (360° per 1.5s)
- **AND** the ring color SHALL pulse between muted and primary

#### Scenario: Fingerprint success
- **WHEN** the fingerprint scan completes successfully
- **THEN** the ring SHALL expand and fade out with `scale: [1, 1.5], opacity: [1, 0]`
- **AND** a checkmark icon SHALL scale in with `scale: [0, 1]` using spring bounce
- **AND** the fingerprint icon SHALL transition to a success color

#### Scenario: Fingerprint fallback
- **WHEN** fingerprint scan fails and falls back to UUID
- **THEN** the ring SHALL shake with `translateX: [0, -3px, 3px, 0]`
- **AND** the ring color SHALL transition to warning color
- **AND** a subtle tooltip SHALL fade in explaining the fallback

### Requirement: Form Error Animations
Auth form errors SHALL provide animated feedback.

#### Scenario: Username validation error
- **WHEN** the user submits an invalid username
- **THEN** the input field SHALL shake with `translateX: [0, -5px, 5px, -3px, 3px, 0]`
- **AND** the border SHALL transition to destructive color
- **AND** an error message SHALL slide in from below with `translateY: [-8px, 0], opacity: [0, 1]`

#### Scenario: Loading state transition
- **WHEN** the auth form submits
- **THEN** the submit button SHALL transition to a loading state
- **AND** the button text SHALL fade out (opacity to 0)
- **AND** a spinner SHALL fade in and start rotating
- **AND** the button width SHALL remain constant during the transition

### Requirement: Auth State Transitions
Transitions between auth states SHALL animate smoothly.

#### Scenario: Sign up to sign in
- **WHEN** the user toggles between sign up and sign in modes
- **THEN** the current form SHALL slide out left with `translateX: [0, -20px], opacity: [1, 0]`
- **AND** the new form SHALL slide in from right with `translateX: [20px, 0], opacity: [0, 1]`
- **AND** the transition SHALL take 300ms

#### Scenario: Success to dashboard
- **WHEN** authentication succeeds
- **THEN** the modal SHALL animate out with `opacity: [1, 0], scale: [1, 0.95]`
- **AND** the main content SHALL animate in with the standard page entrance
- **AND** a brief success toast SHALL slide in from top
