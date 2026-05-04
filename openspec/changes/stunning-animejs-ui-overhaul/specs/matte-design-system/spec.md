## ADDED Requirements

### Requirement: Color Palette
The matte design system SHALL define a restrained color palette using HSL values.

#### Scenario: Default theme colors
- **WHEN** the application loads without a stored theme preference
- **THEN** the default theme SHALL use:
  - `--background: 0 0% 3.5%` (near-black with warmth)
  - `--foreground: 0 0% 92%` (soft white)
  - `--card: 0 0% 6%` (elevated surface)
  - `--border: 0 0% 12%` (barely visible separation)
  - `--primary: 0 85% 62%` (coral accent, used sparingly)
  - `--muted-foreground: 0 0% 38%` (de-emphasized content)
  - `--secondary: 0 0% 9%` (subtle background variation)
  - `--accent: 0 0% 11%` (hover/active states)

#### Scenario: Accent color restraint
- **WHEN** any UI element uses the primary color
- **THEN** it SHALL be limited to interactive elements (buttons, links, active states)
- **AND** decorative elements SHALL use muted foreground colors, not primary

### Requirement: Typography Scale
The matte design system SHALL use a precise typography hierarchy.

#### Scenario: Heading sizes
- **WHEN** text uses heading classes
- **THEN** font sizes SHALL follow:
  - h1: `2.25rem` (36px), weight 700, tracking `-0.03em`
  - h2: `1.5rem` (24px), weight 600, tracking `-0.02em`
  - h3: `1.125rem` (18px), weight 600, tracking `-0.01em`
  - h4: `0.875rem` (14px), weight 600, tracking `0`
  - body: `0.8125rem` (13px), weight 400, tracking `-0.011em`
  - small: `0.6875rem` (11px), weight 500, tracking `0`
  - caption: `0.625rem` (10px), weight 400, tracking `0.02em`

#### Scenario: Font stack
- **WHEN** text renders
- **THEN** the font stack SHALL be `'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
- **AND** monospace elements SHALL use `'SF Mono', 'JetBrains Mono', 'Fira Code', monospace`

### Requirement: Spacing System
The matte design system SHALL use a consistent 4px-base spacing scale.

#### Scenario: Spacing tokens
- **WHEN** any component uses spacing
- **THEN** it SHALL use Tailwind spacing tokens:
  - xs: `0.25rem` (4px)
  - sm: `0.5rem` (8px)
  - md: `1rem` (16px)
  - lg: `1.5rem` (24px)
  - xl: `2rem` (32px)
  - 2xl: `3rem` (48px)

### Requirement: Border Radius
The matte design system SHALL use sharp, minimal border radii.

#### Scenario: Radius tokens
- **WHEN** any element uses border radius
- **THEN** the default radius SHALL be `0.375rem` (6px)
- **AND** buttons and inputs SHALL use `0.375rem`
- **AND** cards SHALL use `0.5rem` (8px)
- **AND** badges and tags SHALL use `0.25rem` (4px)

### Requirement: Shadow System
The matte design system SHALL use single-layer, low-opacity shadows.

#### Scenario: Shadow values
- **WHEN** any element uses a shadow
- **THEN** card elevation SHALL use `0 1px 3px hsl(var(--foreground) / 0.04)`
- **AND** dropdown/popover SHALL use `0 4px 12px hsl(var(--foreground) / 0.06)`
- **AND** modal/dialog SHALL use `0 8px 24px hsl(var(--foreground) / 0.08)`
- **AND** no element SHALL use colored shadows (no gold/primary colored shadows)

### Requirement: Surface Hierarchy
The matte design system SHALL define clear surface elevation levels.

#### Scenario: Surface levels
- **WHEN** elements stack visually
- **THEN** background: `hsl(0 0% 3.5%)`
- **AND** card: `hsl(0 0% 6%)`
- **AND** elevated card: `hsl(0 0% 7%)`
- **AND** popover/dropdown: `hsl(0 0% 8%)`
- **AND** modal/dialog: `hsl(0 0% 9%)`
