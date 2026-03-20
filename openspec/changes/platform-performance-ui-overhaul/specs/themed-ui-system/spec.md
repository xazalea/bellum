## ADDED Requirements

### Requirement: Tweakcn theme system integration
The system SHALL integrate tweakcn for runtime theme switching without requiring application rebuild.

#### Scenario: Theme switch at runtime
- **WHEN** user selects a different theme
- **THEN** UI updates immediately without page reload
- **AND** all components reflect new theme colors

#### Scenario: Theme persistence across sessions
- **WHEN** user selects a theme preference
- **THEN** preference is saved to localStorage
- **AND** same theme is applied on next visit

#### Scenario: Default theme application
- **WHEN** user visits for the first time
- **THEN** system applies default "challenger-deep" theme
- **AND** respects system dark mode preference

### Requirement: Glass-morphism card components
The system SHALL provide glass-morphism card components with backdrop blur and subtle borders.

#### Scenario: Glass card renders with blur effect
- **WHEN** glass card component is rendered
- **THEN** background shows backdrop blur of 12-40px
- **AND** border displays with primary color at 10-20% opacity

#### Scenario: Glass card hover interaction
- **WHEN** user hovers over glass card
- **THEN** border opacity increases to 40%
- **AND** subtle transition animation plays

#### Scenario: Glass card accessibility
- **WHEN** glass card contains interactive elements
- **THEN** focus states are clearly visible
- **AND** color contrast meets WCAG AA standards

### Requirement: Gold/amber accent color system
The system SHALL use gold (#d4af37) and amber (#f2ca50) as primary accent colors with obsidian dark backgrounds.

#### Scenario: Primary color application
- **WHEN** UI renders with default theme
- **THEN** primary accent is gold (#d4af37)
- **AND** secondary accent is amber (#f2ca50)

#### Scenario: Background color hierarchy
- **WHEN** UI renders
- **THEN** base background is obsidian (#0e0e0e)
- **AND** surface background is slightly lighter (#131313)
- **AND** elevated surfaces use #1a1a1a to #2a2a2a

#### Scenario: Text color contrast
- **WHEN** text is rendered on dark backgrounds
- **THEN** primary text is muted (#E5E2E1)
- **AND** accent text uses gold/amber for emphasis
- **AND** contrast ratio meets WCAG AA (4.5:1 minimum)

### Requirement: Responsive sidebar navigation
The system SHALL provide a responsive sidebar navigation that collapses on mobile and expands on desktop.

#### Scenario: Desktop sidebar display
- **WHEN** viewport width is 1024px or greater
- **THEN** sidebar is visible and fixed on left side
- **AND** sidebar width is 288px (w-72)

#### Scenario: Mobile sidebar hidden
- **WHEN** viewport width is less than 1024px
- **THEN** sidebar is hidden by default
- **AND** hamburger menu icon is visible in header

#### Scenario: Mobile sidebar toggle
- **WHEN** user clicks hamburger menu on mobile
- **THEN** sidebar slides in from left
- **AND** backdrop overlay appears behind sidebar

### Requirement: Material Symbols icons integration
The system SHALL use Material Symbols Outlined icons throughout the UI with consistent sizing and styling.

#### Scenario: Icon rendering
- **WHEN** icon is needed in UI
- **THEN** Material Symbols Outlined font is used
- **AND** icon size is consistent (default 24px)

#### Scenario: Icon fill state on active
- **WHEN** navigation item is active
- **THEN** icon displays filled variant
- **AND** inactive items show outlined variant

### Requirement: Custom CSS properties for theming
The system SHALL expose theme colors as CSS custom properties for easy customization.

#### Scenario: CSS custom properties defined
- **WHEN** theme is loaded
- **THEN** CSS variables are set on :root element
- **AND** variables include --primary, --accent, --surface, --obsidian, --muted

#### Scenario: Theme variable updates
- **WHEN** theme is changed
- **THEN** CSS custom properties are updated
- **AND** all components using var() update automatically

### Requirement: Smooth theme transitions
The system SHALL provide smooth transitions when switching themes to avoid jarring visual changes.

#### Scenario: Theme transition animation
- **WHEN** theme is changed
- **THEN** colors transition over 300ms
- **AND** no layout shift occurs during transition

#### Scenario: Transition suppression for instant switch
- **WHEN** theme is applied on initial load
- **THEN** transitions are suppressed
- **AND** theme applies instantly without animation
