## ADDED Requirements

### Requirement: Homepage displays "challenger deep." branding
The homepage SHALL display "challenger deep." text using the `TextHoverEffect` component in the hero section, replacing the previous "Abyss OS" badge.

#### Scenario: Homepage loads with new branding
- **WHEN** user navigates to the homepage
- **THEN** the hero section SHALL display "challenger deep." with the TextHoverEffect component
- **AND** the text SHALL have a hover gradient overlay effect

#### Scenario: Branding text is styled correctly
- **WHEN** the homepage renders
- **THEN** "challenger deep." SHALL be displayed below the main "CHALLENGER" title
- **AND** the text SHALL use appropriate font sizing for secondary branding

### Requirement: No Abyss OS branding remains
All references to "Abyss OS" branding SHALL be removed from the homepage.

#### Scenario: No Abyss OS text visible
- **WHEN** user views the homepage
- **THEN** no "Abyss OS" text SHALL be visible in the hero section or badge area